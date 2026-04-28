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

  // ✅ CORRECCIÓN: Leer de 'facturas_rapidas'
  async cargarBaseCobros() {
    try {
      this.todosLosClientes = [];
      // ⚠️ IMPORTANTE: Se cambió de 'facturas' a 'facturas_rapidas'
      const snap = await getDocs(collection(DB.db, "facturas_rapidas"));
      
      snap.forEach(docSnap => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        
        // Manejar estructura de facturas rápidas (array de productos, no array de compras)
        // Ajuste para que funcione con la estructura actual de facturas_rapidas
        // Si la factura es un documento directo, lo tratamos como una 'compra' en el array
        
        // Estructura esperada de facturas_rapidas: { clienteId, productos: [], total, estado, ... }
        // Pero CobrosManager espera array de compras dentro del doc del cliente.
        // Vamos a normalizar esto para que el módulo funcione:
        
        // Si el documento ES una factura individual (que parece ser el caso por los logs anteriores):
        if (data.productos && Array.isArray(data.productos)) {
           const clienteInfo = this.clientesCache.find(c => c.id === data.clienteId) || {};
           const saldo = Number(data.total) - (Number(data.pagado) || 0);
           
           // Buscamos si ya existe un registro para este cliente
           let clienteReg = this.todosLosClientes.find(c => c.id === data.clienteId);
           
           const facturaObj = {
             id: docSnap.id, // ID de la factura
             fecha: data.fecha,
             total: data.total,
             pagado: data.pagado || 0,
             saldo: saldo,
             productos: data.productos,
             estado: data.estado,
             abonos: data.abonos || []
           };

           if (!clienteReg) {
             clienteReg = {
               id: data.clienteId,
               nombre: data.clienteNombre || clienteInfo.nombre || 'Desconocido',
               cedula: data.clienteId || clienteInfo.cedula || '',
               telefono: data.clienteTelefono || clienteInfo.telefono || '',
               historial: [],
               deudas: [],
               totalDeuda: 0,
               totalPagado: 0
             };
             this.todosLosClientes.push(clienteReg);
           }

           clienteReg.historial.push(facturaObj);
           clienteReg.totalPagado += (Number(facturaObj.pagado) || 0);
           
           if (facturaObj.saldo > 0 && facturaObj.estado !== 'anulada') {
             clienteReg.deudas.push(facturaObj);
             clienteReg.totalDeuda += facturaObj.saldo;
           }
        }
      });

    } catch (e) { 
      console.warn('⚠️ Error cargando base:', e); 
      this.todosLosClientes = [];
    }
  },

  async mostrarPanelCobros() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalCobros';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalCobros','close')">✕</button>
        <h2>💰 Gestión de Cobros</h2>
        <div class="cobros-tabs">
          <button class="tab-btn active" data-tab="deudas">💳 Deudas Pendientes</button>
          <button class="tab-btn" data-tab="historial">📜 Historial Completo</button>
        </div>

        <div id="tab-deudas" class="tab-content active">
          <div class="cobros-toolbar">
            <button id="btnRefreshCobros" class="btn-secondary">🔄 Actualizar</button>
            <input type="text" id="buscarDeudor" placeholder="🔍 Buscar deudor...">
          </div>
          <div id="listaDeudores" class="deudores-grid">
            <div class="loading-state">🔄 Cargando base de clientes...</div>
          </div>
        </div>

        <div id="tab-historial" class="tab-content">
          <div class="cobros-toolbar">
            <input type="text" id="buscarHistorial" placeholder="🔍 Buscar cliente en historial...">
          </div>
          <div id="listaHistorial" class="historial-grid">
            <div class="loading-state">Cargando historial...</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Tabs
    modal.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    await this.cargarBaseCobros();
    this.renderListaDeudores();
    this.renderListaHistorial();

    document.getElementById('btnRefreshCobros').onclick = async () => {
      await this.cargarBaseCobros();
      this.renderListaDeudores();
      this.renderListaHistorial();
      UI.toast('✅ Base actualizada', 'success');
    };
    document.getElementById('buscarDeudor').oninput = (e) => this.renderListaDeudores(e.target.value);
    document.getElementById('buscarHistorial').oninput = (e) => this.renderListaHistorial(e.target.value);
  },

  renderListaDeudores(filtro = '') {
    const container = document.getElementById('listaDeudores');
    if (!container) return;
    const f = filtro.toLowerCase().trim();
    const deudoresActivos = this.todosLosClientes.filter(c => 
      c.totalDeuda > 0 && (f === '' || c.nombre?.toLowerCase().includes(f) || c.cedula?.includes(f))
    );

    container.innerHTML = deudoresActivos.length 
      ? deudoresActivos.map(c => `
          <div class="deudor-card">
            <h3>👤 ${c.nombre}</h3>
            <p class="deudor-info">📱 ${c.telefono || 'N/A'} | 🆔 ${c.cedula || 'N/A'}</p>
            <p>💳 Facturas pendientes: <strong>${c.deudas.length}</strong></p>
            <p>💰 Saldo total: <strong style="color:#e74c3c">₡${c.totalDeuda.toLocaleString()}</strong></p>
            <div class="deudor-actions">
              <button onclick="CobrosManager.verDetalleDeuda('${c.id}')">👁️ Ver y Abonar</button>
              <button onclick="CobrosManager.enviarRecordatorioDeuda('${c.id}')" class="btn-whatsapp-reminder">📱 Recordatorio</button>
            </div>
          </div>
        `).join('')
      : '<p class="no-data">No hay deudas pendientes activas</p>';
  },

  renderListaHistorial(filtro = '') {
    const container = document.getElementById('listaHistorial');
    if (!container) return;
    const f = filtro.toLowerCase().trim();
    const clientesFiltrados = f.length === 0 
      ? this.todosLosClientes 
      : this.todosLosClientes.filter(c => c.nombre?.toLowerCase().includes(f) || c.cedula?.includes(f));

    if (clientesFiltrados.length === 0) {
      container.innerHTML = '<p class="no-data">No se encontraron registros</p>';
      return;
    }

    container.innerHTML = clientesFiltrados.map(c => `
       <div class="historial-cliente-box">
         <div class="hc-header">
           <h3>👤 ${c.nombre}</h3>
           <small>📱 ${c.telefono || ''}</small>
         </div>
         <div class="historial-facturas">
          ${c.historial.map(fact => {
            const esPagada = fact.saldo <= 0 && fact.estado !== 'anulada';
            const esAnulada = fact.estado === 'anulada';
            let badgeClass = 'badge-pendiente';
            let badgeText = '⏳ Pendiente';
            if (esAnulada) { badgeClass = 'badge-anulada'; badgeText  = '🚫 Anulada'; }
            else if (esPagada) { badgeClass = 'badge-completado'; badgeText = '✅ Pagada'; }
            else { badgeClass = 'badge-parcial'; badgeText = '🔄 Parcial'; }

            return `
               <div class="hist-factura">
                 <div class="hf-header">
                   <span>📅 ${new Date(fact.fecha).toLocaleDateString()}</span>
                   <span class="hf-estado badge ${badgeClass}">${badgeText}</span>
                 </div>
                 <div class="hf-body">
                   <div class="hf-montos">
                     <span>Total: ₡${(fact.total||0).toLocaleString()}</span>
                     <span>Saldo: ₡${(fact.saldo||0).toLocaleString()}</span>
                   </div>
                 </div>
               </div>
            `;
          }).join('')}
         </div>
       </div>
    `).join('');
  },

  async verDetalleDeuda(clienteId) {
    this.clienteSeleccionado = clienteId;
    const clienteInfo = this.clientesCache.find(c => c.id === clienteId) || {};
    const clienteData = this.todosLosClientes.find(c => c.id === clienteId);
    
    if (!clienteData) return UI.toast('Cliente no encontrado en base', 'error');
    const deudas = clienteData.deudas;

    const modal = document.createElement('div');
    modal.className = 'modal show'; 
    modal.id = 'modalDetalleDeuda';
    modal.innerHTML = `
       <div class="modal-content modal-grande">
         <button class="modal-close" onclick="UI.modal('modalDetalleDeuda','close')">✕</button>
         <h2>📋 Gestión de Cuenta: ${clienteData.nombre}</h2>
        
         <div class="cliente-info-box">
           <p><strong>📱</strong> ${clienteData.telefono || 'N/A'}</p>
           <p><strong>💰</strong> Saldo Total: <span style="color:#e74c3c;font-weight:700">₡${clienteData.totalDeuda.toLocaleString()}</span></p>
         </div>

         <h3>📄 Facturas Pendientes</h3>
         <div id="facturasPendientes">
          ${deudas.length === 0 ? '<p class="no-data">Sin deudas pendientes</p>' : deudas.map((fact) => {
            return `
               <div class="factura-pendiente">
                 <div class="fp-header">
                   <span>📅 ${new Date(fact.fecha).toLocaleDateString()}</span>
                   <span class="fp-saldo">Saldo: ₡${(fact.saldo||0).toLocaleString()}</span>
                 </div>
                 <div class="fp-items">${(fact.productos||[]).map(p=>`<small>• ${p.nombre} (x${p.cantidad})</small>`).join('')}</div>
                 <button class="btn-abonar" onclick="CobrosManager.abrirModalAbono('${fact.id}', ${fact.saldo})">💸 Registrar Abono</button>
               </div>
            `;
          }).join('')}
         </div>
       </div>
    `;
    document.body.appendChild(modal);
  },

  abrirModalAbono(facturaId, saldo) {
    const modal = document.createElement('div');
    modal.className = 'modal show'; 
    modal.id = 'modalAbono';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalAbono','close')">✕</button>
        <h2>💸 Registrar Pago</h2>
        <p>Saldo pendiente: <strong>₡${(saldo||0).toLocaleString()}</strong></p>
        <form id="formAbono">
          <input type="number" id="montoAbono" placeholder="Monto" max="${saldo}" required>
          <select id="metodoAbono">
            <option value="Efectivo">Efectivo</option>
            <option value="SINPE">SINPE</option>
            <option value="Transferencia">Transferencia</option>
          </select>
          <input type="text" id="notaAbono" placeholder="Nota (opcional)">
          <button type="submit" class="btn-submit">✅ Confirmar</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('formAbono').onsubmit = (e) => { e.preventDefault(); this.procesarAbono(facturaId, saldo); };
  },

  // ✅ CORRECCIÓN: Apunta a 'facturas_rapidas'
  async procesarAbono(facturaId, saldoActual) {
    const monto = Number(document.getElementById('montoAbono').value) || 0;
    const metodo = document.getElementById('metodoAbono').value;
    const nota = document.getElementById('notaAbono').value;
    const btn = document.querySelector('#formAbono button');

    if (monto <= 0) return UI.toast('Monto inválido', 'warning');
    btn.disabled = true; 
    btn.textContent = 'Procesando...';

    try {
      // ⚠️ COLECCIÓN CORREGIDA
      const factRef = doc(DB.db, "facturas_rapidas", facturaId);
      const snap = await getDoc(factRef);
      
      if (!snap.exists()) throw new Error("Factura no encontrada");

      const data = snap.data();
      const nuevoPagado = (Number(data.pagado) || 0) + monto;
      const nuevoSaldo = Math.max(0, (Number(data.total) || 0) - nuevoPagado);
      const estado = nuevoSaldo <= 0.5 ? 'completado' : 'parcial'; // Margen de error 0.5

      const abonoData = { 
        fecha: new Date().toISOString(), 
        monto, 
        metodo, 
        nota: nota || '',
        autor: Store.get('cliente')?.nombre || 'admin'
      };

      await updateDoc(factRef, {
        pagado: nuevoPagado,
        saldo: nuevoSaldo,
        estado: estado,
        abonos: arrayUnion(abonoData)
      });

      UI.toast('✅ Abono registrado', 'success');
      UI.modal('modalAbono', 'close');
      UI.modal('modalDetalleDeuda', 'close');
      await this.cargarBaseCobros();
      this.renderListaDeudores();
      this.renderListaHistorial();
    } catch(err) {
      console.error(err);
      UI.toast('❌ Error: ' + err.message, 'error');
    } finally { 
      btn.disabled = false; 
      btn.textContent = '✅ Confirmar'; 
    }
  },

  // ==========================================
  // 📱 RECORDATORIOS (Amable y Fuerte)
  // ==========================================
  
  async enviarRecordatorioDeuda(clienteId) {
    const clienteData = this.todosLosClientes.find(c => c.id === clienteId);
    if (!clienteData) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalRecordatorio';
    
    // Calcular días de la deuda más antigua
    const hoy = new Date();
    let diasMaxAtraso = 0;
    clienteData.deudas.forEach(d => {
      const dias = Math.floor((hoy - new Date(d.fecha)) / (1000 * 60 * 60 * 24));
      if (dias > diasMaxAtraso) diasMaxAtraso = dias;
    });

    // Decidir recomendación
    const esUrgente = diasMaxAtraso > 15;
    const tipoRecomendado = esUrgente ? 'fuerte' : 'amable';

    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="UI.modal('modalRecordatorio','close')">✕</button>
        <h2>📱 Enviar Recordatorio</h2>
        <p>Cliente: <strong>${clienteData.nombre}</strong></p>
        <p>Deuda: <strong>₡${clienteData.totalDeuda.toLocaleString()}</strong></p>
        <p>Días de atraso máximo: <strong>${diasMaxAtraso} días</strong></p>
        
        <div class="recordatorio-actions" style="display:flex; gap:10px; margin-top:20px; flex-direction:column;">
          <button class="btn-whatsapp ${tipoRecomendado === 'amable' ? 'rec-btn-active' : ''}" 
                  onclick="CobrosManager.enviarMensaje('amable', '${clienteId}')" 
                  style="border: 2px solid #25d366; padding: 15px; background: white; cursor: pointer; border-radius: 8px; font-weight: bold;">
            🌸 Recordatorio Amable (Cordial)
            <br><small>Para deudas recientes o primeras notificaciones.</small>
          </button>

          <button class="btn-whatsapp ${tipoRecomendado === 'fuerte' ? 'rec-btn-active' : ''}" 
                  onclick="CobrosManager.enviarMensaje('fuerte', '${clienteId}')" 
                  style="border: 2px solid #e74c3c; padding: 15px; background: white; cursor: pointer; border-radius: 8px; font-weight: bold;">
            ⚠️ Recordatorio Urgente (Fuerte)
            <br><small>Para deudas > 15 días. Tono serio.</small>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async enviarMensaje(tipo, clienteId) {
    const clienteData = this.todosLosClientes.find(c => c.id === clienteId);
    if (!clienteData) return;

    let telefono = clienteData.telefono || '';
    let cleanPhone = telefono.replace(/\D/g, '');
    if (cleanPhone.length === 8) cleanPhone = '506' + cleanPhone;
    if (cleanPhone.length < 10) return UI.toast('⚠️ Teléfono inválido', 'warning');

    let mensaje = '';
    const deuda = clienteData.totalDeuda.toLocaleString();

    if (tipo === 'amable') {
      mensaje = `Hola ${clienteData.nombre} 👋,\n\nEsperamos que esté muy bien. Le recordamos amablemente que tiene un saldo pendiente de *₡${deuda}*.\n\n💳 *Métodos de pago:*\n• SINPE: 72952454\n• IBAN: CR76015114620010283743\n\n¡Gracias por su preferencia! 🌸`;
    } else {
      mensaje = `Estimado/a ${clienteData.nombre},\n\nLe informamos que su cuenta presenta un saldo vencido de *₡${deuda}* con más de 15 días de atraso.\n\n💳 *Regularice su pago para evitar cargos adicionales:*\n• SINPE: 72952454\n• SMS: "PASE ${Math.round(clienteData.totalDeuda)} 72952454"\n\n⚠️ Agradecemos su pronta gestión.`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    UI.modal('modalRecordatorio', 'close');
    
    // Guardar log
    await updateDoc(doc(DB.db, "clientesBD", clienteId), {
      ultimoRecordatorio: new Date().toISOString(),
      tipoRecordatorio: tipo
    }).catch(e => console.warn('No se guardó log de recordatorio', e));
    
    UI.toast(`📱 Mensaje ${tipo} enviado`, 'success');
  }
};