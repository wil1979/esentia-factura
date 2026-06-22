// modules/factura-editor.js
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const FacturaEditor = {
  _facturasCache: [],
  _productosCache: [],

  async abrirEditor() {
    this._productosCache = Store.get('productos') || [];
    const existing = document.getElementById('modalFacturaEditor');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalFacturaEditor';
    modal.innerHTML = `
      <div class="modal-content modal-xxl">
        <button class="modal-close" onclick="UI.modal('modalFacturaEditor','close')">✕</button>
        <h2>📝 Editor de Facturas (Unificado)</h2>
        <div class="editor-toolbar">
          <input type="text" id="buscarFactura" placeholder="🔍 Buscar por cliente, ID o estado...">
          <button id="btnRecargarEditor" class="btn-secondary">🔄 Recargar</button>
        </div>
        <div id="facturasLista" class="facturas-lista">
          <div class="loading-state">🔄 Cargando facturas...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btnRecargarEditor').addEventListener('click', () => this.cargarFacturas());
    document.getElementById('buscarFactura').addEventListener('input', (e) => this.filtrarFacturas(e.target.value));

    await this.cargarFacturas();
  },

  async cargarFacturas() {
    const container = document.getElementById('facturasLista');
    container.innerHTML = '<div class="loading-state">🔄 Cargando...</div>';
    try {
      // 1. Cargar facturas_rapidas
      const snapRapidas = await getDocs(collection(DB.db, "facturas_rapidas"));
      const facturasRapidas = snapRapidas.docs.map(d => ({ id: d.id, ...d.data(), origen: 'rapida' }));

      // 2. Cargar facturas (historial web)
      const snapFacturas = await getDocs(collection(DB.db, "facturas"));
      let facturasWeb = [];
      snapFacturas.forEach(docSnap => {
        const data = docSnap.data();
        const compras = Array.isArray(data.compras) ? data.compras : [];
        compras.forEach((compra, index) => {
          facturasWeb.push({
            id: `${docSnap.id}_web_${index}`,
            clienteId: docSnap.id,
            clienteNombre: data.nombre || 'Cliente Web',
            clienteTelefono: data.telefono || '',
            ...compra,
            origen: 'web'
          });
        });
      });

      this._facturasCache = [...facturasRapidas, ...facturasWeb].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      this.renderFacturas(this._facturasCache);
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="color:red">❌ Error al cargar facturas</p>';
    }
  },

  renderFacturas(facturas) {
    const container = document.getElementById('facturasLista');
    if (facturas.length === 0) {
      container.innerHTML = '<p class="no-data">No se encontraron facturas</p>';
      return;
    }

    container.innerHTML = facturas.map(f => {
      const total = Number(f.total) || 0;
      const pagado = Number(f.pagado) || 0;
      const saldo = total - pagado;
      
      const estadoClass = f.estado === 'completado' ? 'badge-success' : 
                          f.estado === 'anulada' ? 'badge-danger' : 
                          f.estado === 'parcial' ? 'badge-warning' : 'badge-info';
      
      const productosList = (f.productos || []).map(p => {
        const cant = Number(p.cantidad) || 1;
        const precio = Number(p.precio) || 0;
        const subtotal = Number(p.subtotal) || (cant * precio);
        return `<li>${cant}x ${p.nombre || 'Producto'} (${p.variante || 'Única'}) — ₡${subtotal.toLocaleString()}</li>`;
      }).join('');

      const origenBadge = f.origen === 'web' ? '<span class="badge badge-web" style="font-size:0.6rem; margin-left:5px;">WEB</span>' : '';

      return `
        <div class="factura-item">
          <div class="factura-main" onclick="FacturaEditor.toggleDetalle('${f.id}')">
            <div class="factura-info">
              <span class="factura-id">#${f.id.slice(-6).toUpperCase()} ${origenBadge}</span>
              <strong>${f.clienteNombre || 'Sin nombre'}</strong>
              <small>📅 ${new Date(f.fecha).toLocaleDateString()} | 💳 ${f.metodoPago || 'Contado'}</small>
              ${saldo > 0 && f.estado !== 'anulada' ? `<br><small style="color:#e74c3c; font-weight:600;">⚠️ Saldo: ₡${saldo.toLocaleString()}</small>` : ''}
            </div>
            <div class="factura-summary">
              <span class="badge ${estadoClass}">${(f.estado || 'PENDIENTE').toUpperCase()}</span>
              <span class="factura-total">₡${total.toLocaleString()}</span>
            </div>
          </div>
          
          <div class="factura-actions-bar">
            <button onclick="event.stopPropagation(); FacturaEditor.editar('${f.id}')">✏️ Editar</button>
            <button onclick="event.stopPropagation(); FacturaEditor.imprimir('${f.id}')">🖨️ Imprimir</button>
            <button class="btn-danger" onclick="event.stopPropagation(); FacturaEditor.eliminar('${f.id}')">🗑️ Eliminar</button>
          </div>

          <div class="factura-detalle" id="detalle-${f.id}" style="display: none;">
            <ul class="productos-mini-list">${productosList}</ul>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleDetalle(facturaId) {
    const detalle = document.getElementById(`detalle-${facturaId}`);
    if (detalle) detalle.style.display = detalle.style.display === 'none' ? 'block' : 'none';
  },

  filtrarFacturas(query) {
    if (!query.trim()) {
      this.renderFacturas(this._facturasCache);
      return;
    }
    const q = query.toLowerCase();
    const filtradas = this._facturasCache.filter(f =>
      f.id.toLowerCase().includes(q) ||
      (f.clienteNombre && f.clienteNombre.toLowerCase().includes(q)) ||
      (f.estado && f.estado.toLowerCase().includes(q))
    );
    this.renderFacturas(filtradas);
  },

  async editar(facturaId) {
    const factura = this._facturasCache.find(f => f.id === facturaId);
    if (!factura) return;

    const existing = document.getElementById('modalEditarFacturaCompleta');
    if (existing) existing.remove();

    const abonosHTML = (factura.abonos && factura.abonos.length > 0) 
      ? factura.abonos.map(a => `
          <div class="abono-row">
            <span class="abono-fecha">📅 ${new Date(a.fecha).toLocaleDateString()}</span>
            <span class="abono-monto">💰 ₡${Number(a.monto).toLocaleString()}</span>
            <span class="abono-metodo">💳 ${a.metodo}</span>
            <small class="abono-nota">${a.nota || 'Sin nota'}</small>
          </div>
        `).join('')
      : '<p class="no-data" style="padding:10px; text-align:center;">Sin abonos registrados</p>';

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalEditarFacturaCompleta';
    modal.innerHTML = `
      <div class="modal-content modal-xxl">
        <button class="modal-close" onclick="UI.modal('modalEditarFacturaCompleta','close')">✕</button>
        <h2>✏️ Editar Factura #${facturaId.slice(-6)} ${factura.origen === 'web' ? '(Web)' : ''}</h2>
        <form id="formEditarFactura">
          <div class="edit-section">
            <h3>👤 Datos del Cliente</h3>
            <div class="form-grid">
              <div class="form-group"><label>Cliente:</label><input type="text" id="editCliente" value="${factura.clienteNombre || ''}" required></div>
              <div class="form-group"><label>Teléfono:</label><input type="text" id="editTelefono" value="${factura.clienteTelefono || ''}"></div>
              <div class="form-group">
                <label>Estado:</label>
                <select id="editEstado">
                  <option value="pendiente" ${factura.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="despachado" ${factura.estado === 'despachado' ? 'selected' : ''}>Despachado (Crédito)</option>
                  <option value="parcial" ${factura.estado === 'parcial' ? 'selected' : ''}>Parcial (Con deuda)</option>
                  <option value="completado" ${factura.estado === 'completado' ? 'selected' : ''}>Completado (Pagado)</option>
                  <option value="anulada" ${factura.estado === 'anulada' ? 'selected' : ''}>Anulada</option>
                </select>
              </div>
              <div class="form-group">
                <label>Método de Pago:</label>
                <select id="editMetodo">
                  <option value="contado" ${factura.metodoPago === 'contado' ? 'selected' : ''}>Contado</option>
                  <option value="credito" ${factura.metodoPago === 'credito' ? 'selected' : ''}>Crédito</option>
                  <option value="sinpe" ${factura.metodoPago === 'sinpe' ? 'selected' : ''}>SINPE</option>
                  <option value="transferencia" ${factura.metodoPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                </select>
              </div>
            </div>
          </div>

          <div class="edit-section">
            <h3>💵 Historial de Abonos</h3>
            <div class="abonos-container">${abonosHTML}</div>
            <small style="color:var(--text-muted); display:block; margin-top:8px;">* Para agregar abonos, usa el módulo "Cobros / Abonos".</small>
          </div>

          <div class="edit-section">
            <h3>📦 Productos</h3>
            <div id="productosEditContainer"></div>
            <button type="button" class="btn-secondary" onclick="FacturaEditor.agregarProductoEdit()">➕ Agregar Producto</button>
          </div>

          <div class="edit-section">
            <h3>💰 Totales</h3>
            <div class="form-grid">
              <div class="form-group"><label>Subtotal:</label><input type="number" id="editSubtotal" value="${factura.subtotal || 0}" readonly></div>
              <div class="form-group"><label>Descuento:</label><input type="number" id="editDescuento" value="${factura.descuento || 0}" onchange="FacturaEditor.recalcularTotalesEdit()"></div>
              <div class="form-group"><label>Total Factura:</label><input type="number" id="editTotal" value="${factura.total || 0}" readonly></div>
              <div class="form-group"><label>Total Pagado:</label><input type="number" id="editPagado" value="${factura.pagado || 0}" readonly style="color:var(--success); font-weight:bold;"></div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">💾 Guardar Cambios</button>
            <button type="button" class="btn-secondary" onclick="UI.modal('modalEditarFacturaCompleta','close')">Cancelar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    this.renderProductosEdit(factura.productos || []);

    document.getElementById('formEditarFactura').onsubmit = async (e) => {
      e.preventDefault();
      await this.guardarEdicionCompleta(facturaId);
    };
  },

  renderProductosEdit(productos) {
    const container = document.getElementById('productosEditContainer');
    if (!container) return;
    container.innerHTML = '';
    productos.forEach((prod, index) => {
      const div = document.createElement('div');
      div.className = 'producto-edit-row';
      div.innerHTML = `
        <div class="producto-edit-info">
          <input type="text" class="prod-nombre" value="${prod.nombre || ''}" placeholder="Nombre" readonly>
          <input type="text" class="prod-variante" value="${prod.variante || 'Única'}" placeholder="Variante">
        </div>
        <div class="producto-edit-cant">
          <label>Cant:</label>
          <input type="number" class="prod-cantidad" value="${prod.cantidad || 1}" min="1" onchange="FacturaEditor.recalcularProductoEdit(${index})">
        </div>
        <div class="producto-edit-precio">
          <label>Precio:</label>
          <input type="number" class="prod-precio" value="${prod.precio || 0}" min="0" onchange="FacturaEditor.recalcularProductoEdit(${index})">
        </div>
        <div class="producto-edit-subtotal">
          <label>Subtotal:</label>
          <input type="number" class="prod-subtotal" value="${prod.subtotal || 0}" readonly>
        </div>
        <button type="button" class="btn-danger btn-sm" onclick="FacturaEditor.eliminarProductoEdit(${index})">🗑️</button>
      `;
      container.appendChild(div);
    });
    this.recalcularTotalesEdit();
  },

  agregarProductoEdit() {
    const container = document.getElementById('productosEditContainer');
    const index = container ? container.children.length : 0;
    const div = document.createElement('div');
    div.className = 'producto-edit-row';
    div.innerHTML = `
      <div class="producto-edit-info">
        <select class="prod-select" onchange="FacturaEditor.seleccionarProductoEdit(this, ${index})">
          <option value="">Seleccionar...</option>
          ${this._productosCache.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
        </select>
        <input type="text" class="prod-variante" placeholder="Variante" value="Única">
      </div>
      <div class="producto-edit-cant"><label>Cant:</label><input type="number" class="prod-cantidad" value="1" min="1" onchange="FacturaEditor.recalcularProductoEdit(${index})"></div>
      <div class="producto-edit-precio"><label>Precio:</label><input type="number" class="prod-precio" value="0" min="0" onchange="FacturaEditor.recalcularProductoEdit(${index})"></div>
      <div class="producto-edit-subtotal"><label>Subtotal:</label><input type="number" class="prod-subtotal" value="0" readonly></div>
      <button type="button" class="btn-danger btn-sm" onclick="FacturaEditor.eliminarProductoEdit(${index})">🗑️</button>
    `;
    container.appendChild(div);
  },

  seleccionarProductoEdit(select, index) {
    const productId = select.value;
    const producto = this._productosCache.find(p => p.id === productId);
    if (!producto) return;
    const row = select.closest('.producto-edit-row');
    row.querySelector('.prod-nombre').value = producto.nombre;
    row.querySelector('.prod-nombre').classList.remove('prod-select');
    row.querySelector('.prod-nombre').classList.add('prod-nombre');
    row.querySelector('.prod-precio').value = producto.precio || 0;
    this.recalcularProductoEdit(index);
  },

  recalcularProductoEdit(index) {
    const container = document.getElementById('productosEditContainer');
    const row = container ? container.children[index] : null;
    if (!row) return;
    const cantidad = parseFloat(row.querySelector('.prod-cantidad').value) || 0;
    const precio = parseFloat(row.querySelector('.prod-precio').value) || 0;
    row.querySelector('.prod-subtotal').value = (cantidad * precio).toFixed(2);
    this.recalcularTotalesEdit();
  },

  eliminarProductoEdit(index) {
    const container = document.getElementById('productosEditContainer');
    if (container && container.children[index]) {
      container.removeChild(container.children[index]);
    }
    this.recalcularTotalesEdit();
  },

  recalcularTotalesEdit() {
    const container = document.getElementById('productosEditContainer');
    let subtotal = 0;
    if (container) {
      Array.from(container.children).forEach(row => {
        subtotal += parseFloat(row.querySelector('.prod-subtotal').value) || 0;
      });
    }
    const descuento = parseFloat(document.getElementById('editDescuento')?.value) || 0;
    const total = Math.max(0, subtotal - descuento);
    const elSub = document.getElementById('editSubtotal');
    const elTot = document.getElementById('editTotal');
    if (elSub) elSub.value = subtotal.toFixed(2);
    if (elTot) elTot.value = total.toFixed(2);
  },

  async guardarEdicionCompleta(facturaId) {
    const productos = [];
    const container = document.getElementById('productosEditContainer');
    if (container) {
      Array.from(container.children).forEach(row => {
        const nombre = row.querySelector('.prod-nombre')?.value || row.querySelector('.prod-select')?.value;
        if (!nombre) return;
        productos.push({
          nombre: nombre,
          variante: row.querySelector('.prod-variante').value || 'Única',
          cantidad: parseInt(row.querySelector('.prod-cantidad').value) || 0,
          precio: parseFloat(row.querySelector('.prod-precio').value) || 0,
          subtotal: parseFloat(row.querySelector('.prod-subtotal').value) || 0
        });
      });
    }

    if (productos.length === 0) {
      UI.toast('⚠️ Agrega al menos un producto', 'warning');
      return;
    }

    const totalCalculado = parseFloat(document.getElementById('editTotal').value) || 0;
    const pagadoActual = parseFloat(document.getElementById('editPagado').value) || 0;
    let estadoSeleccionado = document.getElementById('editEstado').value;

    if (totalCalculado > pagadoActual && estadoSeleccionado === 'completado') {
      UI.toast('⚠️ No puede estar "Completado" si aún tiene saldo. Se cambió a "Parcial".', 'warning');
      estadoSeleccionado = 'parcial';
    }

    const facturaData = {
      clienteNombre: document.getElementById('editCliente').value,
      clienteTelefono: document.getElementById('editTelefono').value,
      estado: estadoSeleccionado,
      metodoPago: document.getElementById('editMetodo').value,
      productos: productos,
      subtotal: parseFloat(document.getElementById('editSubtotal').value) || 0,
      descuento: parseFloat(document.getElementById('editDescuento').value) || 0,
      total: totalCalculado,
      pagado: pagadoActual,
      saldo: Math.max(0, totalCalculado - pagadoActual),
      fechaActualizacion: new Date().toISOString()
    };

    try {
      const facturaOriginal = this._facturasCache.find(f => f.id === facturaId);
      
      if (facturaOriginal?.origen === 'web') {
        const [clientId, , indexStr] = facturaId.split('_web_');
        const index = parseInt(indexStr);
        const docRef = doc(DB.db, "facturas", clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const compras = data.compras || [];
          if (compras[index]) {
            compras[index] = { ...compras[index], ...facturaData };
            await updateDoc(docRef, { compras: compras });
          }
        }
      } else {
        await updateDoc(doc(DB.db, "facturas_rapidas", facturaId), facturaData);
      }

      UI.toast('✅ Factura actualizada', 'success');
      UI.modal('modalEditarFacturaCompleta', 'close');
      this.cargarFacturas();
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al guardar', 'error');
    }
  },

  async eliminar(facturaId) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar esta factura? Esta acción no se puede deshacer.')) return;
    try {
      const facturaOriginal = this._facturasCache.find(f => f.id === facturaId);
      if (facturaOriginal?.origen === 'web') {
        const [clientId, , indexStr] = facturaId.split('_web_');
        const index = parseInt(indexStr);
        const docRef = doc(DB.db, "facturas", clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const compras = data.compras || [];
          compras.splice(index, 1);
          await updateDoc(docRef, { compras: compras });
        }
      } else {
        await deleteDoc(doc(DB.db, "facturas_rapidas", facturaId));
      }
      UI.toast('🗑️ Factura eliminada', 'success');
      this.cargarFacturas();
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al eliminar', 'error');
    }
  },

  imprimir(facturaId) {
    if (window.ImpresionManager && typeof window.ImpresionManager.imprimir === 'function') {
      window.ImpresionManager.imprimir(facturaId);
    } else {
      UI.toast('⚠️ Módulo de impresión no cargado', 'error');
    }
  }
};

export default FacturaEditor;