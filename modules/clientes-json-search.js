// modules/clientes-json-search.js

import { ClientesBusqueda } from './clientes-busqueda.js';
import { ClientesEditor } from './clientes-editor.js';
import { UI } from '../components/ui.js';

export const ClientesJSONSearch = {

  personalData: [],

  // =====================================================
  // INIT
  // =====================================================

  async init() {
    

    try {

      const resp = await fetch('./data/personal.json');

      this.personalData = await resp.json();

      console.log(
        `📄 personal.json cargado: ${this.personalData.length} registros`
      );

    } catch (error) {

      console.error(
        '❌ Error cargando personal.json',
        error
      );

      UI.toast(
        'Error cargando base local',
        'error'
      );
    }
  },

  // =====================================================
  // BUSCAR
  // =====================================================

  async buscar(criterio) {

    try {

      criterio = criterio
        .trim()
        .toUpperCase();

      if (!criterio) {
        return [];
      }

      // =================================================
      // FILTRAR
      // =================================================

      const resultados = this.personalData.filter(p => {

        const nombre =
          (p.nombre || '')
            .toUpperCase();

        const cedula =
        String(p.cedula || '')
        .toUpperCase();

       const telefono =
         String(p.telefono || '')
        .toUpperCase();

        return (
          nombre.includes(criterio) ||
          cedula.includes(criterio) ||
          telefono.includes(criterio)
        );

      });

      return resultados;

    } catch (error) {

      console.error(
        '❌ Error buscando clientes',
        error
      );

      return [];
    }
  },

  // =====================================================
  // MOSTRAR RESULTADOS
  // =====================================================

  mostrarResultados(resultados, containerId = 'clientesResultados') {

    const contenedor =
      document.getElementById(containerId);

    if (!contenedor) return;

    if (!resultados.length) {

      contenedor.innerHTML = `
        <div class="result-item warn">
          ⚠️ No se encontraron coincidencias
        </div>
      `;

      return;
    }

    contenedor.innerHTML = resultados.map(cliente => `

      <div class="result-item json-cliente"
           data-cedula="${cliente.cedula}"
           style="
             cursor:pointer;
             margin-bottom:8px;
             padding:10px;
             border-radius:10px;
             border:1px solid #ddd;
           ">

        <strong>
          ${cliente.nombre || 'Sin nombre'}
        </strong>

        <br>

        <small>
          ${cliente.cedula || 'Sin cédula'}
        </small>

        ${cliente.telefono ? `
          <br>
          <small>
            📞 ${cliente.telefono}
          </small>
        ` : ''}

        <br>

        <small style="color:#888">
          📄 personal.json
        </small>

      </div>

    `).join('');

    // ================================================
    // EVENTOS
    // ================================================

    document.querySelectorAll('.json-cliente')
      .forEach(item => {

      item.addEventListener('click', async () => {

        const cedula =
          item.dataset.cedula;

        await this.cargarDesdeHacienda(cedula);

      });

    });

  },

  // =====================================================
  // CONSULTAR HACIENDA
  // =====================================================

  async cargarDesdeHacienda(cedula) {

    const contenedor =
      document.getElementById('clientesResultados');

    try {

      contenedor.innerHTML = `
        <div class="result-item info">
          🏛️ Consultando Hacienda...
        </div>
      `;

      const resultado =
        await ClientesBusqueda.consultarHacienda(
          cedula
        );

      // ===============================================
      // HACIENDA EXITOSA
      // ===============================================

      if (resultado?.success) {

        ClientesBusqueda.autoLlenarFormulario(
          resultado
        );

        contenedor.innerHTML = `
          <div class="result-item success">
            ✅ Datos oficiales cargados
          </div>
        `;

        // abrir tab registrar
        document.querySelector('[data-tab="registrar"]')
          ?.click();

        return;
      }

      // ===============================================
      // FALLBACK JSON
      // ===============================================

      const persona =
        this.personalData.find(
          p => p.cedula === cedula
        );

      if (persona) {

        ClientesEditor.llenarFormulario({

          cedula:
            persona.cedula || '',

          nombre:
            persona.nombre || '',

          telefono:
            persona.telefono || ''

        }, false);

        document.querySelector('[data-tab="registrar"]')
          ?.click();

        contenedor.innerHTML = `
          <div class="result-item warn">
            ⚠️ Hacienda no respondió.
            Datos cargados desde JSON.
          </div>
        `;
      }

    } catch (error) {

      console.error(
        '❌ Error consultando Hacienda',
        error
      );

      const persona =
        this.personalData.find(
          p => p.cedula === cedula
        );

      if (persona) {

        ClientesEditor.llenarFormulario({

          cedula:
            persona.cedula || '',

          nombre:
            persona.nombre || '',

          telefono:
            persona.telefono || ''

        }, false);

        document.querySelector('[data-tab="registrar"]')
          ?.click();
      }

      contenedor.innerHTML = `
        <div class="result-item warn">
          ⚠️ Error consultando Hacienda.
          Datos locales cargados.
        </div>
      `;
    }
  },

  // =====================================================
  // BUSQUEDA DIRECTA
  // =====================================================

  async buscarYMostrar(criterio) {

    const contenedor =
      document.getElementById('clientesResultados');

    contenedor.innerHTML = `
      <div class="result-item info">
        🔍 Buscando en personal.json...
      </div>
    `;

    const resultados =
      await this.buscar(criterio);

    this.mostrarResultados(resultados);
  }

};

export default ClientesJSONSearch;