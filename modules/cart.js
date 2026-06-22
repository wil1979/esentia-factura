// modules/cart.js
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { Store } from './core.js';
import { DB } from './firebase.js';

const CartManager = {
  init() {
    Store.restore('carrito');
    Store.on('cart:updated', () => this.updateUI());
  },

 // ✅ FUNCIÓN add CORREGIDA (Captura y guarda el aroma)
add(product, variant = null) {
  const stock = Store.get('inventario')[product.nombre] || 0;
  const varianteActual = variant?.nombre || '30ml';
  const aroma = variant?.aroma || ''; // ✅ Capturar aroma

  // ✅ Verificar si YA existe el MISMO producto + variante + aroma
  const inCart = Store.get('carrito').find(i =>
    String(i.id) === String(product.id) && 
    i.variante === varianteActual && 
    i.aroma === aroma
  );
   // if (inCart && inCart.cantidad >= stock) {
   //   Store.emit('toast', { message: 'Stock insuficiente', type: 'warning' });
   //   return false;
   // }

    const precioFinal = variant?.precio || product.precio;
  const precioOriginal = variant?.precioOriginal || product.precio;
  const ahorro = precioOriginal - precioFinal;

  Store.addToCart({
    id: product.id,
    nombre: product.nombre,
    imagen: product.imagen,
    precio: precioFinal,
    precioOriginal: precioOriginal,
    descuentoAplicado: ahorro > 0 ? ahorro : 0,
    descuentoPorcentaje: product.descuentoPromo || 0,
    variante: varianteActual,
    aroma: aroma, // ✅ Guardar aroma en el item del carrito
    cantidad: 1,
    tienePromo: product.descuentoPromo > 0
  });

  Store.emit('toast', { 
    message: aroma ? `✓ Agregado (Aroma: ${aroma})` : (ahorro > 0 ? `✓ Agregado (-${product.descuentoPromo}% promo)` : '✓ Agregado al carrito'), 
    type: 'success' 
  });
  return true;  
},

  remove(id) {
    Store.removeFromCart(id);
    Store.emit('toast', { message: 'Producto eliminado', type: 'info' });
  },

  updateQuantity(id, quantity) {
    if (quantity < 1) {
      this.remove(id);
      return;
    }
    const item = Store.get('carrito').find(i => String(i.id) === String(id));
    if (item) {
      item.cantidad = quantity;
      Store.emit('cart:updated', Store.get('carrito'));
      Store.persist('carrito');
    }
  },

  clear() {
    Store.clearCart();
  },

  getTotal() {
    return Store.get('carrito').reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  },

  getCount() {
    return Store.get('carrito').reduce((sum, item) => sum + item.cantidad, 0);
  },

  hasPromoProducts() {
    const cart = Store.get('carrito') || [];
    return cart.some(item => item.tienePromo === true);
  },

  updateUI() {
    const count = this.getCount();
    const btn = document.getElementById('btnCarrito');
    const badge = document.getElementById('contadorCarrito');
    if (badge) badge.textContent = count;
    if (btn) {
      btn.style.transform = count > 0 ? 'scale(1.1)' : 'scale(1)';
      setTimeout(() => btn.style.transform = 'scale(1)', 200);
    }
  },

  async checkout(promoCode = null, metodoEnvio = 'whatsapp') {
    const cliente = Store.get('cliente');
    if (!cliente) { Store.emit('auth:required'); return false; }
    
    const items = Store.get('carrito');
    if (items.length === 0) return false;

    let total = this.getTotal();
    let discount = 0;
    const hasPromoItems = items.some(i => i.tienePromo);

    if (promoCode && !hasPromoItems) {
      const validation = await DB.validatePromo(promoCode, cliente.id);
      if (validation.valid) {
        const promo = validation.promo;
        discount = promo.tipo === 'porcentaje' ? Math.round(total * promo.valor / 100) : promo.valor;
        total -= discount;
        await DB.usePromo(validation.promo.id, cliente.id);
      }
    } else if (promoCode && hasPromoItems) {
      Store.emit('toast', { message: '⚠️ No se pueden combinar promociones especiales con códigos', type: 'warning' });
    }

    // ✅ NUEVO: Estructura compatible con facturas_rapidas y PedidosManager
    const invoiceData = {
      fecha: new Date().toISOString(),
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteTelefono: cliente.telefono || '',
      productos: items,
      subtotal: this.getTotal(),
      descuento: discount,
      total,
      estado: 'pendiente', // 🔴 CLAVE: Para que aparezca en Pedidos
      metodoPago: 'pendiente', // El cliente paga al recibir o transferir
      tipoFactura: 'web',
      pagado: 0,
      saldo: total,
      canalEnvio: metodoEnvio
    };

    try {
      // ✅ Guardar directamente en facturas_rapidas
      await addDoc(collection(DB.db, "facturas_rapidas"), invoiceData);
      
      this.showReceiptModal(invoiceData, cliente, promoCode);
      
      const mensaje = this.generateOrderMessage(items, total, discount, cliente, promoCode);
      let enlace = '';
      switch (metodoEnvio) {
        case 'email':
          enlace = `mailto:${cliente.email || 'eweesentia@gmail.com'}?subject=🛒 Nuevo Pedido Esentia - ${cliente.nombre}&body=${encodeURIComponent(mensaje)}`;
          break;
        case 'sms':
          enlace = `sms:${cliente.telefono || ''}?body=${encodeURIComponent(mensaje)}`;
          break;
        default:
          enlace = `https://wa.me/50672952454?text=${encodeURIComponent(mensaje)}`;
      }
      window.open(enlace, '_blank');
      this.clear();
      return true;
    } catch (e) {
      console.error("❌ Error al guardar pedido:", e);
      Store.emit('toast', { message: '❌ Error al procesar el pedido', type: 'error' });
      return false;
    }
  },

 generateOrderMessage(items, total, discount, cliente, promoCode) {
  let msg = `🛍️ *NUEVO PEDIDO ESENTIA*\n👤 ${cliente.nombre}\n📱 ${cliente.telefono || 'Sin tel'}\n\n`;
  
  items.forEach(item => {
     const aromaStr = item.aroma ? ` - 🌸 ${item.aroma}` : '';
    msg += `🕯️ *${item.nombre}* (${item.variante})${aromaStr} × ${item.cantidad} - ₡${(item.precio * item.cantidad).toLocaleString()}\n`;
    
    if (item.personalizacion) {
      const p = item.personalizacion;
      msg += `   📏 Tamaño: ${p.tamaño}\n`;
      if(p.aroma && p.aroma !== 'Estándar') msg += `   🌸 Aroma: ${p.aroma}\n`;
      if(p.color && p.color !== 'Natural') msg += `   🎨 Color: ${p.color}\n`;
      if(p.envase && p.envase !== 'Estándar') msg += `   🏺 Envase: ${p.envase}\n`;
      if(p.adicionales?.length) msg += `   ✨ Extras: ${p.adicionales.join(', ')}\n`;
      if(p.tarjeta?.trim()) msg += `   📝 Tarjeta: "${p.tarjeta}"\n`;
      if(item.personalizacionId) msg += `   🔗 Ref BD: ${item.personalizacionId}\n`;
      msg += `\n`;
    }
  });

  if (discount > 0) msg += `🎁 Promo: ${promoCode} (-₡${discount.toLocaleString()})\n`;
  msg += `\n💰 *TOTAL: ₡${total.toLocaleString()}*\n💳 Pago: Crédito/Transferencia\n📦 Confirmar disponibilidad y datos de pago.`;
  return msg;
},

  showReceiptModal(invoice, cliente, promoCode) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalFactura';
    modal.innerHTML = `
      <div class="modal-content modal-grande factura-modal">
        <button class="modal-close" onclick="document.getElementById('modalFactura').remove()">✕</button>
        <h2>🧾 Pedido Generado</h2>
        <div class="factura-header">
          <p><strong>Cliente:</strong> ${cliente.nombre}</p>
          <p><strong>Fecha:</strong> ${new Date(invoice.fecha).toLocaleString('es-CR')}</p>
          <p><strong>Estado:</strong> <span class="badge badge-pendiente"> Pendiente (WhatsApp)</span></p>
        </div>
        <div class="factura-items">
          ${invoice.productos.map(p => `
            <div class="factura-item">
              <span>${p.nombre} (${p.variante}) × ${p.cantidad}</span>
              <span>₡${(p.precio * p.cantidad).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        <div class="factura-totals">
          ${invoice.descuento > 0 ? `<div class="factura-row discount">Descuento (${promoCode}): -₡${invoice.descuento.toLocaleString()}</div>` : ''}
          <div class="factura-row total">
            <span>Total:</span>
            <span>₡${invoice.total.toLocaleString()}</span>
          </div>
        </div>
        <div class="pagos-section">
          <h3>💳 Opciones de Pago Disponibles</h3>
          <div class="pago-grid">
            <div class="pago-card" onclick="navigator.clipboard.writeText('72952454'); UI.toast('📋 SINPE copiado', 'success')">
              <div class="pago-icon">📱</div>
              <div class="pago-info"><strong>SINPE Móvil</strong> <small>Toca para copiar</small></div>
            </div>
            <div class="pago-card" onclick="navigator.clipboard.writeText('CR76015114620010283743'); UI.toast(' IBAN copiado', 'success')">
              <div class="pago-icon">🏦</div>
              <div class="pago-info"><strong>Transferencia</strong> <small>Toca para copiar IBAN</small></div>
            </div>
            <div class="pago-card" onclick="UI.toast('📝 Pago contra entrega disponible', 'info')">
              <div class="pago-icon">🤝</div>
              <div class="pago-info"><strong>Efectivo</strong> <small>Contra entrega</small></div>
            </div>
          </div>
        </div>
        <button onclick="document.getElementById('modalFactura').remove()" class="btn-checkout">✅ Entendido, enviaré comprobante</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }
};

export default CartManager;