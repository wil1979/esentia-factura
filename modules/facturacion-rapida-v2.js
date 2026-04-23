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

  // ✅ CARGA ROBUSTA CON LIMPIEZA DE JSON SUCIO
  async cargarProductosLocales() {
    try {
      const archivos = [
        './data/productos_esentia.json',
        './data/productos_limpieza_completo.json',
        './data/catalogo-velas.json'
      ];

      this.productosCache = [];
      
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
            console.log(`✅ ${archivo}: ${limpios.length} productos cargados`);
          } else {
            console.warn(`⚠️ ${archivo} no encontrado (404)`);
          }
        } catch (e) { console.warn(`⚠️ Falló ${archivo}:`, e); }
      }

      console.log(`📦 Total en caché: ${this.productosCache.length} productos`);
    } catch (e) {
      console.error('❌ Error crítico cargando catálogos:', e);
    }
  },

  async mostrarPanel() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    
    // 1. Importar carrito personal si existe
    this.carritoFactura = [];
    const personalCart = Store.get('carrito') || [];
    if (personalCart.length > 0) {
      const quiere = confirm(`🛒 Tienes ${personalCart.length} productos en tu carrito.\n¿Pasarlos a esta factura?`);
      if (quiere) {
        this.carritoFactura = personalCart.map(i => ({
          id: i.id, nombre: i.nombre, variante: i.variante?.nombre || 'Única',
          precio: i.precio, cantidad: i.cantidad, subtotal: i.precio * i.cantidad,
          tipo: i.tipo || 'General', categoria: i.categoria || 'General'
        }));
        UI.toast('📦 Productos importados', 'info');
      }
    }

    // 2. Crear modal
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
            <div id="frCarrito" class="fr-carrito"><p class="empty-carrito">Sin productos</p></div>
            <div class="fr-totales">
              <div class="fr-row"><span>Subtotal:</span><span id="frSubtotal">₡0</span></div>
              <div class="fr-row"><span>Descuento:</span><input type="number" id="frDescuento" value="0" min="0" class="fr-input"></div>
              <div class="fr-row total"><span>Total:</span><span id="frTotal">₡0</span></div>
            </div>
            <div class="fr-actions">
              <button id="frGuardarFactura" class="btn-primary btn-large" disabled>💾 Guardar</button>
              <button id="frLimpiar" class="btn-secondary">🗑️ Limpiar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 3. Attach events DESPUÉS de que el modal está en el DOM
    this.attachEvents();
    this.llenarFiltros();
    this.renderProductos();
    this.renderCarrito();
  },

  attachEvents() {
    console.log('🔌 AttachEvents ejecutado');
    document.getElementById('frBuscarCliente')?.addEventListener('input', this.debounce(() => this.buscarCliente(), 300));
    document.getElementById('frNuevoCliente')?.addEventListener('click', () => this.nuevoCliente());
    document.getElementById('frBuscarProducto')?.addEventListener('input', () => this.renderProductos());
    document.getElementById('frFiltroTipo')?.addEventListener('change', () => this.renderProductos());
    document.getElementById('frFiltroCategoria')?.addEventListener('change', () => this.renderProductos());
    document.getElementById('frDescuento')?.addEventListener('input', () => this.calcularTotales());
    document.getElementById('frLimpiar')?.addEventListener('click', () => this.limpiarFactura());
    document.getElementById('frGuardarFactura')?.addEventListener('click', () => this.guardarFactura());
  },

  llenarFiltros() {
    const tipos = [...new Set(this.productosCache.map(p => p.tipo).filter(Boolean))].sort();
    const cats = [...new Set(this.productosCache.map(p => p.categoria).filter(Boolean))].sort();
    
    const selTipo = document.getElementById('frFiltroTipo');
    const selCat = document.getElementById('frFiltroCategoria');
    
    tipos.forEach(t => selTipo.innerHTML += `<option value="${t}">${t}</option>`);
    cats.forEach(c => selCat.innerHTML += `<option value="${c}">${c}</option>`);
  },

  async buscarCliente() {
    const q = document.getElementById('frBuscarCliente').value.trim();
    if (q.length < 3) return;
    try {
      const snap = await getDocs(collection(DB.db, "clientesBD"));
      const found = snap.docs.find(d => d.id === q || d.data().nombre?.toLowerCase().includes(q.toLowerCase()));
      if (found) {
        this.clienteTemporal = { id: found.id, ...found.data() };
        this.mostrarClienteInfo();
      }
    } catch(e) { console.warn('Error buscando cliente:', e); }
  },

  nuevoCliente() {
    console.log('🆕 Botón +Nuevo clickeado');
    const cedula = prompt('Cédula del nuevo cliente:');
    if (!cedula) return;
    const nombre = prompt('Nombre completo:');
    if (!nombre) return;
    this.clienteTemporal = {
      id: cedula, cedula, nombre,
      telefono: prompt('Teléfono (opcional):') || '',
      email: prompt('Email (opcional):') || ''
    };
    this.mostrarClienteInfo();
  },

  mostrarClienteInfo() {
    const el = document.getElementById('frClienteInfo');
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = `<strong>✅ ${this.clienteTemporal.nombre}</strong><br><small>${this.clienteTemporal.cedula} | 📱 ${this.clienteTemporal.telefono||'N/A'}</small>`;
  },

  renderProductos() {
    const busqueda = (document.getElementById('frBuscarProducto')?.value || '').toLowerCase().trim();
    const tipo = document.getElementById('frFiltroTipo')?.value || '';
    const cat = document.getElementById('frFiltroCategoria')?.value || '';
    const container = document.getElementById('frListaProductos');

    console.log(`🔍 Filtro: "${busqueda}", Tipo: "${tipo}", Cat: "${cat}", Cache: ${this.productosCache.length}`);

    let filtrados = this.productosCache.filter(p => {
      const n = (p.nombre||'').toLowerCase();
      const coincideTxt = !busqueda || n.includes(busqueda) || (p.id||'').includes(busqueda);
      const coincideTipo = !tipo || p.tipo === tipo;
      const coincideCat = !cat || p.categoria === cat;
      return coincideTxt && coincideTipo && coincideCat && (p.stock||0) > 0;
    });

    if (filtrados.length === 0) {
      container.innerHTML = busqueda ? '<p class="no-data">Sin coincidencias</p>' : '<p class="no-data">Cargando o sin stock...</p>';
      return;
    }

    container.innerHTML = filtrados.map(p => `
      <div class="fr-producto-card" onclick="FacturacionRapidaV2.agregarAlCarrito('${p.id}')">
        <div class="fr-prod-nombre">${p.nombre}</div>
        <div class="fr-prod-tipo">${p.tipo} • ${p.categoria||'General'}</div>
        <div class="fr-prod-precio">₡${(p.precio||0).toLocaleString()}</div>
        <div class="fr-prod-stock">Stock: ${p.stock||0}</div>
        ${p.variantes?.length>1 ? `<small class="fr-prod-variantes">${p.variantes.length} opciones</small>` : ''}
      </div>
    `).join('');
  },

  agregarAlCarrito(pid) {
    const prod = this.productosCache.find(p => p.id === pid);
    if (!prod) return;
    if (prod.variantes?.length > 1) {
      const opts = prod.variantes.map((v,i)=>`${i+1}. ${v.nombre} - ₡${v.precio}`).join('\n');
      const sel = prompt(`Variante para ${prod.nombre}:\n${opts}`);
      const idx = parseInt(sel)-1;
      if (idx>=0 && idx<prod.variantes.length) this.agregarItem(prod, prod.variantes[idx]);
    } else {
      this.agregarItem(prod, prod.variantes?.[0] || {nombre:'Única', precio:prod.precio});
    }
  },

  agregarItem(prod, varData) {
    const cant = parseInt(prompt(`Cantidad para ${prod.nombre}:`, '1')) || 1;
    if (cant > (prod.stock||0)) return UI.toast(`Stock insuficiente (${prod.stock})`, 'warning');
    
    const ex = this.carritoFactura.find(i => i.id===prod.id && i.variante===varData.nombre);
    if (ex) ex.cantidad += cant;
    else this.carritoFactura.push({ id:prod.id, nombre:prod.nombre, variante:varData.nombre, precio:varData.precio, cantidad:cant, subtotal:varData.precio*cant, tipo:prod.tipo, categoria:prod.categoria });
    this.renderCarrito();
  },

  renderCarrito() {
    const cont = document.getElementById('frCarrito');
    const btnGuardar = document.getElementById('frGuardarFactura');
    if (this.carritoFactura.length === 0) {
      cont.innerHTML = '<p class="empty-carrito">Sin productos</p>';
      if (btnGuardar) btnGuardar.disabled = true;
    } else {
      cont.innerHTML = this.carritoFactura.map((it,i) => `
        <div class="fr-carrito-item">
          <div class="fr-item-info"><strong>${it.nombre}</strong><small>${it.variante} × ${it.cantidad}</small></div>
          <div class="fr-item-actions"><span>₡${it.subtotal.toLocaleString()}</span><button onclick="FacturacionRapidaV2.eliminarDelCarrito(${i})" class="btn-sm btn-danger">🗑️</button></div>
        </div>`).join('');
      if (btnGuardar) btnGuardar.disabled = false;
    }
    this.calcularTotales();
  },

  eliminarDelCarrito(i) { this.carritoFactura.splice(i,1); this.renderCarrito(); },

  calcularTotales() {
    const sub = this.carritoFactura.reduce((s,i)=>s+i.subtotal,0);
    const desc = parseInt(document.getElementById('frDescuento')?.value) || 0;
    const tot = Math.max(0, sub-desc);
    const elSub = document.getElementById('frSubtotal');
    const elTot = document.getElementById('frTotal');
    if (elSub) elSub.textContent = `₡${sub.toLocaleString()}`;
    if (elTot) elTot.textContent = `₡${tot.toLocaleString()}`;
    return {sub, desc, tot};
  },

  async guardarFactura() {
    if (!this.clienteTemporal) return UI.toast('Selecciona un cliente', 'warning');
    if (this.carritoFactura.length === 0) return UI.toast('Agrega productos', 'warning');
    const {sub, desc, tot} = this.calcularTotales();
    try {
      await addDoc(collection(DB.db, "facturas_rapidas"), {
        fecha: new Date().toISOString(), clienteId: this.clienteTemporal.id, clienteNombre: this.clienteTemporal.nombre,
        productos: this.carritoFactura, subtotal:sub, descuento:desc, total:tot,
        estado:'completado', metodoPago:'contado', tipoFactura:'rapida', creadoPor: Store.get('cliente')?.nombre||'admin'
      });
      // Actualizar stock local
      this.carritoFactura.forEach(it => {
        const p = this.productosCache.find(x=>x.id===it.id);
        if (p) p.stock = Math.max(0, (p.stock||0)-it.cantidad);
      });
      UI.toast('✅ Factura guardada', 'success');
      this.limpiarFactura();
      if (confirm('¿Enviar por WhatsApp?')) this.enviarWhatsApp({clienteNombre:this.clienteTemporal.nombre, productos:this.carritoFactura, total:tot, fecha:new Date().toISOString()});
    } catch(e) { console.error(e); UI.toast('❌ Error al guardar', 'error'); }
  },

  enviarWhatsApp(f) {
    let txt = `🧾 *FACTURA ESENTIA*\n👤 ${f.clienteNombre}\n📅 ${new Date(f.fecha).toLocaleDateString()}\n\n*Productos:*\n`;
    f.productos.forEach(p=>{ txt+=`• ${p.nombre} (${p.variante}) x${p.cantidad} - ₡${p.subtotal.toLocaleString()}\n`; });
    txt+=`\n💰 *Total: ₡${f.total.toLocaleString()}*\n\n¡Gracias! 🌸`;
    const tel = this.clienteTemporal.telefono?.replace(/\D/g,'')||'';
    if (tel.length>=8) window.open(`https://wa.me/${tel.length===8?'506'+tel:tel}?text=${encodeURIComponent(txt)}`);
  },

  limpiarFactura() {
    this.carritoFactura = []; this.clienteTemporal = null;
    const inp = document.getElementById('frBuscarCliente');
    const info = document.getElementById('frClienteInfo');
    const desc = document.getElementById('frDescuento');
    if (inp) inp.value='';
    if (info) info.classList.add('hidden');
    if (desc) desc.value=0;
    this.renderCarrito();
  },

  debounce(fn, ms) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
};

export default FacturacionRapidaV2;