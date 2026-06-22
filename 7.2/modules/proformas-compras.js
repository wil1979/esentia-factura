// modules/proformas-compras.js
import { collection, addDoc, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const ProformasManager = {
  proveedores: [],
  cache: [],

  async init() {
    console.log('📋 Cargando proveedores para proformas...');
    try {
      const snap = await getDocs(collection(DB.db, "proveedores"));
      this.proveedores = snap.docs.map(d => {
        const data = d.data();
        const clean = (v) => typeof v === 'string' ? v.replace(/^["'\s]+|["'\s]+$/g, '').trim() : v;
        return {
          id: d.id,
          nombre: clean(data.nombre || data.Nombre || d.id),
          telefono: clean(data.telefono || ''),
          notas: clean(data.notas || '')
        };
      }).filter(p => p.nombre);
      console.log(`✅ ${this.proveedores.length} proveedores cargados.`);
    } catch (e) {
      console.error('❌ Error cargando proveedores:', e);
      this.proveedores = [];
    }
  },

  async mostrarPanel() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    document.getElementById('modalProformas')?.remove();
    
    const modal = document.createElement('div'); 
    modal.className = 'modal show'; modal.id = 'modalProformas';
    modal.innerHTML = `
      <div class="modal-content modal-xl proformas-modal">
        <button class="modal-close" onclick="UI.modal('modalProformas','close')">✕</button>
        <h2>📄 Proformas de Compra</h2>
        <div class="inventory-toolbar" style="margin-bottom:10px; display:flex; gap:10px; flex-wrap:wrap;">
          <input type="text" id="pfBuscar" placeholder="🔍 Buscar por proveedor, estado o producto..." style="flex:1; min-width:200px;">
          <button class="btn-primary" onclick="ProformasManager.crearNueva()">➕ Nueva</button>
          <button class="btn-secondary" onclick="ProformasManager.cargarHistorial()">🔄 Actualizar</button>
        </div>
        <div id="listaProformas" class="proformas-list"><div class="loading-state">Cargando historial...</div></div>
      </div>`;
    document.body.appendChild(modal);
    
    await this.cargarHistorial();
    document.getElementById('pfBuscar')?.addEventListener('input', e => this.filtrarLista(e.target.value));
  },

  async cargarHistorial() {
    try {
      const snap = await getDocs(collection(DB.db, "proformas"));
      this.cache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      this.renderLista(this.cache);
    } catch (e) { UI.toast('❌ Error al cargar historial', 'error'); }
  },

  renderLista(lista) {
    const container = document.getElementById('listaProformas');
    if (!container) return;
    if (lista.length === 0) { container.innerHTML = '<p class="no-data">No hay proformas registradas</p>'; return; }

    container.innerHTML = lista.map(p => `
      <div class="proforma-card ${p.estado}">
        <div class="pf-header">
          <span><strong>🏢 ${p.proveedorNombre || 'Sin nombre'}</strong></span>
          <span class="badge ${this._getEstadoClass(p.estado)}">${(p.estado||'PENDIENTE').toUpperCase()}</span>
        </div>
        <div class="pf-body">
          <small>📅 ${new Date(p.fecha).toLocaleDateString()}</small>
          <small>📦 ${p.items?.length || 0} prod.</small>
          <small>💰 ₡${(p.totalEstimado||0).toLocaleString()}</small>
        </div>
        <div class="pf-actions">
          ${p.estado==='pendiente' ? `<button onclick="ProformasManager.editar('${p.id}')">✏️ Editar</button>` : ''}
          ${p.estado==='pendiente' ? `<button onclick="ProformasManager.enviar('${p.id}')">📤 Enviar</button>` : ''}
          ${p.estado==='enviada' ? `<button onclick="ProformasManager.marcar('${p.id}','aprobada')">✅ Aprobada</button>` : ''}
          ${p.estado==='aprobada' ? `<button onclick="ProformasManager.recibir('${p.id}')">📥 Recibir</button>` : ''}
          <button onclick="ProformasManager.exportar('${p.id}')">📋 Copiar</button>
        </div>
      </div>`).join('');
  },

  filtrarLista(busqueda) {
    const b = busqueda.toLowerCase();
    const filtrados = this.cache.filter(p => 
      (p.proveedorNombre||'').toLowerCase().includes(b) || 
      (p.estado||'').includes(b) ||
      p.items?.some(i => (i.producto||'').toLowerCase().includes(b))
    );
    this.renderLista(filtrados);
  },

  _getEstadoClass(estado) {
    return { pendiente:'bg-yellow', enviada:'bg-blue', aprobada:'bg-green', rechazada:'bg-red', recibida:'bg-gray' }[estado] || 'bg-gray';
  },

  async crearNueva(proformaExistente = null) {
    const editando = !!proformaExistente;
    
    // ✅ PROVEEDOR: Select + fallback manual limpio
    const provOpts = this.proveedores.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    const provHTML = `
      <label>Proveedor:</label>
      <select id="pfProveedorSelect" style="margin-bottom:5px;">
        <option value="">Seleccionar proveedor...</option>
        ${provOpts}
        <option value="__manual__">✍️ Escribir manualmente...</option>
      </select>
      <input type="text" id="pfProveedorManual" placeholder="Nombre del proveedor..." 
             style="display:none; margin-bottom:10px;" 
             value="${editando && !this.proveedores.find(p=>p.nombre===proformaExistente.proveedorNombre) ? proformaExistente.proveedorNombre : ''}">
    `;

    const items = editando ? proformaExistente.items : [{productoId:'', producto:'', cantidad:10, precioSugerido:0}];
    const prodOptsHTML = this._generarOptionsProductos();

    const modal = document.createElement('div');
    modal.className = 'modal show'; modal.id = 'modalNuevaProforma';
    modal.innerHTML = `
      <div class="modal-content modal-grande">
        <button class="modal-close" onclick="UI.modal('modalNuevaProforma','close')">✕</button>
        <h2>📝 ${editando ? 'Editar' : 'Nueva'} Proforma</h2>
        <div style="margin:10px 0">${provHTML}</div>
        
        <div class="pf-headers" style="display:grid; grid-template-columns: 2fr 80px 100px 40px; gap:5px; font-size:0.8rem; font-weight:600; color:var(--text-muted); margin-bottom:5px;">
          <span>Producto</span><span>Cant.</span><span>Precio Suger.</span><span></span>
        </div>
        
        <div id="pfItems" class="pf-items-container" style="max-height:300px; overflow-y:auto; margin-bottom:10px;">
          ${items.map(i => this._generarFilaHTML(i, prodOptsHTML)).join('')}
        </div>
        
        <button class="btn-secondary" style="width:100%; margin-bottom:10px;" onclick="ProformasManager.agregarFila()">➕ Agregar producto</button>
        <textarea id="pfNotas" placeholder="Notas adicionales..." style="width:100%; height:60px; padding:8px; margin-bottom:10px;">${editando ? (proformaExistente.notas||'') : ''}</textarea>
        <button class="btn-primary" style="width:100%;" onclick="ProformasManager.guardarProforma(${editando ? `'${proformaExistente.id}'` : ''})">💾 ${editando ? 'Actualizar' : 'Guardar'} Proforma</button>
      </div>`;
    document.body.appendChild(modal);

    // ✅ Event Listener para mostrar/ocultar input manual
    const sel = document.getElementById('pfProveedorSelect');
    if (sel) {
      sel.addEventListener('change', (e) => {
        document.getElementById('pfProveedorManual').style.display = e.target.value === '__manual__' ? 'block' : 'none';
      });
      // Restaurar valor si es edición
      if (editando && proformaExistente.proveedorNombre) {
        const existe = this.proveedores.some(p => p.nombre === proformaExistente.proveedorNombre);
        sel.value = existe ? proformaExistente.proveedorNombre : '__manual__';
        if (!existe) document.getElementById('pfProveedorManual').style.display = 'block';
      }
    }

    // Auto-set price for existing rows
    modal.querySelectorAll('.pf-prod-select').forEach(s => {
      if (s.value) this.actualizarPrecio(s);
    });
  },

  _generarOptionsProductos() {
    const productos = (Store.get('productos') || []).filter(p => p.activo !== false);
    return `<option value="">Seleccionar producto...</option>` + 
           productos.map(p => `<option value="${p.id}" data-nombre="${p.nombre}" data-precio="${p.precio}">${p.nombre} (₡${p.precio})</option>`).join('');
  },

  _generarFilaHTML(item, opcionesHTML) {
    return `<div class="pf-item-row">
      <select class="pf-prod-select" data-id="${item.productoId||''}">${opcionesHTML}</select>
      <input type="number" class="pf-cant" value="${item.cantidad||1}" min="1">
      <input type="number" class="pf-precio" value="${item.precioSugerido||0}">
      <button class="btn-sm btn-danger" onclick="this.closest('.pf-item-row').remove()">❌</button>
    </div>`;
  },

  agregarFila() {
    const container = document.getElementById('pfItems');
    const opciones = this._generarOptionsProductos();
    const filaHTML = `<div class="pf-item-row">
      <select class="pf-prod-select">${opciones}</select>
      <input type="number" class="pf-cant" value="10" min="1">
      <input type="number" class="pf-precio" value="0">
      <button class="btn-sm btn-danger" onclick="this.closest('.pf-item-row').remove()">❌</button>
    </div>`;
    container.insertAdjacentHTML('beforeend', filaHTML);

    // ✅ Adjuntar evento correctamente a la nueva fila
    const nuevoSelect = container.lastElementChild.querySelector('.pf-prod-select');
    if (nuevoSelect) {
      nuevoSelect.addEventListener('change', (e) => this.actualizarPrecio(e.target));
      // Auto-select si hay productos
      if (nuevoSelect.options.length > 1) nuevoSelect.selectedIndex = 1;
      this.actualizarPrecio(nuevoSelect);
    }
  },

  actualizarPrecio(selectElement) {
    const row = selectElement.closest('.pf-item-row');
    if (!row) return;
    const precioInput = row.querySelector('.pf-precio');
    const opt = selectElement.options[selectElement.selectedIndex];
    const precio = opt?.getAttribute('data-precio');
    if (precio && precioInput) precioInput.value = precio;
  },

  async guardarProforma(idEditando = null) {
    const sel = document.getElementById('pfProveedorSelect');
    const manual = document.getElementById('pfProveedorManual');
    const proveedor = sel.value === '__manual__' ? (manual?.value.trim() || 'Proveedor Manual') : (sel.value || 'Proveedor Manual');
    
    if (!proveedor || proveedor === 'Proveedor Manual') return UI.toast('⚠️ Selecciona o escribe un proveedor', 'warning');

    const items = []; let total = 0;
    document.querySelectorAll('.pf-item-row').forEach(row => {
      const sel = row.querySelector('.pf-prod-select');
      const cant = parseInt(row.querySelector('.pf-cant').value) || 0;
      const precio = parseFloat(row.querySelector('.pf-precio').value) || 0;
      const opt = sel.options[sel.selectedIndex];
      const nombre = opt?.getAttribute('data-nombre') || sel.value;
      
      if (nombre && cant > 0 && precio > 0) {
        items.push({ productoId: sel.value, producto: nombre, cantidad: cant, precioSugerido: precio, subtotal: cant * precio });
        total += cant * precio;
      }
    });

    if (items.length === 0) return UI.toast('⚠️ Agrega al menos un producto válido', 'warning');

    try {
      const data = {
        proveedorNombre: proveedor,
        fecha: new Date().toISOString(),
        items, totalEstimado: total,
        estado: idEditando ? undefined : 'pendiente',
        notas: document.getElementById('pfNotas').value.trim(),
        creadoPor: Store.get('cliente')?.nombre || 'admin'
      };

      if (!idEditando) {
        await addDoc(collection(DB.db, "proformas"), data);
      } else {
        await updateDoc(doc(DB.db, "proformas", idEditando), data);
      }
      
      UI.toast(`✅ Proforma ${idEditando?'actualizada':'guardada'}`, 'success');
      UI.modal('modalNuevaProforma', 'close');
      this.cargarHistorial();
    } catch (e) { UI.toast('❌ Error al guardar', 'error'); console.error(e); }
  },

  async enviar(id) { await updateDoc(doc(DB.db, "proformas", id), { estado: 'enviada' }); this.cargarHistorial(); },
  async marcar(id, estado) { await updateDoc(doc(DB.db, "proformas", id), { estado }); this.cargarHistorial(); },
  
  async editar(id) {
    const p = this.cache.find(x => x.id === id);
    if (!p) return UI.toast('Proforma no encontrada', 'error');
    this.crearNueva(p);
  },

  async exportar(id) {
    const p = this.cache.find(x => x.id === id);
    if (!p) return;
    let texto = `📄 *SOLICITUD PROFORMA*\n🏢 Para: ${p.proveedorNombre}\n\n*Productos:*\n`;
    p.items.forEach(i => { texto += `• ${i.producto} x${i.cantidad} - ₡${i.precioSugerido.toLocaleString()}\n`; });
    texto += `\n💰 Total Ref: ₡${(p.totalEstimado||0).toLocaleString()}\n📝 Notas: ${p.notas || 'Ninguna'}`;
    await navigator.clipboard.writeText(texto);
    UI.toast('📋 Copiado al portapapeles', 'success');
  },

  async recibir(id) {
    if (!confirm('¿Confirmar recepción y actualizar stock?')) return;
    try {
      const p = this.cache.find(x => x.id === id);
      const inventario = Store.get('inventario') || {};
      for (const item of p.items) {
        const key = item.producto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
        inventario[key] = (inventario[key] || 0) + item.cantidad;
      }
      await updateDoc(doc(DB.db, "proformas", id), { estado: 'recibida', recibidoEn: new Date().toISOString() });
      Store.set('inventario', inventario); Store.persist('inventario'); Store.emit('inventory:updated');
      UI.toast('📥 Stock actualizado correctamente', 'success'); this.cargarHistorial();
    } catch (e) { UI.toast('❌ Error al recibir', 'error'); }
  }
};
export default ProformasManager;