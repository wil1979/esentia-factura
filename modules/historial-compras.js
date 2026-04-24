// modules/historial-compras.js
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const HistorialComprasManager = {
  async mostrarPanel(proveedorId = null) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalHistorialCompras';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalHistorialCompras','close')">✕</button>
        <h2>📦 Historial de Compras</h2>
        ${proveedorId ? `<p>Proveedor: ${proveedorId}</p>` : ''}
        <div id="historialContent" class="historial-compras-list">
          <div class="loading-state">🔄 Cargando...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    await this.cargarHistorial(proveedorId);
  },

  async cargarHistorial(proveedorId) {
    const container = document.getElementById('historialContent');
    try {
      let q = collection(DB.db, "compras_proveedores");
      if (proveedorId) {
        q = query(q, where("proveedorId", "==", proveedorId));
      }
      const snap = await getDocs(q);
      const compras = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      if (compras.length === 0) {
        container.innerHTML = '<p class="no-data">Sin compras registradas</p>';
        return;
      }

      container.innerHTML = compras.map(c => `
        <div class="compra-card">
          <div class="compra-header">
            <strong>📅 ${new Date(c.fecha).toLocaleDateString()}</strong>
            <span class="badge ${c.estado === 'recibida' ? 'badge-success' : 'badge-warning'}">${c.estado || 'pendiente'}</span>
          </div>
          <div class="compra-body">
            <p><strong>Total:</strong> ₡${(c.total || 0).toLocaleString()}</p>
            <p><strong>Productos:</strong> ${c.items?.length || 0}</p>
            ${c.notas ? `<p><small>📝 ${c.notas}</small></p>` : ''}
          </div>
          <div class="compra-actions">
            <button onclick="HistorialComprasManager.verDetalle('${c.id}')">👁️ Ver Detalle</button>
            <button onclick="HistorialComprasManager.editar('${c.id}')">✏️ Editar</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="color:red">❌ Error al cargar</p>';
    }
  },

  async verDetalle(compraId) {
    // Implementar modal con detalle completo
    UI.toast('Función en desarrollo', 'info');
  },

  async editar(compraId) {
    // Implementar edición de datos
    UI.toast('Función en desarrollo', 'info');
  }
};

export default HistorialComprasManager;