// modules/dashboard.js
import { getDocs, collection } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const DashboardManager = {
  async mostrarDashboard() {
    if (!Store.get('isAdmin')) { UI.toast('Acceso denegado', 'warning'); return; }
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalDashboard';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalDashboard','close')">✕</button>
        <h2>📊 Dashboard de Ventas</h2>
        <div id="dashboardContent"><div class="loading-state">🔄 Cargando métricas...</div></div>
      </div>`;
    document.body.appendChild(modal);
    await this.cargarMetricas();
  },

  async cargarMetricas() {
    const container = document.getElementById('dashboardContent');
    try {
      const facturasSnap = await getDocs(collection(DB.db, "facturas_rapidas"));
      
      let totalVentas = 0, totalFacturas = 0, facturasCompletadas = 0;
      let facturasPendientes = 0, montoPendiente = 0;
      const clientesConCompra = new Set();
      const ventasPorProducto = {};
      const ventasPorCliente = {};

      facturasSnap.forEach(docSnap => {
        const f = docSnap.data();
        const total = Number(f.total) || 0;
        const pagado = Number(f.pagado) || 0;
        const estado = f.estado || 'pendiente';
        const clienteId = f.clienteId || 'anonimo';
        const clienteNombre = f.clienteNombre || 'Cliente';

        totalFacturas++;
        
        if (estado === 'completado') {
          totalVentas += total;
          facturasCompletadas++;
          clientesConCompra.add(clienteId);
        } else if (estado === 'pendiente' || estado === 'parcial') {
          facturasPendientes++;
          montoPendiente += Math.max(0, total - pagado);
        }

        // Ventas por producto
        (f.productos || []).forEach(p => {
          const nombre = p.nombre || 'Producto';
          if (!ventasPorProducto[nombre]) ventasPorProducto[nombre] = { cantidad: 0, total: 0 };
          ventasPorProducto[nombre].cantidad += Number(p.cantidad) || 0;
          ventasPorProducto[nombre].total += Number(p.subtotal) || (Number(p.precio) * Number(p.cantidad)) || 0;
        });

        // Ventas por cliente
        if (!ventasPorCliente[clienteId]) ventasPorCliente[clienteId] = { nombre: clienteNombre, total: 0, facturas: 0 };
        ventasPorCliente[clienteId].total += total;
        ventasPorCliente[clienteId].facturas++;
      });

      const topProductos = Object.entries(ventasPorProducto).map(([n, d]) => ({ nombre: n, ...d })).sort((a, b) => b.total - a.total).slice(0, 5);
      const topClientes = Object.entries(ventasPorCliente).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.total - a.total).slice(0, 5);

      container.innerHTML = `
        <div class="dashboard-grid">
          <div class="kpi-card kpi-primary"><div class="kpi-icon">💰</div><div class="kpi-value">₡${totalVentas.toLocaleString()}</div><div class="kpi-label">Total Ventas</div></div>
          <div class="kpi-card"><div class="kpi-icon">📄</div><div class="kpi-value">${facturasCompletadas}</div><div class="kpi-label">Facturas Completadas</div></div>
          <div class="kpi-card kpi-warning"><div class="kpi-icon">⏳</div><div class="kpi-value">${facturasPendientes}</div><div class="kpi-label">Pendientes</div></div>
          <div class="kpi-card kpi-danger"><div class="kpi-icon">💳</div><div class="kpi-value">₡${montoPendiente.toLocaleString()}</div><div class="kpi-label">Monto Pendiente</div></div>
          <div class="kpi-card"><div class="kpi-icon">👥</div><div class="kpi-value">${clientesConCompra.size}</div><div class="kpi-label">Clientes Activos</div></div>
          <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-value">${totalFacturas}</div><div class="kpi-label">Total Facturas</div></div>
        </div>
        <div class="dashboard-section"><h3>🏆 Top 5 Clientes Más Compradores</h3><div class="top-carousel">${topClientes.map((c, i) => `<div class="carousel-item ${i===0?'first':''}"><div class="carousel-rank">#${i+1}</div><div class="carousel-info"><strong>${c.nombre}</strong><small>${c.facturas} compras</small></div><div class="carousel-amount">₡${c.total.toLocaleString()}</div></div>`).join('')}</div></div>
        <div class="dashboard-section"><h3>🔥 Top 5 Productos Más Vendidos</h3><div class="top-list">${topProductos.map((p, i) => `<div class="top-item"><span class="top-rank">#${i+1}</span><span class="top-name">${p.nombre}</span><span class="top-qty">${p.cantidad} unid.</span><span class="top-total">₡${p.total.toLocaleString()}</span></div>`).join('')}</div></div>
        <div class="dashboard-section"><h3>📈 Métricas Adicionales</h3><div class="metrics-grid"><div class="metric-box"><span class="metric-label">Ticket Promedio</span><span class="metric-value">₡${facturasCompletadas>0?Math.round(totalVentas/facturasCompletadas).toLocaleString():0}</span></div><div class="metric-box"><span class="metric-label">Compras por Cliente</span><span class="metric-value">${clientesConCompra.size>0?(totalFacturas/clientesConCompra.size).toFixed(1):0}</span></div><div class="metric-box"><span class="metric-label">% Cobranza</span><span class="metric-value">${(totalVentas+montoPendiente)>0?((totalVentas/(totalVentas+montoPendiente))*100).toFixed(1):0}%</span></div></div></div>`;
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="color:red">❌ Error al cargar métricas</p>';
    }
  }
};
export default DashboardManager;