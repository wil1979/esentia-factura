// modules/factura-editor.js
import { getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const FacturaEditor = {
  clienteId: null,
  facturaIndex: null,
  facturaActual: null,

  async abrirEditor(clienteId, index) {
    this.clienteId = clienteId;
    this.facturaIndex = index;

    try {
      const snap = await getDoc(doc(DB.db, "facturas", clienteId));
      if (!snap.exists()) return UI.toast('Factura no encontrada', 'error');
      
      const data = snap.data();
      this.facturaActual = data.compras?.[index];
      if (!this.facturaActual) return UI.toast('Índice de factura inválido', 'error');

      this.renderModal();
    } catch (e) { console.error(e); UI.toast('Error al cargar factura', 'error'); }
  },

  renderModal() {
    const f = this.facturaActual;
    const modal = document.createElement('div');
    modal.className = 'modal show'; modal.id = 'modalEditorFactura';
    modal.innerHTML = `
      <div class="modal-content modal-grande editor-modal">
        <button class="modal-close" onclick="UI.modal('modalEditorFactura','close')">✕</button>
        <h2>📝 Editar Factura #${this.facturaIndex + 1}</h2>
        <div class="editor-grid">
          <div class="editor-items">
            <h4>Productos</h4>
            <div id="editorItemList">
              ${f.productos.map((p, i) => `
                <div class="editor-row" data-idx="${i}">
                  <input type="text" value="${p.nombre}" class="ed-nombre" readonly>
                  <input type="number" value="${p.cantidad}" min="1" class="ed-cant" data-idx="${i}">
                  <input type="number" value="${p.precio}" min="0" class="ed-precio" data-idx="${i}">
                  <span class="ed-subtotal">₡${(p.precio * p.cantidad).toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="editor-totals">
            <h4>Totales</h4>
            <label>Subtotal: <input type="number" id="edSubtotal" value="${f.total + (f.descuento||0)}" readonly></label>
            <label>Descuento Manual: <input type="number" id="edDescuento" value="${f.descuento||0}" min="0"></label>
            <label>Total: <input type="number" id="edTotal" value="${f.total}" readonly></label>
            <label>Estado: 
              <select id="edEstado">
                <option value="pendiente" ${f.estado==='pendiente'?'selected':''}>⏳ Pendiente</option>
                <option value="parcial" ${f.estado==='parcial'?'selected':''}>🔄 Parcial</option>
                <option value="completado" ${f.estado==='completado'?'selected':''}>✅ Completado</option>
                <option value="anulado" ${f.estado==='anulado'?'selected':''}>🚫 Anulado</option>
              </select>
            </label>
          </div>
        </div>
        <div class="editor-actions">
          <button id="btnGuardarFactura" class="btn-primary">💾 Guardar Cambios</button>
          <button onclick="UI.modal('modalEditorFactura','close')" class="btn-secondary">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this.attachEditorEvents();
  },

  attachEditorEvents() {
    const recalc = () => {
      let sub = 0;
      document.querySelectorAll('.editor-row').forEach(row => {
        const c = parseInt(row.querySelector('.ed-cant').value) || 1;
        const p = parseFloat(row.querySelector('.ed-precio').value) || 0;
        row.querySelector('.ed-subtotal').textContent = `₡${(c*p).toLocaleString()}`;
        sub += c * p;
      });
      document.getElementById('edSubtotal').value = sub;
      const desc = parseInt(document.getElementById('edDescuento').value) || 0;
      document.getElementById('edTotal').value = Math.max(0, sub - desc);
    };

    document.getElementById('editorItemList').addEventListener('input', recalc);
    document.getElementById('edDescuento').addEventListener('input', recalc);

    document.getElementById('btnGuardarFactura').onclick = async () => {
      const btn = document.getElementById('btnGuardarFactura');
      btn.disabled = true; btn.textContent = 'Guardando...';
      
      try {
        const nuevosProductos = [];
        let nuevoSubtotal = 0;
        document.querySelectorAll('.editor-row').forEach(row => {
          const idx = row.dataset.idx;
          const old = this.facturaActual.productos[idx];
          const cant = parseInt(row.querySelector('.ed-cant').value) || 1;
          const precio = parseFloat(row.querySelector('.ed-precio').value) || 0;
          nuevosProductos.push({ ...old, cantidad: cant, precio, total: cant * precio });
          nuevoSubtotal += cant * precio;
        });

        const descuento = parseInt(document.getElementById('edDescuento').value) || 0;
        const total = Math.max(0, nuevoSubtotal - descuento);
        const estado = document.getElementById('edEstado').value;
        const saldo = estado === 'anulado' ? 0 : Math.max(0, total - (this.facturaActual.pagado || 0));

        await updateDoc(doc(DB.db, "facturas", this.clienteId), {
          [`compras.${this.facturaIndex}.productos`]: nuevosProductos,
          [`compras.${this.facturaIndex}.descuento`]: descuento,
          [`compras.${this.facturaIndex}.total`]: total,
          [`compras.${this.facturaIndex}.estado`]: estado,
          [`compras.${this.facturaIndex}.saldo`]: saldo,
          [`compras.${this.facturaIndex}.editadoPorAdmin`]: new Date().toISOString()
        });

        UI.toast('✅ Factura actualizada', 'success');
        UI.modal('modalEditorFactura', 'close');
        // Refrescar módulo de cobros si está abierto
        if (window.CobrosManager) CobrosManager.cargarBaseCobros();
      } catch (e) { console.error(e); UI.toast('❌ Error al guardar', 'error'); }
      finally { btn.disabled = false; btn.textContent = '💾 Guardar Cambios'; }
    };
  }
};