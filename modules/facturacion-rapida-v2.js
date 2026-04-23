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
    await this.cargarProductosLocales();
  },

  async cargarProductosLocales() {
    try {
      const archivos = [
        './data/productos_esentia.json',
        './data/productos_limpieza_completo.json',
        './data/catalogo-velas.json'
      ];

      this.productosCache = [];
      
      // Helper para limpiar objetos sucios de JSON
      const limpiar = (obj) => {
        const limpio = {};
        Object.keys(obj).forEach(k => {
          const key = k.trim();
          const val = typeof obj[k] === 'string' ? obj[k].trim() : obj[k];
          limpio[key] = val;
        });
        return limpio;
      };

      for (const archivo of archivos) {
        try {
          const res = await fetch(archivo);
          if (res.ok) {
            let data = await res.json();
            const lista = Array.isArray(data) ? data : [data];
            const limpios = lista.map(limpiar).filter(p => p.id && p.nombre);
            this.productosCache = [...this.productosCache, ...limpios];
          }
        } catch (e) { console.warn(`⚠️ Falló ${archivo}:`, e); }
      }

      if (this.productosCache.length === 0) {
        console.log('🔄 Sin productos locales, cargando desde Firebase...');
        await this.cargarProductosFirebase();
      }
      
      console.log(`📦 ${this.productosCache.length} productos listos.`);
    } catch (e) {
      console.error('❌ Error cargando catálogos:', e);
      UI.toast('Error cargando catálogo', 'error');
    }
  },

  async cargarProductosFirebase() {
    try {
      const snap = await getDocs(collection(DB.db, "productos"));
      this.productosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('⚠️ Firebase no disponible');
    }
  },

  async mostrarPanel() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    
    // ✅ IMPORTAR CARRITO PERSONAL (Mapeo seguro de estructura)
    this.carritoFactura = [];
    const personalCart = Store.get('carrito') || [];
    
    if (personalCart.length > 0) {
      const quiereImportar = confirm(`🛒 Tienes ${personalCart.length} productos en tu carrito.\n¿Deseas pasarlos a esta factura?`);
      
      if (quiereImportar) {
        this.carritoFactura = personalCart.map(item => ({
          id: item.id,
          nombre: item.nombre,
          variante: typeof item.variante === 'object' ? item.variante.nombre : (item.variante || 'Única'),
          precio: item.precio,
          cantidad: item.cantidad,
          subtotal: item.precio * item.cantidad,
          tipo: item.tipo || 'General',
          categoria: item.categoria || 'General'
        }));
        UI.toast('📦 Productos importados. Tu carrito personal se mantiene.', 'info');
      }
    }

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
              <h3>📦 Productos</h3>
              <div class="fr-filtros">
                <input type="text" id="frBuscarProducto" placeholder="🔍 Buscar producto...">
                <select id="frFiltroTipo">
                  <option value="">Todos</option>
                  <option value="Difusores">Difusores</option>
                  <option value="Aceites">Aceites</option>
                  <option value="Velas">Velas</option>
                  <option value="Limpieza">Limpieza</option>
                </select>
                <select id="frFiltroCategoria">
                  <option value="">Todas</option>
                  <option value="aromaterapia">Aromaterapia</option>
                  <option value="Detergentes">Detergentes</option>
                  <option value="hogar">Hogar</option>
                  <option value="higiene">Higiene</option>
                </select>
              </div>
              <div id="frListaProductos" class="fr-productos-grid">
                <div class="loading-state">Cargando productos...</div>
              </div>
            </div>
          </div>

          <div class="facturacion-right">
            <h3>🛒 Factura Actual</h3>
            <div id="frCarrito" class="fr-carrito">
              <p class="empty-carrito">Sin productos agregados</p>
            </div>
            
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
    this.attachEvents();
    this.renderProductos();
    this.renderCarrito(); // ✅ Renderiza inmediatamente lo importado
  },

  attachEvents() {
    document.getElementById('frBuscarCliente').addEventListener('input', 
      this.debounce(() => this.buscarCliente(), 300));
    document.getElementById('frNuevoCliente').onclick = () => this.nuevoCliente();
    document.getElementById('frBuscarProducto').addEventListener('input', () => this.renderProductos());
    document.getElementById('frFiltroTipo').onchange = () => this.renderProductos();
    document.getElementById('frFiltroCategoria').onchange = () => this.renderProductos();
    document.getElementById('frDescuento').oninput = () => this.calcularTotales();
    document.getElementById('frLimpiar').onclick = () => this.limpiarFactura();
    document.getElementById('frGuardarFactura').onclick = () => this.guardarFactura();
  },

  async buscarCliente() {
    const query = document.getElementById('frBuscarCliente').value.trim();
    if (query.length < 3) return;
    try {
      const snap = await getDocs(collection(DB.db, "clientesBD"));
      const clienteEncontrado = snap.docs.find(d => 
        d.id === query || d.data().nombre?.toLowerCase().includes(query.toLowerCase())
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
    container.innerHTML = `<strong>✅ ${this.clienteTemporal.nombre}</strong><br><small> ${this.clienteTemporal.cedula} | 📱 ${this.clienteTemporal.telefono || 'N/A'}</small>`;
  },

  // ✅ BÚSQUEDA INTELIGENTE (Parcial, sin acentos, tolerante a mayúsculas)
  renderProductos() {
    const busqueda = document.getElementById('frBuscarProducto').value
      .toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const tipoFiltro = document.getElementById('frFiltroTipo').value;
    const catFiltro = document.getElementById('frFiltroCategoria').value;

    let filtrados = this.productosCache.filter(p => {
      const nombreLimpio = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const tipoLimpio = (p.tipo || '').toLowerCase();
      const catLimpio = (p.categoria || '').toLowerCase();

      const coincideTexto = !busqueda || nombreLimpio.includes(busqueda) || (p.id || '').includes(busqueda);
      const coincideTipo = !tipoFiltro || tipoLimpio.includes(tipoFiltro.toLowerCase());
      const coincideCat = !catFiltro || catLimpio.includes(catFiltro.toLowerCase());
      const tieneStock = (p.stock || 0) > 0;

      return coincideTexto && coincideTipo && coincideCat && tieneStock;
    });

    const container = document.getElementById('frListaProductos');
    if (filtrados.length === 0) {
      container.innerHTML = busqueda ? '<p class="no-data">No hay coincidencias</p>' : '<p class="no-data">Cargando productos...</p>';
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
      const opciones = producto.variantes.map((v, i) => `${i + 1}. ${v.nombre} - ₡${v.precio.toLocaleString()}`).join('\n');
      const seleccion = prompt(`Seleccione variante:\n${opciones}`);
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
    if (cantidad > producto.stock) {
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
    if (this.carritoFactura.length === 0) {
      container.innerHTML = '<p class="empty-carrito">Sin productos agregados</p>';
      document.getElementById('frGuardarFactura').disabled = true;
    } else {
      container.innerHTML = this.carritoFactura.map((item, idx) => `
        <div class="fr-carrito-item">
          <div class="fr-item-info">
            <strong>${item.nombre}</strong>
            <small>${item.variante} × ${item.cantidad}</small>
          </div>
          <div class="fr-item-actions">
            <span>₡${item.subtotal.toLocaleString()}</span>
            <button onclick="FacturacionRapidaV2.eliminarDelCarrito(${idx})" class="btn-sm btn-danger">🗑️</button>
          </div>
        </div>
      `).join('');
      document.getElementById('frGuardarFactura').disabled = false;
    }
    this.calcularTotales();
  },

  eliminarDelCarrito(idx) { this.carritoFactura.splice(idx, 1); this.renderCarrito(); },

  calcularTotales() {
    const subtotal = this.carritoFactura.reduce((sum, i) => sum + i.subtotal, 0);
    const descuento = parseInt(document.getElementById('frDescuento').value) || 0;
    const total = Math.max(0, subtotal - descuento);
    document.getElementById('frSubtotal').textContent = `₡${subtotal.toLocaleString()}`;
    document.getElementById('frTotal').textContent = `₡${total.toLocaleString()}`;
    return { subtotal, descuento, total };
  },

  async guardarFactura() {
    if (!this.clienteTemporal) return UI.toast('❌ Debe seleccionar un cliente', 'warning');
    if (this.carritoFactura.length === 0) return UI.toast('❌ No hay productos', 'warning');

    const { subtotal, descuento, total } = this.calcularTotales();
    const facturaData = {
      fecha: new Date().toISOString(),
      clienteId: this.clienteTemporal.id,
      clienteNombre: this.clienteTemporal.nombre,
      productos: this.carritoFactura,
      subtotal, descuento, total,
      estado: 'completado', metodoPago: 'contado',
      tipoFactura: 'rapida', creadaPor: Store.get('cliente')?.nombre || 'admin'
    };

    try {
      await addDoc(collection(DB.db, "facturas_rapidas"), facturaData);
      for (const item of this.carritoFactura) {
        const prod = this.productosCache.find(p => p.id === item.id);
        if (prod) prod.stock -= item.cantidad;
      }
      UI.toast('✅ Factura guardada', 'success');
      this.limpiarFactura();
      if (confirm('¿Enviar factura por WhatsApp?')) this.enviarWhatsApp(facturaData);
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al guardar', 'error');
    }
  },

  enviarWhatsApp(factura) {
    let mensaje = `🧾 *FACTURA ESENTIA*\n👤 ${factura.clienteNombre}\n📅 ${new Date(factura.fecha).toLocaleDateString()}\n\n*Productos:*\n`;
    factura.productos.forEach(p => { mensaje += `• ${p.nombre} (${p.variante}) x${p.cantidad} - ₡${p.subtotal.toLocaleString()}\n`; });
    mensaje += `\n💰 *Total: ₡${factura.total.toLocaleString()}*\n\n¡Gracias! 🌸`;
    const telefono = this.clienteTemporal.telefono?.replace(/\D/g, '') || '';
    if (telefono.length >= 8) {
      const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    }
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