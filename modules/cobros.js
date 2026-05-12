// modules/cobros.js
import { getDocs, collection, updateDoc, doc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';

export const CobrosManager = {
  todosLosClientes: [],
  clientesCache: [],
  clienteSeleccionado: null,

  async init() {
    console.log('💰 Módulo de Cobros cargado');
    await this.cargarClientes();
  },

  async cargarClientes() {
    try {
      const snap = await getDocs(collection(DB.db, "clientesBD"));
      this.clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('⚠️ Error cargando clientes:', e);
      this.clientesCache = [];
    }
  },

  // ✅ CARGAR FACTURAS Y CALCULAR DEUDAS
  async cargarBaseCobros() {
    try {
      this.todosLosClientes = [];
      const snap = await getDocs(collection(DB.db, "facturas_rapidas"));
      const hoy = new Date();

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const clienteInfo = this.clientesCache.find(c => c.id === data.clienteId) || {};
        
        // Calcular días de atraso
        const fechaFactura = new Date(data.fecha);
        const diasAtraso = data.estado === 'pendiente' 
          ? Math.floor((hoy - fechaFactura) / (1000 * 60 * 60 * 24)) 
          : 0;

        this.todosLosClientes.push({
          id: data.clienteId,
          nombre: data.clienteNombre || 'Cliente',
          telefono: data.clienteTelefono || '',
          cedula: data.clienteId,
          total: data.total || 0,
          pagado: data.pagado || 0,
          saldo: (data.total || 0) - (data.pagado || 0),
          estado: data.estado,
          metodoPago: data.metodoPago,
          fecha: data.fecha,
          diasAtraso,
          creditoBloqueado: clienteInfo.creditoBloqueado || false,
          productos: data.productos || []
        });
      });

      console.log(`✅ Cobros: ${this.todosLosClientes.length} facturas cargadas`);
    } catch (e) {
      console.error('❌ Error cargando cobros:', e);
    }
  },

  async mostrarPanelCobros() {

    // ✅ 1. LIMPIEZA PREVENTIVA (Esto soluciona el problema)
  const existingModal = document.getElementById('modalFacturacionRapida');
  if (existingModal) {
    existingModal.remove(); // Borra el modal viejo por completo
  }
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalCobros';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalCobros','close')">✕</button>
        <h2>💰 Gestión de Cobros</h2>
        
        <div class="cobros-tabs">
          <button class="tab-btn active" data-tab="pendientes">💳 Pendientes</button>
          <button class="tab-btn" data-tab="pagos">💵 Pagos por Tipo</button>
          <button class="tab-btn" data-tab="bloqueos">🚫 Bloquear Crédito</button>
        </div>

        <!-- TAB: PENDIENTES -->
        <div id="tab-pendientes" class="tab-content active">
          <div class="cobros-toolbar">
            <button id="btnRefreshCobros" class="btn-secondary">🔄 Actualizar</button>
            <input type="text" id="buscarPendiente" placeholder="🔍 Buscar cliente...">
          </div>
          <div id="listaPendientes" class="deudores-grid">
            <div class="loading-state">🔄 Cargando...</div>
          </div>
        </div>

        <!-- TAB: PAGOS POR TIPO -->
        <div id="tab-pagos" class="tab-content">
          <div class="resumen-pagos">
            <div class="pago-card efectivo">
              <h3>💵 Efectivo</h3>
              <p id="totalEfectivo" class="monto">₡0</p>
              <small id="countEfectivo">0 transacciones</small>
            </div>
            <div class="pago-card sinpe">
              <h3>📱 SINPE</h3>
              <p id="totalSinpe" class="monto">₡0</p>
              <small id="countSinpe">0 transacciones</small>
            </div>
            <div class="pago-card transferencia">
              <h3>🏦 Transferencia</h3>
              <p id="totalTransferencia" class="monto">₡0</p>
              <small id="countTransferencia">0 transacciones</small>
            </div>
          </div>
          <div id="detallePagos" class="tabla-pagos">
            <table class="reporte-table">
              <thead><tr><th>Cliente</th><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead>
              <tbody id="bodyPagos"></tbody>
            </table>
          </div>
        </div>

        <!-- TAB: BLOQUEAR CRÉDITO -->
        <div id="tab-bloqueos" class="tab-content">
          <div class="cobros-toolbar">
            <input type="text" id="buscarBloqueo" placeholder="🔍 Buscar cliente con deuda...">
          </div>
          <div id="listaBloqueos" class="bloqueos-grid">
            <div class="loading-state">🔄 Analizando deudas...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    await this.cargarBaseCobros();
    this.renderPendientes();
    this.renderPagosPorTipo();
    this.renderBloqueos();
    this.attachEvents();
  },

  attachEvents() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    // Refresh
    document.getElementById('btnRefreshCobros')?.addEventListener('click', async () => {
      await this.cargarBaseCobros();
      this.renderPendientes();
      this.renderPagosPorTipo();
      this.renderBloqueos();
      UI.toast('✅ Datos actualizados', 'success');
    });

    // Búsquedas
    document.getElementById('buscarPendiente')?.addEventListener('input', (e) => this.renderPendientes(e.target.value));
    document.getElementById('buscarBloqueo')?.addEventListener('input', (e) => this.renderBloqueos(e.target.value));
  },

  // ✅ RENDERIZAR PENDIENTES
  renderPendientes(filtro = '') {
    const container = document.getElementById('listaPendientes');
    const f = filtro.toLowerCase().trim();
    
    const pendientes = this.todosLosClientes.filter(c => 
      c.saldo > 0 && c.estado !== 'anulada' &&
      (f === '' || c.nombre.toLowerCase().includes(f) || c.cedula.includes(f))
    ).sort((a, b) => b.diasAtraso - a.diasAtraso);

    if (pendientes.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay saldos pendientes</p>';
      return;
    }

    container.innerHTML = pendientes.map(c => {
      const badgeClass = c.diasAtraso > 15 ? 'badge-danger' : c.diasAtraso > 7 ? 'badge-warning' : 'badge-info';
      const textoAtraso = c.diasAtraso > 15 ? `⚠️ ${c.diasAtraso} días` : `${c.diasAtraso} días`;
      
      return `
        <div class="pendiente-card ${c.creditoBloqueado ? 'bloqueado' : ''}">
          <div class="pendiente-header">
            <strong>👤 ${c.nombre}</strong>
            <span class="badge ${badgeClass}">${textoAtraso}</span>
          </div>
          <div class="pendiente-body">
            <p>📅 ${new Date(c.fecha).toLocaleDateString()}</p>
            <p>💰 Total: ₡${c.total.toLocaleString()}</p>
            <p>💸 Saldo: <strong style="color:#e74c3c">₡${c.saldo.toLocaleString()}</strong></p>
            ${c.creditoBloqueado ? '<p class="bloqueo-msg">🚫 Crédito bloqueado</p>' : ''}
          </div>
          <div class="pendiente-actions">
            <button onclick="CobrosManager.abrirModalAbono('${c.id}')">💵 Abonar</button>
            <button onclick="CobrosManager.enviarRecordatorio('${c.id}')">📱 WhatsApp</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ✅ RENDERIZAR PAGOS POR TIPO
  renderPagosPorTipo() {
    // Filtrar solo facturas pagadas/completadas
    const pagadas = this.todosLosClientes.filter(c => 
      c.estado === 'completado' && c.metodoPago && c.metodoPago !== 'Pendiente'
    );

    // Agrupar por método
    const resumen = {
      efectivo: { total: 0, count: 0 },
      sinpe: { total: 0, count: 0 },
      transferencia: { total: 0, count: 0 }
    };

    pagadas.forEach(f => {
      const metodo = f.metodoPago.toLowerCase();
      if (metodo.includes('efectivo')) {
        resumen.efectivo.total += f.total;
        resumen.efectivo.count++;
      } else if (metodo.includes('sinpe')) {
        resumen.sinpe.total += f.total;
        resumen.sinpe.count++;
      } else if (metodo.includes('transfer')) {
        resumen.transferencia.total += f.total;
        resumen.transferencia.count++;
      }
    });

    // Actualizar UI
    document.getElementById('totalEfectivo').textContent = `₡${resumen.efectivo.total.toLocaleString()}`;
    document.getElementById('countEfectivo').textContent = `${resumen.efectivo.count} transacciones`;
    document.getElementById('totalSinpe').textContent = `₡${resumen.sinpe.total.toLocaleString()}`;
    document.getElementById('countSinpe').textContent = `${resumen.sinpe.count} transacciones`;
    document.getElementById('totalTransferencia').textContent = `₡${resumen.transferencia.total.toLocaleString()}`;
    document.getElementById('countTransferencia').textContent = `${resumen.transferencia.count} transacciones`;

    // Tabla detallada
    const body = document.getElementById('bodyPagos');
    body.innerHTML = pagadas.map(f => `
      <tr>
        <td>${f.nombre}</td>
        <td>${new Date(f.fecha).toLocaleDateString()}</td>
        <td>${f.metodoPago}</td>
        <td>₡${f.total.toLocaleString()}</td>
      </tr>
    `).join('');
  },

  // ✅ RENDERIZAR BLOQUEOS DE CRÉDITO
  renderBloqueos(filtro = '') {
    const container = document.getElementById('listaBloqueos');
    const f = filtro.toLowerCase().trim();

    // Clientes con deuda > 15 días
    const conDeuda = this.todosLosClientes.filter(c => 
      c.saldo > 0 && c.diasAtraso > 15 &&
      (f === '' || c.nombre.toLowerCase().includes(f))
    );

    if (conDeuda.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay clientes con deuda >15 días</p>';
      return;
    }

    container.innerHTML = conDeuda.map(c => {
      const clienteBD = this.clientesCache.find(cb => cb.id === c.id);
      const yaBloqueado = clienteBD?.creditoBloqueado || false;
      
      return `
        <div class="bloqueo-card">
          <div class="bloqueo-info">
            <strong>👤 ${c.nombre}</strong>
            <p>📱 ${c.telefono || 'N/A'}</p>
            <p>💰 Deuda: <strong style="color:#e74c3c">₡${c.saldo.toLocaleString()}</strong></p>
            <p>⏰ Atraso: <strong>${c.diasAtraso} días</strong></p>
          </div>
          <div class="bloqueo-actions">
            ${yaBloqueado 
              ? `<button class="btn-unblock" onclick="CobrosManager.toggleCredito('${c.id}', false)">✅ Desbloquear Crédito</button>`
              : `<button class="btn-block" onclick="CobrosManager.toggleCredito('${c.id}', true)">🚫 Bloquear Crédito</button>`
            }
            <button onclick="CobrosManager.verDetalleCliente('${c.id}')">👁️ Ver Detalle</button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ✅ TOGGLE BLOQUEO DE CRÉDITO
  async toggleCredito(clienteId, bloquear) {
    if (!confirm(`¿${bloquear ? 'BLOQUEAR' : 'DES BLOQUEAR'} crédito para este cliente?`)) return;
    
    try {
      await updateDoc(doc(DB.db, "clientesBD", clienteId), {
        creditoBloqueado: bloquear,
        fechaUltimoCambioCredito: new Date().toISOString(),
        motivoCambio: bloquear ? 'Deuda >15 días' : 'Desbloqueado por admin'
      });
      
      // Actualizar cache local
      const cliente = this.clientesCache.find(c => c.id === clienteId);
      if (cliente) cliente.creditoBloqueado = bloquear;
      
      UI.toast(`✅ Crédito ${bloquear ? 'bloqueado' : 'desbloqueado'}`, 'success');
      this.renderBloqueos();
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al actualizar', 'error');
    }
  },

  // ✅ VALIDAR CRÉDITO ANTES DE FACTURAR (llamar desde facturacion-rapida-v2.js)
  async puedeFacturarACredito(clienteId) {
    try {
      const snap = await getDoc(doc(DB.db, "clientesBD", clienteId));
      if (!snap.exists()) return { ok: true }; // Cliente nuevo, permitir
      
      const data = snap.data();
      
      if (data.creditoBloqueado) {
        return { 
          ok: false, 
          message: `🚫 Crédito bloqueado para ${data.nombre}. Contactar administración.` 
        };
      }
      
      // Verificar deudas >15 días automáticamente
      const facturasSnap = await getDocs(collection(DB.db, "facturas_rapidas"));
      const hoy = new Date();
      let tieneDeudaVencida = false;
      
      facturasSnap.forEach(f => {
        const fd = f.data();
        if (fd.clienteId === clienteId && fd.estado === 'pendiente') {
          const dias = Math.floor((hoy - new Date(fd.fecha)) / (1000 * 60 * 60 * 24));
          if (dias > 15) tieneDeudaVencida = true;
        }
      });
      
      if (tieneDeudaVencida) {
        return { 
          ok: false, 
          message: `⚠️ Cliente tiene deudas vencidas (>15 días). Regularizar antes de nuevo crédito.` 
        };
      }
      
      return { ok: true };
    } catch (e) {
      console.error('Error validando crédito:', e);
      return { ok: true }; // Por seguridad, permitir si hay error
    }
  },

  // ✅ ABRIR MODAL DE ABONO
  async abrirModalAbono(clienteId) {
    const factura = this.todosLosClientes.find(f => f.id === clienteId && f.saldo > 0);
    if (!factura) return UI.toast('No hay saldo pendiente', 'warning');
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalAbonoCobros';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalAbonoCobros','close')">✕</button>
        <h2>💵 Registrar Abono</h2>
        <p><strong>Cliente:</strong> ${factura.nombre}</p>
        <p><strong>Saldo pendiente:</strong> ₡${factura.saldo.toLocaleString()}</p>
        
        <form id="formAbonoCobros">
          <input type="number" id="montoAbono" placeholder="Monto" min="1" max="${factura.saldo}" required>
          <select id="metodoAbono">
            <option value="Efectivo">💵 Efectivo</option>
            <option value="SINPE">📱 SINPE</option>
            <option value="Transferencia">🏦 Transferencia</option>
          </select>
          <input type="text" id="notaAbono" placeholder="Nota (opcional)">
          <button type="submit" class="btn-primary">✅ Confirmar Abono</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('formAbonoCobros').onsubmit = async (e) => {
      e.preventDefault();
      await this.procesarAbono(clienteId, factura.saldo);
    };
  },

  async procesarAbono(clienteId, saldoActual) {
    const monto = Number(document.getElementById('montoAbono').value) || 0;
    const metodo = document.getElementById('metodoAbono').value;
    const nota = document.getElementById('notaAbono').value;
    
    if (monto <= 0 || monto > saldoActual) {
      return UI.toast('Monto inválido', 'warning');
    }
    
    try {
      // Actualizar factura en Firebase
      const factRef = doc(DB.db, "facturas_rapidas", clienteId);
      const snap = await getDoc(factRef);
      const data = snap.data();
      
      const nuevoPagado = (data.pagado || 0) + monto;
      const nuevoSaldo = Math.max(0, (data.total || 0) - nuevoPagado);
      const nuevoEstado = nuevoSaldo <= 0 ? 'completado' : 'parcial';
      
      await updateDoc(factRef, {
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
        estado: nuevoEstado,
        abonos: arrayUnion({
          fecha: new Date().toISOString(),
          monto,
          metodo,
          nota: nota || ''
        })
      });
      
      UI.toast('✅ Abono registrado', 'success');
      UI.modal('modalAbonoCobros', 'close');
      await this.cargarBaseCobros();
      this.renderPendientes();
      this.renderPagosPorTipo();
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al procesar abono', 'error');
    }
  },

  async enviarRecordatorio(clienteId) {
    const factura = this.todosLosClientes.find(f => f.id === clienteId);
    if (!factura) return;
    
    const telefono = factura.telefono?.replace(/\D/g, '') || '';
    if (telefono.length < 8) return UI.toast('Teléfono inválido', 'warning');
    
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;
    const mensaje = `Hola ${factura.nombre},\n\nLe recordamos su saldo pendiente de *₡${factura.saldo.toLocaleString()}* con ${factura.diasAtraso} días de atraso.\n\n💳 Métodos:\n• SINPE: 72952454\n• IBAN: CR76015114620010283743\n\n¡Gracias! 🌸`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
  },

  async verDetalleCliente(clienteId) {
    // Implementar modal con historial completo del cliente
    UI.toast('Función en desarrollo', 'info');
  }
};

export default CobrosManager;