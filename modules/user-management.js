// modules/user-management.js
import { getDoc, doc, setDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const UserManager = {
  _allowedCedulas: [],

  // ✅ Sincroniza permisos al iniciar la app
  async syncAdminRights() {
    try {
      const snap = await getDoc(doc(DB.db, "config", "permisos"));
      this._allowedCedulas = snap.exists() ? (snap.data().admins || []) : ['110350666'];
      
      const cliente = Store.get('cliente');
      const isAdmin = cliente ? this._allowedCedulas.includes(cliente.cedula) : false;
      
      Store.set('isAdmin', isAdmin);
      Store.set('allowedAdmins', this._allowedCedulas);
    } catch (e) {
      console.warn("⚠️ No se pudo cargar config de admins:", e);
      Store.set('isAdmin', Store.get('cliente')?.cedula === '110350666');
    }
  },

  // 🖥️ Panel de Gestión
  async mostrarPanel() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    if (document.getElementById('modalUserAdmin')) document.getElementById('modalUserAdmin').remove();

    await this.syncAdminRights();
    const lista = this._allowedCedulas || [];

    const modal = document.createElement('div');
    modal.className = 'modal show'; modal.id = 'modalUserAdmin';
    modal.innerHTML = `
      <div class="modal-content modal-grande">
        <button class="modal-close" onclick="UI.modal('modalUserAdmin','close')">✕</button>
        <h2>👥 Gestión de Administradores</h2>
        <div class="admin-add-row">
          <input type="text" id="newAdminCedula" placeholder="Cédula del nuevo admin...">
          <button id="btnAddAdmin" class="btn-primary">+ Agregar</button>
        </div>
        <div id="adminList" class="admin-list">
          ${lista.length === 0 ? '<p class="no-data">Sin administradores registrados</p>' : 
            lista.map(c => `
              <div class="admin-item" data-cedula="${c}">
                <span class="admin-cedula">🆔 ${c}</span>
                <button class="btn-remove-admin" onclick="UserManager.eliminarAdmin('${c}')">🗑️</button>
              </div>
            `).join('')}
        </div>
        <small class="admin-note">ℹ️ Los cambios se aplican al recargar la página o cerrar sesión.</small>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btnAddAdmin').onclick = () => this.agregarAdmin();
  },

  async agregarAdmin() {
    const input = document.getElementById('newAdminCedula');
    const cedula = input.value.trim();
    if (!cedula) return UI.toast('Ingresa una cédula', 'warning');
    if (this._allowedCedulas.includes(cedula)) return UI.toast('Ya es administrador', 'info');

    try {
      await setDoc(doc(DB.db, "config", "permisos"), {
        admins: arrayUnion(cedula)
      }, { merge: true });
      UI.toast('✅ Admin agregado correctamente', 'success');
      this.mostrarPanel();
    } catch (e) { console.error(e); UI.toast('❌ Error al guardar', 'error'); }
  },

  async eliminarAdmin(cedula) {
    if (cedula === Store.get('cliente')?.cedula) {
      return UI.toast('⚠️ No puedes eliminarte a ti mismo', 'warning');
    }
    if (!confirm(`¿Eliminar a ${cedula} de la lista de admins?`)) return;

    try {
      await setDoc(doc(DB.db, "config", "permisos"), {
        admins: arrayRemove(cedula)
      }, { merge: true });
      UI.toast('🗑️ Admin eliminado', 'success');
      this.mostrarPanel();
    } catch (e) { console.error(e); UI.toast('❌ Error al eliminar', 'error'); }
  }
};

export default UserManager;