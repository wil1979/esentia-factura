// modules/clientes-manager.js
import { ClientesEditor } from './clientes-editor.js';
import { ClientesBusqueda } from './clientes-busqueda.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const ClientesManager = {
  
  async init() {
    console.log('👥 ClientesManager inicializado');
  },

  // ✅ Panel principal unificado
  async mostrarPanelGestion() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    
    if (document.getElementById('modalClientes')) {
      document.getElementById('modalClientes').remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalClientes';
    modal.innerHTML = `
      <div class="modal-content modal-grande">
        <button class="modal-close" onclick="UI.modal('modalClientes','close')">✕</button>
        <h2>👥 Gestión de Clientes</h2>
      
        <div class="clientes-tabs">
          <button class="tab-btn active" data-tab="buscar">🔍 Buscar/Editar</button>
          <button class="tab-btn" data-tab="registrar">📝 Registrar Nuevo</button>
        </div>

        <!-- BUSCAR -->
        <div id="tab-buscar" class="tab-content active">
          <div class="clientes-search-row">
            <input type="text" id="cliSearchCedula" placeholder="🔍 Cédula para buscar..." style="flex:1">
            <button id="btnBuscarBD" class="btn-primary">🗄️ BD</button>
            <button id="btnBuscarHacienda" class="btn-secondary">🏛️ Hacienda</button>
          </div>
          <div id="clientesResultados" class="clientes-list" style="margin-top:1rem; max-height:180px; overflow-y:auto;"></div>
        </div>

        <!-- REGISTRAR/EDITAR -->
        <div id="tab-registrar" class="tab-content">
          <form id="formCliente" class="clientes-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Cédula *</label>
                <input type="text" id="formCedula" placeholder="Cédula" required>
              </div>
              <div class="form-group">
                <label>Nombre Completo *</label>
                <input type="text" id="formNombre" placeholder="Nombre completo" required 
                      style="text-transform: uppercase;" 
                      oninput="this.value = this.value.toUpperCase()">
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input type="tel" id="formTelefono" placeholder="Teléfono">
              </div>
              <div class="form-group">
                <label>Correo</label>
                <input type="email" id="formEmail" placeholder="Correo">
              </div>
              <div class="form-group full-width">
                <label>Dirección</label>
                <input type="text" id="formDireccion" placeholder="Dirección"
                      style="text-transform: uppercase;" 
                      oninput="this.value = this.value.toUpperCase()">
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary">💾 Guardar</button>
              <button type="button" id="btnNuevoCliente" class="btn-secondary">➕ Limpiar</button>
              <button type="button" id="btnEliminarCliente" class="btn-danger" style="display:none">🗑️ Eliminar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachEvents();
  },

  attachEvents() {
    const form = document.getElementById('formCliente');

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
      });
    });

    // 🔍 Buscar en BD (clientes existentes)
    document.getElementById('btnBuscarBD')?.addEventListener('click', async () => {
      const cedula = document.getElementById('cliSearchCedula').value.trim();
      const resDiv = document.getElementById('clientesResultados');
      resDiv.innerHTML = '<div class="result-item info">🔍 Buscando en BD...</div>';
      
      const cliente = await ClientesEditor.buscarEnBD(cedula);
      
      if (cliente) {
        resDiv.innerHTML = `<div class="result-item success">✅ Encontrado en BD</div>`;
        ClientesEditor.llenarFormulario(cliente, true);
      } else {
        resDiv.innerHTML = `<div class="result-item warn">⚠️ No registrado. Usa Hacienda o regístralo manualmente.</div>`;
        ClientesEditor.llenarFormulario({ cedula }, false);
      }
    });

    // 🏛️ Buscar en Hacienda (nuevos clientes)
    document.getElementById('btnBuscarHacienda')?.addEventListener('click', async () => {
      const cedula = document.getElementById('cliSearchCedula').value.trim();
      const resDiv = document.getElementById('clientesResultados');
      resDiv.innerHTML = '<div class="result-item info">🏛️ Consultando Hacienda...</div>';
      
      const resultado = await ClientesBusqueda.consultarHacienda(cedula);
      ClientesBusqueda.mostrarResultado(resultado);
      
      if (resultado.success) {
        ClientesBusqueda.autoLlenarFormulario(resultado);
      }
    });

    // Enter en input búsqueda
    document.getElementById('cliSearchCedula')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btnBuscarBD').click(); // Default: buscar en BD
      }
    });

    // Form submit (guardar cliente)
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        cedula: document.getElementById('formCedula')?.value.trim(),
        nombre: document.getElementById('formNombre')?.value.trim(),
        telefono: document.getElementById('formTelefono')?.value.trim(),
        email: document.getElementById('formEmail')?.value.trim(),
        direccion: document.getElementById('formDireccion')?.value.trim()
      };
      
      if (!data.cedula || !data.nombre) {
        return UI.toast('Cédula y nombre son obligatorios', 'warning');
      }
      
      try {
        await ClientesEditor.guardarCliente(data);
        UI.toast('✅ Cliente guardado', 'success');
        this._limpiarFormulario();
        document.querySelector('[data-tab="buscar"]')?.click();
      } catch (err) {
        console.error(err);
        UI.toast('❌ Error al guardar', 'error');
      }
    });

    // Limpiar formulario
    document.getElementById('btnNuevoCliente')?.addEventListener('click', () => {
      this._limpiarFormulario();
      document.getElementById('cliSearchCedula').value = '';
      document.getElementById('clientesResultados').innerHTML = '';
      document.getElementById('formCedula')?.focus();
    });

    // Eliminar cliente
    document.getElementById('btnEliminarCliente')?.addEventListener('click', async () => {
      const cedula = document.getElementById('formCedula')?.value.trim();
      if (!cedula) return UI.toast('Selecciona un cliente primero', 'warning');
      
      const eliminado = await ClientesEditor.eliminarCliente(cedula);
      if (eliminado) this._limpiarFormulario();
    });
  },

  _limpiarFormulario() {
    document.getElementById('formCliente')?.reset();
    document.getElementById('formCedula')?.removeAttribute('readonly');
    document.getElementById('formCedula').style.background = '';
    document.getElementById('btnEliminarCliente').style.display = 'none';
    const btnGuardar = document.querySelector('#formCliente button[type="submit"]');
    if (btnGuardar) btnGuardar.textContent = '💾 Guardar';
    const titulo = document.querySelector('#modalClientes h3');
    if (titulo) titulo.textContent = '📝 Registrar Nuevo Cliente';
  }
};

export default ClientesManager;