// modules/facturacion-rapida-v2.js
import { collection, addDoc, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';
import { CobrosManager } from './cobros.js';

export const FacturacionRapidaV2 = {
  productosCache: [],
  clientesCache: [],
  clienteTemporal: null,
  carritoFactura: [],

  async init() {
    console.log('🧾 Facturación Rápida v2.0 - Iniciando...');
    await this.cargarClientes();
  },

  async cargarClientes() {
    try {
      const snap = await getDocs(collection(DB.db, "clientesBD"));
      this.clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      console.log(`✅ ${this.clientesCache.length} clientes cargados`);
    } catch (e) {
      console.warn('⚠️ Error cargando clientes:', e);
      this.clientesCache = [];
    }
  },

  prepararProductos() {
    const productosGlobales = Store.get('productos') || [];
    this.productosCache = productosGlobales;
    console.log(`🧾 Facturación lista con ${this.productosCache.length} productos globales.`);
    const contadorEl = document.getElementById('contadorProductos');
    if (contadorEl) contadorEl.textContent = this.productosCache.length;
  },

  async mostrarPanel() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }

    // ✅ 1. LIMPIEZA PREVENTIVA (Esto soluciona el problema)
  const existingModal = document.getElementById('modalFacturacionRapida');
  if (existingModal) {
    existingModal.remove(); // Borra el modal viejo por completo
  }

    this.prepararProductos();
    await this.cargarClientes(); // ✅ Recargar clientes cada vez que se abre

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

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalFacturacionRapida';
    modal.innerHTML = `
      <div class="modal-content modal-xl facturacion-modal">
        <button class="modal-close" onclick="UI.modal('modalFacturacionRapida','close')">✕</button>
        <h2>🧾 Facturación Rápida v2.0</h2>
        
        <div class="facturacion-layout">
          <div class="facturacion-left">
            <!-- Sección Cliente MEJORADA -->
            <div class="cliente-section">
              <h3>👤 Cliente</h3>
              <div class="cliente-search">
                <input type="text" id="frBuscarCliente" placeholder="🔍 Buscar cliente..." readonly onclick="FacturacionRapidaV2.mostrarModalClientes()">
                <button id="btnSeleccionarCliente" class="btn-primary" onclick="FacturacionRapidaV2.mostrarModalClientes()">👥 Seleccionar</button>
                <button id="frNuevoCliente" class="btn-secondary">➕ Nuevo</button>
              </div>
              <div id="frClienteInfo" class="cliente-info hidden"></div>
            </div>

            <!-- Sección Productos -->
            <div class="productos-section">
              <h3>📦 Catálogo (<span id="contadorProductos">${this.productosCache.length}</span>)</h3>
              
              <button id="btnRecargarProductos" class="btn-secondary" style="margin: 5px 0; width: 100%; font-size: 0.8rem;">
                🔄 Actualizar Catálogo
              </button>

              <div class="fr-buscador-principal">
                <input type="text" id="frBuscarProducto" placeholder="🔍 Escribe para buscar (ej: detergente, vela, difusor)...">
              </div>
              
              <div id="frListaProductos" class="fr-productos-grid">
                <div class="fr-empty-state">
                  <span class="empty-icon">📦</span>
                  <p>Escribe arriba para buscar productos</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel Derecho: Carrito -->
          <div class="facturacion-right">
            <h3>🛒 Factura Actual</h3>
            <div id="frCarrito" class="fr-carrito"><p class="empty-carrito">Sin productos agregados</p></div>
            
            <div class="fr-totales">
              <div class="fr-row"><span>Subtotal:</span><span id="frSubtotal">₡0</span></div>
              <div class="fr-row"><span>Descuento:</span><input type="number" id="frDescuento" value="0" min="0" class="fr-input"></div>
              
              <div class="fr-row" style="flex-direction:column; align-items:flex-start; margin-top:10px;">
                <label style="font-size:0.9rem;"><strong>Método de Pago:</strong></label>
                <select id="frMetodoPago" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd;">
                  <option value="contado">💵 Contado</option>
                  <option value="credito">💳 Crédito (15 días)</option>
                </select>
              </div>

              <div class="fr-row total"><span>Total:</span><span id="frTotal">₡0</span></div>
            </div>

            <div class="fr-actions">
              <button id="frGuardarFactura" class="btn-primary btn-large" disabled>💾 Guardar</button>
              <button id="frLimpiar" class="btn-secondary">🗑️ Limpiar</button>
              <!-- ✅ NUEVO: Botón para Nueva Factura -->
              <button id="frNuevaFactura" class="btn-success" style="display:none;">🔄 Nueva Factura</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachEvents();
    this.renderProductos();
    this.renderCarrito();
    
    setTimeout(() => document.getElementById('frBuscarProducto')?.focus(), 300);
  },

  // ✅ MODAL DE SELECCIÓN DE CLIENTES
  async mostrarModalClientes() {
    // ✅ Cerrar modal de facturación temporalmente para evitar superposición
    const modalFactura = document.getElementById('modalFacturacionRapida');
    if (modalFactura) modalFactura.style.display = 'none';

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalSeleccionCliente';
    modal.innerHTML = `
      <div class="modal-content modal-grande">
        <button class="modal-close" onclick="FacturacionRapidaV2.cerrarModalClientes()">✕</button>
        <h2>👥 Seleccionar Cliente</h2>
        
        <div class="cliente-buscador">
          <input type="text" id="buscarClienteModal" placeholder="🔍 Buscar por nombre, cédula o teléfono..." autofocus>
        </div>

        <div id="listaClientesModal" class="clientes-lista">
          <div class="loading-state">🔄 Cargando clientes...</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // ✅ Recargar clientes frescos al abrir el modal
    await this.cargarClientes();
    this.renderListaClientes(this.clientesCache);
    
    // Búsqueda en tiempo real
    document.getElementById('buscarClienteModal').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtrados = this.clientesCache.filter(c => 
        (c.nombre && c.nombre.toLowerCase().includes(query)) ||
        (c.cedula && c.cedula.includes(query)) ||
        (c.telefono && c.telefono.includes(query))
      );
      this.renderListaClientes(filtrados);
    });

    // Foco automático
    setTimeout(() => document.getElementById('buscarClienteModal')?.focus(), 100);
  },

  // ✅ Función para cerrar modal de clientes y volver a facturación
  cerrarModalClientes() {
    UI.modal('modalSeleccionCliente', 'close');
    const modalFactura = document.getElementById('modalFacturacionRapida');
    if (modalFactura) modalFactura.style.display = 'flex';
  },

  renderListaClientes(clientes) {
    const container = document.getElementById('listaClientesModal');
    
    if (clientes.length === 0) {
      container.innerHTML = '<p class="no-data">No se encontraron clientes</p>';
      return;
    }

    container.innerHTML = clientes.map(c => `
      <div class="cliente-item" onclick="FacturacionRapidaV2.seleccionarCliente('${c.id}')">
        <div class="cliente-item-info">
          <strong>👤 ${c.nombre || 'Sin nombre'}</strong>
          <small>🆔 ${c.cedula || 'N/A'} | 📱 ${c.telefono || 'N/A'}</small>
        </div>
        <button class="btn-select-cliente">Seleccionar</button>
      </div>
    `).join('');
  },

  seleccionarCliente(clienteId) {
    const cliente = this.clientesCache.find(c => c.id === clienteId);
    if (!cliente) return;

    this.clienteTemporal = {
      id: cliente.id,
      cedula: cliente.cedula,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email
    };

    this.mostrarClienteInfo();
    this.cerrarModalClientes(); // ✅ Volver al modal de facturación
    UI.toast(`✅ Cliente seleccionado: ${cliente.nombre}`, 'success');
  },

  attachEvents() {
    document.getElementById('frNuevoCliente')?.addEventListener('click', () => this.nuevoCliente());
    document.getElementById('frBuscarProducto')?.addEventListener('input', () => this.renderProductos());

    document.getElementById('btnRecargarProductos')?.addEventListener('click', () => {
      this.prepararProductos();
      this.renderProductos();
      UI.toast('🔄 Catálogo actualizado', 'info');
    });

    document.getElementById('frDescuento')?.addEventListener('input', () => this.calcularTotales());
    document.getElementById('frLimpiar')?.addEventListener('click', () => this.limpiarFactura());
    document.getElementById('frGuardarFactura')?.addEventListener('click', () => this.guardarFactura());
    
    // ✅ NUEVO: Botón para Nueva Factura (mantiene modal abierto)
    document.getElementById('frNuevaFactura')?.addEventListener('click', () => {
      this.prepararNuevaFactura();
    });
  },

  async buscarCliente() {
    // Esta función ahora se usa desde el modal
  },

  nuevoCliente() {
    const cedula = prompt('Ingrese cédula del cliente:');
    if (!cedula) return;
    const nombre = prompt('Ingrese nombre del cliente:');
    if (!nombre) return;
    
    const clienteData = {
      id: cedula,
      cedula: cedula,
      nombre: nombre,
      telefono: prompt('Teléfono (opcional):') || '',
      email: prompt('Email (opcional):') || '',
      fechaRegistro: new Date().toISOString()
    };

    import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js')
      .then(async ({ doc, setDoc }) => {
        try {
          await setDoc(doc(DB.db, "clientesBD", cedula), clienteData);
          this.clientesCache.push(clienteData);
          this.clienteTemporal = clienteData;
          this.mostrarClienteInfo();
          UI.toast('✅ Cliente creado exitosamente', 'success');
        } catch (e) {
          console.error(e);
          UI.toast('❌ Error al crear cliente', 'error');
        }
      });
  },

  mostrarClienteInfo() {
    const container = document.getElementById('frClienteInfo');
    if (!container || !this.clienteTemporal) return;
    
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="cliente-seleccionado">
        <strong>✅ ${this.clienteTemporal.nombre}</strong><br>
        <small>🆔 ${this.clienteTemporal.cedula} | 📱 ${this.clienteTemporal.telefono || 'N/A'}</small>
        <button class="btn-cambiar-cliente" onclick="FacturacionRapidaV2.limpiarCliente()">🔄 Cambiar</button>
      </div>
    `;
  },

  limpiarCliente() {
    this.clienteTemporal = null;
    const container = document.getElementById('frClienteInfo');
    if (container) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  },

  renderProductos() {
    const busqueda = (document.getElementById('frBuscarProducto')?.value || '').toLowerCase().trim();
    const container = document.getElementById('frListaProductos');

    if (this.productosCache.length === 0) {
      container.innerHTML = '<p class="fr-sin-resultados">⚠️ Cargando catálogo...</p>';
      return;
    }

    if (!busqueda) {
      container.innerHTML = `
        <div class="fr-empty-state">
          <span class="empty-icon">🔍</span>
          <p>Escribe para buscar productos</p>
        </div>
      `;
      const contadorEl = document.getElementById('contadorProductos');
      if (contadorEl) contadorEl.textContent = `${this.productosCache.length} disponibles`;
      return;
    }

    let filtrados = this.productosCache.filter(p => {
      const nombre = String(p.nombre || '').toLowerCase();
      const categoria = String(p.categoria || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      return nombre.includes(busqueda) || categoria.includes(busqueda) || id.includes(busqueda);
    });

    if (filtrados.length > 50) filtrados = filtrados.slice(0, 50);

    if (filtrados.length === 0) {
      container.innerHTML = `<div class="fr-sin-resultados">🔍 No se encontraron productos<br><small>Intenta otra palabra</small></div>`;
      return;
    }

    container.innerHTML = filtrados.map(p => `
      <div class="fr-producto-card" data-product-id="${p.id}">
        <div class="fr-prod-nombre" title="${p.nombre}">${p.nombre}</div>
        <div class="fr-prod-tipo">${p.categoria || 'General'}</div>
        <div class="fr-prod-precio">₡${(p.precio || 0).toLocaleString()}</div>
        ${p.variantes?.length > 1 ? `<span class="fr-prod-variantes">${p.variantes.length} opc.</span>` : ''}
      </div>
    `).join('');

    container.querySelectorAll('.fr-producto-card').forEach(card => {
      card.addEventListener('click', () => {
        const productId = card.dataset.productId;
        FacturacionRapidaV2.agregarAlCarrito(productId);
      });
    });

    const contadorEl = document.getElementById('contadorProductos');
    if (contadorEl) contadorEl.textContent = `${filtrados.length} encontrados`;
  },

  agregarAlCarrito(productId) {
    const producto = this.productosCache.find(p => String(p.id) === String(productId));
    if (!producto) return UI.toast('Producto no encontrado', 'error');

    const variantes = producto.variantes || [];
    if (variantes.length > 1) {
      const opciones = variantes.map((v, i) => `${i + 1}. ${v.nombre} - ₡${v.precio}`).join('\n');
      const seleccion = prompt(`Seleccione variante para ${producto.nombre}:\n${opciones}`);
      if (!seleccion) return;
      const idx = parseInt(seleccion) - 1;
      if (idx >= 0 && idx < variantes.length) {
        this.agregarItem(producto, variantes[idx]);
      }
    } else {
      const variante = variantes[0] || { nombre: 'Única', precio: producto.precio };
      this.agregarItem(producto, variante);
    }
  },

  agregarItem(producto, variante) {
    const cantidad = parseInt(prompt(`Cantidad para ${producto.nombre}:`, '1')) || 1;
    const stockDisponible = producto.stock || 0;
    if (stockDisponible > 0 && cantidad > stockDisponible) {
      UI.toast(`⚠️ Stock bajo: solo hay ${stockDisponible}`, 'warning');
    }

    const existing = this.carritoFactura.find(i => i.id === producto.id && i.variante === variante.nombre);
    if (existing) {
      existing.cantidad += cantidad;
    } else {
      this.carritoFactura.push({
        id: producto.id,
        nombre: producto.nombre,
        variante: variante.nombre,
        precio: variante.precio,
        cantidad,
        subtotal: variante.precio * cantidad,
        categoria: producto.categoria,
        tipo: producto.tipo
      });
    }
    this.renderCarrito();
  },

  renderCarrito() {
    const container = document.getElementById('frCarrito');
    const btnGuardar = document.getElementById('frGuardarFactura');
    const btnNueva = document.getElementById('frNuevaFactura');

    if (this.carritoFactura.length === 0) {
      container.innerHTML = '<p class="empty-carrito">Sin productos agregados</p>';
      if (btnGuardar) btnGuardar.disabled = true;
      if (btnNueva) btnNueva.style.display = 'none';
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
      if (btnNueva) btnNueva.style.display = 'inline-block';
    }
    this.calcularTotales();
  },

  eliminarDelCarrito(idx) {
    this.carritoFactura.splice(idx, 1);
    this.renderCarrito();
  },

  calcularTotales() {
    const subtotal = this.carritoFactura.reduce((sum, i) => sum + i.subtotal, 0);
    const descuento = parseInt(document.getElementById('frDescuento')?.value) || 0;
    const total = Math.max(0, subtotal - descuento);
    document.getElementById('frSubtotal').textContent = `₡${subtotal.toLocaleString()}`;
    document.getElementById('frTotal').textContent = `₡${total.toLocaleString()}`;
    return { subtotal, descuento, total };
  },

  // ✅ FUNCIÓN NUEVA: Preparar para nueva factura (mantiene modal abierto)
  prepararNuevaFactura() {
    this.carritoFactura = [];
    this.clienteTemporal = null;
    
    // Limpiar UI
    document.getElementById('frBuscarCliente').value = '';
    document.getElementById('frClienteInfo').classList.add('hidden');
    document.getElementById('frClienteInfo').innerHTML = '';
    document.getElementById('frDescuento').value = 0;
    document.getElementById('frMetodoPago').value = 'contado';
    
    // Resetear botones
    const btnGuardar = document.getElementById('frGuardarFactura');
    const btnNueva = document.getElementById('frNuevaFactura');
    if (btnGuardar) {
      btnGuardar.disabled = true;
      btnGuardar.style.display = 'inline-block';
    }
    if (btnNueva) btnNueva.style.display = 'none';
    
    this.renderCarrito();
    UI.toast('🔄 Lista para nueva factura', 'info');
    
    // Foco en búsqueda de cliente
    setTimeout(() => document.getElementById('frBuscarCliente')?.focus(), 100);
  },

  async guardarFactura() {
    if (!this.clienteTemporal) return UI.toast('⚠️ Seleccione un cliente', 'warning');
    if (this.carritoFactura.length === 0) return UI.toast('❌ Agregue productos', 'warning');

    // ✅ VALIDAR CRÉDITO ANTES DE GUARDAR
if (metodoPago === 'credito') {
  const validacion = await CobrosManager.puedeFacturarACredito(idCliente);
  if (!validacion.ok) {
    UI.toast(validacion.message, 'warning');
    btn.disabled = false;
    btn.textContent = '💾 Guardar';
    return;
  }
}

    const { subtotal, descuento, total } = this.calcularTotales();
    const subtotalNum = Number(subtotal) || 0;
    const descuentoNum = Number(descuento) || 0;
    const totalNum = Number(total) || 0;

    const metodoPago = document.getElementById('frMetodoPago')?.value || 'contado';
    const estadoFactura = metodoPago === 'credito' ? 'pendiente' : 'completado';

    const idCliente = String(this.clienteTemporal.id || this.clienteTemporal.cedula || 'temp').trim();
    const nombreCliente = String(this.clienteTemporal.nombre || 'Cliente').trim();
    const telefonoCliente = String(this.clienteTemporal.telefono || '').trim();

    const productosSanitizados = this.carritoFactura.map(item => ({
      id: String(item.id || ''),
      nombre: String(item.nombre || 'Producto'),
      variante: String(item.variante || 'Única'),
      precio: Number(item.precio) || 0,
      cantidad: Number(item.cantidad) || 1,
      subtotal: Number(item.subtotal) || 0,
      categoria: String(item.categoria || 'General'),
      tipo: String(item.tipo || 'General')
    }));

    const facturaData = {
      fecha: new Date().toISOString(),
      clienteId: idCliente,
      clienteNombre: nombreCliente,
      clienteTelefono: telefonoCliente,
      productos: productosSanitizados,
      subtotal: subtotalNum,
      descuento: descuentoNum,
      total: totalNum,
      estado: estadoFactura,
      metodoPago,
      tipoFactura: 'rapida',
      creadaPor: String(Store.get('cliente')?.nombre || 'admin'),
      fechaVencimiento: metodoPago === 'credito' 
        ? new Date(Date.now() + 15*24*60*60*1000).toISOString() 
        : null
    };

    console.log('🔍 Datos a guardar:', facturaData);
    const camposInvalidos = Object.entries(facturaData).filter(([k, v]) => v === undefined);
    if (camposInvalidos.length > 0) {
      console.error('❌ Campos undefined:', camposInvalidos);
      return UI.toast('⚠️ Error interno: datos inválidos', 'error');
    }

    try {
      await addDoc(collection(DB.db, "facturas_rapidas"), facturaData);
      
      for (const item of this.carritoFactura) {
        const prod = this.productosCache.find(p => p.id === item.id);
        if (prod) prod.stock = Math.max(0, (prod.stock || 0) - item.cantidad);
      }

      if (metodoPago === 'credito') {
        await this.actualizarSaldoCliente(idCliente, totalNum);
      }

      UI.toast(`✅ Factura guardada (${metodoPago.toUpperCase()})`, 'success');
      
      if (telefonoCliente && confirm('¿Enviar por WhatsApp?')) {
        this.enviarWhatsApp({ ...facturaData, telefono: telefonoCliente });
      }
      
      // ✅ CAMBIO: En lugar de limpiarFactura(), usar prepararNuevaFactura()
      this.prepararNuevaFactura();
      
    } catch (e) {
      console.error('❌ Error al guardar:', e);
      UI.toast('❌ Error: ' + e.message, 'error');
    }
  },

  async actualizarSaldoCliente(clienteId, monto) {
    try {
      const clienteRef = doc(DB.db, "clientesBD", clienteId);
      const clienteSnap = await getDoc(clienteRef);
      let saldoActual = 0;
      if (clienteSnap.exists()) saldoActual = clienteSnap.data().saldoPendiente || 0;
      
      await updateDoc(clienteRef, {
        saldoPendiente: saldoActual + monto,
        ultimoCredito: new Date().toISOString()
      });
      console.log(`💳 Saldo de ${clienteId} actualizado: ₡${(saldoActual + monto).toLocaleString()}`);
    } catch (e) { console.warn('No se actualizó saldo:', e); }
  },

  enviarWhatsApp(factura) {
    const telefono = factura.telefono?.replace(/\D/g, '') || '';
    if (!telefono || telefono.length < 8) return UI.toast('⚠️ Teléfono inválido', 'warning');
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;
    
    let mensaje = `🧾 *FACTURA ESENTIA*\n👤 ${factura.clienteNombre}\n📅 ${new Date(factura.fecha).toLocaleDateString()}\n\n*Productos:*\n`;
    factura.productos.forEach(p => { mensaje += `• ${p.nombre} (${p.variante}) x${p.cantidad} - ₡${p.subtotal.toLocaleString()}\n`; });
    mensaje += `\n💰 *Total: ₡${factura.total.toLocaleString()}*\n💳 Método: ${factura.metodoPago?.toUpperCase()}\n\n¡Gracias! 🌸`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
  },

  limpiarFactura() {
    this.carritoFactura = [];
    this.clienteTemporal = null;
    document.getElementById('frBuscarCliente').value = '';
    document.getElementById('frClienteInfo').classList.add('hidden');
    document.getElementById('frClienteInfo').innerHTML = '';
    document.getElementById('frDescuento').value = 0;
    document.getElementById('frMetodoPago').value = 'contado';
    this.renderCarrito();
  },

  debounce(fn, ms) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => fn(...args), ms); };
  }
};

export default FacturacionRapidaV2;