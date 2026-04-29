// modules/factura-editor.js
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const FacturaEditor = {
  _facturasCache: [],

  async abrirEditor() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalFacturaEditor';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
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

    // Event Listeners
    document.getElementById('btnRecargarEditor').addEventListener('click', () => this.cargarFacturas());
    document.getElementById('buscarFactura').addEventListener('input', (e) => this.filtrarFacturas(e.target.value));

    await this.cargarFacturas();
  },

  async cargarFacturas() {
    const container = document.getElementById('facturasLista');
    container.innerHTML = '<div class="loading-state">🔄 Cargando...</div>';
    
    try {
      // ✅ Cargar desde la colección correcta
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
          
          <!-- Acciones Rápidas -->
          <div class="factura-actions-bar">
            <button onclick="event.stopPropagation(); FacturaEditor.editar('${f.id}')">✏️ Editar</button>
            
            <!-- ✅ UNIFICADO: Delega al módulo ImpresionManager -->
            <button onclick="event.stopPropagation(); FacturaEditor.imprimir('${f.id}')">🖨️ Imprimir</button>
            
            <button class="btn-danger" onclick="event.stopPropagation(); FacturaEditor.eliminar('${f.id}')">🗑️</button>
          </div>

          <!-- Detalle Colapsable -->
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

  async editar(facturaId) {
    const factura = this._facturasCache.find(f => f.id === facturaId);
    if (!factura) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalEditarFactura';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalEditarFactura','close')">✕</button>
        <h2>✏️ Editar Factura #${facturaId.slice(-6)}</h2>
        
        <form id="formEditar">
          <div class="form-group">
            <label>Estado:</label>
            <select id="editEstado">
              <option value="pendiente" ${factura.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="completado" ${factura.estado === 'completado' ? 'selected' : ''}>Completado</option>
              <option value="anulada" ${factura.estado === 'anulada' ? 'selected' : ''}>Anulada</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Cliente:</label>
            <input type="text" id="editCliente" value="${factura.clienteNombre || ''}">
          </div>

          <div class="form-group">
            <label>Teléfono:</label>
            <input type="text" id="editTelefono" value="${factura.clienteTelefono || ''}">
          </div>

          <div class="form-group">
            <label>Método de Pago:</label>
            <select id="editMetodo">
              <option value="contado" ${factura.metodoPago === 'contado' ? 'selected' : ''}>Contado</option>
              <option value="credito" ${factura.metodoPago === 'credito' ? 'selected' : ''}>Crédito</option>
            </select>
          </div>

          <button type="submit" class="btn-primary">💾 Guardar Cambios</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('formEditar').onsubmit = async (e) => {
      e.preventDefault();
      await this.guardarEdicion(facturaId);
    };
  },

  async guardarEdicion(facturaId) {
    const nuevoEstado = document.getElementById('editEstado').value;
    const nuevoCliente = document.getElementById('editCliente').value;
    const nuevoTelefono = document.getElementById('editTelefono').value;
    const nuevoMetodo = document.getElementById('editMetodo').value;

    try {
      const docRef = doc(DB.db, "facturas_rapidas", facturaId);
      await updateDoc(docRef, {
        estado: nuevoEstado,
        clienteNombre: nuevoCliente,
        clienteTelefono: nuevoTelefono,
        metodoPago: nuevoMetodo
      });
      
      UI.toast('✅ Factura actualizada', 'success');
      UI.modal('modalEditarFactura', 'close');
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

  // ✅ IMPRESIÓN UNIFICADA: Delega al módulo ImpresionManager
  imprimir(facturaId) {
    if (window.ImpresionManager && typeof window.ImpresionManager.imprimir === 'function') {
      // Llama al motor estandarizado (Ticket Térmico + QR)
      window.ImpresionManager.imprimir(facturaId);
    } else {
      console.error("Módulo ImpresionManager no disponible");
      UI.toast('⚠️ Módulo de impresión no cargado', 'error');
    }
  }
};

export default FacturaEditor;