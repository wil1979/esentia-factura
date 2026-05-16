// modules/cobros.js
import { getDocs, collection, updateDoc, doc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const CobrosManager = {
  // ✅ Estado inicial seguro (evita undefined)
  clientesCache: [],
  facturasCache: [],
  clienteActivo: null,
  BASE_URL: "https://wil1979.github.io/esentia-factura",

  // ===============================
  // 🔄 CARGA DE DATOS
  // ===============================
  async init() {
    console.log('💰 Módulo de Cobros inicializado');
    await this.cargarBaseCobros();
  },

  async cargarBaseCobros() {
    try {
      this.clientesCache = [];
      this.facturasCache = [];

      // 1. Cargar clientes
      const snapClientes = await getDocs(collection(DB.db, "clientesBD"));
      const clientesBD = snapClientes.docs.map(d => ({ id: d.id, ...d.data() }));

      // 2. Cargar facturas rápidas
      const snapFacturas = await getDocs(collection(DB.db, "facturas_rapidas"));
      this.facturasCache = snapFacturas.docs.map(d => ({ id: d.id, ...d.data() }));

      // 3. Agrupar por cliente y calcular métricas
      this.clientesCache = clientesBD.map(c => {
        const facturas = this.facturasCache.filter(f => f.clienteId === c.id);
        const pendientes = facturas.filter(f => 
          (f.estado === 'pendiente' || f.estado === 'parcial') && 
          ((Number(f.total) || 0) - (Number(f.pagado) || 0)) > 0
        );

        const totalDeuda = pendientes.reduce((sum, f) => sum + ((Number(f.total) || 0) - (Number(f.pagado) || 0)), 0);
        const hoy = new Date();
        const diasMaxAtraso = pendientes.length 
          ? Math.max(...pendientes.map(f => Math.floor((hoy - new Date(f.fecha)) / 86400000)))
          : 0;

        return {
          ...c,
          facturas,
          pendientes,
          totalDeuda,
          diasMaxAtraso,
          creditoBloqueado: c.creditoBloqueado || false
        };
      }).filter(c => c.totalDeuda > 0); // Solo clientes con deuda

      console.log(`✅ Cobros: ${this.clientesCache.length} clientes con deuda cargados`);
    } catch (e) {
      console.error('❌ Error cargando base de cobros:', e);
      this.clientesCache = [];
    }
  },

  // ===============================
  // 🖥️ PANEL PRINCIPAL
  // ===============================
  async mostrarPanelCobros() {
    // Limpieza preventiva
    const existing = document.getElementById('modalCobros');
    if (existing) existing.remove();

    await this.cargarBaseCobros();

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

        <div id="tab-pendientes" class="tab-content active">
          <div class="cobros-toolbar">
            <button id="btnRefreshCobros" class="btn-secondary">🔄 Actualizar</button>
            <input type="text" id="buscarPendiente" placeholder="🔍 Buscar cliente...">
          </div>
          <div id="listaPendientes" class="deudores-grid">
            <div class="loading-state">🔄 Cargando...</div>
          </div>
        </div>

        <div id="tab-pagos" class="tab-content">
          <div class="resumen-pagos">
            <div class="pago-card efectivo"><h3>💵 Efectivo</h3><p id="totalEfectivo" class="monto">₡0</p><small id="countEfectivo">0 transacciones</small></div>
            <div class="pago-card sinpe"><h3>📱 SINPE</h3><p id="totalSinpe" class="monto">₡0</p><small id="countSinpe">0 transacciones</small></div>
            <div class="pago-card transferencia"><h3>🏦 Transferencia</h3><p id="totalTransferencia" class="monto">₡0</p><small id="countTransferencia">0 transacciones</small></div>
          </div>
          <div id="detallePagos" class="tabla-pagos">
            <table class="reporte-table">
              <thead><tr><th>Cliente</th><th>Fecha</th><th>Método</th><th>Monto</th></tr></thead>
              <tbody id="bodyPagos"></tbody>
            </table>
          </div>
        </div>

        <div id="tab-bloqueos" class="tab-content">
          <div class="cobros-toolbar">
            <input type="text" id="buscarBloqueo" placeholder="🔍 Buscar cliente con deuda...">
          </div>
          <div id="listaBloqueos" class="bloqueos-grid">
            <div class="loading-state">🔄 Analizando...</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
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

  // ===============================
  // 📊 RENDERIZADO DE VISTAS
  // ===============================
  renderPendientes(filtro = '') {
    const container = document.getElementById('listaPendientes');
    if (!container) return;

    const f = filtro.toLowerCase().trim();
    const filtrados = this.clientesCache.filter(c => 
      (f === '' || c.nombre.toLowerCase().includes(f) || c.cedula?.includes(f))
    );

    if (filtrados.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay saldos pendientes</p>';
      return;
    }

    container.innerHTML = filtrados.map(c => {
      const badgeClass = c.diasMaxAtraso > 15 ? 'badge-danger' : c.diasMaxAtraso > 7 ? 'badge-warning' : 'badge-info';
      const textoAtraso = c.diasMaxAtraso > 15 ? `⚠️ ${c.diasMaxAtraso} días` : `${c.diasMaxAtraso} días`;
      
      return `
        <div class="pendiente-card ${c.creditoBloqueado ? 'bloqueado' : ''}">
          <div class="pendiente-header">
            <strong>👤 ${c.nombre}</strong>
            <span class="badge ${badgeClass}">${textoAtraso}</span>
          </div>
          <div class="pendiente-body">
            <p>📱 ${c.telefono || 'N/A'} | 🆔 ${c.cedula || 'N/A'}</p>
            <p>🧾 Facturas pendientes: <strong>${c.pendientes.length}</strong></p>
            <p>💰 Saldo total: <strong style="color:#e74c3c">₡${c.totalDeuda.toLocaleString()}</strong></p>
            ${c.creditoBloqueado ? '<p class="bloqueo-msg">🚫 Crédito bloqueado</p>' : ''}
          </div>
          <div class="pendiente-actions">
            <button onclick="CobrosManager.abrirModalAbono('${c.id}')">💵 Abonar</button>
            <button onclick="CobrosManager.enviarRecordatorioDeuda('${c.id}')">📱 WhatsApp</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderPagosPorTipo() {
    const pagadas = this.facturasCache.filter(f => f.estado === 'completado' && f.metodoPago);
    const resumen = { efectivo: { total: 0, count: 0 }, sinpe: { total: 0, count: 0 }, transferencia: { total: 0, count: 0 } };

    pagadas.forEach(f => {
      const metodo = (f.metodoPago || '').toLowerCase();
      if (metodo.includes('efectivo') || metodo === 'contado') { resumen.efectivo.total += f.total; resumen.efectivo.count++; }
      else if (metodo.includes('sinpe')) { resumen.sinpe.total += f.total; resumen.sinpe.count++; }
      else if (metodo.includes('transfer')) { resumen.transferencia.total += f.total; resumen.transferencia.count++; }
    });

    document.getElementById('totalEfectivo').textContent = `₡${resumen.efectivo.total.toLocaleString()}`;
    document.getElementById('countEfectivo').textContent = `${resumen.efectivo.count} transacciones`;
    document.getElementById('totalSinpe').textContent = `₡${resumen.sinpe.total.toLocaleString()}`;
    document.getElementById('countSinpe').textContent = `${resumen.sinpe.count} transacciones`;
    document.getElementById('totalTransferencia').textContent = `₡${resumen.transferencia.total.toLocaleString()}`;
    document.getElementById('countTransferencia').textContent = `${resumen.transferencia.count} transacciones`;

    const body = document.getElementById('bodyPagos');
    if (body) {
      body.innerHTML = pagadas.slice(0, 50).map(f => `
        <tr><td>${f.clienteNombre}</td><td>${new Date(f.fecha).toLocaleDateString()}</td><td>${f.metodoPago}</td><td>₡${f.total.toLocaleString()}</td></tr>
      `).join('');
    }
  },

  renderBloqueos(filtro = '') {
    const container = document.getElementById('listaBloqueos');
    if (!container) return;

    const f = filtro.toLowerCase().trim();
    const conDeuda = this.clientesCache.filter(c => 
      c.diasMaxAtraso > 15 && (f === '' || c.nombre.toLowerCase().includes(f))
    );

    if (conDeuda.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay clientes con deuda >15 días</p>';
      return;
    }

    container.innerHTML = conDeuda.map(c => `
      <div class="bloqueo-card">
        <div class="bloqueo-info">
          <strong>👤 ${c.nombre}</strong>
          <p>📱 ${c.telefono || 'N/A'}</p>
          <p>💰 Deuda: <strong style="color:#e74c3c">₡${c.totalDeuda.toLocaleString()}</strong></p>
          <p>⏰ Atraso: <strong>${c.diasMaxAtraso} días</strong></p>
        </div>
        <div class="bloqueo-actions">
          ${c.creditoBloqueado 
            ? `<button class="btn-unblock" onclick="CobrosManager.toggleCredito('${c.id}', false)">✅ Desbloquear</button>`
            : `<button class="btn-block" onclick="CobrosManager.toggleCredito('${c.id}', true)">🚫 Bloquear Crédito</button>`
          }
        </div>
      </div>
    `).join('');
  },

  // ===============================
  // 💸 ABONO Y PAGO
  // ===============================
  async abrirModalAbono(clienteId) {
    // ✅ CORRECCIÓN: Validación segura del caché
    if (!this.clientesCache || !Array.isArray(this.clientesCache)) {
      UI.toast('⏳ Cargando datos, intenta de nuevo...', 'info');
      await this.cargarBaseCobros();
    }

    const cliente = this.clientesCache.find(c => c.id === clienteId);
    if (!cliente) {
      UI.toast('Cliente no encontrado', 'error');
      return;
    }

    this.clienteActivo = cliente;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalAbono';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalAbono','close')">✕</button>
        <h2>💵 Registrar Abono</h2>
        <p><strong>Cliente:</strong> ${cliente.nombre}</p>
        <p><strong>Saldo pendiente:</strong> ₡${cliente.totalDeuda.toLocaleString()}</p>
        
        <form id="formAbono">
          <input type="number" id="montoAbono" placeholder="Monto" min="1" max="${cliente.totalDeuda}" required 
                 style="width:100%; padding:8px; margin:5px 0; border:1px solid #ddd; border-radius:4px;">
          <select id="metodoAbono" style="width:100%; padding:8px; margin:5px 0; border:1px solid #ddd; border-radius:4px;">
            <option value="Efectivo">💵 Efectivo</option>
            <option value="SINPE">📱 SINPE</option>
            <option value="Transferencia">🏦 Transferencia</option>
          </select>
          <input type="text" id="notaAbono" placeholder="Nota (opcional)" 
                 style="width:100%; padding:8px; margin:5px 0; border:1px solid #ddd; border-radius:4px;">
          <button type="submit" class="btn-primary" style="width:100%; margin-top:10px;">✅ Confirmar Abono</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('formAbono').onsubmit = async (e) => {
      e.preventDefault();
      await this.procesarAbono(clienteId);
    };
  },

  async procesarAbono(clienteId) {
    const monto = Number(document.getElementById('montoAbono').value) || 0;
    const metodo = document.getElementById('metodoAbono').value;
    const nota = document.getElementById('notaAbono').value;
    const btn = document.querySelector('#formAbono button[type="submit"]');

    if (!btn) return console.error('❌ Botón no encontrado');
    if (monto <= 0) return UI.toast('Monto inválido', 'warning');

    btn.disabled = true;
    btn.textContent = '⏳ Procesando...';

    try {
      // Obtener facturas pendientes del cliente
      const pendientes = this.clientesActivo?.pendientes || this.clientesCache.find(c => c.id === clienteId)?.pendientes || [];
      if (pendientes.length === 0) throw new Error('No hay facturas pendientes');

      let montoRestante = monto;
      const facturasActualizadas = [];

      // Aplicar abono FIFO (primero las más antiguas)
      pendientes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      
      for (const fact of pendientes) {
        if (montoRestante <= 0) break;
        const saldoActual = (Number(fact.total) || 0) - (Number(fact.pagado) || 0);
        const aplicar = Math.min(saldoActual, montoRestante);
        
        const nuevoPagado = (Number(fact.pagado) || 0) + aplicar;
        const nuevoSaldo = Math.max(0, (Number(fact.total) || 0) - nuevoPagado);
        const nuevoEstado = nuevoSaldo <= 0 ? 'completado' : 'parcial';

        // Actualizar en Firebase
        await updateDoc(doc(DB.db, "facturas_rapidas", fact.id), {
          pagado: nuevoPagado,
          saldo: nuevoSaldo,
          estado: nuevoEstado,
          abonos: arrayUnion({
            fecha: new Date().toISOString(),
            monto: aplicar,
            metodo,
            nota: nota || ''
          })
        });

        facturasActualizadas.push(fact.id);
        montoRestante -= aplicar;
      }

      UI.toast('✅ Abono registrado correctamente', 'success');
      UI.modal('modalAbono', 'close');
      
      // Recargar datos y refrescar vistas
      await this.cargarBaseCobros();
      this.renderPendientes();
      this.renderPagosPorTipo();
      
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al procesar: ' + e.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✅ Confirmar Abono';
      }
    }
  },

  // ===============================
  // 📱 WHATSAPP & RECORDATORIOS
  // ===============================
  async enviarRecordatorioDeuda(clienteId) {
    const cliente = this.clientesCache.find(c => c.id === clienteId);
    if (!cliente || cliente.pendientes.length === 0) return UI.toast('✅ No tiene saldos pendientes', 'info');

    let telefono = cliente.telefono || '';
    telefono = telefono.replace(/\D/g, '');
    if (telefono.length < 8) return UI.toast('⚠️ Teléfono inválido', 'warning');
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;

    const hoy = new Date();
    let totalPendiente = 0;
    let tieneAtraso = false;
    let detalleFacturas = '';

    cliente.pendientes.forEach((f, i) => {
      const dias = Math.floor((hoy - new Date(f.fecha)) / 86400000);
      if (dias > 15) tieneAtraso = true;
      const saldo = (Number(f.total) || 0) - (Number(f.pagado) || 0);
      totalPendiente += saldo;
      const link = `${this.BASE_URL}/ver-factura.html?id=${f.id}`;
      detalleFacturas += `\n🧾 *Factura ${i+1}* (${new Date(f.fecha).toLocaleDateString()})\nMonto pendiente: ₡${saldo.toLocaleString()}\n${dias > 15 ? `⚠️ *Con ${dias} días de emisión.*\n` : ''}🔗 Ver e imprimir: ${link}\n`;
    });

    let mensaje = `Hola ${cliente.nombre} 🌸\n\nGracias por confiar en Esentia. Te compartimos un resumen de tus compras pendientes:\n${detalleFacturas}\n💰 *Total pendiente: ₡${totalPendiente.toLocaleString()}*\n\n💳 *Formas de pago:*\n📱 SINPE Móvil: 72952454\n🏦 IBAN: CR76015114620010283743\n💡 Opción rápida: SMS "PASE ${Math.round(totalPendiente)} 72952454"\n\n${tieneAtraso ? 'Te agradecemos regularizar tu cuenta a la brevedad. ¡Estamos para servirte! 💜' : 'Recuerda que puedes realizar tus abonos en cualquier momento. ¡Gracias! 💜'}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    UI.toast('📱 Recordatorio listo para enviar', 'success');
  },

  // ===============================
  // 🚫 BLOQUEO DE CRÉDITO
  // ===============================
  async toggleCredito(clienteId, bloquear) {
    if (!confirm(`¿${bloquear ? 'BLOQUEAR' : 'DESBLOQUEAR'} crédito para este cliente?`)) return;
    try {
      await updateDoc(doc(DB.db, "clientesBD", clienteId), {
        creditoBloqueado: bloquear,
        fechaUltimoCambioCredito: new Date().toISOString(),
        motivoCambio: bloquear ? 'Deuda >15 días' : 'Desbloqueado por admin'
      });
      
      const cliente = this.clientesCache.find(c => c.id === clienteId);
      if (cliente) cliente.creditoBloqueado = bloquear;
      
      UI.toast(`✅ Crédito ${bloquear ? 'bloqueado' : 'desbloqueado'}`, 'success');
      this.renderBloqueos();
      this.renderPendientes();
    } catch (e) { 
      UI.toast('❌ Error al actualizar', 'error'); 
    }
  },

  // ✅ VALIDAR CRÉDITO ANTES DE FACTURAR
  async puedeFacturarACredito(clienteId) {
    try {
      const snap = await getDoc(doc(DB.db, "clientesBD", clienteId));
      if (snap.exists() && snap.data().creditoBloqueado) {
        return { ok: false, message: `🚫 Crédito bloqueado. Contactar administración.` };
      }
      
      const hoy = new Date();
      const tieneDeudaVencida = this.facturasCache.some(f => 
        f.clienteId === clienteId && 
        f.estado === 'pendiente' && 
        Math.floor((hoy - new Date(f.fecha)) / 86400000) > 15
      );
      
      if (tieneDeudaVencida) {
        return { ok: false, message: `⚠️ Deudas >15 días. Regularizar antes de nuevo crédito.` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: true };
    }
  }
};

export default CobrosManager;