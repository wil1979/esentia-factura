// modules/clientes-manager.js
import { ClientesJSONSearch } from './clientes-json-search.js';
import { ClientesEditor } from './clientes-editor.js';
import { ClientesBusqueda } from './clientes-busqueda.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';


export const ClientesManager = {
async init() {

  console.log('👥 ClientesManager inicializado');

  await ClientesJSONSearch.init();
},

  // =====================================================
  // PANEL PRINCIPAL
  // =====================================================

    async mostrarPanelGestion() {

  await ClientesJSONSearch.init();

    if (!Store.get('isAdmin')) {
      UI.toast('Acceso denegado', 'warning');
      return;
    }

    // eliminar modal existente
    const modalExistente = document.getElementById('modalClientes');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');

    modal.className = 'modal show';
    modal.id = 'modalClientes';

    modal.innerHTML = `
      <div class="modal-content modal-grande">

        <button class="modal-close"
                onclick="UI.modal('modalClientes','close')">
          ✕
        </button>

        <h2>👥 Gestión de Clientes</h2>

        <!-- TABS -->
        <div class="clientes-tabs">

          <button class="tab-btn active"
                  data-tab="buscar">
            🔍 Buscar/Editar
          </button>

          <button class="tab-btn"
                  data-tab="registrar">
            📝 Registrar Nuevo
          </button>

        </div>

        <!-- TAB BUSCAR -->
        <div id="tab-buscar"
             class="tab-content active">

          <div class="clientes-search-row">

            <input type="text"
                   id="cliSearchCedula"
                   placeholder="🔍 Buscar por nombre, cédula o teléfono..."
                   style="flex:1">

            <button id="btnBuscarBD"
                    class="btn-primary">
              🔍 Buscar
            </button>

            <button id="btnBuscarHacienda"
                    class="btn-secondary">
              🏛️ Hacienda
            </button>

          </div>

          <div id="clientesResultados"
               class="clientes-list"
               style="margin-top:1rem;
                      max-height:300px;
                      overflow-y:auto;">
          </div>

        </div>

        <!-- TAB REGISTRAR -->
        <div id="tab-registrar"
             class="tab-content">

          <form id="formCliente"
                class="clientes-form">

            <div class="form-grid">

              <div class="form-group">
                <label>Cédula *</label>

                <input type="text"
                       id="formCedula"
                       placeholder="Cédula"
                       required>
              </div>

              <div class="form-group">
                <label>Nombre Completo *</label>

                <input type="text"
                       id="formNombre"
                       placeholder="Nombre completo"
                       required
                       style="text-transform: uppercase;"
                       oninput="this.value=this.value.toUpperCase()">
              </div>

              <div class="form-group">
                <label>Teléfono</label>

                <input type="tel"
                       id="formTelefono"
                       placeholder="Teléfono">
              </div>

              <div class="form-group">
                <label>Correo</label>

                <input type="email"
                       id="formEmail"
                       placeholder="Correo">
              </div>

              <div class="form-group full-width">

                <label>Dirección</label>

                <input type="text"
                       id="formDireccion"
                       placeholder="Dirección"
                       style="text-transform: uppercase;"
                       oninput="this.value=this.value.toUpperCase()">
              </div>

            </div>

            <div class="form-actions">

              <button type="submit"
                      class="btn-primary">
                💾 Guardar
              </button>

              <button type="button"
                      id="btnNuevoCliente"
                      class="btn-secondary">
                ➕ Limpiar
              </button>

              <button type="button"
                      id="btnEliminarCliente"
                      class="btn-danger"
                      style="display:none">
                🗑️ Eliminar
              </button>

            </div>

          </form>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    this.attachEvents();
  },

  // =====================================================
  // EVENTOS
  // =====================================================

  attachEvents() {

    const form = document.getElementById('formCliente');

    // =====================================================
    // TABS
    // =====================================================

    document.querySelectorAll('.tab-btn').forEach(btn => {

      btn.addEventListener('click', (e) => {

        document.querySelectorAll('.tab-btn')
          .forEach(b => b.classList.remove('active'));

        document.querySelectorAll('.tab-content')
          .forEach(c => c.classList.remove('active'));

        e.target.classList.add('active');

        document.getElementById(`tab-${e.target.dataset.tab}`)
          .classList.add('active');

      });

    });

    // =====================================================
// BUSCAR CLIENTES JSON
// =====================================================

document.getElementById('btnBuscarBD')
  ?.addEventListener('click', async () => {

  const criterio = document.getElementById(
    'cliSearchCedula'
  ).value;

  if (!criterio.trim()) {

    return UI.toast(
      'Ingresa nombre o cédula',
      'warning'
    );
  }

  await ClientesJSONSearch.buscarYMostrar(
    criterio
  );

});

    // =====================================================
    // BUSCAR DIRECTO EN HACIENDA
    // =====================================================

    document.getElementById('btnBuscarHacienda')
      ?.addEventListener('click', async () => {

      const cedula = document.getElementById('cliSearchCedula')
        .value
        .trim();

      const resDiv = document.getElementById('clientesResultados');

      if (!cedula) {
        return UI.toast('Ingresa una cédula', 'warning');
      }

      resDiv.innerHTML = `
        <div class="result-item info">
          🏛️ Consultando Hacienda...
        </div>
      `;

      try {

        const resultado =
          await ClientesBusqueda.consultarHacienda(
            cedula
          );

        ClientesBusqueda.mostrarResultado(resultado);

        if (resultado.success) {

          ClientesBusqueda.autoLlenarFormulario(
            resultado
          );

          document.querySelector('[data-tab="registrar"]')
            ?.click();
        }

      } catch (error) {

        console.error(error);

        resDiv.innerHTML = `
          <div class="result-item error">
            ❌ Error consultando Hacienda
          </div>
        `;
      }

    });

    // =====================================================
    // ENTER EN BUSQUEDA
    // =====================================================

    document.getElementById('cliSearchCedula')
      ?.addEventListener('keypress', (e) => {

      if (e.key === 'Enter') {
        document.getElementById('btnBuscarBD')
          ?.click();
      }

    });

    // =====================================================
    // GUARDAR CLIENTE
    // =====================================================

    form?.addEventListener('submit', async (e) => {

      e.preventDefault();

      const data = {

        cedula:
          document.getElementById('formCedula')
            ?.value
            .trim(),

        nombre:
          document.getElementById('formNombre')
            ?.value
            .trim(),

        telefono:
          document.getElementById('formTelefono')
            ?.value
            .trim(),

        email:
          document.getElementById('formEmail')
            ?.value
            .trim(),

        direccion:
          document.getElementById('formDireccion')
            ?.value
            .trim()
      };

      if (!data.cedula || !data.nombre) {

        return UI.toast(
          'Cédula y nombre son obligatorios',
          'warning'
        );
      }

      try {

        await ClientesEditor.guardarCliente(data);

        UI.toast(
          '✅ Cliente guardado',
          'success'
        );

        this._limpiarFormulario();

        document.querySelector('[data-tab="buscar"]')
          ?.click();

      } catch (err) {

        console.error(err);

        UI.toast(
          '❌ Error al guardar',
          'error'
        );
      }

    });

    // =====================================================
    // LIMPIAR
    // =====================================================

    document.getElementById('btnNuevoCliente')
      ?.addEventListener('click', () => {

      this._limpiarFormulario();

      document.getElementById('cliSearchCedula').value = '';

      document.getElementById('clientesResultados')
        .innerHTML = '';

      document.getElementById('formCedula')
        ?.focus();

    });

    // =====================================================
    // ELIMINAR
    // =====================================================

    document.getElementById('btnEliminarCliente')
      ?.addEventListener('click', async () => {

      const cedula =
        document.getElementById('formCedula')
          ?.value
          .trim();

      if (!cedula) {

        return UI.toast(
          'Selecciona un cliente primero',
          'warning'
        );
      }

      const eliminado =
        await ClientesEditor.eliminarCliente(
          cedula
        );

      if (eliminado) {
        this._limpiarFormulario();
      }

    });

  },

  // =====================================================
  // LIMPIAR FORMULARIO
  // =====================================================

  _limpiarFormulario() {

    document.getElementById('formCliente')
      ?.reset();

    document.getElementById('formCedula')
      ?.removeAttribute('readonly');

    document.getElementById('formCedula')
      .style.background = '';

    document.getElementById('btnEliminarCliente')
      .style.display = 'none';

    const btnGuardar = document.querySelector(
      '#formCliente button[type="submit"]'
    );

    if (btnGuardar) {
      btnGuardar.textContent = '💾 Guardar';
    }
  }

};

export default ClientesManager;