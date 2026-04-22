// modules/facturacion-rapida-v2.js
import { collection, addDoc, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
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
      
      for (const archivo of archivos) {
        try {
          const res = await fetch(archivo);
          if (res.ok) {
            const productos = await res.json();
            const activos = productos.filter(p => p.activo !== false);
            this.productosCache = [...this.productosCache, ...activos];
            console.log(`✅ Cargado: ${archivo} (${activos.length} productos activos)`);
          }
        } catch (e) {
          console.warn(`⚠️ No se pudo cargar ${archivo}:`, e);
        }
      }

      if (this.productosCache.length === 0) {
        console.log('🔄 Sin productos locales, cargando desde Firebase...');
        await this.cargarProductosFirebase();
      }
    } catch (e) {
      console.error('❌ Error cargando productos:', e);
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
    
    // 🔄 NUEVO: Verificar si hay carrito personal para importar
    const personalCart = Store.get('carrito') || [];
    if (personalCart.length > 0) {
      if (confirm(`🛒 Tienes ${personalCart.length} productos en tu carrito personal.\n\n¿Deseas importarlos a la factura de este cliente?`)) {
        this.carritoFactura = [...personalCart];
        Store.clearCart(); // Limpiar personal para evitar duplicados
        UI.toast('📦 Productos importados al carrito de factura', 'success');
      } else {
        this.carritoFactura = []; // Si dice que no, iniciar limpio
      }
    } else {
      this.carritoFactura = [];
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
    this.renderCarrito(); // Renderizar si importamos carrito
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

  renderProductos() {
    const busqueda = document.getElementById('frBuscarProducto').value.toLowerCase();
    const tipoFiltro = document.getElementById('frFiltroTipo').value;
    const catFiltro = document.getElementById('frFiltroCategoria').value;

    let filtrados = this.productosCache.filter(p => {
      const coincideBusqueda = !busqueda || p.nombre.toLowerCase().includes(busqueda);
      const coincideTipo = !tipoFiltro || p.tipo === tipoFiltro;
      const coincideCat = !catFiltro || p.categoria === catFiltro;
      const tieneStock = p.stock > 0;
      return coincideBusqueda && coincideTipo && coincideCat && tieneStock;
    });

    const container = document.getElementById('frListaProductos');
    if (filtrados.length === 0) {
      container.innerHTML = '<p class="no-data">No se encontraron productos</p>';
      return;
    }

    container.innerHTML = filtrados.map(p => `
      <div class="fr-producto-card" onclick="FacturacionRapidaV2.agregarAlCarrito('${p.id}')">
        <div class="fr-prod-nombre">${p.nombre}</div>
        <div class="fr-prod-tipo">${p.tipo} • ${p.categoria}</div>
        <div class="fr-prod-precio">₡${p.precio.toLocaleString()}</div>
        <div class="fr-prod-stock">Stock: ${p.stock}</div>
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
      // Actualizar stock local
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