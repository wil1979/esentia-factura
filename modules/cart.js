// modules/cart.js
import { Store } from './core.js';
import { DB } from './firebase.js';

const CartManager = {
  init() {
    Store.restore('carrito');
    Store.on('cart:updated', () => this.updateUI());
  },

  // ✅ CORREGIDO: Evitar doble descuento
  add(product, variant = null) {
  const stock = Store.get('inventario')[product.nombre] || 0;
  const inCart = Store.get('carrito').find(i => String(i.id) === String(product.id) && i.variante === (variant?.nombre || '30ml'));
  
  if (inCart && inCart.cantidad >= stock) {
    Store.emit('toast', { message: 'Stock insuficiente', type: 'warning' });
    return false;
  }

  // ✅ El precio YA viene calculado desde product-card.js
  // NO recalcular descuento aquí para evitar duplicación
  const precioFinal = variant?.precio || product.precio;
  const precioBase = variant?.precioOriginal || product.precio;
  const descuentoPromo = variant?.descuentoPromo || product.descuentoPromo || 0;
  
  // Calcular descuento solo para mostrar (ya está aplicado en precioFinal)
  const descuentoAplicado = descuentoPromo > 0 ? (precioBase - precioFinal) : 0;

  Store.addToCart({
    id: product.id,
    nombre: product.nombre,
    imagen: product.imagen,
    precio: precioFinal,           // ✅ Precio final (ya con descuento si aplica)
    precioOriginal: precioBase,    // ✅ Precio base (sin descuento)
    descuentoAplicado: descuentoAplicado,
    descuentoPorcentaje: descuentoPromo,
    variante: variant?.nombre || '30ml',
    cantidad: 1,
    tienePromo: descuentoPromo > 0  // ✅ Flag para saber si ya tiene descuento
  });

  Store.emit('toast', { 
    message: descuentoAplicado > 0 
      ? `✓ Agregado (-${descuentoPromo}% promo)` 
      : '✓ Agregado al carrito', 
    type: 'success' 
  });
  return true;
},

  remove(id) {
    Store.removeFromCart(id);
    Store.emit('toast', { message: 'Producto eliminado', type: 'info' });
  },

  updateQuantity(id, quantity) {
    if (quantity < 1) { this.remove(id); return; }
    const item = Store.get('carrito').find(i => String(i.id) === String(id));
    if (item) {
      item.cantidad = quantity;
      Store.emit('cart:updated', Store.get('carrito'));
      Store.persist('carrito');
    }
  },

  clear() { Store.clearCart(); },
  
  getTotal() { 
    return Store.get('carrito').reduce((sum, item) => sum + (item.precio * item.cantidad), 0); 
  },
  
  getCount() { 
    return Store.get('carrito').reduce((sum, item) => sum + item.cantidad, 0); 
  },

  // ✅ Verificar si hay productos con promo
  hasPromoProducts() {
    return Store.get('carrito').some(item => item.tienePromo === true);
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

  async checkout(promoCode = null) {
    const cliente = Store.get('cliente');
    if (!cliente) { Store.emit('auth:required'); return false; }
    const items = Store.get('carrito');
    if (items.length === 0) return false;

    let total = this.getTotal();
    let discount = 0;

    // ✅ NO aplicar código promo si hay productos con descuento
    if (promoCode && !this.hasPromoProducts()) {
      const validation = await DB.validatePromo(promoCode, cliente.id);
      if (validation.valid) {
        const promo = validation.promo;
        discount = promo.tipo === 'porcentaje' 
          ? Math.round(total * promo.valor / 100)
          : promo.valor;
        total -= discount;
        await DB.usePromo(validation.promo.id, cliente.id);
      }
    } else if (this.hasPromoProducts()) {
      Store.emit('toast', { message: '⚠️ No se pueden combinar descuentos', type: 'warning' });
    }

    const invoiceData = {
      fecha: new Date().toISOString(),
      productos: items,
      total,
      descuento: discount,
      metodoPago: 'WhatsApp',
      tipoPago: 'credito',
      monto: total,
      pagado: 0,
      saldo: total
    };

    await DB.addInvoice(cliente.id, invoiceData);
    this.showReceiptModal(invoiceData, cliente, promoCode);
    window.open(`https://wa.me/50672952454?text=${encodeURIComponent(this.generateWhatsAppMessage(items, total, discount, cliente, promoCode))}`, '_blank');
    this.clear();
    return true;
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
          <p><strong>Estado:</strong> <span class="badge badge-pendiente">⏳ Pendiente (WhatsApp)</span></p>
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
          <div class="factura-row total"><span>Total:</span><span>₡${invoice.total.toLocaleString()}</span></div>
        </div>
        <div class="pagos-section">
          <h3>💳 Opciones de Pago Disponibles</h3>
          <div class="pago-grid">
            <div class="pago-card" onclick="navigator.clipboard.writeText('72952454'); UI.toast('📋 SINPE copiado', 'success')">
              <div class="pago-icon">📱</div><div class="pago-info"><strong>SINPE Móvil</strong><small>Toca para copiar</small></div>
            </div>
            <div class="pago-card" onclick="navigator.clipboard.writeText('CR76015114620010283743'); UI.toast('📋 IBAN copiado', 'success')">
              <div class="pago-icon">🏦</div><div class="pago-info"><strong>Transferencia</strong><small>Toca para copiar IBAN</small></div>
            </div>
            <div class="pago-card" onclick="UI.toast('📝 Pago contra entrega disponible', 'info')">
              <div class="pago-icon">🤝</div><div class="pago-info"><strong>Efectivo</strong><small>Contra entrega</small></div>
            </div>
          </div>
        </div>
        <button onclick="document.getElementById('modalFactura').remove()" class="btn-checkout">✅ Entendido, enviaré comprobante</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  },

  generateWhatsAppMessage(items, total, discount, cliente, promoCode) {
    let msg = `Hola Wilber 👋\n\nQuiero confirmar mi pedido:\n\n`;
    items.forEach(item => {
      msg += `• ${item.nombre} (${item.variante}) × ${item.cantidad} – ₡${(item.precio * item.cantidad).toLocaleString()}\n`;
    });
    if (discount > 0) msg += `\n🎁 Promo: ${promoCode}\nDescuento: -₡${discount.toLocaleString()}`;
    msg += `\n\n*💰 Total: ₡${total.toLocaleString()}*\n👤 Cliente: ${cliente.nombre}\n📱 Tel: ${cliente.telefono || 'No registrado'}`;
    return msg;
  }
};

export default CartManager;