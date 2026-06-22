// modules/cobros.js
import { getDocs, collection, updateDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

export const CobrosManager = {
  clientesCache: [],
  facturasCache: [],
  clienteActivo: null,
  BASE_URL: "https://wil1979.github.io/esentia-factura",
  _isOpening: false,
  _eventListeners: [],

  async init() {
    console.log('💰 Módulo de Cobros inicializado');
    await this.cargarBaseCobros();
  },

  async cargarBaseCobros() {
    try {
      this.clientesCache = [];
      this.facturasCache = [];
      
      const snapClientes = await getDocs(collection(DB.db, "clientesBD"));
      const clientesBD = snapClientes.docs.map(d => ({ id: d.id, ...d.data() }));

      const snapRapidas = await getDocs(collection(DB.db, "facturas_rapidas"));
      const facturasRapidas = snapRapidas.docs.map(d => ({ id: d.id, ...d.data(), origen: 'rapida' }));

      const snapFacturas = await getDocs(collection(DB.db, "facturas"));
      let facturasWeb = [];
      snapFacturas.forEach(docSnap => {
        const data = docSnap.data();
        const compras = Array.isArray(data.compras) ? data.compras : [];
        compras.forEach((compra, index) => {
          facturasWeb.push({
            id: `${docSnap.id}_web_${index}`,
            clienteId: docSnap.id,
            clienteNombre: data.nombre || 'Cliente Web',
            clienteTelefono: data.telefono || '',
            ...compra,
            origen: 'web'
          });
        });
      });

      this.facturasCache = [...facturasRapidas, ...facturasWeb];
      console.log(`📊 Total Facturas cargadas: ${this.facturasCache.length} (Rápidas: ${facturasRapidas.length}, Web: ${facturasWeb.length})`);

      this.clientesCache = clientesBD.map(c => {
        const facturas = this.facturasCache.filter(f => String(f.clienteId) === String(c.id));
        
        const pendientes = facturas.filter(f => {
          const saldo = (Number(f.total) || 0) - (Number(f.pagado) || 0);
          const estadoValido = ['pendiente', 'parcial', 'despachado', 'activo', 'en_proceso'].includes(f.estado);
          return estadoValido && saldo > 0.5; 
        });

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
      }).filter(c => c.totalDeuda > 0);

      console.log(`✅ Cobros: ${this.clientesCache.length} clientes con deuda cargados`);
    } catch (e) {
      console.error('❌ Error cargando base de cobros:', e);
      this.clientesCache = [];
    }
  },

  async mostrarPanelCobros() {
    if (this._isOpening) return;
    this._isOpening = true;
    try {
      const existing = document.getElementById('modalCobros');
      if (existing) {
        this._clearEventListeners();
        existing.remove();
      }

      await this.cargarBaseCobros();

      const modal = document.createElement('div');
      modal.className = 'modal show';
      modal.id = 'modalCobros';
      modal.innerHTML = `
        <div class="modal-content modal-xl">
          <button class="modal-close" onclick="CobrosManager.cerrarModalCobros()">✕</button>
          <h2>💰 Gestión de Cobros y Abonos</h2>
          <div class="cobros-tabs">
            <button class="tab-btn active" data-tab="pendientes">💳 Pendientes</button>
            <button class="tab-btn" data-tab="bloqueos">🚫 Bloquear Crédito</button>
          </div>
          <div id="tab-pendientes" class="tab-content active">
            <div class="cobros-toolbar">
              <button id="btnRefreshCobros" class="btn-secondary">🔄 Actualizar</button>
              <input type="text" id="buscarPendiente" placeholder="🔍 Buscar cliente...">
            </div>
            <div id="listaPendientes" class="deudores-grid"><div class="loading-state">🔄 Cargando...</div></div>
          </div>
          <div id="tab-bloqueos" class="tab-content">
            <div class="cobros-toolbar"><input type="text" id="buscarBloqueo" placeholder="🔍 Buscar cliente con deuda..."></div>
            <div id="listaBloqueos" class="bloqueos-grid"><div class="loading-state">Analizando...</div></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      this.renderPendientes();
      this.renderBloqueos();
      this.attachEvents();

    } catch (error) {
      console.error('Error abriendo panel de cobros:', error);
      UI.toast('❌ Error al abrir cobros', 'error');
    } finally {
      this._isOpening = false;
    }
  },

  cerrarModalCobros() {
    this._clearEventListeners();
    UI.modal('modalCobros', 'close');
  },

  _clearEventListeners() {
    this._eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) element.removeEventListener(event, handler);
    });
    this._eventListeners = [];
  },

  _addTrackedListener(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    this._eventListeners.push({ element, event, handler });
  },

  attachEvents() {
    this._clearEventListeners();
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      const handler = () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabContent = document.getElementById(`tab-${btn.dataset.tab}`);
        if (tabContent) tabContent.classList.add('active');
      };
      this._addTrackedListener(btn, 'click', handler);
    });

    const btnRefresh = document.getElementById('btnRefreshCobros');
    if (btnRefresh) {
      this._addTrackedListener(btnRefresh, 'click', async () => {
        btnRefresh.disabled = true;
        try {
          await this.cargarBaseCobros();
          this.renderPendientes(); 
          this.renderBloqueos();
          UI.toast('✅ Datos actualizados', 'success');
        } catch (e) { console.error(e); } 
        finally { btnRefresh.disabled = false; }
      });
    }

    const buscarPendiente = document.getElementById('buscarPendiente');
    if (buscarPendiente) this._addTrackedListener(buscarPendiente, 'input', (e) => this.renderPendientes(e.target.value));

    const buscarBloqueo = document.getElementById('buscarBloqueo');
    if (buscarBloqueo) this._addTrackedListener(buscarBloqueo, 'input', (e) => this.renderBloqueos(e.target.value));
  },

  renderPendientes(filtro = '') {
    const container = document.getElementById('listaPendientes');
    if (!container) return;
    const f = filtro.toLowerCase().trim();
    const filtrados = this.clientesCache.filter(c => (f === '' || c.nombre.toLowerCase().includes(f) || c.cedula?.includes(f)));
    
    if (filtrados.length === 0) {
      container.innerHTML = '<p class="no-data">✅ No hay saldos pendientes</p>';
      return;
    }

    container.innerHTML = filtrados.map(c => {
      const badgeClass = c.diasMaxAtraso > 15 ? 'badge-danger' : c.diasMaxAtraso > 7 ? 'badge-warning' : 'badge-info';
      const textoAtraso = c.diasMaxAtraso > 15 ? `⚠️ ${c.diasMaxAtraso} días` : `${c.diasMaxAtraso} días`;
      
      const facturasHTML = c.pendientes.map(fact => {
        const saldo = (Number(fact.total) || 0) - (Number(fact.pagado) || 0);
        const abonosCount = (fact.abonos || []).length;
        const origenBadge = fact.origen === 'web' ? '<span class="badge badge-web" style="font-size:0.6rem; margin-left:5px;">WEB</span>' : '';
        return `
          <div class="factura-pendiente-mini">
            <div>
              <strong>Factura #${fact.id.slice(-6).toUpperCase()} ${origenBadge}</strong> 
              <small>(${new Date(fact.fecha).toLocaleDateString()})</small><br>
              <span class="badge badge-warning">Saldo: ₡${saldo.toLocaleString()}</span>
              <small style="color:var(--text-muted)"> | ${abonosCount} abono(s)</small>
            </div>
            <div class="mini-actions">
              <button class="btn-sm btn-primary" onclick="CobrosManager.abrirModalAbono('${c.id}', '${fact.id}')">💵 Abonar</button>
              <button class="btn-sm btn-secondary" onclick="CobrosManager.gestionarAbonos('${fact.id}')">📋 Gestionar</button>
              <button class="btn-sm btn-danger" onclick="CobrosManager.eliminarFactura('${fact.id}')" title="Eliminar factura completa">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="pendiente-card ${c.creditoBloqueado ? 'bloqueado' : ''}">
          <div class="pendiente-header">
            <strong>👤 ${c.nombre}</strong>
            <span class="badge ${badgeClass}">${textoAtraso}</span>
          </div>
          <div class="pendiente-body">
            <p>📱 ${c.telefono || 'N/A'} | 🆔 ${c.cedula || 'N/A'}</p>
            <p>💰 <strong>Deuda Total: ₡${c.totalDeuda.toLocaleString()}</strong></p>
            ${c.creditoBloqueado ? '<p class="bloqueo-msg">🚫 Crédito bloqueado</p>' : ''}
            <div class="facturas-list-mini">
              ${facturasHTML}
            </div>
          </div>
          <div class="pendiente-actions">
            <button onclick="CobrosManager.enviarRecordatorioDeuda('${c.id}')">📱 WhatsApp General</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderBloqueos(filtro = '') {
    const container = document.getElementById('listaBloqueos');
    if (!container) return;
    const f = filtro.toLowerCase().trim();
    const conDeuda = this.clientesCache.filter(c => c.diasMaxAtraso > 15 && (f === '' || c.nombre.toLowerCase().includes(f)));
    if (conDeuda.length === 0) { container.innerHTML = '<p class="no-data">✅ No hay clientes con deuda >15 días</p>'; return; }
    
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
            : `<button class="btn-block" onclick="CobrosManager.toggleCredito('${c.id}', true)">🚫 Bloquear Crédito</button>`}
        </div>
      </div>
    `).join('');
  },

  async abrirModalAbono(clienteId, facturaId) {
    const modalAnterior = document.getElementById('modalAbono');
    if (modalAnterior) modalAnterior.remove();

    await this.cargarBaseCobros();

    const cliente = this.clientesCache.find(c => c.id === clienteId);
    const factura = this.facturasCache.find(f => f.id === facturaId);
    
    if (!cliente || !factura) { 
      UI.toast('❌ Datos no encontrados. Recargando...', 'warning');
      await this.cargarBaseCobros();
      return; 
    }
    
    this.clienteActivo = cliente;
    const saldoPendiente = Math.max(0, (Number(factura.total) || 0) - (Number(factura.pagado) || 0));

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalAbono';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="CobrosManager.cerrarModalAbono()">✕</button>
        <h2>💵 Registrar Abono</h2>
        <p><strong>Cliente:</strong> ${cliente.nombre}</p>
        <p><strong>Factura:</strong> #${facturaId.slice(-6).toUpperCase()} ${factura.origen === 'web' ? '(Web)' : ''}</p>
        <p><strong>Saldo pendiente:</strong> <span style="color:#e74c3c; font-weight:700;">₡${saldoPendiente.toLocaleString()}</span></p>
        
        <div id="formAbono" style="margin-top:15px;">
          <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:4px;">
            💰 Monto a abonar (puede modificar si es parcial):
          </label>
          <input type="number" id="montoAbono" 
                 value="${saldoPendiente}" 
                 min="1" 
                 max="${saldoPendiente}" 
                 required 
                 style="width:100%; padding:10px; margin-bottom:10px; border:1.5px solid var(--border); border-radius:6px; font-size:1rem; font-weight:600;">
          
          <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:4px;">💳 Método de pago:</label>
          <select id="metodoAbono" style="width:100%; padding:10px; margin-bottom:10px; border:1.5px solid var(--border); border-radius:6px;">
            <option value="Efectivo">💵 Efectivo</option>
            <option value="SINPE">📱 SINPE</option>
            <option value="Transferencia">🏦 Transferencia</option>
          </select>
          
          <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:4px;">📝 Nota (opcional):</label>
          <input type="text" id="notaAbono" placeholder="Ej: Abono quincenal" 
                 style="width:100%; padding:10px; margin-bottom:15px; border:1.5px solid var(--border); border-radius:6px;">
          
          <button type="button" id="btnConfirmarAbono" class="btn-primary" style="width:100%;">
            ✅ Confirmar Abono
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const btnConfirmar = document.getElementById('btnConfirmarAbono');
    btnConfirmar.addEventListener('click', async () => {
      await this.procesarAbono(clienteId, facturaId);
    });

    const handleEsc = (e) => {
      if (e.key === 'Escape') this.cerrarModalAbono();
    };
    document.addEventListener('keydown', handleEsc, { once: true });

    setTimeout(() => document.getElementById('montoAbono')?.select(), 100);
  },

  cerrarModalAbono() {
    const modal = document.getElementById('modalAbono');
    if (modal) modal.remove();
  },

  async procesarAbono(clienteId, facturaId) {
    const montoInput = document.getElementById('montoAbono');
    const metodoInput = document.getElementById('metodoAbono');
    const notaInput = document.getElementById('notaAbono');
    const btn = document.getElementById('btnConfirmarAbono');
    
    if (!montoInput || !btn) return;

    const monto = Number(montoInput.value) || 0;
    const metodo = metodoInput?.value || 'Efectivo';
    const nota = notaInput?.value || '';

    if (monto <= 0) {
      UI.toast('⚠️ Monto inválido', 'warning');
      return;
    }

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = '⏳ Procesando...';

    try {
      await this.cargarBaseCobros();
      const factura = this.facturasCache.find(f => f.id === facturaId);
      if (!factura) throw new Error('Factura no encontrada en la base de datos');

      const saldoActual = Math.max(0, (Number(factura.total) || 0) - (Number(factura.pagado) || 0));
      
      if (monto > saldoActual + 0.5) {
        UI.toast(`⚠️ El monto (₡${monto}) excede el saldo (₡${saldoActual})`, 'warning');
        throw new Error('Monto excede saldo');
      }

      const aplicar = Math.min(saldoActual, monto);
      const nuevoPagado = (Number(factura.pagado) || 0) + aplicar;
      const nuevoSaldo = Math.max(0, (Number(factura.total) || 0) - nuevoPagado);
      const nuevoEstado = nuevoSaldo <= 0.5 ? 'completado' : 'parcial';

      const abonosActuales = factura.abonos || [];
      abonosActuales.push({ 
        fecha: new Date().toISOString(), 
        monto: aplicar, 
        metodo, 
        nota: nota || 'Abono' 
      });

      if (factura.origen === 'web') {
        const [clientId, , indexStr] = facturaId.split('_web_');
        const index = parseInt(indexStr);
        const docRef = doc(DB.db, "facturas", clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const compras = data.compras || [];
          if (compras[index]) {
            compras[index].pagado = nuevoPagado;
            compras[index].saldo = nuevoSaldo;
            compras[index].estado = nuevoEstado;
            compras[index].abonos = abonosActuales;
            await updateDoc(docRef, { compras: compras });
          }
        }
      } else {
        await updateDoc(doc(DB.db, "facturas_rapidas", facturaId), {
          pagado: nuevoPagado, 
          saldo: nuevoSaldo, 
          estado: nuevoEstado, 
          abonos: abonosActuales
        });
      }

      UI.toast(`✅ Abono de ₡${aplicar.toLocaleString()} registrado`, 'success');
      
      this.cerrarModalAbono();
      
      await this.cargarBaseCobros();
      this.renderPendientes();
      this.renderBloqueos();

    } catch (e) {
      console.error('Error procesando abono:', e);
      UI.toast('❌ ' + (e.message || 'Error al procesar'), 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = textoOriginal;
      }
    }
  },

  // ✅ NUEVO: ELIMINAR FACTURA COMPLETA
  async eliminarFactura(facturaId) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar esta factura COMPLETA?\n\nEsta acción no se puede deshacer y eliminará todos los abonos registrados.')) {
      return;
    }

    try {
      const factura = this.facturasCache.find(f => f.id === facturaId);
      if (!factura) {
        UI.toast('❌ Factura no encontrada', 'error');
        return;
      }

      if (factura.origen === 'web') {
        // Factura web: eliminar del array 'compras' en el documento del cliente
        const [clientId, , indexStr] = facturaId.split('_web_');
        const index = parseInt(indexStr);
        const docRef = doc(DB.db, "facturas", clientId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const compras = data.compras || [];
          
          if (compras[index]) {
            compras.splice(index, 1);
            await updateDoc(docRef, { compras: compras });
            UI.toast('🗑️ Factura web eliminada correctamente', 'success');
          } else {
            UI.toast('❌ No se encontró la factura en el historial', 'error');
          }
        }
      } else {
        // Factura rápida: eliminar el documento completo
        await deleteDoc(doc(DB.db, "facturas_rapidas", facturaId));
        UI.toast('🗑️ Factura rápida eliminada correctamente', 'success');
      }

      // Recargar datos y actualizar UI
      await this.cargarBaseCobros();
      this.renderPendientes();
      this.renderBloqueos();

    } catch (e) {
      console.error('Error eliminando factura:', e);
      UI.toast('❌ Error al eliminar: ' + e.message, 'error');
    }
  },

  async gestionarAbonos(facturaId) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return UI.toast('Factura no encontrada', 'error');

    const existing = document.getElementById('modalGestionAbonos');
    if (existing) existing.remove();

    const abonos = factura.abonos || [];
    const abonosHTML = abonos.length > 0 ? abonos.map((a, index) => `
      <div class="abono-gestion-row">
        <div class="abono-info">
          <strong>📅 ${new Date(a.fecha).toLocaleString()}</strong>
          <span class="badge badge-info">${a.metodo}</span>
          <p class="abono-monto">₡${Number(a.monto).toLocaleString()}</p>
          <small class="abono-nota">${a.nota || 'Sin nota'}</small>
        </div>
        <div class="abono-actions">
          <button class="btn-sm btn-secondary" onclick="CobrosManager.editarAbono('${facturaId}', ${index})" title="Editar">✏️</button>
          <button class="btn-sm btn-danger" onclick="CobrosManager.eliminarAbono('${facturaId}', ${index})" title="Eliminar">🗑️</button>
          <button class="btn-sm btn-primary" onclick="CobrosManager.imprimirAbono('${facturaId}', ${index})" title="Imprimir">🖨️</button>
          <button class="btn-sm btn-success" onclick="CobrosManager.enviarAbonoWA('${facturaId}', ${index})" title="WhatsApp">📱</button>
        </div>
      </div>
    `).join('') : '<p class="no-data" style="padding:20px; text-align:center;">No hay abonos registrados.</p>';

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalGestionAbonos';
    modal.innerHTML = `
      <div class="modal-content modal-grande">
        <button class="modal-close" onclick="UI.modal('modalGestionAbonos','close')">✕</button>
        <h2>📋 Gestión de Abonos</h2>
        <p><strong>Factura:</strong> #${facturaId.slice(-6).toUpperCase()} ${factura.origen === 'web' ? '(Web)' : ''} | <strong>Cliente:</strong> ${factura.clienteNombre}</p>
        <p><strong>Total:</strong> ₡${(Number(factura.total)||0).toLocaleString()} | <strong>Pagado:</strong> ₡${(Number(factura.pagado)||0).toLocaleString()} | <strong>Saldo:</strong> ₡${(Number(factura.saldo)||0).toLocaleString()}</p>
        <div class="abonos-gestion-list">${abonosHTML}</div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async eliminarAbono(facturaId, abonoIndex) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este abono? Se recalculará el saldo.')) return;
    try {
      const factura = this.facturasCache.find(f => f.id === facturaId);
      const abonos = [...(factura.abonos || [])];
      const abonoEliminado = abonos.splice(abonoIndex, 1)[0];
      
      const nuevoPagado = Math.max(0, (Number(factura.pagado) || 0) - Number(abonoEliminado.monto));
      const nuevoSaldo = Math.max(0, (Number(factura.total) || 0) - nuevoPagado);
      const nuevoEstado = nuevoSaldo <= 0.5 ? 'completado' : (nuevoPagado === 0 ? 'pendiente' : 'parcial');

      if (factura.origen === 'web') {
        const [clientId, , indexStr] = facturaId.split('_web_');
        const docRef = doc(DB.db, "facturas", clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const compras = docSnap.data().compras || [];
          const index = parseInt(indexStr);
          if (compras[index]) {
            compras[index].pagado = nuevoPagado; 
            compras[index].saldo = nuevoSaldo;
            compras[index].estado = nuevoEstado; 
            compras[index].abonos = abonos;
            await updateDoc(docRef, { compras: compras });
          }
        }
      } else {
        await updateDoc(doc(DB.db, "facturas_rapidas", facturaId), { 
          abonos, pagado: nuevoPagado, saldo: nuevoSaldo, estado: nuevoEstado 
        });
      }

      UI.toast('🗑️ Abono eliminado y saldo recalculado', 'success');
      UI.modal('modalGestionAbonos', 'close');
      await this.cargarBaseCobros();
      this.renderPendientes();
    } catch (e) { UI.toast('❌ Error al eliminar', 'error'); }
  },

  async editarAbono(facturaId, abonoIndex) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    const abono = factura.abonos[abonoIndex];
    const nuevoMonto = prompt(`Editar monto del abono (Actual: ₡${abono.monto}):`, abono.monto);
    if (nuevoMonto === null) return;
    const montoNum = Number(nuevoMonto);
    if (isNaN(montoNum) || montoNum <= 0) return UI.toast('Monto inválido', 'warning');

    try {
      const abonos = [...(factura.abonos || [])];
      const diferencia = montoNum - Number(abono.monto);
      abonos[abonoIndex] = { ...abono, monto: montoNum, fecha: new Date().toISOString() };

      const nuevoPagado = Math.max(0, (Number(factura.pagado) || 0) + diferencia);
      const nuevoSaldo = Math.max(0, (Number(factura.total) || 0) - nuevoPagado);
      const nuevoEstado = nuevoSaldo <= 0.5 ? 'completado' : (nuevoPagado === 0 ? 'pendiente' : 'parcial');

      if (factura.origen === 'web') {
        const [clientId, , indexStr] = facturaId.split('_web_');
        const docRef = doc(DB.db, "facturas", clientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const compras = docSnap.data().compras || [];
          const index = parseInt(indexStr);
          if (compras[index]) {
            compras[index].pagado = nuevoPagado; 
            compras[index].saldo = nuevoSaldo;
            compras[index].estado = nuevoEstado; 
            compras[index].abonos = abonos;
            await updateDoc(docRef, { compras: compras });
          }
        }
      } else {
        await updateDoc(doc(DB.db, "facturas_rapidas", facturaId), { 
          abonos, pagado: nuevoPagado, saldo: nuevoSaldo, estado: nuevoEstado 
        });
      }

      UI.toast('✅ Abono modificado y saldo recalculado', 'success');
      UI.modal('modalGestionAbonos', 'close');
      await this.cargarBaseCobros();
      this.renderPendientes();
    } catch (e) { UI.toast('❌ Error al editar', 'error'); }
  },

  imprimirAbono(facturaId, abonoIndex) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    const abono = factura.abonos[abonoIndex];
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <html><head><title>Recibo de Abono</title>
      <style>body{font-family:monospace;padding:20px;text-align:center;}.monto{font-size:24px;font-weight:bold;margin:15px 0;}</style>
      </head><body>
        <h2>🌸 ESENTIA - Recibo de Abono</h2>
        <p><strong>Fecha:</strong> ${new Date(abono.fecha).toLocaleString()}</p>
        <p><strong>Cliente:</strong> ${factura.clienteNombre}</p>
        <p><strong>Factura:</strong> #${facturaId.slice(-6).toUpperCase()}</p>
        <div class="monto">MONTO ABONADO<br>₡${Number(abono.monto).toLocaleString()}</div>
        <p><strong>Saldo Restante:</strong> ₡${((Number(factura.total)||0) - (Number(factura.pagado)||0)).toLocaleString()}</p>
        <button onclick="window.print()">🖨️ Imprimir</button>
      </body></html>
    `);
  },

  enviarAbonoWA(facturaId, abonoIndex) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    const abono = factura.abonos[abonoIndex];
    let telefono = factura.clienteTelefono || '';
    telefono = telefono.replace(/\D/g, '');
    if (telefono.length < 8) return UI.toast('⚠️ Teléfono inválido', 'warning');
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;
    const saldoActual = (Number(factura.total) || 0) - (Number(factura.pagado) || 0);

    let mensaje = `🌸 *RECIBO DE PAGO - ESENTIA*\n\n`;
    mensaje += `👤 Cliente: ${factura.clienteNombre}\n📅 Fecha: ${new Date(abono.fecha).toLocaleString()}\n`;
    mensaje += `🧾 Factura: #${facturaId.slice(-6).toUpperCase()}\n💳 Método: ${abono.metodo}\n`;
    if (abono.nota) mensaje += `📝 Nota: ${abono.nota}\n`;
    mensaje += `\n✅ *MONTO ABONADO: ₡${Number(abono.monto).toLocaleString()}*\n`;
    mensaje += `💰 *Saldo pendiente restante: ₡${saldoActual.toLocaleString()}*\n\n¡Gracias por tu pago! 🙏`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    UI.toast('📱 WhatsApp abierto', 'success');
  },

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

    let mensaje = `Hola ${cliente.nombre} 🌸\n\nGracias por confiar en Esentia. Te compartimos un resumen de tus compras pendientes:\n${detalleFacturas}\n💰 *Total pendiente: ₡${totalPendiente.toLocaleString()}*\n\n💳 *Formas de pago:*\n📱 SINPE Móvil: 72952454\n🏦 IBAN: CR76015114620010283743\n\n\n${tieneAtraso ? 'Te agradecemos regularizar tu cuenta a la brevedad. ¡Estamos para servirte! 💜' : 'Recuerda que puedes realizar tus abonos en cualquier momento. ¡Gracias! 💜'}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    UI.toast('📱 Recordatorio listo para enviar', 'success');
  },

  async toggleCredito(clienteId, bloquear) {
    if (!confirm(`¿${bloquear ? 'BLOQUEAR' : 'DESBLOQUEAR'} crédito?`)) return;
    try {
      await updateDoc(doc(DB.db, "clientesBD", clienteId), {
        creditoBloqueado: bloquear,
        fechaUltimoCambioCredito: new Date().toISOString()
      });
      const cliente = this.clientesCache.find(c => c.id === clienteId);
      if (cliente) cliente.creditoBloqueado = bloquear;
      UI.toast(`✅ Crédito ${bloquear ? 'bloqueado' : 'desbloqueado'}`, 'success');
      this.renderBloqueos();
      this.renderPendientes();
    } catch (e) { UI.toast('❌ Error', 'error'); }
  }
};

export default CobrosManager;