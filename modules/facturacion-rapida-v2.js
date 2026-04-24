// modules/facturacion-rapida-v2.js
import { collection, addDoc, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';

export const FacturacionRapidaV2 = {
  productosCache: [],
  clienteTemporal: null,
  carritoFactura: [],

  async init() {
    console.log('🧾 Facturación Rápida v2.0 - Iniciando...');
    // No cargamos nada aquí, esperamos a que products.js llene el Store
  },

  // ✅ LECTURA DIRECTA DEL STORE GLOBAL (Sin cargar JSONs locales)
  prepararProductos() {
    const productosGlobales = Store.get('productos') || [];
    this.productosCache = productosGlobales;
    console.log(`🧾 Facturación lista con ${this.productosCache.length} productos globales.`);
  },

  async mostrarPanel() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    
    // 1. Cargar productos del Store global
    this.prepararProductos();

    // 2. Importar carrito personal si existe
    this.carritoFactura = [];
    const personalCart = Store.get('carrito') || [];
    if (personalCart.length > 0) {
      const quiere = confirm(`🛒 Tienes ${personalCart.length} productos en tu carrito personal.\n¿Deseas pasarlos a esta factura?`);
      if (quiere) {
        this.carritoFactura = personalCart.map(i => ({
          id: i.id || `temp_${Date.now()}`,
          nombre: i.nombre || 'Producto',
          variante: typeof i.variante === 'object' ? i.variante.nombre : (i.variante || 'Única'),
          precio: Number(i.precio) || 0,
          cantidad: Number(i.cantidad) || 1,
          subtotal: (Number(i.precio) || 0) * (Number(i.cantidad) || 1),
          tipo: i.tipo || 'General',
          categoria: i.categoria || 'General'
        }));
        UI.toast('📦 Productos importados', 'info');
      }
    }

    // 3. Renderizar Modal
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalFacturacionRapida';
    modal.innerHTML = `
      <div class="modal-content modal-xl facturacion-modal">
        <button class="modal-close" onclick="UI.modal('modalFacturacionRapida','close')">✕</button>
        <h2>🧾 Facturación Rápida v2.0</h2>
        
        <div class="facturacion-layout">
          <div class="facturacion-left">
            <div class="cliente-section">
              <h3>👤 Cliente</h3>
              <div class="cliente-search">
                <input type="text" id="frBuscarCliente" placeholder="🔍 Cédula o nombre...">
                <button id="frNuevoCliente" class="btn-secondary">➕ Nuevo</button>
              </div>
              <div id="frClienteInfo" class="cliente-info hidden"></div>
            </div>

            <div class="productos-section">
              <h3>📦 Productos (${this.productosCache.length})</h3>
              <button id="btnRecargarProductos" class="btn-secondary" style="margin-bottom: 10px; width: 100%;">🔄 Recargar Catálogo</button>
              
              <div class="fr-filtros">
                <input type="text" id="frBuscarProducto" placeholder="🔍 Buscar producto...">
                <select id="frFiltroTipo"><option value="">Todos</option></select>
                <select id="frFiltroCategoria"><option value="">Todas</option></select>
              </div>
              <div id="frListaProductos" class="fr-productos-grid">
                <div class="loading-state">Cargando catálogo...</div>
              </div>
            </div>
          </div>

          <div class="facturacion-right">
            <h3>🛒 Factura Actual</h3>
            <div id="frCarrito" class="fr-carrito"><p class="empty-carrito">Sin productos agregados</p></div>
            
            <div class="fr-totales">
              <div class="fr-row"><span>Subtotal:</span><span id="frSubtotal">₡0</span></div>
              <div class="fr-row"><span>Descuento:</span><input type="number" id="frDescuento" value="0" min="0" class="fr-input"></div>
              <div class="fr-row total"><span>Total:</span><span id="frTotal">₡0</span></div>
            </div>

            <div class="fr-actions">
              <button id="frGuardarFactura" class="btn-primary btn-large" disabled>💾 Guardar Factura</button>
              <button id="frLimpiar" class="btn-secondary">🗑️ Limpiar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.llenarFiltros();
    this.attachEvents();
    this.renderProductos();
    this.renderCarrito(); // Renderizar si importamos carrito
  },

  attachEvents() {
    document.getElementById('frBuscarCliente')?.addEventListener('input', this.debounce(() => this.buscarCliente(), 300));
    document.getElementById('frNuevoCliente')?.addEventListener('click', () => this.nuevoCliente());
    
    document.getElementById('frBuscarProducto')?.addEventListener('input', () => this.renderProductos());
    document.getElementById('frFiltroTipo')?.addEventListener('change', () => this.renderProductos());
    document.getElementById('frFiltroCategoria')?.addEventListener('change', () => this.renderProductos());
    
    document.getElementById('btnRecargarProductos')?.addEventListener('click', () => {
      this.prepararProductos();
      this.llenarFiltros();
      this.renderProductos();
      UI.toast('🔄 Catálogo recargado', 'info');
    });

    document.getElementById('frDescuento')?.addEventListener('input', () => this.calcularTotales());
    document.getElementById('frLimpiar')?.addEventListener('click', () => this.limpiarFactura());
    document.getElementById('frGuardarFactura')?.addEventListener('click', () => this.guardarFactura());
  },

  llenarFiltros() {
    const tipos = [...new Set(this.productosCache.map(p => p.tipo).filter(Boolean))].sort();
    const cats = [...new Set(this.productosCache.map(p => p.categoria).filter(Boolean))].sort();
    
    const selTipo = document.getElementById('frFiltroTipo');
    const selCat = document.getElementById('frFiltroCategoria');
    
    if(selTipo) {
        selTipo.innerHTML = '<option value="">Todos</option>';
        tipos.forEach(t => selTipo.innerHTML += `<option value="${t}">${t}</option>`);
    }
    if(selCat) {
        selCat.innerHTML = '<option value="">Todas</option>';
        cats.forEach(c => selCat.innerHTML += `<option value="${c}">${c}</option>`);
    }
  },

  async buscarCliente() {
    const query = document.getElementById('frBuscarCliente')?.value.trim();
    if (!query || query.length < 3) return;
    try {
      const snap = await getDocs(collection(DB.db, "clientesBD"));
      const clienteEncontrado = snap.docs.find(d => 
        d.id === query || (d.data().nombre && d.data().nombre.toLowerCase().includes(query.toLowerCase()))
      );
      if (clienteEncontrado) {
        this.clienteTemporal = { id: clienteEncontrado.id, ...clienteEncontrado.data() };
        this.mostrarClienteInfo();
      }
    } catch (e) { console.warn('Error buscando cliente:', e); }
  },

  nuevoCliente() {
    const cedula = prompt('Ingrese cédula del cliente:');
    if (!cedula) return;
    const nombre = prompt('Ingrese nombre del cliente:');
    if (!nombre) return;
    this.clienteTemporal = {
      id: cedula, cedula, nombre,
      telefono: prompt('Teléfono (opcional):') || '',
      email: prompt('Email (opcional):') || ''
    };
    this.mostrarClienteInfo();
  },

  mostrarClienteInfo() {
    const container = document.getElementById('frClienteInfo');
    container.classList.remove('hidden');
    container.innerHTML = `<strong>✅ ${this.clienteTemporal.nombre}</strong><br><small>${this.clienteTemporal.cedula} | 📱 ${this.clienteTemporal.telefono || 'N/A'}</small>`;
  },

  renderProductos() {
    const busqueda = (document.getElementById('frBuscarProducto')?.value || '').toLowerCase().trim();
    const tipoFiltro = document.getElementById('frFiltroTipo')?.value || '';
    const catFiltro = document.getElementById('frFiltroCategoria')?.value || '';
    const container = document.getElementById('frListaProductos');

    if (this.productosCache.length === 0) {
      container.innerHTML = '<p style="color:red; text-align:center;">⚠️ No hay productos cargados en el sistema.</p>';
      return;
    }

    const filtrados = this.productosCache.filter(p => {
      const nombre = (p.nombre || '').toLowerCase();
      const categoria = (p.categoria || '').toLowerCase();
      const tipo = (p.tipo || '').toLowerCase();
      
      const coincideTexto = !busqueda || nombre.includes(busqueda) || categoria.includes(busqueda);
      const coincideTipo = !tipoFiltro || tipo === tipoFiltro.toLowerCase();
      const coincideCat = !catFiltro || categoria === catFiltro.toLowerCase();
      
      return coincideTexto && coincideTipo && coincideCat;
    });

    if (filtrados.length === 0) {
      container.innerHTML = '<p class="no-data">No se encontraron productos.</p>';
      return;
    }

    container.innerHTML = filtrados.map(p => `
      <div class="fr-producto-card" onclick="FacturacionRapidaV2.agregarAlCarrito('${p.id}')">
        <div class="fr-prod-nombre">${p.nombre}</div>
        <div class="fr-prod-tipo">${p.tipo} • ${p.categoria || 'General'}</div>
        <div class="fr-prod-precio">₡${(p.precio || 0).toLocaleString()}</div>
        <div class="fr-prod-stock">Stock: ${p.stock || 0}</div>
        ${p.variantes?.length > 1 ? `<small class="fr-prod-variantes">${p.variantes.length} opciones</small>` : ''}
      </div>
    `).join('');
  },

  agregarAlCarrito(productId) {
    const producto = this.productosCache.find(p => p.id === productId);
    if (!producto) return;

    if (producto.variantes && producto.variantes.length > 1) {
      const opciones = producto.variantes.map((v, i) => `${i + 1}. ${v.nombre} - ₡${v.precio}`).join('\n');
      const seleccion = prompt(`Seleccione variante para ${producto.nombre}:\n${opciones}`);
      if (!seleccion) return;
      const idx = parseInt(seleccion) - 1;
      if (idx >= 0 && idx < producto.variantes.length) {
        this.agregarItem(producto, producto.variantes[idx]);
      }
    } else {
      const variante = producto.variantes?.[0] || { nombre: 'Única', precio: producto.precio };
      this.agregarItem(producto, variante);
    }
  },

  agregarItem(producto, variante) {
    const cantidad = parseInt(prompt(`Cantidad para ${producto.nombre}:`, '1')) || 1;
    if (cantidad > (producto.stock || 0)) {
      UI.toast(`Stock insuficiente. Disponible: ${producto.stock}`, 'warning');
      return;
    }
    const existing = this.carritoFactura.find(i => i.id === producto.id && i.variante === variante.nombre);
    if (existing) {
      existing.cantidad += cantidad;
    } else {
      this.carritoFactura.push({
        id: producto.id, nombre: producto.nombre, variante: variante.nombre,
        precio: variante.precio, cantidad, subtotal: variante.precio * cantidad,
        categoria: producto.categoria, tipo: producto.tipo
      });
    }
    this.renderCarrito();
  },

  renderCarrito() {
    const container = document.getElementById('frCarrito');
    const btnGuardar = document.getElementById('frGuardarFactura');
    
    if (this.carritoFactura.length === 0) {
      container.innerHTML = '<p class="empty-carrito">Sin productos agregados</p>';
      if (btnGuardar) btnGuardar.disabled = true;
    } else {
      container.innerHTML = this.carritoFactura.map((item, idx) => `
        <div class="fr-carrito-item">
          <div class="fr-item-info">
            <strong>${item.nombre || 'Producto'}</strong>
            <small>${item.variante || 'Única'} × ${Number(item.cantidad)||1}</small>
          </div>
          <div class="fr-item-actions">
            <span>₡${(Number(item.subtotal) || 0).toLocaleString()}</span>
            <button onclick="FacturacionRapidaV2.eliminarDelCarrito(${idx})" class="btn-sm btn-danger">🗑️</button>
          </div>
        </div>
      `).join('');
      if (btnGuardar) btnGuardar.disabled = false;
    }
    this.calcularTotales();
  },

  eliminarDelCarrito(idx) { this.carritoFactura.splice(idx, 1); this.renderCarrito(); },

  calcularTotales() {
    const subtotal = this.carritoFactura.reduce((sum, i) => sum + i.subtotal, 0);
    const descuento = parseInt(document.getElementById('frDescuento')?.value) || 0;
    const total = Math.max(0, subtotal - descuento);
    document.getElementById('frSubtotal').textContent = `₡${subtotal.toLocaleString()}`;
    document.getElementById('frTotal').textContent = `₡${total.toLocaleString()}`;
    return { subtotal, descuento, total };
  },

  async guardarFactura() {
    if (!this.clienteTemporal) return UI.toast('⚠️ Debe seleccionar un cliente', 'warning');
    if (this.carritoFactura.length === 0) return UI.toast('❌ No hay productos', 'warning');

    const { subtotal, descuento, total } = this.calcularTotales();
    
    // Accesos seguros
    const nombreCliente = this.clienteTemporal.nombre || 'Cliente';
    const idCliente = this.clienteTemporal.id || this.clienteTemporal.cedula || 'temp';
    const telefonoCliente = this.clienteTemporal.telefono || '';

    const facturaData = {
      fecha: new Date().toISOString(),
      clienteId: idCliente,
      clienteNombre: nombreCliente,
      productos: this.carritoFactura,
      subtotal, descuento, total,
      estado: 'completado', metodoPago: 'contado',
      tipoFactura: 'rapida', creadaPor: Store.get('cliente')?.nombre || 'admin'
    };

    try {
      await addDoc(collection(DB.db, "facturas_rapidas"), facturaData);
      
      // Actualizar stock local
      for (const item of this.carritoFactura) {
        const prod = this.productosCache.find(p => p.id === item.id);
        if (prod) prod.stock -= item.cantidad;
      }
      
      UI.toast('✅ Factura guardada', 'success');
      
      if (telefonoCliente && confirm('¿Enviar factura por WhatsApp?')) {
        this.enviarWhatsApp({ ...facturaData, telefono: telefonoCliente });
      }
      
      this.limpiarFactura();
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al guardar', 'error');
    }
  },

  enviarWhatsApp(factura) {
    const telefono = factura.telefono?.replace(/\D/g, '') || '';
    if (!telefono || telefono.length < 8) {
        UI.toast('⚠️ No hay teléfono válido para enviar', 'warning');
        return;
    }
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;

    let mensaje = `🧾 *FACTURA ESENTIA*\n👤 ${factura.clienteNombre}\n📅 ${new Date(factura.fecha).toLocaleDateString()}\n\n*Productos:*\n`;
    factura.productos.forEach(p => { mensaje += `• ${p.nombre} (${p.variante}) x${p.cantidad} - ₡${p.subtotal.toLocaleString()}\n`; });
    mensaje += `\n💰 *Total: ₡${factura.total.toLocaleString()}*\n\n¡Gracias! 🌸`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
  },

  limpiarFactura() {
    this.carritoFactura = [];
    this.clienteTemporal = null;
    document.getElementById('frBuscarCliente').value = '';
    document.getElementById('frClienteInfo').classList.add('hidden');
    document.getElementById('frDescuento').value = 0;
    this.renderCarrito();
  },

  debounce(fn, ms) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), ms); };
  }
};

export default FacturacionRapidaV2;