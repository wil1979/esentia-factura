// modules/factura-editor.js
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const FacturaEditor = {
  _facturasCache: [],
  _productosCache: [],

  async abrirEditor() {
    // Cargar productos disponibles
    this._productosCache = Store.get('productos') || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalFacturaEditor';
    modal.innerHTML = `
      <div class="modal-content modal-xxl">
        <button class="modal-close" onclick="UI.modal('modalFacturaEditor','close')">✕</button>
        <h2>📝 Editor de Facturas</h2>
        
        <div class="editor-toolbar">
          <input type="text" id="buscarFactura" placeholder="🔍 Buscar por cliente o ID...">
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
      const snap = await getDocs(collection(DB.db, "facturas_rapidas"));
      this._facturasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
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
      const estadoClass = f.estado === 'completado' ? 'badge-success' : 
                          f.estado === 'anulada' ? 'badge-danger' : 'badge-warning';
      
      return `
        <div class="factura-item">
          <div class="factura-main" onclick="FacturaEditor.toggleDetalle('${f.id}')">
            <div class="factura-info">
              <span class="factura-id">#${f.id.slice(-6).toUpperCase()}</span>
              <strong>${f.clienteNombre || 'Sin nombre'}</strong>
              <small>📅 ${new Date(f.fecha).toLocaleDateString()} | 💳 ${f.metodoPago || 'Contado'}</small>
            </div>
            <div class="factura-summary">
              <span class="badge ${estadoClass}">${f.estado?.toUpperCase() || 'PENDIENTE'}</span>
              <span class="factura-total">₡${(f.total || 0).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="factura-actions-bar">
            <button onclick="event.stopPropagation(); FacturaEditor.editar('${f.id}')">✏️ Editar Completa</button>
            <button onclick="event.stopPropagation(); FacturaEditor.imprimir('${f.id}')">🖨️ Imprimir</button>
            <button class="btn-danger" onclick="event.stopPropagation(); FacturaEditor.eliminar('${f.id}')">🗑️</button>
          </div>

          <div class="factura-detalle" id="detalle-${f.id}" style="display: none;">
            <ul class="productos-mini-list">
              ${(f.productos || []).map(p => `
                <li>${p.cantidad}x ${p.nombre} (${p.variante}) — ₡${p.subtotal.toLocaleString()}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleDetalle(facturaId) {
    const detalle = document.getElementById(`detalle-${facturaId}`);
    detalle.style.display = detalle.style.display === 'none' ? 'block' : 'none';
  },

  filtrarFacturas(query) {
    if (!query.trim()) {
      this.renderFacturas(this._facturasCache);
      return;
    }
    const filtradas = this._facturasCache.filter(f => 
      f.id.includes(query) || 
      (f.clienteNombre && f.clienteNombre.toLowerCase().includes(query.toLowerCase()))
    );
    this.renderFacturas(filtradas);
  },

  // ✅ EDICIÓN COMPLETA DE FACTURA
  async editar(facturaId) {
    const factura = this._facturasCache.find(f => f.id === facturaId);
    if (!factura) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalEditarFacturaCompleta';
    modal.innerHTML = `
      <div class="modal-content modal-xxl">
        <button class="modal-close" onclick="UI.modal('modalEditarFacturaCompleta','close')">✕</button>
        <h2>✏️ Editar Factura #${facturaId.slice(-6)}</h2>
        
        <form id="formEditarFactura">
          <!-- DATOS DEL CLIENTE -->
          <div class="edit-section">
            <h3>👤 Datos del Cliente</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Cliente:</label>
                <input type="text" id="editCliente" value="${factura.clienteNombre || ''}" required>
              </div>
              <div class="form-group">
                <label>Teléfono:</label>
                <input type="text" id="editTelefono" value="${factura.clienteTelefono || ''}">
              </div>
              <div class="form-group">
                <label>Estado:</label>
                <select id="editEstado">
                  <option value="pendiente" ${factura.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                  <option value="completado" ${factura.estado === 'completado' ? 'selected' : ''}>Completado</option>
                  <option value="anulada" ${factura.estado === 'anulada' ? 'selected' : ''}>Anulada</option>
                </select>
              </div>
              <div class="form-group">
                <label>Método de Pago:</label>
                <select id="editMetodo">
                  <option value="contado" ${factura.metodoPago === 'contado' ? 'selected' : ''}>Contado</option>
                  <option value="credito" ${factura.metodoPago === 'credito' ? 'selected' : ''}>Crédito</option>
                </select>
              </div>
            </div>
          </div>

          <!-- PRODUCTOS -->
          <div class="edit-section">
            <h3>📦 Productos</h3>
            <div id="productosEditContainer">
              <!-- Los productos se renderizarán aquí -->
            </div>
            <button type="button" class="btn-secondary" onclick="FacturaEditor.agregarProductoEdit()">➕ Agregar Producto</button>
          </div>

          <!-- TOTALES -->
          <div class="edit-section">
            <h3>💰 Totales</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>Subtotal:</label>
                <input type="number" id="editSubtotal" value="${factura.subtotal || 0}" readonly>
              </div>
              <div class="form-group">
                <label>Descuento:</label>
                <input type="number" id="editDescuento" value="${factura.descuento || 0}" onchange="FacturaEditor.recalcularTotalesEdit()">
              </div>
              <div class="form-group">
                <label>Total:</label>
                <input type="number" id="editTotal" value="${factura.total || 0}" readonly>
              </div>
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

    // Renderizar productos existentes
    this.renderProductosEdit(factura.productos || []);
    
    // Event listener para formulario
    document.getElementById('formEditarFactura').onsubmit = async (e) => {
      e.preventDefault();
      await this.guardarEdicionCompleta(facturaId);
    };
  },

  renderProductosEdit(productos) {
    const container = document.getElementById('productosEditContainer');
    container.innerHTML = '';

    productos.forEach((prod, index) => {
      const div = document.createElement('div');
      div.className = 'producto-edit-row';
      div.innerHTML = `
        <div class="producto-edit-info">
          <input type="text" class="prod-nombre" value="${prod.nombre}" placeholder="Nombre del producto" readonly>
          <input type="text" class="prod-variante" value="${prod.variante || 'Única'}" placeholder="Variante">
        </div>
        <div class="producto-edit-cant">
          <label>Cant:</label>
          <input type="number" class="prod-cantidad" value="${prod.cantidad}" min="1" onchange="FacturaEditor.recalcularProductoEdit(${index})">
        </div>
        <div class="producto-edit-precio">
          <label>Precio:</label>
          <input type="number" class="prod-precio" value="${prod.precio}" min="0" onchange="FacturaEditor.recalcularProductoEdit(${index})">
        </div>
        <div class="producto-edit-subtotal">
          <label>Subtotal:</label>
          <input type="number" class="prod-subtotal" value="${prod.subtotal}" readonly>
        </div>
        <button type="button" class="btn-danger btn-sm" onclick="FacturaEditor.eliminarProductoEdit(${index})">🗑️</button>
      `;
      container.appendChild(div);
    });

    this.recalcularTotalesEdit();
  },

  agregarProductoEdit() {
    const container = document.getElementById('productosEditContainer');
    const index = container.children.length;
    
    const div = document.createElement('div');
    div.className = 'producto-edit-row';
    div.innerHTML = `
      <div class="producto-edit-info">
        <select class="prod-select" onchange="FacturaEditor.seleccionarProductoEdit(this, ${index})">
          <option value="">Seleccionar producto...</option>
          ${this._productosCache.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
        </select>
        <input type="text" class="prod-variante" placeholder="Variante" value="Única">
      </div>
      <div class="producto-edit-cant">
        <label>Cant:</label>
        <input type="number" class="prod-cantidad" value="1" min="1" onchange="FacturaEditor.recalcularProductoEdit(${index})">
      </div>
      <div class="producto-edit-precio">
        <label>Precio:</label>
        <input type="number" class="prod-precio" value="0" min="0" onchange="FacturaEditor.recalcularProductoEdit(${index})">
      </div>
      <div class="producto-edit-subtotal">
        <label>Subtotal:</label>
        <input type="number" class="prod-subtotal" value="0" readonly>
      </div>
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
    const row = container.children[index];
    const cantidad = parseFloat(row.querySelector('.prod-cantidad').value) || 0;
    const precio = parseFloat(row.querySelector('.prod-precio').value) || 0;
    const subtotal = cantidad * precio;
    
    row.querySelector('.prod-subtotal').value = subtotal.toFixed(2);
    this.recalcularTotalesEdit();
  },

  eliminarProductoEdit(index) {
    const container = document.getElementById('productosEditContainer');
    container.removeChild(container.children[index]);
    this.recalcularTotalesEdit();
  },

  recalcularTotalesEdit() {
    const container = document.getElementById('productosEditContainer');
    let subtotal = 0;
    
    Array.from(container.children).forEach(row => {
      subtotal += parseFloat(row.querySelector('.prod-subtotal').value) || 0;
    });

    const descuento = parseFloat(document.getElementById('editDescuento').value) || 0;
    const total = Math.max(0, subtotal - descuento);

    document.getElementById('editSubtotal').value = subtotal.toFixed(2);
    document.getElementById('editTotal').value = total.toFixed(2);
  },

  async guardarEdicionCompleta(facturaId) {
    const productos = [];
    const container = document.getElementById('productosEditContainer');
    
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

    if (productos.length === 0) {
      UI.toast('⚠️ Agrega al menos un producto', 'warning');
      return;
    }

    const facturaData = {
      clienteNombre: document.getElementById('editCliente').value,
      clienteTelefono: document.getElementById('editTelefono').value,
      estado: document.getElementById('editEstado').value,
      metodoPago: document.getElementById('editMetodo').value,
      productos: productos,
      subtotal: parseFloat(document.getElementById('editSubtotal').value) || 0,
      descuento: parseFloat(document.getElementById('editDescuento').value) || 0,
      total: parseFloat(document.getElementById('editTotal').value) || 0,
      fechaActualizacion: new Date().toISOString()
    };

    try {
      await updateDoc(doc(DB.db, "facturas_rapidas", facturaId), facturaData);
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
      await deleteDoc(doc(DB.db, "facturas_rapidas", facturaId));
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
      console.error("Módulo ImpresionManager no disponible");
      UI.toast('⚠️ Módulo de impresión no cargado', 'error');
    }
  }
};

export default FacturaEditor;