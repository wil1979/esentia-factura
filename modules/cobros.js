// modules/cobros.js
import { getDocs, collection, updateDoc, doc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';

export const CobrosManager = {
  facturasCache: [],      // ✅ Todas las facturas individuales
  clientesCache: [],      // ✅ Info básica de clientes
  BASE_URL: "https://wil1979.github.io/esentia-factura",

  async init() {
    console.log('💰 Módulo de Cobros cargado');
    await this.cargarClientes();
  },

  // ✅ Cargar clientes para nombres/teléfonos de respaldo
  async cargarClientes() {
    try {
      const snap = await getDocs(collection(DB.db, "clientesBD"));
      this.clientesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('⚠️ Error cargando clientes:', e);
      this.clientesCache = [];
    }
  },

  // ✅ CORREGIDO: Cargar desde facturas_rapidas (documentos individuales)
  async cargarBaseCobros() {
    try {
      this.facturasCache = [];
      console.log('🔄 Cargando facturas_rapidas...');
      
      const snap = await getDocs(collection(DB.db, "facturas_rapidas"));
      const hoy = new Date();

      snap.forEach(docSnap => {
        const f = docSnap.data();
        
        // Calcular días de atraso solo si está pendiente
        const fechaFactura = new Date(f.fecha);
        const diasAtraso = f.estado === 'pendiente' 
          ? Math.floor((hoy - fechaFactura) / (1000 * 60 * 60 * 24)) 
          : 0;

        // Calcular saldo pendiente
        const pagado = Number(f.pagado) || 0;
        const total = Number(f.total) || 0;
        const saldo = Math.max(0, total - pagado);

        this.facturasCache.push({
          id: docSnap.id,                    // ID del documento de Firebase
          clienteId: f.clienteId,            // ID del cliente
          clienteNombre: f.clienteNombre || 'Cliente',
          clienteTelefono: f.clienteTelefono || '', // ✅ Teléfono directo de la factura
          cedula: f.clienteId,               // Usamos clienteId como cédula
          total,
          pagado,
          saldo,                             // ✅ Saldo calculado
          estado: f.estado || 'pendiente',
          metodoPago: f.metodoPago || 'contado',
          fecha: f.fecha,
          diasAtraso,
          productos: f.productos || [],
          tipoFactura: f.tipoFactura || 'rapida'
        });
      });

      console.log(`✅ Cobros: ${this.facturasCache.length} facturas cargadas`);
    } catch (e) {
      console.error('❌ Error cargando cobros:', e);
      this.facturasCache = [];
    }
  },

  async mostrarPanelCobros() {
    // ✅ Limpieza preventiva
    const existingModal = document.getElementById('modalCobros');
    if (existingModal) existingModal.remove();

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

  // ✅ RENDERIZAR PENDIENTES (agrupados por cliente)
  renderPendientes(filtro = '') {
    const container = document.getElementById('listaPendientes');
    if (!container) return;

    const f = filtro.toLowerCase().trim();
    
    // Filtrar facturas pendientes con saldo > 0
    const pendientes = this.facturasCache.filter(fact => 
      fact.saldo > 0 && fact.estado !== 'anulada' &&
      (f === '' || fact.clienteNombre.toLowerCase().includes(f) || fact.cedula.includes(f))
    );

    // Agrupar por cliente para mostrar deuda consolidada
    const porCliente = {};
    pendientes.forEach(fact => {
      if (!porCliente[fact.clienteId]) {
        porCliente[fact.clienteId] = {
          id: fact.clienteId,
          nombre: fact.clienteNombre,
          telefono: fact.clienteTelefono,
          cedula: fact.cedula,
          totalDeuda: 0,
          facturas: [],
          maxDiasAtraso: 0
        };
      }
      porCliente[fact.clienteId].totalDeuda += fact.saldo;
      porCliente[fact.clienteId].facturas.push(fact);
      if (fact.diasAtraso > porCliente[fact.clienteId].maxDiasAtraso) {
        porCliente[fact.clienteId].maxDiasAtraso = fact.diasAtraso;
      }
    });

    const lista = Object.values(porCliente).sort((a, b) => b.totalDeuda - a.totalDeuda);

    if (lista.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay saldos pendientes</p>';
      return;
    }

    container.innerHTML = lista.map(c => {
      const badgeClass = c.maxDiasAtraso > 15 ? 'badge-danger' : c.maxDiasAtraso > 7 ? 'badge-warning' : 'badge-info';
      const textoAtraso = c.maxDiasAtraso > 15 ? `⚠️ ${c.maxDiasAtraso} días` : `${c.maxDiasAtraso} días`;
      const tieneTelefono = c.telefono && c.telefono.length >= 8;
      
      return `
        <div class="pendiente-card">
          <div class="pendiente-header">
            <strong>👤 ${c.nombre}</strong>
            <span class="badge ${badgeClass}">${textoAtraso}</span>
          </div>
          <div class="pendiente-body">
            <p>📱 ${c.telefono || 'N/A'} | 🆔 ${c.cedula}</p>
            <p>🧾 Facturas pendientes: <strong>${c.facturas.length}</strong></p>
            <p>💰 Saldo total: <strong style="color:#e74c3c">₡${c.totalDeuda.toLocaleString()}</strong></p>
          </div>
          <div class="pendiente-actions">
            <button onclick="CobrosManager.verDetalleCliente('${c.id}')">👁️ Ver Facturas</button>
            <button onclick="CobrosManager.enviarRecordatorioDeuda('${c.id}')" 
                    ${!tieneTelefono ? 'disabled style="opacity:0.5"' : ''} 
                    class="btn-whatsapp-reminder">
              📱 WhatsApp ${!tieneTelefono ? '(Sin tel)' : ''}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ✅ RENDERIZAR PAGOS POR TIPO
  renderPagosPorTipo() {
    // Filtrar solo facturas completadas/pagadas
    const pagadas = this.facturasCache.filter(f => 
      f.estado === 'completado' && f.metodoPago && f.total > 0
    );

    // Agrupar por método
    const resumen = {
      efectivo: { total: 0, count: 0 },
      sinpe: { total: 0, count: 0 },
      transferencia: { total: 0, count: 0 }
    };

    pagadas.forEach(f => {
      const metodo = (f.metodoPago || '').toLowerCase();
      if (metodo.includes('efectivo') || metodo === 'contado') {
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
    if (body) {
      body.innerHTML = pagadas.map(f => `
        <tr>
          <td>${f.clienteNombre}</td>
          <td>${new Date(f.fecha).toLocaleDateString()}</td>
          <td>${f.metodoPago}</td>
          <td>₡${f.total.toLocaleString()}</td>
        </tr>
      `).join('');
    }
  },

  // ✅ RENDERIZAR BLOQUEOS (>15 días de atraso)
  renderBloqueos(filtro = '') {
    const container = document.getElementById('listaBloqueos');
    if (!container) return;
    
    const f = filtro.toLowerCase().trim();
    
    // Clientes con deuda > 15 días
    const conDeuda = this.facturasCache.filter(fact => 
      fact.saldo > 0 && fact.diasAtraso > 15 &&
      (f === '' || fact.clienteNombre.toLowerCase().includes(f))
    );

    // Agrupar por cliente
    const porCliente = {};
    conDeuda.forEach(fact => {
      if (!porCliente[fact.clienteId]) {
        porCliente[fact.clienteId] = {
          id: fact.clienteId,
          nombre: fact.clienteNombre,
          telefono: fact.clienteTelefono,
          deudaTotal: 0,
          maxDias: 0,
          facturas: []
        };
      }
      porCliente[fact.clienteId].deudaTotal += fact.saldo;
      porCliente[fact.clienteId].facturas.push(fact);
      if (fact.diasAtraso > porCliente[fact.clienteId].maxDias) {
        porCliente[fact.clienteId].maxDias = fact.diasAtraso;
      }
    });

    const lista = Object.values(porCliente);

    if (lista.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay clientes con deuda >15 días</p>';
      return;
    }

    container.innerHTML = lista.map(c => {
      const clienteBD = this.clientesCache.find(cb => cb.id === c.id);
      const yaBloqueado = clienteBD?.creditoBloqueado || false;
      
      return `
        <div class="bloqueo-card">
          <div class="bloqueo-info">
            <strong>👤 ${c.nombre}</strong>
            <p>📱 ${c.telefono || 'N/A'}</p>
            <p>💰 Deuda: <strong style="color:#e74c3c">₡${c.deudaTotal.toLocaleString()}</strong></p>
            <p>⏰ Atraso máximo: <strong>${c.maxDias} días</strong></p>
          </div>
          <div class="bloqueo-actions">
            ${yaBloqueado 
              ? `<button class="btn-unblock" onclick="CobrosManager.toggleCredito('${c.id}', false)">✅ Desbloquear</button>`
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
    } catch (e) { 
      UI.toast('❌ Error al actualizar', 'error'); 
    }
  },

  // ✅ VALIDAR CRÉDITO ANTES DE FACTURAR
  async puedeFacturarACredito(clienteId) {
    try {
      // Verificar si el cliente tiene bloqueo manual
      const snap = await getDoc(doc(DB.db, "clientesBD", clienteId));
      if (snap.exists() && snap.data().creditoBloqueado) {
        return { ok: false, message: `🚫 Crédito bloqueado. Contactar administración.` };
      }
      
      // Verificar deudas >15 días en facturas_rapidas
      const hoy = new Date();
      const facturasSnap = await getDocs(collection(DB.db, "facturas_rapidas"));
      let tieneDeudaVencida = false;
      
      facturasSnap.forEach(f => {
        const fd = f.data();
        if (fd.clienteId === clienteId && fd.estado === 'pendiente') {
          const dias = Math.floor((hoy - new Date(fd.fecha)) / (1000 * 60 * 60 * 24));
          if (dias > 15) tieneDeudaVencida = true;
        }
      });
      
      if (tieneDeudaVencida) {
        return { ok: false, message: `⚠️ Deudas >15 días. Regularizar antes de nuevo crédito.` };
      }
      
      return { ok: true };
    } catch (e) {
      console.error('Error validando crédito:', e);
      return { ok: true }; // Por seguridad, permitir si hay error
    }
  },

  // ✅ VER DETALLE DE FACTURAS POR CLIENTE
  async verDetalleCliente(clienteId) {
    const facturas = this.facturasCache.filter(f => f.clienteId === clienteId && f.saldo > 0);
    if (facturas.length === 0) return UI.toast('No hay facturas pendientes', 'info');
    
    const cliente = facturas[0];
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalDetalleFacturas';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalDetalleFacturas','close')">✕</button>
        <h2>📋 Facturas de ${cliente.clienteNombre}</h2>
        <p>📱 ${cliente.clienteTelefono || 'N/A'} | 🆔 ${cliente.cedula}</p>
        
        <div style="max-height: 60vh; overflow-y: auto; margin-top: 15px;">
          ${facturas.map(f => `
            <div style="border: 1px solid #eee; padding: 12px; margin-bottom: 10px; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <strong>📄 #${f.id.slice(-6).toUpperCase()}</strong>
                <span style="color: #e74c3c; font-weight: bold;">₡${f.saldo.toLocaleString()}</span>
              </div>
              <p style="margin: 4px 0; font-size: 0.9rem;">📅 ${new Date(f.fecha).toLocaleDateString()} | ⏰ ${f.diasAtraso} días</p>
              <p style="margin: 4px 0; font-size: 0.9rem;">💳 ${f.metodoPago?.toUpperCase()}</p>
              <div style="margin-top: 8px;">
                <button class="btn-sm" onclick="CobrosManager.abrirModalAbono('${f.id}', ${f.saldo})">💵 Abonar</button>
                <button class="btn-sm" onclick="ImpresionManager.imprimir('${f.id}')">🖨️ Imprimir</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // ✅ ABRIR MODAL DE ABONO PARA FACTURA ESPECÍFICA
  async abrirModalAbono(facturaId, saldo) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return UI.toast('Factura no encontrada', 'warning');
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalAbonoCobros';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalAbonoCobros','close')">✕</button>
        <h2>💵 Registrar Abono</h2>
        <p><strong>Factura:</strong> #${facturaId.slice(-6).toUpperCase()}</p>
        <p><strong>Cliente:</strong> ${factura.clienteNombre}</p>
        <p><strong>Saldo pendiente:</strong> ₡${saldo.toLocaleString()}</p>
        
        <form id="formAbonoCobros">
          <input type="number" id="montoAbono" placeholder="Monto" min="1" max="${saldo}" required>
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
      await this.procesarAbono(facturaId, saldo);
    };
  },

  // ✅ PROCESAR ABONO (actualizar factura en Firebase)
  // ✅ 1. FUNCIÓN CORREGIDA: procesarAbono
async procesarAbono(index) {
  const monto = Number(document.getElementById('montoAbono').value) || 0;
  const metodo = document.getElementById('metodoAbono').value;
  const nota = document.getElementById('notaAbono').value;
  const btn = document.querySelector('#formAbono button');

  if (monto <= 0) return UI.toast('Monto inválido', 'warning');

  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const snap = await getDoc(doc(DB.db, "facturas_rapidas", this.clienteSeleccionado));
    const data = snap.data();
    const compras = data.compras || [];
    const fact = compras[index];

    const nuevoPagado = (Number(fact.pagado) || 0) + monto;
    const nuevoSaldo = Math.max(0, (Number(fact.total) || 0) - nuevoPagado);
    const estado = nuevoSaldo <= 0 ? 'completado' : 'parcial';

    const abonoData = {
      fecha: new Date().toISOString(),
      monto,
      metodo,
      nota: nota || '',
      autor: Store.get('cliente')?.nombre || 'admin'
    };

    await updateDoc(doc(DB.db, "facturas_rapidas", this.clienteSeleccionado), {
      [`compras.${index}.pagado`]: nuevoPagado,
      [`compras.${index}.saldo`]: nuevoSaldo,
      [`compras.${index}.estado`]: estado,
      [`compras.${index}.fechaCompletado`]: nuevoSaldo <= 0 ? new Date().toISOString() : null,
      abonos: arrayUnion(abonoData)
    });

    UI.toast('✅ Abono registrado', 'success');

    // ✅ SOLO CERRAMOS EL MODAL DEL ABONO, NO EL DEL CLIENTE
    UI.modal('modalAbono', 'close');
    
    // ❌ ELIMINADA ESTA LÍNEA: UI.modal('modalDetalleDeuda', 'close');

    // Recargar datos globales
    await this.cargarBaseCobros();
    this.renderListaDeudores();
    this.renderListaHistorial();

    // ✅ REFRESCAR EL MODAL DETALLE PARA VER EL NUEVO SALDO SIN CERRAR
    if (this.clienteSeleccionado) {
      await this.verDetalleDeuda(this.clienteSeleccionado);
    }

  } catch (err) {
    console.error('Error en procesarAbono:', err);
    UI.toast('❌ Error al procesar pago: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Confirmar';
  }
},

// ✅ CORREGIDA: Carga correcta de datos y visualización del historial
async verDetalleDeuda(clienteId) {
  this.clienteSeleccionado = clienteId;
  
  // ✅ Evitar modales duplicados
  const modalExistente = document.getElementById('modalDetalleDeuda');
  if (modalExistente) modalExistente.remove();

  const clienteInfo = this.clientesCache.find(c => c.id === clienteId) || {};

  try {
    // ✅ Cargar desde la colección "facturas" (donde el ID es el del cliente)
    // para coincidir con cargarBaseCobros
    const snap = await getDoc(doc(DB.db, "facturas", clienteId));
    
    if (!snap.exists()) {
      UI.toast('Cliente no encontrado en la base', 'error');
      return;
    }
    
    const data = snap.data();
    const compras = data.compras || [];
    // Filtrar solo las que tienen saldo pendiente
    const deudas = compras.filter(c => (Number(c.saldo) || 0) > 0);
    
    // ✅ Cargar el log de recordatorios
    const recordatorios = data.recordatorios || []; 

    const modal = document.createElement('div');
    modal.className = 'modal show'; 
    modal.id = 'modalDetalleDeuda';
    modal.innerHTML = `
       <div class= "modal-content modal-grande " >
         <button class= "modal-close " onclick= "UI.modal('modalDetalleDeuda','close') " >✕ </button >
         <h2 >📋 Gestión de Cuenta: ${clienteInfo.nombre || 'Cliente'} </h2 >
        
         <div class= "cliente-info-box " >
           <p > <strong >👤 </strong > ${clienteInfo.nombre || clienteId} </p >
           <p > <strong >📱 </strong > ${clienteInfo.telefono || 'N/A'} </p >
           <p > <strong >💰 </strong > Saldo Total:  <span style= "color:#e74c3c;font-weight:700 " >₡${deudas.reduce((s,d) => s + (Number(d.saldo)||0), 0).toLocaleString()} </span > </p >
         </div >

         <h3 >📄 Facturas Pendientes </h3 >
         <div id= "facturasPendientes " >
          ${deudas.length === 0 ? ' <p class= "no-data " >✅ Sin deudas pendientes </p >' : deudas.map((fact) => {
            // Encontrar el índice real en el array original para poder abonar
            const realIdx = compras.indexOf(fact);
            return `
               <div class= "factura-pendiente " >
                 <div class= "fp-header " >
                   <span >📅 ${new Date(fact.fecha).toLocaleDateString()} </span >
                   <span class= "fp-saldo " >Saldo: ₡${Number(fact.saldo).toLocaleString()} </span >
                 </div >
                 <div class= "fp-items " >${fact.productos.map(p=>` <small >• ${p.nombre} (x${p.cantidad}) </small >`).join('')} </div >
                 <button class= "btn-abonar " onclick= "CobrosManager.abrirModalAbono(${realIdx}, ${Number(fact.saldo)}) " >💸 Registrar Abono </button >
               </div >
            `;
          }).join('')}
         </div >

         <!-- ✅ SECCIÓN: HISTORIAL DE NOTIFICACIONES (WHATSAPP) -->
         <div class= "historial-recordatorios " >
           <h4 >📱 Historial de Contactos </h4 >
          ${recordatorios.length > 0 
            ? recordatorios.map(r => `
                 <div class= "log-item " >
                   <span class= "log-date " >🗓️ ${new Date(r.fecha).toLocaleString()} </span >
                   <span class= "log-info " >₡${r.monto.toLocaleString()} → ${r.telefono} </span >
                   <span class= "log-tipo " style= "font-size:0.8em;color:#666 " >(${r.tipo || 'recordatorio'}) </span >
                 </div >
              `).join('')
            : ' <p class= "no-data " style= "font-size:0.9em " >ℹ️ No hay notificaciones registradas. </p >'}
         </div >
       </div >
    `;
    document.body.appendChild(modal);
  } catch(e) { 
    console.error(e); 
    UI.toast('Error al cargar detalles', 'error'); 
  }
},

  // ✅ ENVIAR RECORDATORIO UNIFICADO CON ENLACES
  async enviarRecordatorioDeuda(clienteId) {
    // Filtrar facturas pendientes del cliente
    const facturasPendientes = this.facturasCache.filter(f => 
      f.clienteId === clienteId && f.saldo > 0 && f.estado !== 'anulada'
    );
    
    if (facturasPendientes.length === 0) {
      return UI.toast('✅ No tiene saldos pendientes', 'info');
    }

    const cliente = facturasPendientes[0];
    
    // Validar teléfono
    let telefono = cliente.clienteTelefono || '';
    telefono = telefono.replace(/\D/g, '');
    if (telefono.length < 8) {
      return UI.toast(`⚠️ Teléfono inválido: ${telefono || 'Sin teléfono'}`, 'warning');
    }
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;

    // Calcular totales y días
    const hoy = new Date();
    let totalPendiente = 0;
    let tieneAtraso = false;
    
    const detalleFacturas = facturasPendientes.map(f => {
      const dias = Math.floor((hoy - new Date(f.fecha)) / (1000 * 60 * 60 * 24));
      if (dias > 15) tieneAtraso = true;
      totalPendiente += f.saldo;
      const verLink = `${this.BASE_URL}/ver-factura.html?id=${f.id}`;
      return {
        fecha: new Date(f.fecha).toLocaleDateString(),
        saldo: f.saldo,
        dias,
        link: verLink
      };
    });

    // Construir mensaje AMIGABLE y UNIFICADO
    let mensaje = `Hola ${cliente.clienteNombre} 🌸\n\n`;
    mensaje += `Gracias por confiar en Esentia. Te compartimos un resumen de tus compras pendientes:\n\n`;

    detalleFacturas.forEach((item, index) => {
      mensaje += `🧾 *Factura ${index + 1}* (${item.fecha})\n`;
      mensaje += `Monto pendiente: ₡${item.saldo.toLocaleString()}\n`;
      if (item.dias > 15) {
        mensaje += `⚠️ *Con ${item.dias} días desde la emisión.*\n`;
      }
      mensaje += `🔗 Ver e imprimir: ${item.link}\n\n`;
    });

    mensaje += `💰 *Total pendiente: ₡${totalPendiente.toLocaleString()}*\n\n`;
    mensaje += `💳 *Formas de pago:*\n`;
    mensaje += `📱 SINPE Móvil: 72952454\n`;
   // mensaje += `🏦 IBAN: CR76015114620010283743\n`;
   // mensaje += `💡 Opción rápida: SMS "PASE ${Math.round(totalPendiente)} 72952454"\n\n`;

    if (tieneAtraso) {
      mensaje += `Te agradecemos regularizar tu cuenta a la brevedad. ¡Estamos para servirte! 💜`;
    } else {
      mensaje += `Recuerda que puedes realizar tus abonos en cualquier momento. ¡Gracias! 💜`;
    }

    // Abrir WhatsApp
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    UI.toast('📱 Recordatorio listo para enviar', 'success');
  }
};

export default CobrosManager;