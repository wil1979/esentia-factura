// modules/reportes.js
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const ReportesManager = {
  todasLasFacturas: [],
  clientesCache: [],

  async init() {
    await this.cargarDatos();
  },

  async cargarDatos() {
    try {
      // 1. Cargar Clientes (para obtener nombres en facturas viejas)
      const snapClientes = await getDocs(collection(DB.db, "clientesBD"));
      this.clientesCache = snapClientes.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Cargar Facturas NUEVAS (facturas_rapidas)
      const snapRapidas = await getDocs(collection(DB.db, "facturas_rapidas"));
      const facturasNuevas = snapRapidas.docs.map(d => ({
        ...d.data(),
        id: d.id,
        origen: 'rapida'
      }));

      // 3. Cargar Facturas VIEJAS (facturas legacy con array de compras)
      const snapLegacy = await getDocs(collection(DB.db, "facturas"));
      let facturasViejas = [];
      
      snapLegacy.forEach(doc => {
        const data = doc.data();
        if (data.compras && Array.isArray(data.compras)) {
          data.compras.forEach((compra, index) => {
            // Buscar nombre del cliente desde el cache
            const clienteInfo = this.clientesCache.find(c => c.id === doc.id);
            
            facturasViejas.push({
              ...compra,
              id: `${doc.id}_${index}`, // ID único temporal
              clienteId: doc.id,
              clienteNombre: clienteInfo?.nombre || doc.id,
              clienteTelefono: clienteInfo?.telefono || '',
              origen: 'legacy'
            });
          });
        }
      });

      // 4. UNIFICAR Y ORDENAR
      this.todasLasFacturas = [...facturasNuevas, ...facturasViejas]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      console.log(`📊 Reportes: ${this.todasLasFacturas.length} facturas cargadas (Nuevas: ${facturasNuevas.length}, Viejas: ${facturasViejas.length})`);
    } catch (e) {
      console.error('❌ Error cargando reportes:', e);
    }
  },

  async mostrarPanel() {
    await this.cargarDatos(); // Recargar al abrir

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalReportes';
    modal.innerHTML = `
      <div class="modal-content modal-xxl">
        <button class="modal-close" onclick="UI.modal('modalReportes','close')">✕</button>
        <h2>📊 Centro de Reportes Unificados</h2>
        
        <div class="reportes-tabs">
          <button class="tab-btn active" data-tab="ventas">📊 Ventas Totales</button>
          <button class="tab-btn" data-tab="pagos">💳 Métodos de Pago</button>
          <button class="tab-btn" data-tab="deudas">💰 Deudas Pendientes</button>
          <button class="tab-btn" data-tab="lealtad">🎁 Lealtad</button>
        </div>

        <!-- TAB: VENTAS -->
        <div id="tab-ventas" class="tab-content active">
          <div class="resumen-cards">
             <div class="card-resumen">
               <h3>Total Facturado</h3>
               <p id="totalFacturado" class="monto-grande">₡0</p>
             </div>
             <div class="card-resumen">
               <h3>Cantidad Facturas</h3>
               <p id="totalFacturas" class="monto-grande">0</p>
             </div>
          </div>
          
          <h3>📅 Desglose por Día</h3>
          <div id="tablaVentasDia" class="table-container"></div>
        </div>

        <!-- TAB: MÉTODOS DE PAGO -->
        <div id="tab-pagos" class="tab-content">
           <div id="tablaMetodosPago" class="table-container"></div>
        </div>

        <!-- TAB: DEUDAS -->
        <div id="tab-deudas" class="tab-content">
           <div id="tablaDeudas" class="table-container"></div>
        </div>

        <!-- TAB: LEALTAD -->
        <div id="tab-lealtad" class="tab-content">
           <div id="tablaLealtad" class="table-container"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Tabs Logic
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    this.renderizarTodo();
  },

  renderizarTodo() {
    this.renderVentas();
    this.renderMetodosPago();
    this.renderDeudas();
    this.renderLealtad();
  },

  renderVentas() {
    const total = this.todasLasFacturas.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
    document.getElementById('totalFacturado').textContent = `₡${total.toLocaleString()}`;
    document.getElementById('totalFacturas').textContent = this.todasLasFacturas.length;

    // Agrupar por día
    const porDia = {};
    this.todasLasFacturas.forEach(f => {
      const dia = new Date(f.fecha).toLocaleDateString('es-CR');
      porDia[dia] = (porDia[dia] || 0) + (Number(f.total) || 0);
    });

    const container = document.getElementById('tablaVentasDia');
    const filas = Object.entries(porDia).map(([dia, monto]) => `
      <tr><td>${dia}</td><td>₡${monto.toLocaleString()}</td></tr>
    `).join('');

    container.innerHTML = `
      <table class="reporte-table">
        <thead><tr><th>Fecha</th><th>Total</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
      </table>
    `;
  },

  renderMetodosPago() {
    const metodos = {};
    this.todasLasFacturas.forEach(f => {
      const m = f.metodoPago || 'No especificado';
      metodos[m] = (metodos[m] || 0) + (Number(f.total) || 0);
    });

    const container = document.getElementById('tablaMetodosPago');
    const filas = Object.entries(metodos).map(([m, total]) => `
      <tr><td>${m}</td><td>₡${total.toLocaleString()}</td></tr>
    `).join('');

    container.innerHTML = `
      <table class="reporte-table">
        <thead><tr><th>Método</th><th>Total</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
      </table>
    `;
  },

  renderDeudas() {
    // Filtrar facturas pendientes (tanto nuevas como viejas)
    const deudas = this.todasLasFacturas.filter(f => {
      // Nueva: estado pendiente
      if (f.origen === 'rapida') return f.estado === 'pendiente';
      // Vieja: saldo > 0
      return (Number(f.saldo) || 0) > 0;
    });

    const container = document.getElementById('tablaDeudas');
    
    if (deudas.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:20px;">✅ No hay deudas pendientes</p>';
      return;
    }

    const filas = deudas.map(f => `
      <tr>
        <td>${f.clienteNombre || 'Cliente'}</td>
        <td>${new Date(f.fecha).toLocaleDateString()}</td>
        <td style="color:#e74c3c; font-weight:bold;">₡${(Number(f.total) || Number(f.saldo)).toLocaleString()}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="reporte-table">
        <thead><tr><th>Cliente</th><th>Fecha</th><th>Saldo</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    `;
  },

  renderLealtad() {
    // Calcular puntos simples (1 punto por cada ₡4,000)
    const puntosPorCliente = {};
    
    this.todasLasFacturas.forEach(f => {
      if (f.estado === 'completado' || (f.origen === 'legacy' && !f.saldo)) {
        const cid = f.clienteId;
        if (!puntosPorCliente[cid]) {
          puntosPorCliente[cid] = { nombre: f.clienteNombre, puntos: 0 };
        }
        const pts = Math.floor((Number(f.total) || 0) / 4000);
        puntosPorCliente[cid].puntos += pts;
      }
    });

    const container = document.getElementById('tablaLealtad');
    const lista = Object.values(puntosPorCliente).sort((a,b) => b.puntos - a.puntos);
    
    const filas = lista.map(c => `
      <tr><td>${c.nombre}</td><td style="font-weight:bold; color:#9b59b6;">🎁 ${c.puntos} pts</td></tr>
    `).join('');

    container.innerHTML = `
      <table class="reporte-table">
        <thead><tr><th>Cliente</th><th>Puntos Acumulados</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
      </table>
    `;
  }
};

export default ReportesManager;