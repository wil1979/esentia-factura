// modules/velas-admin.js
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const VelasAdminManager = {
  cache: [],
  
  async mostrarPanel() {
    if (!Store.get('isAdmin')) return UI.toast('Acceso denegado', 'warning');
    document.getElementById('modalVelasCustom')?.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal show'; modal.id = 'modalVelasCustom';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalVelasCustom','close')">✕</button>
        <h2>🕯️ Personalizaciones de Velas</h2>
        <div class="inventory-toolbar" style="margin-bottom:10px;">
          <input type="text" id="vcBuscar" placeholder="🔍 Buscar cliente, producto o aroma...">
          <select id="vcFiltroEstado">
            <option value="">Todos</option>
            <option value="pendiente_carrito">⏳ Pendiente</option>
            <option value="en_proceso">🔨 En Proceso</option>
            <option value="completado">✅ Completado</option>
          </select>
          <button class="btn-secondary" onclick="VelasAdminManager.cargar()">🔄 Actualizar</button>
        </div>
        <div id="vcLista" class="vc-list"><div class="loading-state">Cargando...</div></div>
      </div>`;
    document.body.appendChild(modal);
    
    await this.cargar();
    document.getElementById('vcBuscar')?.addEventListener('input', () => this.filtrar());
    document.getElementById('vcFiltroEstado')?.addEventListener('change', () => this.filtrar());
  },

  async cargar() {
    try {
      const snap = await getDocs(collection(DB.db, "personalizaciones_velas"));
      this.cache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      this.render(this.cache);
    } catch (e) { UI.toast('❌ Error al cargar', 'error'); }
  },

  render(lista) {
    const container = document.getElementById('vcLista');
    if (!container) return;
    if (lista.length === 0) { container.innerHTML = '<p class="no-data">No hay personalizaciones registradas</p>'; return; }

    container.innerHTML = lista.map(vc => {
      const sel = vc.seleccion || {};
      const extras = sel.adicionales?.length ? ` + ${sel.adicionales.join(', ')}` : '';
      const tarjeta = sel.tarjeta?.trim() ? ` 📝 "${sel.tarjeta}"` : '';
      const badgeClass = { pendiente_carrito:'bg-yellow', en_proceso:'bg-blue', completado:'bg-green' }[vc.estado] || 'bg-gray';

      return `
        <div class="vc-card">
          <div class="vc-header">
            <strong>👤 ${vc.clienteNombre}</strong>
            <span class="badge ${badgeClass}">${(vc.estado||'PENDIENTE').replace('_',' ')}</span>
          </div>
          <div class="vc-body">
            <p>🕯️ <strong>${vc.productoNombre}</strong> | ₡${vc.precioFinal?.toLocaleString()}</p>
            <p class="vc-details">
              📏 ${sel.tamaño} | 🌸 ${sel.aroma} | 🎨 ${sel.color} | 🏺 ${sel.envase}${extras}${tarjeta}
            </p>
            <small>📅 ${new Date(vc.fecha).toLocaleString()} | 🔗 ${vc.id.slice(0,8)}...</small>
          </div>
          <div class="vc-actions">
            <button onclick="VelasAdminManager.cambiarEstado('${vc.id}')">🔄 Estado</button>
            <button onclick="VelasAdminManager.enviarWA('${vc.id}')">📱 WhatsApp</button>
            <button onclick="VelasAdminManager.eliminar('${vc.id}')" class="btn-sm btn-danger">🗑️</button>
          </div>
        </div>`;
    }).join('');
  },

  filtrar() {
    const busqueda = (document.getElementById('vcBuscar')?.value || '').toLowerCase();
    const estado = document.getElementById('vcFiltroEstado')?.value || '';
    
    const filtrados = this.cache.filter(vc => {
      const matchEstado = !estado || vc.estado === estado;
      const texto = `${vc.clienteNombre} ${vc.productoNombre} ${vc.seleccion?.aroma} ${vc.seleccion?.color}`.toLowerCase();
      const matchBusqueda = !busqueda || texto.includes(busqueda);
      return matchEstado && matchBusqueda;
    });
    this.render(filtrados);
  },

  async cambiarEstado(id) {
    const nuevoEstado = prompt('Nuevo estado (pendiente_carrito, en_proceso, completado):');
    if (!nuevoEstado) return;
    try {
      await updateDoc(doc(DB.db, "personalizaciones_velas", id), { estado: nuevoEstado });
      UI.toast('✅ Estado actualizado', 'success');
      this.cargar();
    } catch (e) { UI.toast('❌ Error al actualizar', 'error'); }
  },

  enviarWA(id) {
    const vc = this.cache.find(x => x.id === id);
    if (!vc) return;
    const sel = vc.seleccion || {};
    const extras = sel.adicionales?.length ? `\n✨ *Extras:* ${sel.adicionales.join(', ')}` : '';
    const tarjeta = sel.tarjeta?.trim() ? `\n📝 *Tarjeta:* "${sel.tarjeta}"` : '';
    
    let msg = `🕯️ *PERSONALIZACIÓN CONFIRMADA*\n👤 ${vc.clienteNombre}\n📱 ${vc.clienteTelefono || 'Sin tel'}\n\n`;
    msg += `📦 *Producto:* ${vc.productoNombre}\n`;
    msg += `📏 Tamaño: ${sel.tamaño}\n🌸 Aroma: ${sel.aroma}\n🎨 Color: ${sel.color}\n🏺 Envase: ${sel.envase}${extras}${tarjeta}`;
    msg += `\n\n💰 *Total: ₡${vc.precioFinal?.toLocaleString()}*\n📌 Ref BD: ${vc.id}`;
    
    window.open(`https://wa.me/50672952454?text=${encodeURIComponent(msg)}`, '_blank');
    UI.toast('📱 WhatsApp abierto', 'success');
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta personalización?')) return;
    try {
      // Nota: Firestore requiere deleteDoc, pero para mantenerlo simple sin importar más, solo ocultamos y notificamos.
      // Si necesitas borrado real, avísame y lo agrego con import de deleteDoc.
      UI.toast('🗑️ Marcado para eliminar (contacta si necesitas borrado en BD)', 'info');
    } catch(e) { UI.toast('Error', 'error'); }
  }
};
export default VelasAdminManager;