const firebaseConfig = {
    apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
    authDomain: "esentiacreditos-8345f.firebaseapp.com",
    projectId: "esentiacreditos-8345f",
    storageBucket: "esentiacreditos-8345f.firebasestorage.app",
    messagingSenderId: "888658236080",
    appId: "1:888658236080:web:506e5e2085b5a452dba175"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const ProductManager = {
    URLS: {
        ESENCIAS: "https://wil1979.github.io/esentia-factura/data/productos_esentia.json",
        LIMPIEZA: "https://wil1979.github.io/esentia-factura/data/productos_limpieza_completo.json",
        VELAS: "https://wil1979.github.io/esentia-factura/data/catalogo-velas.json"
    }
};

let allProducts = [];
let allClients = [];
let allStock = new Map();
let currentClient = null;
let cart = [];
let currentInvoiceNumber = generateInvoiceNumber();
let html5QrcodeScanner = null;
let currentSubtotal = 0, currentIva = 0, currentTotal = 0;
let transportCost = 0;
let currentPaymentInvoice = null;
let selectedPaymentMethod = null;
let currentInventoryFilter = 'all';
let currentDetailInvoice = null;
let stockMovements = [];
let allReceivables = [];
let currentReceivableFilter = 'all';
let showOutOfStockProducts = false;
let currentMovementFilter = 'all';
let requiresShipping = false;
let shippingDiscount = 0;
let purchaseOrders = [];
let currentPO = null;
let poLines = [];
let currentEditingInvoice = null;
const LOW_STOCK_THRESHOLD = 5;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-CR');
    document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
    const overlay = document.getElementById('loadingOverlay');
    const hideLoading = () => {
        if (!overlay) return;
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    };
    const withTimeout = (promise, ms, name) =>
        Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`${name}: tiempo de espera agotado`)), ms))
        ]);
    try {
        initLocationSelects();
        initShippingControls();
        initUberFloatingButton();
        initPurchaseModule();
        const results = await Promise.allSettled([
            withTimeout(loadClients(), 15000, 'Clientes'),
            withTimeout(loadStock(), 15000, 'Stock'),
            withTimeout(loadProducts(), 20000, 'Productos')
        ]);
        results.forEach((result, index) => {
            if (result.status === 'rejected') console.error(`Error en carga ${index + 1}:`, result.reason);
        });
        checkLowStockAlerts();
    } catch (error) {
        console.error('Error al iniciar la página:', error);
    } finally {
        hideLoading();
    }
});

// ==========================================
// UTILIDADES
// ==========================================
function normalizeString(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
}

function buildProductDescription(nombre, nombreOriginal) {
    const displayName = String(nombre || nombreOriginal || 'Producto').trim();
    const originalName = String(nombreOriginal || '').trim();
    if (!originalName || normalizeString(displayName) === normalizeString(originalName)) return displayName;
    return `${displayName} (${originalName})`;
}

function getItemDescription(item) {
    if (!item) return 'Producto';
    return item.descripcion || buildProductDescription(item.nombre, item.nombreOriginal);
}

function getPOLineDescription(line) {
    if (!line) return 'Producto';
    const product = allProducts.find(p => String(p.id) === String(line.productId));
    if (product) return buildProductDescription(product.nombre, product.nombreOriginal);
    return line.descripcion || buildProductDescription(line.nombre, line.nombreOriginal);
}

function formatMoney(amount) {
    const value = Number(amount) || 0;
    return value.toFixed(2).replace(/\d(?=(\d{3})+.)/g, '$&,');
}

function generateInvoiceNumber() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}${month}${year}${hours}${minutes}`;
}

function normalizePhone(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 8) digits = '506' + digits;
    return digits;
}

// ==========================================
// CÁLCULO DE INTERESES POR MORA (DÍAS HÁBILES)
// Regla:
//   - 0 a 15 días hábiles    → 0%
//   - 16 a 30 días hábiles   → 1.5%
//   - 31+ días hábiles       → 3.5% (1.5% + 2% acumulable)
// ==========================================
const MORA_POLICY = {
    version: 'EWE-MORA-2026-11-V1',
    graceBusinessDays: 15,
    firstPercent: 1.5,
    secondPercent: 2,
    maxPercent: 3.5,
    businessDaysFirstCharge: 16,
    businessDaysSecondCharge: 31
};

// Feriados de Costa Rica (formato 'YYYY-MM-DD') - agregar según se necesite
const MORA_HOLIDAYS = new Set([
    // '2026-12-25',
    // '2027-01-01'
]);

function getMoraDate(value) {
    if (!value) return new Date();
    if (value?.toDate) return value.toDate();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
}

function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isMoraBusinessDay(date) {
    const day = date.getDay(); // 0 domingo, 6 sábado
    if (day === 0 || day === 6) return false;
    return !MORA_HOLIDAYS.has(toDateKey(date));
}

function addMoraBusinessDays(startDate, days) {
    const date = new Date(startDate);
    date.setHours(0, 0, 0, 0);
    let added = 0;
    while (added < days) {
        date.setDate(date.getDate() + 1);
        if (isMoraBusinessDay(date)) added++;
    }
    return date;
}

function getMoraBusinessDaysElapsed(startDate, endDate = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end <= start) return 0;
    let count = 0;
    const current = new Date(start);
    while (current < end) {
        current.setDate(current.getDate() + 1);
        if (isMoraBusinessDay(current)) count++;
    }
    return count;
}

// Calcula la mora con base en la fecha de factura (usa días hábiles)
function calculateMoratoryInterest(saldoPendiente, fechaFactura) {
    const saldo = Math.max(0, parseFloat(saldoPendiente) || 0);
    const invoiceDate = getMoraDate(fechaFactura);
    const dueDate = addMoraBusinessDays(invoiceDate, MORA_POLICY.graceBusinessDays);
    const businessDaysElapsed = getMoraBusinessDaysElapsed(invoiceDate, new Date());
    const overdueBusinessDays = Math.max(0, businessDaysElapsed - MORA_POLICY.graceBusinessDays);

    let porcentaje = 0;
    let tramo = 'sin_recargo';

    if (saldo > 0 && businessDaysElapsed >= MORA_POLICY.businessDaysFirstCharge) {
        porcentaje = MORA_POLICY.firstPercent;
        tramo = 'primer_recargo';
    }
    if (saldo > 0 && businessDaysElapsed >= MORA_POLICY.businessDaysSecondCharge) {
        porcentaje = MORA_POLICY.maxPercent;
        tramo = 'recargo_acumulado';
    }

    const monto = +(saldo * (porcentaje / 100)).toFixed(2);
    const totalConInteres = +(saldo + monto).toFixed(2);

    return {
        saldo,
        fechaFactura: invoiceDate,
        fechaVencimiento: dueDate,
        diasHabilesTranscurridos: businessDaysElapsed,
        diasHabilesAtraso: overdueBusinessDays,
        porcentaje,
        monto,
        totalConInteres,
        tramo
    };
}

// Etiqueta legible del tramo de mora
function getMoratoryLabel(interest) {
    if (!interest || interest.porcentaje === 0) return { text: 'Al día (sin recargo)', class: 'days-normal', icon: '✅' };
    if (interest.tramo === 'primer_recargo') return { text: `Recargo 1.5% (${interest.diasHabilesTranscurridos} días hábiles)`, class: 'days-warning', icon: '🟡' };
    if (interest.tramo === 'recargo_acumulado') return { text: `Recargo 3.5% (${interest.diasHabilesTranscurridos} días hábiles)`, class: 'days-urgent', icon: '🟠' };
    return { text: `Recargo 3.5% (${interest.diasHabilesTranscurridos} días hábiles)`, class: 'days-urgent', icon: '🔴' };
}

// ==========================================
// CONSENTIMIENTO DE MORA
// ==========================================
let moraConsentResolver = null;
let moraConsentContext = null;

function getMoraPolicyPlainText() {
    return `CONSENTIMIENTO INFORMADO DE CONDICIONES DE PAGO Y CARGOS POR MORA

Los precios indicados en la factura corresponden a condiciones de pago de contado. El cliente se compromete a cancelar el monto total adeudado dentro de un plazo máximo de quince (15) días hábiles contados a partir de la fecha de emisión de la factura.

Si la factura no ha sido cancelada dentro de ese plazo, EWE Esentia podrá aplicar cargos por mora sobre el saldo pendiente, de la siguiente manera:

• De 0 a 15 días hábiles desde la fecha de factura: sin recargo.
• A partir de 16 días hábiles: recargo del 1.5% sobre el saldo pendiente.
• Al superar 30 días hábiles: se suma un 2% adicional, para un total acumulado de 3.5%.
• A los 45 días o más: el recargo acumulado será de 3.5%, salvo condiciones especiales previamente acordadas.

Los recargos se calculan únicamente sobre el saldo pendiente y no sobre montos ya abonados.

El cliente declara que ha sido informado claramente sobre estas condiciones, que las comprende y que las acepta para sus compras pendientes de pago.`;
}

function buildMoraPolicyWhatsAppBlock(invoice, saldoPendiente, type = 'invoice') {
    const saldo = Math.max(0, parseFloat(saldoPendiente) || 0);
    if (saldo <= 0) {
        return `\n✅ *Factura cancelada.* No genera cargos por mora.\n`;
    }
    const interest = calculateMoratoryInterest(saldo, invoice.fecha);
    const fechaVencimiento = interest.fechaVencimiento.toLocaleDateString('es-CR');

    let msg = `\n━━━━━━━━━━━━━━━━━━\n`;
    msg += `📌 *Condiciones de pago y cargos por mora*\n\n`;
    msg += `Los precios facturados corresponden a *pago de contado* dentro de un plazo máximo de *15 días hábiles* desde la fecha de factura.\n\n`;
    msg += `🗓️ *Fecha límite sin recargo:* ${fechaVencimiento}\n`;
    msg += `📆 Días hábiles transcurridos: *${interest.diasHabilesTranscurridos}*\n`;

    if (interest.porcentaje > 0) {
        msg += `\n⚠️ Actualmente aplica un recargo por mora de *${interest.porcentaje}%* sobre el saldo pendiente.\n`;
        msg += `💸 Recargo estimado: *₡${formatMoney(interest.monto)}*\n`;
        msg += `💵 *Total estimado con recargo: ₡${formatMoney(interest.totalConInteres)}*\n`;
    } else {
        msg += `\n✅ Actualmente está dentro del plazo sin recargo.\n`;
        msg += `Para evitar cargos adicionales, puede cancelar antes del ${fechaVencimiento}.\n`;
    }

    msg += `\n📋 *Política aplicada:*\n`;
    msg += `• 0 a 15 días hábiles: 0%\n`;
    msg += `• Desde 16 días hábiles: 1.5%\n`;
    msg += `• Al superar 30 días hábiles: 3.5% acumulado\n`;
    msg += `• El cálculo se realiza solo sobre el saldo pendiente.\n`;

    if (type === 'reminder') {
        msg += `\n🙏 Le recordamos con mucho gusto esta información para evitar recargos mayores. Si ya realizó el pago, por favor enviarnos el comprobante.\n`;
    }
    return msg;
}

async function hasMoraConsentAccepted(clienteId) {
    if (!clienteId || clienteId === 'contado') return false;
    const localClient = allClients.find(c => c.id === clienteId);
    const localConsent = localClient?.consentimientoMora;
    if (localConsent && localConsent.aceptado === true && localConsent.version === MORA_POLICY.version) {
        return true;
    }
    try {
        const snap = await db.collection('consentimientos_mora')
            .where('clienteId', '==', clienteId)
            .where('version', '==', MORA_POLICY.version)
            .where('aceptado', '==', true)
            .limit(1)
            .get();
        return !snap.empty;
    } catch (error) {
        console.error('Error verificando consentimiento de mora:', error);
        return false;
    }
}

function ensureMoraConsentModal() {
    if (document.getElementById('moraConsentModal')) return;
    const modal = document.createElement('div');
    modal.id = 'moraConsentModal';
    modal.style.cssText = `display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:100000;align-items:center;justify-content:center;padding:16px;`;
    modal.innerHTML = `
        <div style="background:#ffffff;width:min(720px,100%);max-height:92vh;overflow:auto;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.35);">
            <div style="padding:16px 18px;background:linear-gradient(135deg,#14532d,#b8860b);color:#fff;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;gap:12px;align-items:center;">
                <div>
                    <h3 style="margin:0;font-size:1.05rem;">📋 Consentimiento informado</h3>
                    <div style="font-size:0.8rem;opacity:0.9;">Condiciones de pago y cargos por mora</div>
                </div>
                <button type="button" onclick="cancelMoraConsent()" style="border:none;background:rgba(255,255,255,0.2);color:#fff;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:20px;">×</button>
            </div>
            <div style="padding:16px 18px;">
                <div id="moraConsentClientInfo" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-bottom:12px;font-size:0.9rem;"></div>
                <pre id="moraConsentText" style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:0.88rem;line-height:1.45;background:#fffbeb;border:1px solid #facc15;color:#3f3f46;padding:12px;border-radius:10px;max-height:310px;overflow:auto;"></pre>
                <label style="display:flex;gap:10px;align-items:flex-start;margin:14px 0;font-size:0.9rem;cursor:pointer;">
                    <input type="checkbox" id="moraConsentCheck" style="margin-top:3px;width:18px;height:18px;">
                    <span>Declaro que la información fue explicada claramente y que el cliente acepta las condiciones de pago y cargos por mora indicadas.</span>
                </label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                    <button type="button" class="btn" onclick="cancelMoraConsent()">Cancelar</button>
                    <button type="button" class="btn btn-success" onclick="acceptMoraConsent()">✅ Registrar aceptación</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

async function requestMoraConsent(context = {}) {
    const cliente = context.cliente;
    if (!cliente || !cliente.id || cliente.id === 'contado') {
        alert('Seleccione un cliente registrado para aceptar las condiciones de pago.');
        return false;
    }
    const accepted = await hasMoraConsentAccepted(cliente.id);
    if (accepted) return true;

    ensureMoraConsentModal();
    moraConsentContext = {
        cliente,
        facturaId: context.facturaId || null,
        numeroFactura: context.numeroFactura || '',
        total: parseFloat(context.total) || 0,
        saldo: parseFloat(context.saldo) || 0,
        canal: context.canal || 'sistema'
    };
    document.getElementById('moraConsentText').textContent = getMoraPolicyPlainText();
    document.getElementById('moraConsentCheck').checked = false;
    document.getElementById('moraConsentClientInfo').innerHTML = `
        <strong>Cliente:</strong> ${cliente.nombre || 'N/A'}<br>
        <strong>Teléfono:</strong> ${cliente.telefono || 'N/A'}<br>
        <strong>Cédula:</strong> ${cliente.cedula || 'N/A'}<br>
        ${moraConsentContext.numeroFactura ? `<strong>Factura:</strong> ${moraConsentContext.numeroFactura}<br>` : ''}
        ${moraConsentContext.saldo > 0 ? `<strong>Saldo:</strong> ₡${formatMoney(moraConsentContext.saldo)}` : ''}`;
    document.getElementById('moraConsentModal').style.display = 'flex';
    return new Promise(resolve => { moraConsentResolver = resolve; });
}

async function acceptMoraConsent() {
    const check = document.getElementById('moraConsentCheck');
    if (!check?.checked) { alert('Debe confirmar que el cliente acepta las condiciones.'); return; }
    if (!moraConsentContext?.cliente?.id) { alert('No hay cliente seleccionado.'); return; }
    const cliente = moraConsentContext.cliente;
    const consentData = {
        clienteId: cliente.id,
        clienteNombre: cliente.nombre || '',
        clienteTelefono: cliente.telefono || '',
        clienteCedula: cliente.cedula || '',
        facturaId: moraConsentContext.facturaId || null,
        numeroFactura: moraConsentContext.numeroFactura || '',
        totalFactura: moraConsentContext.total || 0,
        saldoPendiente: moraConsentContext.saldo || 0,
        canal: moraConsentContext.canal,
        aceptado: true,
        version: MORA_POLICY.version,
        politica: {
            plazoDiasHabiles: MORA_POLICY.graceBusinessDays,
            primerPorcentaje: MORA_POLICY.firstPercent,
            segundoPorcentaje: MORA_POLICY.secondPercent,
            porcentajeMaximo: MORA_POLICY.maxPercent
        },
        textoAceptado: getMoraPolicyPlainText(),
        fechaLocal: new Date().toISOString(),
        fechaAceptacion: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent || ''
    };
    try {
        await db.collection('consentimientos_mora').add(consentData);
        const resumenConsent = {
            aceptado: true,
            version: MORA_POLICY.version,
            fechaLocal: consentData.fechaLocal,
            canal: consentData.canal
        };
        try {
            await db.collection('clientesBD').doc(cliente.id).update({ consentimientoMora: resumenConsent });
        } catch (e) { console.warn('No se pudo actualizar resumen en cliente:', e); }
        const idx = allClients.findIndex(c => c.id === cliente.id);
        if (idx !== -1) allClients[idx].consentimientoMora = resumenConsent;
        document.getElementById('moraConsentModal').style.display = 'none';
        if (moraConsentResolver) moraConsentResolver(true);
        moraConsentResolver = null;
        moraConsentContext = null;
        alert('✅ Consentimiento registrado correctamente.');
    } catch (error) {
        console.error('Error guardando consentimiento:', error);
        alert('Error al guardar el consentimiento: ' + error.message);
    }
}

function cancelMoraConsent() {
    const modal = document.getElementById('moraConsentModal');
    if (modal) modal.style.display = 'none';
    if (moraConsentResolver) moraConsentResolver(false);
    moraConsentResolver = null;
    moraConsentContext = null;
}

function renderMoraInfoInInvoiceDetail(factura, saldoPendiente) {
    const balanceEl = document.getElementById('detailBalance');
    if (!balanceEl) return;
    let box = document.getElementById('detailMoraInfoBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'detailMoraInfoBox';
        balanceEl.closest('div')?.parentElement?.appendChild(box);
    }
    if (saldoPendiente <= 0) {
        box.innerHTML = `<div style="margin-top:10px;padding:10px;border-radius:10px;background:#dcfce7;color:#14532d;border:1px solid #86efac;">✅ Factura cancelada. No genera cargos por mora.</div>`;
        return;
    }
    const interest = calculateMoratoryInterest(saldoPendiente, factura.fecha);
    const dueDate = interest.fechaVencimiento.toLocaleDateString('es-CR');
    if (interest.porcentaje > 0) {
        box.innerHTML = `
            <div style="margin-top:10px;padding:12px;border-radius:10px;background:#fff7ed;color:#7c2d12;border:1px solid #fdba74;">
                <div style="font-weight:700;margin-bottom:4px;">⚠️ Recargo por mora aplicado</div>
                <div style="font-size:0.85rem;">Fecha límite sin recargo: <strong>${dueDate}</strong></div>
                <div style="font-size:0.85rem;">Días hábiles transcurridos: <strong>${interest.diasHabilesTranscurridos}</strong></div>
                <div style="font-size:0.85rem;">Porcentaje aplicado: <strong>${interest.porcentaje}%</strong></div>
                <div style="font-size:0.85rem;">Recargo: <strong>₡${formatMoney(interest.monto)}</strong></div>
                <div style="font-size:0.95rem;margin-top:5px;">Total estimado con recargo: <strong>₡${formatMoney(interest.totalConInteres)}</strong></div>
            </div>`;
    } else {
        box.innerHTML = `
            <div style="margin-top:10px;padding:12px;border-radius:10px;background:#ecfdf5;color:#064e3b;border:1px solid #6ee7b7;">
                <div style="font-weight:700;margin-bottom:4px;">✅ Dentro del plazo sin recargo</div>
                <div style="font-size:0.85rem;">Fecha límite sin recargo: <strong>${dueDate}</strong></div>
                <div style="font-size:0.85rem;">Días hábiles transcurridos: <strong>${interest.diasHabilesTranscurridos}</strong></div>
            </div>`;
    }
}

// ==========================================
// ENVÍO OPCIONAL + DESCUENTO ESPECIAL DE ENVÍO
// ==========================================
function initShippingControls() {
    const transportInput = document.getElementById('transportCost');
    if (!transportInput || document.getElementById('shippingToggleWrap')) return;
    const anchor = transportInput.closest('.summary-row') || transportInput.parentElement;
    if (!anchor || !anchor.parentElement) return;
    const wrap = document.createElement('div');
    wrap.id = 'shippingToggleWrap';
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:8px 0;padding:10px;border:1px dashed var(--border,#cccccc);border-radius:8px;background:rgba(0,0,0,0.02);';
    wrap.innerHTML = `
        <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer;user-select:none;">
            <input type="checkbox" id="requiresShippingChk" style="width:16px;height:16px;">
            <span>🚚 Requiere envío <small style="color:var(--text-light,#888);">(incluir dirección y transporte en la factura)</small></span>
        </label>
        <label id="shippingDiscountWrap" style="display:none;align-items:center;gap:8px;font-size:0.85rem;flex-wrap:wrap;">
            🏷️ Descuento especial envío ₡
            <input type="number" id="shippingDiscountInput" min="0" step="100" value="0" style="width:120px;padding:6px;border:1px solid var(--border,#cccccc);border-radius:6px;">
        </label>`;
    anchor.parentElement.insertBefore(wrap, anchor);
    document.getElementById('requiresShippingChk').addEventListener('change', (e) => {
        requiresShipping = e.target.checked;
        document.getElementById('shippingDiscountWrap').style.display = requiresShipping ? 'flex' : 'none';
        updateTotals();
    });
    document.getElementById('shippingDiscountInput').addEventListener('input', (e) => {
        const ship = getShippingTotals();
        if ((parseFloat(e.target.value) || 0) > ship.gross && ship.gross > 0) e.target.value = ship.gross;
        updateTotals();
    });
}

function resetShippingControls() {
    requiresShipping = false;
    shippingDiscount = 0;
    const chk = document.getElementById('requiresShippingChk');
    if (chk) chk.checked = false;
    const wrap = document.getElementById('shippingDiscountWrap');
    if (wrap) wrap.style.display = 'none';
    const disc = document.getElementById('shippingDiscountInput');
    if (disc) disc.value = 0;
}

// ==========================================
// BOTÓN FLOTANTE ARRASTRABLE - UBER ENVÍOS
// ==========================================
function initUberFloatingButton() {
    if (document.getElementById('uberEnviosFloatBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'uberEnviosFloatBtn';
    btn.type = 'button';
    btn.title = 'Gestionar envío con Uber';
    btn.textContent = '🚚';
    btn.style.cssText = 'position:fixed;right:18px;bottom:18px;width:56px;height:56px;border-radius:50%;border:none;background:#276EF1;color:#ffffff;font-size:26px;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,0.35);z-index:99999;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;display:flex;align-items:center;justify-content:center;padding:0;';
    document.body.appendChild(btn);
    try {
        const saved = JSON.parse(localStorage.getItem('uberBtnPos') || 'null');
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
            btn.style.left = saved.x + 'px';
            btn.style.top = saved.y + 'px';
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
        }
    } catch (e) { /* ignore */ }
    let dragging = false, moved = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
    btn.addEventListener('pointerdown', (e) => {
        dragging = true; moved = false;
        const rect = btn.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        baseLeft = rect.left; baseTop = rect.top;
        btn.style.cursor = 'grabbing';
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    btn.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX; const dy = e.clientY - startY;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
        if (moved) {
            const size = btn.offsetWidth || 56;
            const x = Math.min(window.innerWidth - size, Math.max(0, baseLeft + dx));
            const y = Math.min(window.innerHeight - size, Math.max(0, baseTop + dy));
            btn.style.left = x + 'px'; btn.style.top = y + 'px';
            btn.style.right = 'auto'; btn.style.bottom = 'auto';
        }
    });
    const endDrag = () => {
        if (!dragging) return;
        dragging = false; btn.style.cursor = 'grab';
        const rect = btn.getBoundingClientRect();
        try { localStorage.setItem('uberBtnPos', JSON.stringify({ x: rect.left, y: rect.top })); } catch (e) { /* ignore */ }
        if (!moved) requestUberEnvio();
    };
    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', () => { dragging = false; btn.style.cursor = 'grab'; });
}

function requestUberEnvio() {
    if (!currentClient) { alert('Seleccione un cliente primero'); return; }
    if (!currentClient.direccion) {
        const pedir = confirm(`⚠️ ${currentClient.nombre || 'El cliente'} no tiene dirección registrada.\n\nAceptar = Pedir dirección por WhatsApp\nCancelar = Editar cliente ahora`);
        if (pedir) requestLocation(); else openEditClientModal();
        return;
    }
    const fullAddress = [currentClient.direccion, currentClient.distrito, currentClient.canton, currentClient.provincia, 'Costa Rica'].filter(Boolean).join(', ');
    const mapsLink = (currentClient.lat && currentClient.lng)
        ? `https://maps.google.com/?q=${currentClient.lat},${currentClient.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    const deliveryInfo = `📦 ENVÍO UBER - EWE Esentia\n👤 Cliente: ${currentClient.nombre || 'N/A'}\n📞 Teléfono: ${currentClient.telefono || 'N/A'}\n📍 Dirección: ${fullAddress}\n🌐 Mapa: ${mapsLink}\n`;
    try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(deliveryInfo); } catch (e) { /* ignore */ }
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const uberDeep = `uber://?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}`;
    const uberWeb = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}`;
    const abrirUber = confirm(`🚚 Gestionar envío para:\n\n${currentClient.nombre || 'Cliente'}\n📍 ${fullAddress}\n\nLos datos del envío fueron copiados al portapapeles.\n\nAceptar = Abrir Uber\nCancelar = Abrir Google Maps`);
    if (abrirUber) {
        if (isMobile) {
            window.location.href = uberDeep;
            setTimeout(() => window.open(uberWeb, '_blank'), 1200);
        } else {
            window.open(uberWeb, '_blank');
        }
        setTimeout(() => { alert('🚚 En Uber seleccione "Envíos" / "Connect".\nSi la dirección no aparece completa, pegue los datos que se copiaron.'); }, 900);
    } else {
        window.open(mapsLink, '_blank');
    }
}

function buildClientAddressHTML(client) {
    let html = client.direccion || '';
    const parts = [];
    if (client.distrito) parts.push(client.distrito);
    if (client.canton) parts.push(client.canton);
    if (client.provincia) parts.push(client.provincia);
    if (parts.length) html += `<br><small>📍 ${parts.join(', ')}</small>`;
    return html;
}

function getStockDocId(product) {
    if (!product) return '';
    const byId = normalizeString(product.id);
    if (allStock.has(byId)) return byId;
    return normalizeString(product.nombre);
}

// ==========================================
// CARGA DE DATOS
// ==========================================
async function loadStock() {
    try {
        const snapshot = await db.collection('stock').get();
        allStock.clear();
        snapshot.forEach(doc => {
            const data = doc.data();
            allStock.set(doc.id.toLowerCase(), {
                id: doc.id,
                cantidad: parseInt(data.cantidad) || 0,
                costoUnitario: parseFloat(data.costoUnitario) || 0,
                nombre: data.nombre || '',
                ultimaActualizacion: data.ultimaActualizacion || '',
                ultimaCompra: data.ultimaCompra || ''
            });
        });
        console.log(`✅ Stock cargado: ${allStock.size} productos`);
    } catch (error) { console.error("❌ Error cargando stock:", error); }
}

function getStockForProduct(product) {
    if (!product) return null;
    let stock = allStock.get(String(product.id).toLowerCase());
    if (stock) return stock;
    const normalizedName = normalizeString(product.nombre);
    for (const [key, value] of allStock.entries()) {
        if (normalizeString(value.nombre) === normalizedName || key === normalizedName) return value;
    }
    for (const [key, value] of allStock.entries()) {
        const stockNameNorm = normalizeString(value.nombre);
        if (stockNameNorm.includes(normalizedName) || normalizedName.includes(stockNameNorm)) return value;
    }
    return null;
}

function getStockStatus(stock) {
    if (!stock) return { status: 'unknown', label: 'Sin registro', class: '' };
    if (stock.cantidad <= 0) return { status: 'out', label: 'Agotado', class: 'stock-out' };
    if (stock.cantidad <= LOW_STOCK_THRESHOLD) return { status: 'low', label: `Stock bajo: ${stock.cantidad}`, class: 'stock-low' };
    return { status: 'ok', label: `Disponible: ${stock.cantidad}`, class: 'stock-ok' };
}

function checkLowStockAlerts() {
    let lowStockCount = 0, outOfStockCount = 0;
    allStock.forEach(stock => {
        if (stock.cantidad <= 0) outOfStockCount++;
        else if (stock.cantidad <= LOW_STOCK_THRESHOLD) lowStockCount++;
    });
    const banner = document.getElementById('stockWarningBanner');
    if (!banner) return;
    if (outOfStockCount > 0 || lowStockCount > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `⚠️ <strong>Alerta de Inventario:</strong> ${outOfStockCount} producto(s) agotado(s) y ${lowStockCount} con stock bajo. <a href="#" onclick="switchView('inventory', event); return false;" style="color: inherit; text-decoration: underline;">Ver inventario</a>`;
    } else {
        banner.style.display = 'none';
        banner.innerHTML = '';
    }
}

async function loadClients() {
    const snapshot = await db.collection('clientesBD').get();
    allClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadProducts() {
    const urls = [
        { url: ProductManager.URLS.ESENCIAS, catDefault: 'Esencias' },
        { url: ProductManager.URLS.LIMPIEZA, catDefault: 'Limpieza' },
        { url: ProductManager.URLS.VELAS, catDefault: 'Velas' }
    ];
    const errors = [];
    for (const item of urls) {
        try {
            const response = await fetch(item.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            let productsToProcess = [];
            if (Array.isArray(data)) {
                productsToProcess = data.map(p => ({ ...p, categoriaDetectada: item.catDefault }));
            } else {
                for (const [categoria, items] of Object.entries(data)) {
                    if (Array.isArray(items)) {
                        items.forEach(p => { p.categoriaDetectada = categoria; productsToProcess.push(p); });
                    }
                }
            }
            const mapped = productsToProcess.map(p => {
                const precioBase = (p.precioOferta && p.precioOferta > 0) ? p.precioOferta : (p.precioOriginal || 0);
                return {
                    id: String(p.id),
                    nombre: p.nombre || p.nombreOriginal || 'Producto sin nombre',
                    nombreOriginal: p.nombreOriginal || p.nombre || 'Producto sin nombre',
                    precioBase: parseFloat(precioBase) || 0,
                    categoria: p.categoriaDetectada || item.catDefault,
                    variantes: Array.isArray(p.variantes) ? p.variantes : []
                };
            });
            allProducts = allProducts.concat(mapped);
        } catch (error) {
            console.error(`❌ Error cargando ${item.catDefault}:`, error);
            errors.push(item.catDefault);
        }
    }
    const errorBanner = document.getElementById('loadErrorBanner');
    if (errors.length > 0 && errorBanner) {
        errorBanner.style.display = 'block';
        errorBanner.innerHTML = `⚠️ No se pudieron cargar: <strong>${errors.join(', ')}</strong>.`;
    } else if (errorBanner) {
        errorBanner.style.display = 'none';
        errorBanner.innerHTML = '';
    }
    filterProducts('');
    if (typeof refreshPODatalist === 'function') refreshPODatalist();
}

// ==========================================
// SISTEMA DE UBICACIONES COSTA RICA (CASCADA)
// ==========================================
function initLocationSelects() {
    const provinceSelect = document.getElementById('newClientProvince');
    if (!provinceSelect) return;
    if (typeof COSTA_RICA_UBICACIONES === 'undefined') {
        console.warn('COSTA_RICA_UBICACIONES no está definido.');
        return;
    }
    provinceSelect.innerHTML = '<option value="">Seleccionar...</option>';
    Object.keys(COSTA_RICA_UBICACIONES).sort().forEach(provincia => {
        const option = document.createElement('option');
        option.value = provincia;
        option.textContent = provincia;
        provinceSelect.appendChild(option);
    });
}

function onProvinceChange() {
    if (typeof COSTA_RICA_UBICACIONES === 'undefined') return;
    const provinceSelect = document.getElementById('newClientProvince');
    const cantonSelect = document.getElementById('newClientCanton');
    const districtSelect = document.getElementById('newClientDistrict');
    if (!provinceSelect || !cantonSelect || !districtSelect) return;
    const province = provinceSelect.value;
    cantonSelect.innerHTML = '<option value="">Seleccionar...</option>';
    districtSelect.innerHTML = '<option value="">Primero cantón</option>';
    districtSelect.disabled = true;
    if (!province || !COSTA_RICA_UBICACIONES[province]) {
        cantonSelect.disabled = true;
        cantonSelect.innerHTML = '<option value="">Primero provincia</option>';
        return;
    }
    Object.keys(COSTA_RICA_UBICACIONES[province]).sort().forEach(canton => {
        const option = document.createElement('option');
        option.value = canton;
        option.textContent = canton;
        cantonSelect.appendChild(option);
    });
    cantonSelect.disabled = false;
}

function onCantonChange() {
    if (typeof COSTA_RICA_UBICACIONES === 'undefined') return;
    const provinceSelect = document.getElementById('newClientProvince');
    const cantonSelect = document.getElementById('newClientCanton');
    const districtSelect = document.getElementById('newClientDistrict');
    if (!provinceSelect || !cantonSelect || !districtSelect) return;
    const province = provinceSelect.value;
    const canton = cantonSelect.value;
    districtSelect.innerHTML = '<option value="">Seleccionar...</option>';
    if (!province || !canton || !COSTA_RICA_UBICACIONES[province]?.[canton]) {
        districtSelect.disabled = true;
        districtSelect.innerHTML = '<option value="">Primero cantón</option>';
        return;
    }
    COSTA_RICA_UBICACIONES[province][canton].forEach(distrito => {
        const option = document.createElement('option');
        option.value = distrito;
        option.textContent = distrito;
        districtSelect.appendChild(option);
    });
    districtSelect.disabled = false;
}

// ==========================================
// CLIENTES
// ==========================================
function openNewClientModal() {
    closeNewClientModal(true);
    const title = document.getElementById('clientModalTitle');
    if (title) title.textContent = '➕ Nuevo Cliente';
    document.getElementById('newClientModal').classList.add('active');
}

function openEditClientModal() {
    if (!currentClient) return;
    const title = document.getElementById('clientModalTitle');
    if (title) title.textContent = '✏️ Editar Cliente';
    document.getElementById('editClientId').value = currentClient.id || '';
    document.getElementById('newClientName').value = currentClient.nombre || '';
    document.getElementById('newClientId').value = currentClient.cedula || '';
    document.getElementById('newClientPhone').value = currentClient.telefono || '';
    document.getElementById('newClientAddress').value = currentClient.direccion || '';
    const provinceSelect = document.getElementById('newClientProvince');
    const cantonSelect = document.getElementById('newClientCanton');
    const districtSelect = document.getElementById('newClientDistrict');
    const status = document.getElementById('locationStatus');
    provinceSelect.value = currentClient.provincia || '';
    onProvinceChange();
    setTimeout(() => {
        cantonSelect.value = currentClient.canton || '';
        onCantonChange();
        setTimeout(() => { districtSelect.value = currentClient.distrito || ''; }, 80);
    }, 80);
    if (currentClient.lat && currentClient.lng) {
        document.getElementById('newClientAddress').dataset.lat = currentClient.lat;
        document.getElementById('newClientAddress').dataset.lng = currentClient.lng;
        status.textContent = `📍 Coordenadas: ${Number(currentClient.lat).toFixed(5)}, ${Number(currentClient.lng).toFixed(5)}`;
        status.style.color = 'var(--success)';
    } else {
        delete document.getElementById('newClientAddress').dataset.lat;
        delete document.getElementById('newClientAddress').dataset.lng;
        status.textContent = '';
    }
    document.getElementById('newClientModal').classList.add('active');
}

function closeNewClientModal(keepOpen = false) {
    const modal = document.getElementById('newClientModal');
    if (modal && !keepOpen) modal.classList.remove('active');
    const fields = { editClientId: '', newClientName: '', newClientId: '', newClientPhone: '', newClientAddress: '', newClientProvince: '', newClientCanton: '', newClientDistrict: '' };
    Object.entries(fields).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });
    const cantonSelect = document.getElementById('newClientCanton');
    const districtSelect = document.getElementById('newClientDistrict');
    if (cantonSelect) { cantonSelect.innerHTML = '<option value="">Primero provincia</option>'; cantonSelect.disabled = true; }
    if (districtSelect) { districtSelect.innerHTML = '<option value="">Primero cantón</option>'; districtSelect.disabled = true; }
    const status = document.getElementById('locationStatus');
    if (status) { status.textContent = ''; status.className = ''; status.style.color = ''; }
    const address = document.getElementById('newClientAddress');
    if (address) { delete address.dataset.lat; delete address.dataset.lng; }
    const title = document.getElementById('clientModalTitle');
    if (title) title.textContent = '➕ Nuevo Cliente';
}

async function saveNewClient() {
    const nombre = document.getElementById('newClientName').value.trim();
    const cedula = document.getElementById('newClientId').value.trim();
    const telefono = document.getElementById('newClientPhone').value.trim();
    const direccion = document.getElementById('newClientAddress').value.trim();
    const provincia = document.getElementById('newClientProvince').value.trim();
    const canton = document.getElementById('newClientCanton').value.trim();
    const distrito = document.getElementById('newClientDistrict').value.trim();
    const editId = document.getElementById('editClientId').value;
    const addressEl = document.getElementById('newClientAddress');
    if (!nombre) { alert('El nombre del cliente es obligatorio'); return; }
    if (!telefono) { alert('El teléfono es obligatorio'); return; }
    const lat = parseFloat(addressEl.dataset.lat) || null;
    const lng = parseFloat(addressEl.dataset.lng) || null;
    const clientData = { nombre, cedula: cedula || 'N/A', telefono, direccion: direccion || '', provincia: provincia || '', canton: canton || '', distrito: distrito || '', lat, lng, ultimaActualizacion: new Date().toISOString() };
    try {
        let clientId;
        if (editId) {
            await db.collection('clientesBD').doc(editId).update(clientData);
            clientId = editId;
            const index = allClients.findIndex(c => c.id === editId);
            if (index !== -1) allClients[index] = { id: editId, ...clientData };
            alert('✅ Cliente actualizado exitosamente');
        } else {
            clientData.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('clientesBD').add(clientData);
            clientId = docRef.id;
            allClients.push({ id: clientId, ...clientData });
            alert('✅ Cliente agregado exitosamente');
        }
        selectClient(clientId);
        closeNewClientModal();
    } catch (error) {
        console.error("Error guardando cliente:", error);
        alert('Error al guardar el cliente: ' + error.message);
    }
}

function searchClients(query) {
    const resultsDiv = document.getElementById('clientResults');
    if (!resultsDiv) return;
    if (query.length < 2) { resultsDiv.style.display = 'none'; return; }
    const q = query.toLowerCase();
    const filtered = allClients.filter(c => (c.nombre || '').toLowerCase().includes(q) || (c.cedula || c.id || '').toLowerCase().includes(q) || (c.telefono || '').toLowerCase().includes(q));
    if (filtered.length > 0) {
        resultsDiv.innerHTML = filtered.map(c => `<div class="result-item" onclick="selectClient('${c.id}')"><div class="result-name">${c.nombre || 'Sin nombre'}</div><div class="result-meta">CC: ${c.cedula || c.id || 'N/A'} | Tel: ${c.telefono || 'N/A'}</div></div>`).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.innerHTML = '<div class="result-item" style="color: #999;">No se encontraron clientes</div>';
        resultsDiv.style.display = 'block';
    }
}

function selectClient(clientId) {
    currentClient = allClients.find(c => c.id === clientId);
    if (!currentClient) return;
    document.getElementById('clientSearch').value = '';
    document.getElementById('clientResults').style.display = 'none';
    document.getElementById('selectedClientInfo').style.display = 'flex';
    document.getElementById('clientNameDisplay').textContent = currentClient.nombre || 'N/A';
    document.getElementById('clientIdDisplay').textContent = currentClient.cedula || currentClient.id || 'N/A';
    document.getElementById('clientPhoneDisplay').textContent = currentClient.telefono || 'N/A';
    const addressDiv = document.getElementById('clientAddressDisplay');
    const addressText = document.getElementById('clientAddressText');
    const locationBtn = document.getElementById('locationBtn');
    const deliveryBtn = document.getElementById('deliveryBtn');
    if (currentClient.direccion) { addressText.innerHTML = buildClientAddressHTML(currentClient); addressDiv.style.display = 'block'; }
    else { addressDiv.style.display = 'none'; }
    const hasPhone = currentClient.telefono && currentClient.telefono !== 'N/A';
    if (locationBtn) locationBtn.style.display = hasPhone ? 'block' : 'none';
    if (deliveryBtn) deliveryBtn.style.display = currentClient.direccion ? 'block' : 'none';
    document.getElementById('invoiceClientInfo').innerHTML = `
        <strong>${currentClient.nombre || 'Cliente'}</strong>
        <br><span style="font-size: 0.8rem; color: #666;">CC: ${currentClient.cedula || currentClient.id}</span>
        ${currentClient.direccion ? `<br><span style="font-size: 0.75rem; color: var(--info);">📍 ${[currentClient.distrito, currentClient.canton, currentClient.provincia].filter(Boolean).join(', ')}</span>` : ''}`;
}

function clearClient() {
    currentClient = null;
    document.getElementById('selectedClientInfo').style.display = 'none';
    document.getElementById('invoiceClientInfo').innerHTML = '<em>Seleccione un cliente</em>';
}

// ==========================================
// SOLICITAR UBICACIÓN / TRANSPORTE
// ==========================================
function requestLocation() {
    if (!currentClient) { alert('Seleccione un cliente primero'); return; }
    const phone = normalizePhone(currentClient.telefono);
    if (!phone) { alert('El cliente no tiene teléfono registrado.'); return; }
    const message = `Hola ${currentClient.nombre} 🌿\n\nSomos de *EWE Esentia*. Para realizar el envío de su pedido, necesitamos que nos comparta su *ubicación actual*.\n\n📍 Por favor, envíenos su ubicación usando esta opción de WhatsApp:\n   1. Toque el clip 📎 o el + junto al campo de texto\n   2. Seleccione "Ubicación"\n   3. Elija "Enviar mi ubicación actual"\n\nTambién puede escribirnos la dirección completa con referencias.\n\n¡Gracias! 🙏`;
    if (confirm(`📍 Se abrirá WhatsApp para solicitar la ubicación a:\n\n${currentClient.nombre}\n📞 ${currentClient.telefono}\n\n¿Continuar?`)) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
}

function requestUber() { requestUberEnvio(); }

function getCurrentLocation() {
    const statusDiv = document.getElementById('locationStatus');
    const addressInput = document.getElementById('newClientAddress');
    if (!statusDiv || !addressInput) return;
    if (!navigator.geolocation) {
        statusDiv.textContent = '❌ Tu navegador no soporta geolocalización';
        statusDiv.className = '';
        statusDiv.style.color = 'var(--danger)';
        return;
    }
    statusDiv.textContent = '📍 Obteniendo ubicación...';
    statusDiv.className = 'location-pulse';
    statusDiv.style.color = 'var(--info)';
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`);
                const data = await response.json();
                addressInput.value = data.display_name || '';
                if (data.address) {
                    document.getElementById('newClientProvince').value = data.address.state || '';
                    onProvinceChange();
                    document.getElementById('newClientCanton').value = data.address.city || data.address.town || '';
                    onCantonChange();
                }
                addressInput.dataset.lat = lat;
                addressInput.dataset.lng = lng;
                statusDiv.textContent = `✅ Ubicación obtenida: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                statusDiv.className = '';
                statusDiv.style.color = 'var(--success)';
            } catch (error) {
                addressInput.dataset.lat = lat;
                addressInput.dataset.lng = lng;
                statusDiv.textContent = '⚠️ No se pudo obtener la dirección, pero las coordenadas están listas';
                statusDiv.className = '';
                statusDiv.style.color = 'var(--warning)';
            }
        },
        (error) => {
            let msg = '❌ Error: ';
            switch (error.code) {
                case error.PERMISSION_DENIED: msg += 'Permiso denegado'; break;
                case error.POSITION_UNAVAILABLE: msg += 'Ubicación no disponible'; break;
                case error.TIMEOUT: msg += 'Tiempo agotado'; break;
                default: msg += error.message || 'Desconocido';
            }
            statusDiv.textContent = msg;
            statusDiv.className = '';
            statusDiv.style.color = 'var(--danger)';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ==========================================
// TABS / NAVEGACIÓN
// ==========================================
function switchMobileTab(tab, button) {
    const productsPanel = document.getElementById('productsPanel');
    const cartPanel = document.getElementById('cartPanel');
    if (!productsPanel || !cartPanel) return;
    document.querySelectorAll('.mobile-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (button) button.classList.add('active');
    if (tab === 'products') { productsPanel.classList.remove('mobile-hidden'); cartPanel.classList.add('mobile-hidden'); }
    else if (tab === 'cart') { productsPanel.classList.add('mobile-hidden'); cartPanel.classList.remove('mobile-hidden'); }
}

function switchView(view, event) {
    const pos = document.getElementById('view-pos');
    const inventory = document.getElementById('view-inventory');
    const receivables = document.getElementById('view-receivables');
    const purchase = document.getElementById('view-purchase');
    if (pos) pos.style.display = view === 'pos' ? 'grid' : 'none';
    if (inventory) inventory.style.display = view === 'inventory' ? 'grid' : 'none';
    if (receivables) receivables.style.display = view === 'receivables' ? 'grid' : 'none';
    if (purchase) purchase.style.display = view === 'purchase' ? 'block' : 'none';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target && event.target.classList) event.target.classList.add('active');
    if (view === 'inventory') { renderInventoryTable(); loadStockMovements(); }
    else if (view === 'receivables') { loadReceivables(); }
    else if (view === 'purchase') { loadPurchaseOrders(); }
}

// ==========================================
// PRODUCTOS Y CARRITO
// ==========================================
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    let visibleProducts = Array.isArray(products) ? products : [];
    visibleProducts = visibleProducts.filter(p => getStockStatus(getStockForProduct(p)).status === 'low');
    const counter = document.getElementById('productCount');
    if (counter) counter.textContent = `${visibleProducts.length} productos`;
    if (visibleProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 20px;">No hay productos disponibles en inventario</div>';
        return;
    }
    grid.innerHTML = visibleProducts.map(p => {
        const hasVariants = p.variantes && p.variantes.length > 0;
        const stock = getStockForProduct(p);
        const stockStatus = getStockStatus(stock);
        const isOutOfStock = stock && stock.cantidad <= 0;
        const isLowStock = stock && stock.cantidad > 0 && stock.cantidad <= LOW_STOCK_THRESHOLD;
        return `
        <div class="product-card ${hasVariants ? 'has-variants' : ''} ${isOutOfStock ? 'out-of-stock' : ''} ${isLowStock ? 'low-stock' : ''}" 
             onclick="${isOutOfStock ? `alert('⚠️ Producto agotado.'); return false;` : `openProductModal('${p.id}')`}">
            <div class="stock-badge ${stockStatus.class}">${stockStatus.label}</div>
            <div class="product-category">${p.categoria}</div>
            <div class="product-name">${buildProductDescription(p.nombre, p.nombreOriginal)}</div>
            <div class="product-price">Desde ₡${formatMoney(p.precioBase)}</div>
            <div class="product-code">ID: ${p.id}</div>
        </div>`;
    }).join('');
}

function filterProducts(query) {
    let filtered = allProducts;
    if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(p => (p.nombre || '').toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q));
    }
    renderProducts(filtered);
}

function toggleOutOfStock() {
    const checkbox = document.getElementById('showOutOfStock');
    showOutOfStockProducts = checkbox ? checkbox.checked : false;
    const search = document.getElementById('productSearch');
    filterProducts(search ? search.value : '');
}

function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const discountInput = document.getElementById('modalDiscount');
    discountInput.dataset.percent = '0';
    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').textContent = product.nombre;
    document.getElementById('modalQuantity').value = 1;
    discountInput.value = 0;
    const stock = getStockForProduct(product);
    const stockBar = document.getElementById('modalStockBar');
    const stockIcon = document.getElementById('modalStockIcon');
    const stockQty = document.getElementById('modalStockQty');
    const stockText = document.getElementById('modalStockText');
    const maxQtyLabel = document.getElementById('maxQtyLabel');
    const pricePreview = document.getElementById('modalPricePreview');
    const qtyInput = document.getElementById('modalQuantity');
    if (stock) {
        stockQty.textContent = stock.cantidad;
        maxQtyLabel.textContent = stock.cantidad;
        qtyInput.max = stock.cantidad;
        if (stock.cantidad <= 0) { stockIcon.textContent = '❌'; stockText.textContent = 'Producto agotado.'; stockBar.style.background = '#fee2e2'; pricePreview.classList.add('warning'); }
        else if (stock.cantidad <= LOW_STOCK_THRESHOLD) { stockIcon.textContent = '⚠️'; stockText.textContent = `¡Últimas ${stock.cantidad} unidades!`; stockBar.style.background = '#fef3c7'; pricePreview.classList.remove('warning'); }
        else { stockIcon.textContent = '✅'; stockText.textContent = 'Stock suficiente'; stockBar.style.background = '#dcfce7'; pricePreview.classList.remove('warning'); }
    } else {
        stockQty.textContent = '?'; maxQtyLabel.textContent = '∞'; qtyInput.max = 999;
        stockIcon.textContent = 'ℹ️'; stockText.textContent = 'Sin registro en inventario.';
        stockBar.style.background = '#f0f9ff'; pricePreview.classList.remove('warning');
    }
    const variantGroup = document.getElementById('variantGroup');
    const variantSelect = document.getElementById('modalVariantSelect');
    variantSelect.innerHTML = '';
    if (product.variantes && product.variantes.length > 0) {
        variantGroup.style.display = 'block';
        if (product.precioBase > 0) {
            const opt = document.createElement('option');
            opt.value = 'base';
            opt.textContent = `Tamaño Único / Base (₡${formatMoney(product.precioBase)})`;
            opt.dataset.price = product.precioBase;
            variantSelect.appendChild(opt);
        }
        product.variantes.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.nombre;
            opt.textContent = `${v.nombre} - ₡${formatMoney(v.precio)}`;
            opt.dataset.price = v.precio;
            variantSelect.appendChild(opt);
        });
        variantSelect.selectedIndex = 0;
    } else { variantGroup.style.display = 'none'; }
    updateModalPricePreview();
    document.getElementById('productModal').classList.add('active');
}

function validateQuantity() {
    const qtyInput = document.getElementById('modalQuantity');
    const maxQty = parseInt(qtyInput.max) || 999;
    const qty = parseInt(qtyInput.value) || 1;
    if (qty > maxQty) { qtyInput.value = maxQty; alert(`⚠️ Stock máximo: ${maxQty} unidades`); }
    if (qty < 1) qtyInput.value = 1;
    updateModalPricePreview();
}

function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }

function getSelectedBasePrice(product) {
    const variantSelect = document.getElementById('modalVariantSelect');
    if (variantSelect && variantSelect.style.display !== 'none' && variantSelect.value !== 'base') {
        return parseFloat(variantSelect.options[variantSelect.selectedIndex]?.dataset.price) || product.precioBase;
    }
    return product.precioBase;
}

function updateModalPricePreview() {
    const productId = document.getElementById('modalProductId').value;
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const basePrice = getSelectedBasePrice(product);
    const qty = parseInt(document.getElementById('modalQuantity').value) || 1;
    const discountInput = document.getElementById('modalDiscount');
    const discountColones = parseFloat(discountInput.value) || 0;
    const totalBase = basePrice * qty;
    if (discountColones > totalBase) {
        discountInput.value = totalBase;
        alert(`⚠️ El descuento no puede ser mayor al total (₡${formatMoney(totalBase)})`);
        return updateModalPricePreview();
    }
    const discountPercent = totalBase > 0 ? (discountColones / totalBase) * 100 : 0;
    const totalFinal = Math.max(0, totalBase - discountColones);
    document.getElementById('modalOriginalPrice').textContent = `₡${formatMoney(basePrice)} c/u`;
    document.getElementById('modalFinalPrice').textContent = `₡${formatMoney(totalFinal)}`;
    const percentLabel = document.getElementById('discountPercentLabel');
    if (discountColones > 0) { percentLabel.textContent = `Equivale a ${discountPercent.toFixed(1)}% de descuento (-₡${formatMoney(discountColones)})`; percentLabel.style.color = 'var(--success)'; }
    else { percentLabel.textContent = 'Sin descuento'; percentLabel.style.color = 'var(--text-light)'; }
    discountInput.dataset.percent = discountPercent.toFixed(2);
}

function confirmAddToCart() {
    const productId = document.getElementById('modalProductId').value;
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const stock = getStockForProduct(product);
    if (stock && stock.cantidad <= 0) { alert('❌ Producto agotado.'); return; }
    let basePrice = product.precioBase;
    let variantName = '';
    const variantSelect = document.getElementById('modalVariantSelect');
    if (variantSelect.style.display !== 'none' && variantSelect.value !== 'base') {
        basePrice = parseFloat(variantSelect.options[variantSelect.selectedIndex].dataset.price);
        variantName = variantSelect.value;
    }
    const qty = parseInt(document.getElementById('modalQuantity').value) || 1;
    const discountInput = document.getElementById('modalDiscount');
    const discountColones = parseFloat(discountInput.value) || 0;
    const discountPercent = parseFloat(discountInput.dataset.percent) || 0;
    const currentInCart = cart.filter(item => item.id === product.id && (!variantName || item.nombre.includes(variantName))).reduce((sum, item) => sum + item.cantidad, 0);
    const totalRequested = currentInCart + qty;
    if (stock && totalRequested > stock.cantidad) {
        alert(`⚠️ Stock insuficiente.\nDisponible: ${stock.cantidad}\nEn carrito: ${currentInCart}\nSolicitado: ${qty}\nMáximo: ${stock.cantidad - currentInCart}`);
        return;
    }
    const totalBase = basePrice * qty;
    const totalFinal = Math.max(0, totalBase - discountColones);
    const finalPriceUnit = totalFinal / qty;
    const baseDescription = buildProductDescription(product.nombre, product.nombreOriginal);
    const displayName = variantName ? `${product.nombre} (${variantName})` : product.nombre;
    const nombreOriginal = variantName ? `${product.nombreOriginal || product.nombre} (${variantName})` : (product.nombreOriginal || product.nombre);
    const descripcion = variantName ? `${baseDescription} (${variantName})` : baseDescription;
    cart.push({
        id: product.id, nombre: displayName, nombreOriginal, descripcion,
        precioUnitario: basePrice, descuentoColones, descuentoPct: discountPercent,
        precioFinalUnitario: finalPriceUnit, cantidad: qty, stockId: stock ? stock.id : null
    });
    closeProductModal();
    renderCart();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
    if (totalItems > 0) { badge.textContent = totalItems; badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 40px 20px; font-size: 0.9rem;">Carrito vacío.<br>Agregue productos o escanee un código.</div>';
        updateTotals(); updateCartBadge(); return;
    }
    container.innerHTML = cart.map((item, index) => {
        const product = allProducts.find(p => p.id === item.id);
        const stock = product ? getStockForProduct(product) : null;
        const stockWarning = stock && item.cantidad >= stock.cantidad ? '<div class="cart-item-stock-warning">⚠️ Últimas unidades</div>' : '';
        return `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.nombre}</div>
                ${item.descuentoColones > 0 ? `<div class="cart-item-discount">🏷️ -₡${formatMoney(item.descuentoColones)} desc. (${Number(item.descuentoPct || 0).toFixed(1)}%)</div>` : ''}
                <div class="cart-item-price">₡${formatMoney(item.precioFinalUnitario)} c/u</div>
                ${stockWarning}
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateCartItemQty(${index}, -1)">-</button>
                <span class="qty-display">${item.cantidad}</span>
                <button class="qty-btn" onclick="updateCartItemQty(${index}, 1)" ${stock && item.cantidad >= stock.cantidad ? 'disabled' : ''}>+</button>
                <span class="remove-btn" onclick="removeFromCart(${index})">&times;</span>
            </div>
        </div>`;
    }).join('');
    updateTotals(); updateCartBadge();
}

function updateCartItemQty(index, change) {
    const item = cart[index]; if (!item) return;
    const product = allProducts.find(p => p.id === item.id);
    const stock = product ? getStockForProduct(product) : null;
    const newQty = item.cantidad + change;
    if (stock && newQty > stock.cantidad) { alert(`⚠️ Stock máximo: ${stock.cantidad} unidades`); return; }
    if (newQty <= 0) cart.splice(index, 1); else item.cantidad = newQty;
    renderCart();
}

function removeFromCart(index) { cart.splice(index, 1); renderCart(); }

function clearCart() {
    if (cart.length === 0) return;
    if (confirm('¿Limpiar el carrito?')) { cart = []; renderCart(); }
}

function getShippingTotals() {
    const transportInput = document.getElementById('transportCost');
    const discountInput = document.getElementById('shippingDiscountInput');
    const gross = requiresShipping ? (parseFloat(transportInput?.value) || 0) : 0;
    let discount = requiresShipping ? Math.max(0, parseFloat(discountInput?.value) || 0) : 0;
    if (discount > gross) discount = gross;
    return { gross, discount, net: Math.max(0, gross - discount) };
}

function updateTotals() {
    const transportInput = document.getElementById('transportCost');
    transportCost = parseFloat(transportInput?.value) || 0;
    const totalConIva = cart.reduce((sum, item) => sum + (item.precioFinalUnitario * item.cantidad), 0);
    const subtotalReal = totalConIva / 1.13;
    const ivaReal = totalConIva - subtotalReal;
    const productsTotal = subtotalReal + ivaReal;
    const ship = getShippingTotals();
    shippingDiscount = ship.discount;
    const finalTotal = productsTotal + ship.net;
    currentSubtotal = subtotalReal;
    currentIva = ivaReal;
    currentTotal = finalTotal;
    document.getElementById('subtotalAmount').textContent = `₡${formatMoney(subtotalReal)}`;
    document.getElementById('taxAmount').textContent = `₡${formatMoney(ivaReal)}`;
    document.getElementById('productsTotal').textContent = `₡${formatMoney(productsTotal)}`;
    const transportRow = document.getElementById('transportRow');
    if (transportRow) {
        if (ship.gross > 0) {
            transportRow.style.display = 'flex';
            document.getElementById('transportAmount').textContent = ship.discount > 0 ? `₡${formatMoney(ship.net)} (desc. envío -₡${formatMoney(ship.discount)})` : `₡${formatMoney(ship.net)}`;
        } else { transportRow.style.display = 'none'; }
    }
    document.getElementById('totalAmount').textContent = `₡${formatMoney(finalTotal)}`;
}

// ==========================================
// GUARDAR FACTURA
// ==========================================
async function saveInvoice() {
    if (cart.length === 0) { alert('El carrito está vacío'); return; }
    if (!currentClient) { alert('Seleccione un cliente'); return; }
    const aceptaMora = await requestMoraConsent({
        cliente: currentClient,
        facturaId: currentEditingInvoice?.id || null,
        numeroFactura: currentInvoiceNumber,
        total: currentTotal, saldo: currentTotal,
        canal: 'facturacion'
    });
    if (!aceptaMora) {
        alert('No se puede guardar la factura pendiente sin aceptar las condiciones de pago y cargos por mora.');
        return;
    }
    if (currentEditingInvoice) { await updateExistingInvoice(); return; }
    try {
        await db.runTransaction(async (transaction) => {
            const stockGroups = new Map();
            for (const item of cart) {
                const product = allProducts.find(p => p.id === item.id);
                if (!product) throw new Error(`Producto no encontrado: ${item.nombre}`);
                const stockId = getStockDocId(product);
                if (!stockGroups.has(stockId)) {
                    const stockRef = db.collection('stock').doc(stockId);
                    const stockDoc = await transaction.get(stockRef);
                    stockGroups.set(stockId, { stockId, product, stockRef, stockDoc, items: [], totalQty: 0 });
                }
                const group = stockGroups.get(stockId);
                group.items.push({ product, item });
                group.totalQty += item.cantidad;
            }
            for (const group of stockGroups.values()) {
                const currentStock = group.stockDoc.exists ? (group.stockDoc.data().cantidad || 0) : 0;
                if (group.totalQty > currentStock) throw new Error(`Stock insuficiente para "${group.product.nombre}": necesita ${group.totalQty}, disponible ${currentStock}`);
            }
            const shipSave = getShippingTotals();
            const effectiveTransport = requiresShipping ? shipSave.net : 0;
            const invoiceRef = db.collection('facturas').doc();
            const invoiceData = {
                numero: currentInvoiceNumber,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                clienteId: currentClient ? currentClient.id : 'contado',
                clienteNombre: currentClient ? currentClient.nombre : 'Cliente Contado',
                clienteTelefono: currentClient ? currentClient.telefono : '',
                clienteDireccion: requiresShipping && currentClient ? (currentClient.direccion || '') : '',
                clienteProvincia: requiresShipping && currentClient ? (currentClient.provincia || '') : '',
                clienteCanton: requiresShipping && currentClient ? (currentClient.canton || '') : '',
                clienteDistrito: requiresShipping && currentClient ? (currentClient.distrito || '') : '',
                requiereEnvio: requiresShipping,
                items: cart,
                subtotal: currentSubtotal, impuesto: currentIva,
                transporte: effectiveTransport,
                descuentoEnvio: requiresShipping ? shipSave.discount : 0,
                total: currentTotal, abonos: [], estado: 'pagada'
            };
            transaction.set(invoiceRef, invoiceData);
            for (const group of stockGroups.values()) {
                const currentStock = group.stockDoc.exists ? (group.stockDoc.data().cantidad || 0) : 0;
                const stockData = group.stockDoc.exists ? group.stockDoc.data() : { nombre: group.product.nombre, categoria: group.product.categoria, precioVenta: group.product.precioBase, cantidad: 0, costoUnitario: 0, ultimaCompra: '-' };
                const newCantidad = Math.max(0, currentStock - group.totalQty);
                transaction.set(group.stockRef, { ...stockData, id: group.stockId, nombre: stockData.nombre || group.product.nombre, cantidad: newCantidad, ultimaActualizacion: new Date().toISOString() }, { merge: true });
                for (const { product, item } of group.items) {
                    const movementRef = db.collection('stock_movements').doc();
                    transaction.set(movementRef, {
                        productId: product.id, productName: product.nombre, type: 'salida',
                        quantity: item.cantidad, reference: currentInvoiceNumber,
                        notes: `Venta a ${currentClient.nombre || 'Cliente Contado'}`,
                        precioVenta: item.precioFinalUnitario,
                        fecha: firebase.firestore.FieldValue.serverTimestamp(),
                        fechaLocal: new Date().toISOString()
                    });
                }
            }
        });
        alert('✅ Factura guardada y stock actualizado');
        cart = []; renderCart();
        document.getElementById('transportCost').value = '';
        resetShippingControls();
        currentInvoiceNumber = generateInvoiceNumber();
        document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
        await loadStock();
        filterProducts(document.getElementById('productSearch')?.value || '');
        checkLowStockAlerts();
    } catch (error) {
        console.error("Error guardando factura:", error);
        if (error.message.includes('Stock insuficiente')) alert('⚠️ ' + error.message);
        else alert('Error al guardar: ' + error.message);
    }
}

async function updateExistingInvoice() {
    const original = currentEditingInvoice;
    if (!original || !original.id) return;
    const originalItems = Array.isArray(original.items) ? original.items : [];
    const oldByStock = new Map();
    const newByStock = new Map();
    const addQuantities = (target, items) => items.forEach(item => {
        const product = allProducts.find(p => String(p.id) === String(item.id));
        const stockId = item.stockId || (product ? getStockDocId(product) : '');
        if (!stockId) throw new Error(`No se encontró el inventario de "${item.nombre || item.id}"`);
        target.set(stockId, (target.get(stockId) || 0) + (parseInt(item.cantidad) || 0));
    });
    try {
        addQuantities(oldByStock, originalItems);
        addQuantities(newByStock, cart);
        const allStockIds = new Set([...oldByStock.keys(), ...newByStock.keys()]);
        const shipSave = getShippingTotals();
        const effectiveTransport = requiresShipping ? shipSave.net : 0;
        const totalPaid = (original.abonos || []).reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
        await db.runTransaction(async transaction => {
            const stockDocs = new Map();
            for (const stockId of allStockIds) {
                const ref = db.collection('stock').doc(stockId);
                stockDocs.set(stockId, { ref, doc: await transaction.get(ref) });
            }
            for (const stockId of allStockIds) {
                const entry = stockDocs.get(stockId);
                const currentStock = entry.doc.exists ? (parseInt(entry.doc.data().cantidad) || 0) : 0;
                const delta = (newByStock.get(stockId) || 0) - (oldByStock.get(stockId) || 0);
                if (delta > 0 && currentStock < delta) {
                    const product = allProducts.find(p => getStockDocId(p) === stockId);
                    throw new Error(`Stock insuficiente para "${product?.nombre || stockId}": necesita ${delta}, disponible ${currentStock}`);
                }
                const stockData = entry.doc.exists ? entry.doc.data() : {};
                transaction.set(entry.ref, { ...stockData, id: stockId, cantidad: Math.max(0, currentStock - delta), ultimaActualizacion: new Date().toISOString() }, { merge: true });
            }
            transaction.update(db.collection('facturas').doc(original.id), {
                clienteId: currentClient.id || original.clienteId || 'contado',
                clienteNombre: currentClient.nombre || original.clienteNombre || 'Cliente Contado',
                clienteTelefono: currentClient.telefono || original.clienteTelefono || '',
                clienteDireccion: requiresShipping ? (currentClient.direccion || '') : '',
                clienteProvincia: requiresShipping ? (currentClient.provincia || '') : '',
                clienteCanton: requiresShipping ? (currentClient.canton || '') : '',
                clienteDistrito: requiresShipping ? (currentClient.distrito || '') : '',
                requiereEnvio: requiresShipping, items: cart,
                subtotal: currentSubtotal, impuesto: currentIva,
                transporte: effectiveTransport,
                descuentoEnvio: requiresShipping ? shipSave.discount : 0,
                total: currentTotal,
                estado: totalPaid >= currentTotal && currentTotal > 0 ? 'pagada' : (totalPaid > 0 ? 'parcial' : 'pendiente'),
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            for (const stockId of allStockIds) {
                const delta = (newByStock.get(stockId) || 0) - (oldByStock.get(stockId) || 0);
                if (!delta) continue;
                const product = allProducts.find(p => getStockDocId(p) === stockId);
                const movementRef = db.collection('stock_movements').doc();
                transaction.set(movementRef, {
                    productId: product?.id || stockId, productName: product?.nombre || stockId,
                    type: delta > 0 ? 'salida_ajuste_factura' : 'entrada_ajuste_factura',
                    quantity: Math.abs(delta), reference: original.numero || currentInvoiceNumber,
                    invoiceId: original.id,
                    notes: `Ajuste por edición de factura para ${currentClient.nombre || 'Cliente Contado'}`,
                    fecha: firebase.firestore.FieldValue.serverTimestamp(), fechaLocal: new Date().toISOString()
                });
            }
        });
        alert('✅ Factura actualizada y stock ajustado correctamente');
        currentEditingInvoice = null; cart = []; renderCart();
        document.getElementById('transportCost').value = ''; resetShippingControls();
        currentInvoiceNumber = generateInvoiceNumber();
        document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
        await loadStock(); filterProducts(document.getElementById('productSearch')?.value || ''); checkLowStockAlerts();
    } catch (error) {
        console.error('Error actualizando factura:', error);
        alert(error.message.includes('Stock insuficiente') ? '⚠️ ' + error.message : 'Error al actualizar: ' + error.message);
    }
}

// ==========================================
// INVENTARIO
// ==========================================
function renderInventoryTable(filter = currentInventoryFilter, searchQuery = '') {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    const q = (searchQuery || '').toLowerCase();
    let totalProducts = 0, inStock = 0, lowStock = 0, outOfStock = 0;
    const rows = [];
    allProducts.forEach(p => {
        const stock = getStockForProduct(p);
        const stockQty = stock ? stock.cantidad : 0;
        const stockStatus = getStockStatus(stock);
        totalProducts++;
        if (stockQty <= 0) outOfStock++;
        else if (stockQty <= LOW_STOCK_THRESHOLD) lowStock++;
        else inStock++;
        if (filter === 'ok' && stockStatus.status !== 'ok') return;
        if (filter === 'low' && stockStatus.status !== 'low') return;
        if (filter === 'out' && stockStatus.status !== 'out') return;
        if (q && !(p.nombre || '').toLowerCase().includes(q) && !(p.categoria || '').toLowerCase().includes(q)) return;
        const stockCellClass = stockStatus.status === 'ok' ? 'ok' : (stockStatus.status === 'low' ? 'low' : 'out');
        const lastPurchase = stock && stock.ultimaCompra ? new Date(stock.ultimaCompra).toLocaleDateString('es-CR') : '-';
        rows.push(`
            <tr>
                <td><strong>${p.nombre}</strong><br><small style="color: #999;">ID: ${p.id}</small></td>
                <td>${p.categoria}</td>
                <td>₡${formatMoney(p.precioBase)}</td>
                <td class="stock-cell ${stockCellClass}">${stockQty} ${stockStatus.status === 'out' ? '❌' : (stockStatus.status === 'low' ? '⚠️' : '✅')}</td>
                <td>${stock ? `₡${formatMoney(stock.costoUnitario)}` : '-'}</td>
                <td>${lastPurchase}</td>
                <td><button class="btn btn-success btn-sm" onclick="openRestockModal('${p.id}')">📦 Reabastecer</button></td>
            </tr>`);
    });
    document.getElementById('invTotalProducts').textContent = totalProducts;
    document.getElementById('invInStock').textContent = inStock;
    document.getElementById('invLowStock').textContent = lowStock;
    document.getElementById('invOutOfStock').textContent = outOfStock;
    tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-light);">No hay productos.</td></tr>';
}

function filterInventory(filter, element) {
    currentInventoryFilter = filter;
    document.querySelectorAll('#view-inventory .filter-tab').forEach(tab => tab.classList.remove('active'));
    if (element) element.classList.add('active');
    renderInventoryTable(filter, document.getElementById('inventorySearch')?.value || '');
}

function filterInventoryTable(query) { renderInventoryTable(currentInventoryFilter, query); }

function openRestockModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const stock = getStockForProduct(product);
    document.getElementById('restockProductId').value = productId;
    document.getElementById('restockProductName').textContent = product.nombre;
    document.getElementById('restockCurrentStock').textContent = stock ? stock.cantidad : 0;
    document.getElementById('restockQuantity').value = 1;
    document.getElementById('restockCost').value = stock ? stock.costoUnitario : '';
    document.getElementById('restockNote').value = '';
    document.getElementById('restockModal').classList.add('active');
}

function closeRestockModal() { document.getElementById('restockModal').classList.remove('active'); }

async function confirmRestock() {
    const productId = document.getElementById('restockProductId').value;
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const quantity = parseInt(document.getElementById('restockQuantity').value) || 0;
    const cost = parseFloat(document.getElementById('restockCost').value) || 0;
    const note = document.getElementById('restockNote').value.trim();
    if (quantity <= 0) { alert('Ingrese una cantidad válida'); return; }
    try {
        await db.runTransaction(async (transaction) => {
            const stockId = getStockDocId(product);
            const stockRef = db.collection('stock').doc(stockId);
            const stockDoc = await transaction.get(stockRef);
            let currentStock = 0, stockData = {};
            if (stockDoc.exists) { currentStock = stockDoc.data().cantidad || 0; stockData = stockDoc.data(); }
            else { stockData = { id: stockId, nombre: product.nombre, categoria: product.categoria, precioVenta: product.precioBase, ultimaCompra: '-' }; }
            const newCantidad = currentStock + quantity;
            const today = new Date().toISOString().split('T')[0];
            transaction.set(stockRef, { ...stockData, id: stockId, nombre: stockData.nombre || product.nombre, cantidad: newCantidad, costoUnitario: cost > 0 ? cost : (stockData.costoUnitario || 0), ultimaActualizacion: new Date().toISOString(), ultimaCompra: today }, { merge: true });
            const movementRef = db.collection('stock_movements').doc();
            transaction.set(movementRef, {
                productId: product.id, productName: product.nombre, type: 'entrada', quantity,
                reference: 'Reabastecimiento manual', notes: note || 'Compra a proveedor',
                costoUnitario: cost,
                fecha: firebase.firestore.FieldValue.serverTimestamp(), fechaLocal: new Date().toISOString()
            });
        });
        alert(`✅ Stock actualizado: ${product.nombre}\n+${quantity} unidades`);
        closeRestockModal();
        await loadStock();
        renderInventoryTable(currentInventoryFilter, document.getElementById('inventorySearch')?.value || '');
        filterProducts(document.getElementById('productSearch')?.value || '');
        checkLowStockAlerts();
    } catch (error) {
        console.error("Error reabasteciendo:", error);
        alert('Error al actualizar el stock: ' + error.message);
    }
}

async function loadStockMovements() {
    try {
        const snapshot = await db.collection('stock_movements').orderBy('fecha', 'desc').limit(100).get();
        stockMovements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMovementsTable(currentMovementFilter);
    } catch (error) { console.error("Error cargando movimientos:", error); }
}

function renderMovementsTable(filter = currentMovementFilter) {
    const tbody = document.getElementById('movementsTableBody');
    if (!tbody) return;
    const filtered = filter === 'all' ? stockMovements : stockMovements.filter(m => m.type === filter);
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-light);">No hay movimientos registrados</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(m => {
        const dateObj = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fechaLocal);
        const dateStr = dateObj.toLocaleString('es-CR');
        const typeIcon = m.type === 'entrada' ? '📥' : '📤';
        const typeClass = m.type === 'entrada' ? 'color: var(--success);' : 'color: var(--danger);';
        const typeLabel = m.type === 'entrada' ? 'ENTRADA' : 'SALIDA';
        return `
            <tr>
                <td style="padding: 10px;">${dateStr}</td>
                <td style="padding: 10px;"><strong>${m.productName}</strong><br><small style="color: #999;">ID: ${m.productId}</small></td>
                <td style="padding: 10px; ${typeClass} font-weight: 700;">${typeIcon} ${typeLabel}</td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">${m.type === 'entrada' ? '+' : '-'}${m.quantity}</td>
                <td style="padding: 10px;">${m.reference || '-'}${m.notes ? `<br><small style="color: #999;">${m.notes}</small>` : ''}</td>
                <td style="padding: 10px; text-align: right;">${m.precioVenta ? `₡${formatMoney(m.precioVenta)}` : (m.costoUnitario ? `₡${formatMoney(m.costoUnitario)}` : '-')}</td>
            </tr>`;
    }).join('');
}

function filterMovements(filter, element) {
    currentMovementFilter = filter;
    const tabs = element?.parentElement?.querySelectorAll('.filter-tab');
    if (tabs) tabs.forEach(tab => tab.classList.remove('active'));
    if (element) element.classList.add('active');
    renderMovementsTable(filter);
}

// ==========================================
// CUENTAS POR COBRAR
// ==========================================
async function loadReceivables() {
    const container = document.getElementById('receivablesList');
    if (!container) return;
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-light);"><div class="spinner" style="margin: 0 auto 15px;"></div>Cargando facturas pendientes...</div>';
    try {
        const snapshot = await db.collection('facturas').get();
        const allInvoices = [];
        snapshot.forEach(doc => allInvoices.push({ id: doc.id, ...doc.data() }));
        const receivables = [];
        const clientDebtMap = new Map();
        for (const inv of allInvoices) {
            const abonos = inv.abonos || [];
            const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
            const totalFactura = parseFloat(inv.total) || 0;
            const saldoPendiente = Math.max(0, totalFactura - totalAbonado);
            if (saldoPendiente > 0) {
                const dateObj = inv.fecha?.toDate ? inv.fecha.toDate() : new Date(inv.fecha);
                const today = new Date();
                const diffTime = Math.abs(today - dateObj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                let urgency = 'normal';
                if (diffDays > 60) urgency = 'urgent';
                else if (diffDays > 30) urgency = 'warning';
                receivables.push({
                    id: inv.id, numero: inv.numero, clienteId: inv.clienteId,
                    clienteNombre: inv.clienteNombre || 'Cliente Contado',
                    clienteTelefono: inv.clienteTelefono,
                    total: totalFactura, abonado: totalAbonado, saldo: saldoPendiente,
                    fecha: dateObj, dias: diffDays, urgencia: urgency, items: inv.items
                });
                const currentDebt = clientDebtMap.get(inv.clienteId) || { nombre: inv.clienteNombre || 'Cliente', total: 0 };
                clientDebtMap.set(inv.clienteId, { ...currentDebt, total: currentDebt.total + saldoPendiente });
            }
        }
        receivables.sort((a, b) => {
            const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
            if (urgencyOrder[a.urgencia] !== urgencyOrder[b.urgencia]) return urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia];
            return b.saldo - a.saldo;
        });
        allReceivables = receivables;
        const totalDebt = receivables.reduce((sum, r) => sum + r.saldo, 0);
        const urgentCount = receivables.filter(r => r.urgencia === 'urgent').length;
        let topClient = '-', topDebt = 0;
        clientDebtMap.forEach((data) => {
            if (data.total > topDebt) { topDebt = data.total; topClient = data.nombre.split(' ')[0]; }
        });
        document.getElementById('recTotalDebt').textContent = `₡${formatMoney(totalDebt)}`;
        document.getElementById('recTotalInvoices').textContent = receivables.length;
        document.getElementById('recUrgentCount').textContent = urgentCount;
        document.getElementById('recTopClient').textContent = topClient;
        renderReceivablesList(receivables);
    } catch (error) {
        console.error("Error cargando cuentas por cobrar:", error);
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--danger);">Error al cargar las facturas pendientes.</div>';
    }
}

function renderReceivablesList(receivables) {
    const container = document.getElementById('receivablesList');
    if (!container) return;
    if (receivables.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--success);"><div style="font-size: 4rem; margin-bottom: 15px;">✅</div><h3 style="color: var(--primary); margin-bottom: 10px;">¡Excelente!</h3><p>No hay facturas pendientes de cobro.</p></div>';
        return;
    }
    container.innerHTML = receivables.map(r => {
        const urgencyClass = r.urgencia === 'urgent' ? 'urgent' : (r.urgencia === 'warning' ? 'warning' : 'normal');
        const daysClass = r.urgencia === 'urgent' ? 'days-urgent' : (r.urgencia === 'warning' ? 'days-warning' : 'days-normal');
        const daysText = r.dias === 0 ? 'Hoy' : (r.dias === 1 ? '1 día' : `${r.dias} días`);
        const urgencyLabel = r.urgencia === 'urgent' ? '🔴 URGENTE' : (r.urgencia === 'warning' ? '🟡 Moderada' : '🔵 Reciente');
        const dateStr = r.fecha.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
        // ✅ Cálculo de mora usando la fecha de la factura (no los días calendario)
        const interest = calculateMoratoryInterest(r.saldo, r.fecha);
        const moraBlock = interest.porcentaje > 0
            ? `<div style="font-size:0.72rem;color:#d97706;margin-top:2px;">+₡${formatMoney(interest.monto)} recargo (${interest.porcentaje}%)</div>
               <div style="font-size:0.75rem;font-weight:700;color:#b45309;">Total: ₡${formatMoney(interest.totalConInteres)}</div>`
            : `<div style="font-size:0.72rem;color:var(--success);margin-top:2px;">Sin recargo (${interest.diasHabilesTranscurridos} días hábiles)</div>`;
        return `
        <div class="receivable-card ${urgencyClass}" onclick="openInvoiceDetailModal('${r.id}')">
            <div class="receivable-header">
                <div>
                    <div class="receivable-client">${r.clienteNombre}</div>
                    <div class="receivable-invoice">Factura: ${r.numero || 'S/N'} • ${dateStr}</div>
                    <div style="font-size: 0.75rem; color: var(--text-light); margin-top: 4px;">${urgencyLabel}</div>
                </div>
                <div class="receivable-amount">
                    <div class="receivable-balance">₡${formatMoney(r.saldo)}</div>
                    ${moraBlock}
                    <div class="receivable-total">de ₡${formatMoney(r.total)}</div>
                </div>
            </div>
            <div class="receivable-footer">
                <div class="receivable-date">📅 ${dateStr}</div>
                <div class="receivable-days ${daysClass}">⏱️ ${daysText} de antigüedad</div>
            </div>
            <div class="receivable-actions" onclick="event.stopPropagation();">
                <button class="btn btn-info btn-sm" onclick="openInvoiceDetailModal('${r.id}')">👁️ Ver Detalle</button>
                <button class="btn btn-success btn-sm" onclick="openPaymentModal('${r.id}')">💰 Abonar</button>
                <button class="btn btn-whatsapp btn-sm" onclick="sendReminder('${r.id}')">📱 Recordar</button>
            </div>
        </div>`;
    }).join('');
}

function filterReceivables(filter, element) {
    currentReceivableFilter = filter;
    document.querySelectorAll('#view-receivables .filter-tab').forEach(tab => tab.classList.remove('active'));
    if (element) element.classList.add('active');
    applyReceivablesFilters();
}

function filterReceivablesTable(query) { applyReceivablesFilters(query); }

function applyReceivablesFilters(searchQuery = '') {
    const q = (searchQuery || '').toLowerCase();
    let filtered = allReceivables;
    if (currentReceivableFilter === 'urgent') filtered = filtered.filter(r => r.urgencia === 'urgent');
    else if (currentReceivableFilter === 'warning') filtered = filtered.filter(r => r.urgencia === 'warning');
    else if (currentReceivableFilter === 'normal') filtered = filtered.filter(r => r.urgencia === 'normal');
    else if (currentReceivableFilter === 'high') filtered = filtered.filter(r => r.saldo > 50000);
    if (q) {
        filtered = filtered.filter(r => (r.clienteNombre || '').toLowerCase().includes(q) || (r.numero && r.numero.toLowerCase().includes(q)));
    }
    renderReceivablesList(filtered);
}

async function sendReminder(invoiceId) {
    try {
        const doc = await db.collection('facturas').doc(invoiceId).get();
        if (!doc.exists) { alert('Factura no encontrada'); return; }
        const factura = { id: doc.id, ...doc.data() };
        let phone = '';
        const clienteLocal = allClients.find(c => c.id === factura.clienteId);
        if (clienteLocal && clienteLocal.telefono) phone = normalizePhone(clienteLocal.telefono);
        else if (factura.clienteTelefono) phone = normalizePhone(factura.clienteTelefono);
        if (!phone) {
            phone = prompt(`Ingrese el número de WhatsApp para enviar recordatorio:`);
            if (!phone) return;
            phone = normalizePhone(phone);
        }
        const { message } = buildWhatsAppMessage(factura, 'reminder');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
        console.error("Error enviando recordatorio:", error);
        alert('Error al enviar el recordatorio.');
    }
}

// ==========================================
// HISTORIAL
// ==========================================
async function openHistoryModal() {
    if (!currentClient) return;
    document.getElementById('historyClientName').textContent = currentClient.nombre || 'Cliente';
    document.getElementById('historyModal').classList.add('active');
    document.getElementById('historyList').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-light);">Cargando historial...</div>';
    try {
        const snapshot = await db.collection('facturas').where('clienteId', '==', currentClient.id).get();
        let facturas = [];
        snapshot.forEach(doc => facturas.push({ id: doc.id, ...doc.data() }));
        facturas.sort((a, b) => {
            const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
            const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
            return dateB - dateA;
        });
        let totalGastado = 0, totalDebt = 0;
        const listContainer = document.getElementById('historyList');
        if (facturas.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-light);">Este cliente aún no tiene facturas registradas.</div>';
        } else {
            listContainer.innerHTML = facturas.map(f => {
                const abonos = f.abonos || [];
                const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
                const totalFactura = parseFloat(f.total) || 0;
                const saldoPendiente = Math.max(0, totalFactura - totalAbonado);
                totalGastado += totalFactura;
                if (saldoPendiente > 0) totalDebt += saldoPendiente;
                let estado, estadoClass, itemClass;
                if (saldoPendiente <= 0 && totalFactura > 0) { estado = 'Pagada'; estadoClass = 'status-pagada'; itemClass = 'paid'; }
                else if (totalAbonado > 0) { estado = 'Parcial'; estadoClass = 'status-parcial'; itemClass = 'partial'; }
                else { estado = 'Pendiente'; estadoClass = 'status-pendiente'; itemClass = 'has-debt'; }
                const dateObj = f.fecha?.toDate ? f.fecha.toDate() : new Date(f.fecha);
                const dateStr = dateObj.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
                return `
                <div class="history-item ${itemClass}" style="cursor: pointer;" onclick="openInvoiceDetailModal('${f.id}')">
                    <div class="history-info">
                        <div class="history-invoice">${f.numero || 'S/N'} 👁️</div>
                        <div class="history-date">${dateStr}</div>
                        <span class="history-status ${estadoClass}">${estado}</span>
                        ${totalAbonado > 0 ? `<div style="font-size: 0.75rem; color: var(--success); margin-top: 2px;">Abonado: ₡${formatMoney(totalAbonado)}</div>` : ''}
                    </div>
                    <div class="history-totals">
                        <div class="history-total">₡${formatMoney(totalFactura)}</div>
                        ${saldoPendiente > 0 ? `<div class="history-balance">Saldo: ₡${formatMoney(saldoPendiente)}</div>` : ''}
                    </div>
                    <div class="history-actions" onclick="event.stopPropagation();">
                        <button class="btn btn-whatsapp btn-sm" onclick="resendInvoice('${f.id}')">📱</button>
                        ${saldoPendiente > 0 ? `<button class="btn btn-success btn-sm" onclick="openPaymentModal('${f.id}')">💰</button>` : ''}
                    </div>
                </div>`;
            }).join('');
        }
        document.getElementById('statTotalSpent').textContent = `₡${formatMoney(totalGastado)}`;
        document.getElementById('statInvoiceCount').textContent = facturas.length;
        document.getElementById('statTotalDebt').textContent = `₡${formatMoney(totalDebt)}`;
    } catch (error) {
        console.error("Error cargando historial:", error);
        document.getElementById('historyList').innerHTML = '<div style="text-align: center; padding: 20px; color: var(--danger);">Error al cargar el historial.</div>';
    }
}

function closeHistoryModal() { document.getElementById('historyModal').classList.remove('active'); }

// ==========================================
// ABONOS
// ==========================================
async function openPaymentModal(invoiceId) {
    try {
        const doc = await db.collection('facturas').doc(invoiceId).get();
        if (!doc.exists) { alert('Factura no encontrada'); return; }
        currentPaymentInvoice = { id: doc.id, ...doc.data() };
        const abonos = currentPaymentInvoice.abonos || [];
        const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
        const saldo = Math.max(0, (parseFloat(currentPaymentInvoice.total) || 0) - totalAbonado);
        document.getElementById('payInvoiceNum').textContent = currentPaymentInvoice.numero || 'S/N';
        document.getElementById('payTotal').textContent = `₡${formatMoney(parseFloat(currentPaymentInvoice.total) || 0)}`;
        document.getElementById('payPaid').textContent = `₡${formatMoney(totalAbonado)}`;
        document.getElementById('payBalance').textContent = `₡${formatMoney(saldo)}`;
        const amountInput = document.getElementById('paymentAmount');
        amountInput.value = ''; amountInput.max = saldo;
        document.getElementById('paymentNote').value = '';
        document.getElementById('paymentPreview').style.display = 'none';
        document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
        selectedPaymentMethod = null;
        document.getElementById('paymentModal').classList.add('active');
    } catch (error) {
        console.error("Error abriendo modal de pago:", error);
        alert('Error al cargar la factura.');
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    currentPaymentInvoice = null;
    selectedPaymentMethod = null;
}

function selectPaymentMethod(element) {
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedPaymentMethod = element.dataset.method;
}

function updatePaymentPreview() {
    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const abonos = currentPaymentInvoice.abonos || [];
    const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
    const saldo = Math.max(0, (parseFloat(currentPaymentInvoice.total) || 0) - totalAbonado);
    const newBalance = Math.max(0, saldo - amount);
    const preview = document.getElementById('paymentPreview');
    if (amount > 0) { preview.style.display = 'block'; document.getElementById('newBalancePreview').textContent = `₡${formatMoney(newBalance)}`; }
    else { preview.style.display = 'none'; }
}

async function confirmPayment() {
    if (!selectedPaymentMethod) { alert('Seleccione un método de pago'); return; }
    if (!currentPaymentInvoice) { alert('No hay factura seleccionada'); return; }
    const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    if (amount <= 0) { alert('Ingrese un monto válido'); return; }
    const abonos = currentPaymentInvoice.abonos || [];
    const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
    const saldo = Math.max(0, (parseFloat(currentPaymentInvoice.total) || 0) - totalAbonado);
    if (amount > saldo) {
        if (!confirm(`El monto (₡${formatMoney(amount)}) excede el saldo pendiente (₡${formatMoney(saldo)}). ¿Desea continuar?`)) return;
    }
    const note = document.getElementById('paymentNote').value.trim();
    try {
        const newAbono = { monto: amount, metodo: selectedPaymentMethod, nota: note || '-', fecha: new Date() };
        await db.collection('facturas').doc(currentPaymentInvoice.id).update({ abonos: firebase.firestore.FieldValue.arrayUnion(newAbono) });
        alert(`✅ Abono de ₡${formatMoney(amount)} registrado exitosamente`);
        const invoiceId = currentPaymentInvoice.id;
        closePaymentModal();
        if (document.getElementById('view-receivables')?.style.display !== 'none') loadReceivables();
        else if (currentClient) openHistoryModal();
        else openInvoiceDetailModal(invoiceId);
    } catch (error) {
        console.error("Error registrando abono:", error);
        alert('Error al registrar el abono.');
    }
}

async function resendInvoice(invoiceId) {
    try {
        const doc = await db.collection('facturas').doc(invoiceId).get();
        if (!doc.exists) { alert('Factura no encontrada'); return; }
        const factura = { id: doc.id, ...doc.data() };
        let phone = '';
        const clienteLocal = allClients.find(c => c.id === factura.clienteId);
        if (clienteLocal && clienteLocal.telefono) phone = normalizePhone(clienteLocal.telefono);
        else if (factura.clienteTelefono) phone = normalizePhone(factura.clienteTelefono);
        if (!phone) {
            phone = prompt(`Ingrese el número de WhatsApp para reenviar la factura ${factura.numero}:`);
            if (!phone) return;
            phone = normalizePhone(phone);
        }
        const { message } = buildWhatsAppMessage(factura, 'resend');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
        console.error("Error reenviando factura:", error);
        alert('Error al reenviar la factura.');
    }
}

// ==========================================
// DETALLE DE FACTURA
// ==========================================
async function openInvoiceDetailModal(invoiceId) {
    try {
        const doc = await db.collection('facturas').doc(invoiceId).get();
        if (!doc.exists) { alert('Factura no encontrada'); return; }
        currentDetailInvoice = { id: doc.id, ...doc.data() };
        const factura = currentDetailInvoice;
        document.getElementById('detailInvoiceNum').textContent = factura.numero || 'S/N';
        const dateObj = factura.fecha?.toDate ? factura.fecha.toDate() : new Date(factura.fecha);
        document.getElementById('detailDate').textContent = dateObj.toLocaleString('es-CR');
        document.getElementById('detailClient').textContent = factura.clienteNombre || 'Cliente Contado';
        const abonos = factura.abonos || [];
        const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
        const totalFactura = parseFloat(factura.total) || 0;
        const saldoPendiente = Math.max(0, totalFactura - totalAbonado);
        let estado, estadoClass;
        if (saldoPendiente <= 0 && totalFactura > 0) { estado = '✅ Pagada'; estadoClass = 'status-pagada'; }
        else if (totalAbonado > 0) { estado = '⚠️ Pago Parcial'; estadoClass = 'status-parcial'; }
        else { estado = '⏳ Pendiente'; estadoClass = 'status-pendiente'; }
        document.getElementById('detailStatus').innerHTML = `<span class="history-status ${estadoClass}">${estado}</span>`;
        document.getElementById('detailTotal').textContent = `₡${formatMoney(totalFactura)}`;
        const productsTable = document.getElementById('detailProductsTable');
        if (factura.items && factura.items.length > 0) {
            productsTable.innerHTML = factura.items.map(item => {
                const itemTotal = item.precioFinalUnitario * item.cantidad;
                let discountText = '-';
                if (item.descuentoColones > 0) discountText = `₡${formatMoney(item.descuentoColones)} (${Number(item.descuentoPct || 0).toFixed(1)}%)`;
                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;">
                            <div style="font-weight: 600;">${getItemDescription(item)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-light);">ID: ${item.id}</div>
                        </td>
                        <td style="padding: 10px; text-align: center;">${item.cantidad}</td>
                        <td style="padding: 10px; text-align: right;">₡${formatMoney(item.precioUnitario)}</td>
                        <td style="padding: 10px; text-align: center; color: ${item.descuentoPct > 0 ? 'var(--danger)' : 'var(--text-light)'};">${discountText}</td>
                        <td style="padding: 10px; text-align: right; font-weight: 600;">₡${formatMoney(itemTotal)}</td>
                    </tr>`;
            }).join('');
        } else {
            productsTable.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-light);">No hay productos registrados</td></tr>';
        }
        document.getElementById('detailSubtotal').textContent = `₡${formatMoney(factura.subtotal || 0)}`;
        document.getElementById('detailTax').textContent = `₡${formatMoney(factura.impuesto || 0)}`;
        const detailTransportEl = document.getElementById('detailTransport');
        if (detailTransportEl) detailTransportEl.textContent = `₡${formatMoney(factura.transporte || 0)}`;
        document.getElementById('detailTotalFinal').textContent = `₡${formatMoney(totalFactura)}`;
        const paymentsSection = document.getElementById('detailPaymentsSection');
        if (abonos.length > 0 || saldoPendiente > 0) {
            paymentsSection.style.display = 'block';
            if (abonos.length > 0) {
                document.getElementById('detailPaymentsTable').innerHTML = abonos.map(a => {
                    const aDate = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
                    return `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 10px;">${aDate.toLocaleDateString('es-CR')}</td>
                            <td style="padding: 10px;">${a.metodo}</td>
                            <td style="padding: 10px; font-size: 0.8rem; color: var(--text-light);">${a.nota || '-'}</td>
                            <td style="padding: 10px; text-align: right; font-weight: 600; color: var(--success);">₡${formatMoney(a.monto)}</td>
                        </tr>`;
                }).join('');
            } else {
                document.getElementById('detailPaymentsTable').innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-light);">Sin pagos registrados</td></tr>';
            }
            document.getElementById('detailTotalPaid').textContent = `₡${formatMoney(totalAbonado)}`;
            document.getElementById('detailBalance').textContent = `₡${formatMoney(saldoPendiente)}`;

            // ✅ Mostrar intereses por mora usando la fecha de la factura
            const interest = calculateMoratoryInterest(saldoPendiente, factura.fecha);
            const interestBox = document.getElementById('detailInterestBox');
            if (interestBox) {
                if (interest.porcentaje > 0) {
                    interestBox.style.display = 'block';
                    interestBox.innerHTML = `
                        <div style="padding:10px;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;margin-top:8px;">
                            <div style="font-weight:700;color:#856404;">⏰ Intereses por mora</div>
                            <div style="font-size:0.85rem;color:#664d03;margin-top:4px;">
                                ${interest.diasHabilesTranscurridos} días hábiles transcurridos → ${interest.porcentaje}% de recargo
                            </div>
                            <div style="font-size:0.9rem;margin-top:6px;">
                                Recargo: <strong>₡${formatMoney(interest.monto)}</strong><br>
                                Total a pagar hoy: <strong style="color:#d97706;">₡${formatMoney(interest.totalConInteres)}</strong>
                            </div>
                        </div>`;
                } else {
                    interestBox.style.display = 'block';
                    interestBox.innerHTML = `
                        <div style="padding:10px;background:#d1fae5;border:1px solid #10b981;border-radius:8px;margin-top:8px;">
                            <div style="font-weight:700;color:#065f46;">✅ Al día</div>
                            <div style="font-size:0.85rem;color:#064e3b;margin-top:4px;">
                                ${interest.diasHabilesTranscurridos} días hábiles — sin recargo (plazo libre: 15 días hábiles)
                            </div>
                        </div>`;
                }
            }
            document.getElementById('detailPaymentBtn').style.display = saldoPendiente > 0 ? 'flex' : 'none';
        } else {
            paymentsSection.style.display = 'none';
            document.getElementById('detailPaymentBtn').style.display = 'none';
        }
        ensureInvoiceDetailActions();
        document.getElementById('invoiceDetailModal').classList.add('active');
    } catch (error) {
        console.error("Error abriendo detalle de factura:", error);
        alert('Error al cargar el detalle de la factura.');
    }
}

function ensureInvoiceDetailActions() {
    const modal = document.getElementById('invoiceDetailModal');
    if (!modal || document.getElementById('invoiceDetailActions')) return;
    const actions = document.createElement('div');
    actions.id = 'invoiceDetailActions';
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0;';
    actions.innerHTML = `<button type="button" class="btn btn-info" onclick="printHistoricalInvoice()">🖨️ Imprimir factura</button> <button type="button" class="btn btn-warning" onclick="editCurrentInvoice()">✏️ Editar factura</button>`;
    const closeBtn = modal.querySelector('[onclick*="closeInvoiceDetailModal"]');
    if (closeBtn && closeBtn.parentElement) closeBtn.parentElement.insertBefore(actions, closeBtn);
    else modal.querySelector('.modal-content, .modal-body')?.appendChild(actions);
}

function editCurrentInvoice() {
    const invoice = currentDetailInvoice;
    if (!invoice) return;
    if ((invoice.abonos || []).length > 0 && !confirm('Esta factura tiene abonos registrados. ¿Desea continuar con la edición?')) return;
    currentEditingInvoice = JSON.parse(JSON.stringify(invoice, (key, value) => {
        if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
        return value;
    }));
    currentInvoiceNumber = invoice.numero || currentInvoiceNumber;
    document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
    cart = (invoice.items || []).map(item => ({ ...item }));
    const knownClient = allClients.find(c => String(c.id) === String(invoice.clienteId));
    currentClient = knownClient || {
        id: invoice.clienteId || 'contado', nombre: invoice.clienteNombre || 'Cliente Contado',
        telefono: invoice.clienteTelefono || '', direccion: invoice.clienteDireccion || '',
        provincia: invoice.clienteProvincia || '', canton: invoice.clienteCanton || '', distrito: invoice.clienteDistrito || ''
    };
    if (knownClient) selectClient(knownClient.id);
    else {
        document.getElementById('invoiceClientInfo').innerHTML = `<strong>${currentClient.nombre}</strong>`;
        document.getElementById('selectedClientInfo').style.display = 'flex';
        document.getElementById('clientNameDisplay').textContent = currentClient.nombre;
        document.getElementById('clientIdDisplay').textContent = currentClient.id;
        document.getElementById('clientPhoneDisplay').textContent = currentClient.telefono || 'N/A';
    }
    requiresShipping = Boolean(invoice.requiereEnvio || invoice.clienteDireccion);
    shippingDiscount = parseFloat(invoice.descuentoEnvio) || 0;
    document.getElementById('transportCost').value = requiresShipping ? ((parseFloat(invoice.transporte) || 0) + shippingDiscount) : '';
    const shippingChk = document.getElementById('requiresShippingChk');
    if (shippingChk) shippingChk.checked = requiresShipping;
    const shippingWrap = document.getElementById('shippingDiscountWrap');
    if (shippingWrap) shippingWrap.style.display = requiresShipping ? 'flex' : 'none';
    const discountInput = document.getElementById('shippingDiscountInput');
    if (discountInput) discountInput.value = shippingDiscount;
    renderCart();
    closeInvoiceDetailModal();
    switchView('pos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert(`✏️ Editando factura ${invoice.numero || 'S/N'}. Revise los cambios y presione "Guardar factura".`);
}

function printHistoricalInvoice() { if (currentDetailInvoice) printInvoiceData(currentDetailInvoice); }

function printInvoiceData(invoice) {
    const dateObj = invoice.fecha?.toDate ? invoice.fecha.toDate() : new Date(invoice.fecha || Date.now());
    const items = invoice.items || [];
    const rows = items.map(item => `<tr><td>${getItemDescription(item)}</td><td>${item.cantidad}</td><td>₡${formatMoney(item.precioFinalUnitario)}</td><td>₡${formatMoney((item.precioFinalUnitario || 0) * (item.cantidad || 0))}</td></tr>`).join('');
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) { alert('Permita las ventanas emergentes para imprimir'); return; }
    win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${invoice.numero || ''}</title>
        <style>body{font-family:Arial,sans-serif;color:#222;margin:28px}h1{color:#216e39;margin-bottom:4px}.head{display:flex;justify-content:space-between;border-bottom:2px solid #216e39;padding-bottom:12px}.muted{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#f1f7f2}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.totals{margin:20px 0 0 auto;width:280px}.line{display:flex;justify-content:space-between;padding:5px}.grand{font-weight:bold;font-size:18px;border-top:2px solid #216e39;margin-top:7px;padding-top:9px}@media print{body{margin:10mm}}</style></head><body>
        <div class="head"><div><h1>EWE ESENTIA</h1><div class="muted">Factura de venta</div></div><div><b>No. ${invoice.numero || 'S/N'}</b><br><span class="muted">${dateObj.toLocaleString('es-CR')}</span></div></div>
        <p><b>Cliente:</b> ${invoice.clienteNombre || 'Cliente Contado'}<br><span class="muted">Tel: ${invoice.clienteTelefono || 'N/A'}</span>${invoice.requiereEnvio && invoice.clienteDireccion ? `<br><span class="muted">Dirección: ${invoice.clienteDireccion}, ${[invoice.clienteDistrito, invoice.clienteCanton, invoice.clienteProvincia].filter(Boolean).join(', ')}</span>` : ''}</p>
        <table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio c/u</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="totals"><div class="line"><span>Subtotal</span><span>₡${formatMoney(invoice.subtotal || 0)}</span></div><div class="line"><span>IVA (13%)</span><span>₡${formatMoney(invoice.impuesto || 0)}</span></div>${invoice.transporte > 0 ? `<div class="line"><span>Transporte</span><span>₡${formatMoney(invoice.transporte)}</span></div>` : ''}${invoice.descuentoEnvio > 0 ? `<div class="line"><span>Desc. envío</span><span>-₡${formatMoney(invoice.descuentoEnvio)}</span></div>` : ''}<div class="line grand"><span>TOTAL</span><span>₡${formatMoney(invoice.total || 0)}</span></div></div><p class="muted">¡Gracias por su compra!</p><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
}

function closeInvoiceDetailModal() {
    document.getElementById('invoiceDetailModal').classList.remove('active');
    currentDetailInvoice = null;
}

function resendInvoiceFromDetail() { if (currentDetailInvoice) resendInvoice(currentDetailInvoice.id); }

function openPaymentModalFromDetail() {
    if (currentDetailInvoice) {
        const invoiceId = currentDetailInvoice.id;
        closeInvoiceDetailModal();
        setTimeout(() => openPaymentModal(invoiceId), 300);
    }
}

// ==========================================
// ESCÁNER
// ==========================================
function openScanner() {
    document.getElementById('scannerModal').classList.add('active');
    if (typeof Html5Qrcode === 'undefined') { alert('El escáner no está disponible.'); closeScanner(); return; }
    if (!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 };
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .catch(err => { console.error("Error cámara:", err); alert("No se pudo acceder a la cámara."); closeScanner(); });
}

function closeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop()
            .then(() => { document.getElementById('scannerModal').classList.remove('active'); })
            .catch(() => { document.getElementById('scannerModal').classList.remove('active'); });
    } else { document.getElementById('scannerModal').classList.remove('active'); }
}

function onScanSuccess(decodedText) {
    const searchCode = String(decodedText).trim();
    const product = allProducts.find(p => String(p.id) === searchCode);
    if (product) {
        const stock = getStockForProduct(product);
        if (stock && stock.cantidad <= 0) { alert(`❌ Producto agotado: ${product.nombre}`); return; }
        closeScanner();
        setTimeout(() => openProductModal(product.id), 300);
    } else { alert(`❌ Producto no encontrado.\nCódigo: ${searchCode}`); }
}

function onScanFailure() { }

// ==========================================
// IMPRESIÓN Y WHATSAPP
// ==========================================
function printTicket() {
    if (cart.length === 0 || !currentClient) { alert('Carrito vacío o cliente no seleccionado'); return; }
    document.getElementById('ticketDate').textContent = new Date().toLocaleString('es-CR');
    document.getElementById('ticketInvoiceNum').textContent = document.getElementById('invoiceNumber').textContent;
    document.getElementById('ticketClientName').textContent = currentClient.nombre || 'Cliente Contado';
    document.getElementById('ticketClientId').textContent = currentClient.cedula || currentClient.id || 'N/A';
    const phoneLine = document.getElementById('ticketPhoneLine');
    const phoneSpan = document.getElementById('ticketPhone');
    if (currentClient.telefono && currentClient.telefono !== 'N/A') { phoneSpan.textContent = currentClient.telefono; phoneLine.style.display = 'block'; }
    else { phoneLine.style.display = 'none'; }
    const addressLine = document.getElementById('ticketAddressLine');
    const addressSpan = document.getElementById('ticketAddress');
    if (requiresShipping && currentClient.direccion) { addressSpan.textContent = [currentClient.direccion, currentClient.distrito, currentClient.canton, currentClient.provincia].filter(Boolean).join(', '); addressLine.style.display = 'block'; }
    else { addressLine.style.display = 'none'; }
    document.getElementById('ticketItems').innerHTML = cart.map(item => {
        let desc = `${item.cantidad} x ${getItemDescription(item)}`;
        if (item.descuentoColones > 0) desc += ` (-₡${formatMoney(item.descuentoColones)})`;
        return `<div class="ticket-item"><div class="ticket-item-desc">${desc}</div><div>₡${formatMoney(item.precioFinalUnitario * item.cantidad)}</div></div>`;
    }).join('');
    document.getElementById('ticketSubtotal').textContent = `₡${formatMoney(currentSubtotal)}`;
    document.getElementById('ticketTax').textContent = `₡${formatMoney(currentIva)}`;
    document.getElementById('ticketProductsTotal').textContent = `₡${formatMoney(currentSubtotal + currentIva)}`;
    const shipTicket = getShippingTotals();
    if (shipTicket.gross > 0) {
        document.getElementById('ticketTransportLine').style.display = 'flex';
        document.getElementById('ticketTransport').textContent = shipTicket.discount > 0 ? `₡${formatMoney(shipTicket.net)} (desc. -₡${formatMoney(shipTicket.discount)})` : `₡${formatMoney(shipTicket.net)}`;
    } else { document.getElementById('ticketTransportLine').style.display = 'none'; }
    document.getElementById('ticketTotal').textContent = `₡${formatMoney(currentTotal)}`;
    window.print();
}

// ==========================================
// MENSAJES WHATSAPP UNIFICADOS
// ==========================================
function buildWhatsAppMessage(invoice, type = 'invoice') {
    const clientName = invoice.clienteNombre || 'Cliente';
    const numero = invoice.numero || 'S/N';
    const dateObj = invoice.fecha?.toDate ? invoice.fecha.toDate() : new Date(invoice.fecha || Date.now());
    const fechaStr = dateObj.toLocaleDateString('es-CR');
    const totalFactura = parseFloat(invoice.total) || 0;
    const abonos = invoice.abonos || [];
    const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
    const saldoPendiente = Math.max(0, totalFactura - totalAbonado);
    // ✅ Calcular mora usando la fecha de la factura (días hábiles)
    const interest = calculateMoratoryInterest(saldoPendiente, invoice.fecha);

    let header = '';
    if (type === 'reminder') {
        header = `🌿 *Recordatorio amable de pago* 🌿\n\nHola ${clientName} 👋, esperamos que estés muy bien.\n\nTe escribimos de *EWE Esentia* para recordarte amablemente que tienes un saldo pendiente con nosotros:\n\n`;
    } else if (type === 'resend') {
        header = `🌿 *Factura EWE Esentia* 🌿\nHola ${clientName} 👋, te reenviamos tu factura:\n\n`;
    } else {
        header = `🌿 *¡Gracias por tu compra en EWE Esentia!* 🌿\nHola ${clientName} 👋, aquí tienes tu factura:\n\n`;
    }
    let msg = header;
    msg += `📄 *Factura:* ${numero}\n`;
    msg += `📅 *Fecha:* ${fechaStr}\n`;
    if (invoice.requiereEnvio && invoice.clienteDireccion) {
        const dir = [invoice.clienteDireccion, invoice.clienteDistrito, invoice.clienteCanton, invoice.clienteProvincia].filter(Boolean).join(', ');
        msg += `📍 *Envío a:* ${dir}\n`;
    }
    msg += `\n━━━━━━━━━━━━━━━━━━\n*🛍️ Detalle de productos:*\n`;
    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach(item => {
            let desc = getItemDescription(item);
            if (item.descuentoColones > 0) desc += ` (-₡${formatMoney(item.descuentoColones)})`;
            msg += `▪️ ${item.cantidad} x ${desc}\n   ₡${formatMoney(item.precioFinalUnitario * item.cantidad)}\n`;
        });
    }
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `Subtotal: ₡${formatMoney(invoice.subtotal || 0)}\n`;
    msg += `IVA (13%): ₡${formatMoney(invoice.impuesto || 0)}\n`;
    if (invoice.transporte > 0) {
        msg += `🚚 Transporte: ₡${formatMoney(invoice.transporte)}\n`;
        if (invoice.descuentoEnvio > 0) msg += `🏷️ Desc. envío: -₡${formatMoney(invoice.descuentoEnvio)}\n`;
    }
    msg += `\n💰 *TOTAL: ₡${formatMoney(totalFactura)}*\n`;
    if (abonos.length > 0) {
        msg += `\n💳 *Pagos realizados:*\n`;
        abonos.forEach((a, idx) => {
            const aDate = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
            msg += `  ${idx + 1}. ₡${formatMoney(a.monto)} - ${a.metodo} (${aDate.toLocaleDateString('es-CR')})\n`;
        });
        msg += `\n*Total abonado:* ₡${formatMoney(totalAbonado)}\n`;
    }
    if (saldoPendiente > 0) {
        msg += `\n⚠️ *Saldo pendiente:* ₡${formatMoney(saldoPendiente)}\n`;
        if (interest.porcentaje > 0) {
            msg += `\n⏰ *Política de pago:*\n`;
            msg += `Después de *15 días hábiles* de atraso se aplica un recargo acumulable:\n`;
            msg += `  • 16 a 30 días hábiles → *1.5%*\n`;
            msg += `  • 31+ días hábiles → *3.5%* (1.5% + 2%)\n\n`;
            msg += `📌 En tu caso (${interest.diasHabilesTranscurridos} días hábiles): *${interest.porcentaje}%*\n`;
            msg += `💸 Recargo actual: *₡${formatMoney(interest.monto)}*\n`;
            msg += `💵 *Total a pagar hoy: ₡${formatMoney(interest.totalConInteres)}*\n`;
        } else {
            msg += `\n🕐 Llevas *${interest.diasHabilesTranscurridos} días hábiles* sin recargo. ¡Paga dentro de los primeros 15 días hábiles y evita intereses!\n`;
        }
    } else {
        msg += `\n✅ *Factura totalmente pagada.* ¡Gracias!\n`;
    }
    if (type === 'reminder') {
        msg += `\n🙏 Te agradecemos mucho realizar el pago a la brevedad.\n`;
        msg += `Cualquier consulta estamos con gusto 😊\n`;
    } else {
        msg += `\n¡Gracias por tu preferencia! 🙏🌿\n`;
    }
    msg += `\n💳 *SINPE Móvil:* 7295-2454\n*EWE Esentia*`;
    return { message: msg, interest };
}

function sendWhatsApp() {
    if (cart.length === 0) { alert('El carrito está vacío'); return; }
    let phone = currentClient && currentClient.telefono ? normalizePhone(currentClient.telefono) : '';
    if (!phone) {
        phone = prompt("Ingrese el número de WhatsApp:");
        if (!phone) return;
        phone = normalizePhone(phone);
    }
    const shipWA = getShippingTotals();
    const invoice = {
        numero: document.getElementById('invoiceNumber').textContent,
        fecha: new Date(),
        clienteNombre: currentClient ? currentClient.nombre : 'Cliente',
        clienteTelefono: currentClient?.telefono || '',
        requiereEnvio: requiresShipping,
        clienteDireccion: requiresShipping && currentClient ? currentClient.direccion : '',
        clienteDistrito: requiresShipping && currentClient ? currentClient.distrito : '',
        clienteCanton: requiresShipping && currentClient ? currentClient.canton : '',
        clienteProvincia: requiresShipping && currentClient ? currentClient.provincia : '',
        items: cart,
        subtotal: currentSubtotal, impuesto: currentIva,
        transporte: shipWA.net, descuentoEnvio: shipWA.discount,
        total: currentTotal, abonos: []
    };
    const { message } = buildWhatsAppMessage(invoice, 'invoice');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

// ==========================================
// MÓDULO: ÓRDENES DE COMPRA
// ==========================================
function initPurchaseModule() {
    const navBtn = document.querySelector('.nav-btn');
    const navContainer = navBtn ? navBtn.parentElement : null;
    if (navContainer && !document.getElementById('navPurchaseBtn')) {
        const btn = document.createElement('button');
        btn.id = 'navPurchaseBtn';
        btn.className = 'nav-btn';
        btn.style.cssText = 'background:#6d28d9;color:#fff;';
        btn.textContent = '📋 Órdenes';
        btn.onclick = (e) => switchView('purchase', e);
        navContainer.appendChild(btn);
    }
    if (document.getElementById('view-purchase')) return;
    const view = document.createElement('div');
    view.id = 'view-purchase';
    view.style.cssText = 'display:none;padding:15px;max-width:1100px;margin:0 auto;';
    view.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
            <h2 style="margin:0;color:var(--primary,#2e7d32);">📋 Órdenes de Compra</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-success" onclick="generatePOFromWeek()">📅 Generar de pedidos de la semana</button>
                <button class="btn" onclick="newPurchaseOrder()">➕ Nueva orden</button>
            </div>
        </div>
        <div id="poEditor" style="display:none;background:#ffffff;border:1px solid var(--border,#dddddd);border-radius:10px;padding:14px;margin-bottom:15px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px;">
                <div><label style="font-size:0.75rem;color:var(--text-light,#888);">No. Orden</label><br><input id="poNumero" readonly style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;background:#f5f5f5;width:170px;"></div>
                <div><label style="font-size:0.75rem;color:var(--text-light,#888);">Proveedor *</label><br><input id="poProveedor" placeholder="Nombre del proveedor" style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;width:190px;"></div>
                <div style="flex:1;min-width:180px;"><label style="font-size:0.75rem;color:var(--text-light,#888);">Notas</label><br><input id="poNotas" placeholder="Notas de la compra" style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;width:100%;"></div>
                <div><label style="font-size:0.75rem;color:var(--text-light,#888);">Solicitado por</label><br><input id="poSolicitadoPor" value="M Elena Gutierrez S." style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;width:190px;"></div>
                <div><label style="font-size:0.75rem;color:var(--text-light,#888);">Autorizado por</label><br><input id="poAutorizadoPor" value="Wilber Calderon M." style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;width:190px;"></div>
                <div id="poEstadoBadge" style="font-weight:700;"></div>
            </div>
            <div style="display:grid;grid-template-columns:2fr 70px 120px 120px 40px;gap:8px;font-size:0.75rem;color:var(--text-light,#888);padding:0 4px;">
                <div>Producto</div><div>Cant.</div><div>Costo unit. ₡</div><div>Subtotal ₡</div><div></div>
            </div>
            <div id="poLines"></div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center;">
                <input id="poQuickSearch" list="poProductDatalist" placeholder="🔍 Buscar producto..." style="flex:1;min-width:220px;padding:8px;border:1px solid var(--border,#ccc);border-radius:6px;">
                <datalist id="poProductDatalist"></datalist>
                <button class="btn btn-sm" onclick="addPOLineFromSearch()">➕ Agregar</button>
                <button class="btn btn-sm" onclick="addPOLine()">➕ Línea vacía</button>
            </div>
            <div id="poTotals" style="text-align:right;font-weight:700;margin:12px 0;font-size:1.05rem;"></div>
            <div id="poActions" style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn" onclick="savePurchaseOrder('borrador')">💾 Guardar borrador</button>
                <button class="btn btn-success" onclick="savePurchaseOrder('aprobada')">✅ Aprobar compra y actualizar inventario</button>
                <button class="btn" onclick="printPurchaseOrder()">🖨️ Imprimir orden</button>
                <button class="btn" onclick="closePOEditor()">Cerrar</button>
            </div>
            <div id="poApprovedMsg" style="display:none;color:var(--success);font-weight:600;margin-top:8px;">✅ Orden aprobada: el inventario ya fue actualizado. Vista de solo lectura.</div>
        </div>
        <div id="poList"></div>`;
    const receivablesView = document.getElementById('view-receivables');
    if (receivablesView && receivablesView.parentElement) receivablesView.parentElement.appendChild(view);
    else document.body.appendChild(view);
    refreshPODatalist();
}

function generatePONumber() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `OC-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function newPurchaseOrder() {
    currentPO = null; poLines = [];
    document.getElementById('poNumero').value = generatePONumber();
    document.getElementById('poProveedor').value = '';
    document.getElementById('poNotas').value = '';
    document.getElementById('poSolicitadoPor').value = 'M Elena Gutierrez S.';
    document.getElementById('poAutorizadoPor').value = 'Wilber Calderon M.';
    ['poProveedor', 'poNotas', 'poSolicitadoPor', 'poAutorizadoPor'].forEach(fid => { document.getElementById(fid).disabled = false; });
    document.getElementById('poEstadoBadge').textContent = '🟣 Borrador';
    document.getElementById('poEditor').style.display = 'block';
    document.getElementById('poApprovedMsg').style.display = 'none';
    document.getElementById('poActions').style.display = 'flex';
    renderPOLines();
    document.getElementById('poEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closePOEditor() { document.getElementById('poEditor').style.display = 'none'; }

function getClientRuta(clientId) {
    const c = allClients.find(x => x.id === clientId);
    return (c && c.ruta) ? c.ruta : 'Sin ruta';
}

async function generatePOFromWeek() {
    if (!allProducts.length) { alert('Los productos aún no están cargados.'); return; }
    const since = new Date(); since.setDate(since.getDate() - 7); since.setHours(0, 0, 0, 0);
    try {
        const snapshot = await db.collection('facturas').where('fecha', '>=', since).get();
        const demand = new Map();
        snapshot.forEach(doc => {
            const f = doc.data();
            (f.items || []).forEach(item => {
                const key = String(item.id);
                if (!demand.has(key)) demand.set(key, { id: key, nombre: item.nombre || 'Producto', total: 0, detalle: [] });
                const d = demand.get(key);
                const qty = parseInt(item.cantidad) || 0;
                d.total += qty;
                const ruta = getClientRuta(f.clienteId);
                d.detalle.push(`${f.clienteNombre || 'Cliente'} · ${ruta}: ${qty}`);
            });
        });
        const lines = [];
        for (const d of demand.values()) {
            const product = allProducts.find(p => String(p.id) === d.id);
            const stock = product ? getStockForProduct(product) : null;
            const stockQty = stock ? (stock.cantidad || 0) : 0;
            const sugerido = d.total - stockQty;
            if (sugerido <= 0) continue;
            lines.push({
                productId: d.id, nombre: d.nombre, cantidad: sugerido,
                costoUnitario: stock ? (stock.costoUnitario || 0) : 0,
                detalle: `📦 Demanda semanal: ${d.total} | Stock: ${stockQty} | Pedidos: ${d.detalle.join(' | ')}`
            });
        }
        if (lines.length === 0) { alert('✅ No hay faltantes: el stock cubre todos los pedidos de la última semana.'); return; }
        newPurchaseOrder();
        poLines = lines;
        renderPOLines();
        alert(`📋 Orden sugerida generada con ${lines.length} producto(s) faltante(s).`);
    } catch (error) {
        console.error('Error generando orden de compra:', error);
        alert('Error al generar la orden: ' + error.message);
    }
}

function renderPOLines() {
    const container = document.getElementById('poLines');
    if (!container) return;
    const readOnly = currentPO && currentPO.estado === 'aprobada';
    const dis = readOnly ? 'disabled' : '';
    if (!poLines.length) {
        container.innerHTML = '<div style="color:var(--text-light,#999);padding:10px 4px;">Sin productos.</div>';
    } else {
        container.innerHTML = poLines.map((l, i) => `
            <div style="display:grid;grid-template-columns:2fr 70px 120px 120px 40px;gap:8px;align-items:center;margin-bottom:4px;">
                <select onchange="updatePOLine(${i},'productId',this.value)" ${dis} style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;">
                    <option value="">— Seleccionar —</option>
                    ${allProducts.map(p => `<option value="${p.id}" ${String(p.id) === String(l.productId) ? 'selected' : ''}>${buildProductDescription(p.nombre, p.nombreOriginal)}</option>`).join('')}
                </select>
                <input type="number" min="1" value="${l.cantidad}" onchange="updatePOLine(${i},'cantidad',this.value)" ${dis} style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;width:100%;">
                <input type="number" min="0" step="0.01" value="${l.costoUnitario}" onchange="updatePOLine(${i},'costoUnitario',this.value)" ${dis} style="padding:6px;border:1px solid var(--border,#ccc);border-radius:6px;width:100%;">
                <div style="font-weight:600;">₡${formatMoney((l.cantidad || 0) * (l.costoUnitario || 0))}</div>
                <button class="btn btn-sm" onclick="removePOLine(${i})" ${dis} style="color:var(--danger);">&times;</button>
                ${l.detalle ? `<div style="grid-column:1/-1;font-size:0.72rem;color:var(--text-light,#888);padding:0 4px 8px;">${l.detalle}</div>` : ''}
            </div>`).join('');
    }
    recalcPOTotals();
}

function addPOLine() { poLines.push({ productId: '', nombre: '', cantidad: 1, costoUnitario: 0, detalle: '' }); renderPOLines(); }

function refreshPODatalist() {
    const datalist = document.getElementById('poProductDatalist');
    if (!datalist) return;
    datalist.innerHTML = allProducts.map(p => `<option value="${p.nombre}" data-id="${p.id}"></option>`).join('');
}

function addPOLineFromSearch() {
    const input = document.getElementById('poQuickSearch');
    const q = (input?.value || '').trim().toLowerCase();
    if (!q) { alert('Escriba el nombre o ID del producto'); return; }
    const product = allProducts.find(p => p.nombre.toLowerCase() === q || p.nombre.toLowerCase().includes(q) || String(p.id).toLowerCase() === q || String(p.id).toLowerCase().includes(q));
    if (!product) { alert(`❌ Producto no encontrado: "${q}"`); return; }
    const already = poLines.findIndex(l => String(l.productId) === String(product.id));
    if (already !== -1) { poLines[already].cantidad = (parseInt(poLines[already].cantidad) || 0) + 1; }
    else {
        const stock = getStockForProduct(product);
        poLines.push({
            productId: product.id, nombre: product.nombre,
            nombreOriginal: product.nombreOriginal || product.nombre,
            descripcion: buildProductDescription(product.nombre, product.nombreOriginal),
            cantidad: 1,
            costoUnitario: stock ? (stock.costoUnitario || 0) : (product.precioBase || 0),
            detalle: stock ? `Stock actual: ${stock.cantidad}` : ''
        });
    }
    if (input) input.value = '';
    renderPOLines();
}

function printPurchaseOrderData(o) {
    if (!o) return;
    const lineas = o.lineas || [];
    const fecha = o.fecha?.toDate ? o.fecha.toDate().toLocaleString('es-CR') : (o.ultimaActualizacion ? new Date(o.ultimaActualizacion).toLocaleString('es-CR') : new Date().toLocaleString('es-CR'));
    const estadoTxt = o.estado === 'aprobada' ? 'APROBADA' : 'BORRADOR';
    const solicitadoPor = o.solicitadoPor || 'M Elena Gutierrez S.';
    const autorizadoPor = o.autorizadoPor || 'Wilber Calderon M.';
    const rows = lineas.map((l, i) => `
        <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${getPOLineDescription(l)}<br><small style="color:#666;">ID: ${l.productId || '-'}</small></td>
            <td style="text-align:center;">${l.cantidad}</td>
            <td style="text-align:right;">₡${formatMoney(l.costoUnitario || 0)}</td>
            <td style="text-align:right;">₡${formatMoney((l.cantidad || 0) * (l.costoUnitario || 0))}</td>
        </tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) { alert('Permita las ventanas emergentes para imprimir'); return; }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Orden de Compra ${o.numero || ''}</title>
        <style>body{font-family:Arial,sans-serif;margin:24px;color:#222;}h1{font-size:20px;margin:0 0 4px;color:#2e7d32;}.sub{color:#666;font-size:12px;margin-bottom:16px;}.info{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:14px;font-size:13px;}.info div{min-width:150px;}.label{color:#888;font-size:11px;text-transform:uppercase;}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;}th,td{border:1px solid #ccc;padding:7px 8px;}th{background:#f0f0f0;}.total-row td{font-weight:bold;font-size:15px;background:#fafafa;}.firma{display:flex;justify-content:space-between;margin-top:70px;gap:30px;}.firma div{flex:1;text-align:center;border-top:1px solid #333;padding-top:6px;font-size:12px;color:#555;}.estado{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:bold;background:${o.estado === 'aprobada' ? '#e6f4ea' : '#f3e8ff'};color:${o.estado === 'aprobada' ? '#1e7e34' : '#6d28d9'};}@media print{body{margin:10mm;}}</style>
        </head><body>
        <h1>📋 ORDEN DE COMPRA</h1>
        <div class="sub">EWE Esentia · Documento generado desde el sistema</div>
        <div class="info">
            <div><div class="label">No. Orden</div><strong>${o.numero || 'S/N'}</strong></div>
            <div><div class="label">Fecha</div>${fecha}</div>
            <div><div class="label">Proveedor</div>${o.proveedor || '-'}</div>
            <div><div class="label">Estado</div><span class="estado">${estadoTxt}</span></div>
        </div>
        ${o.notas ? `<div style="font-size:12px;margin-bottom:8px;"><span class="label">Notas:</span> ${o.notas}</div>` : ''}
        <table><thead><tr><th>#</th><th style="text-align:left;">Producto</th><th>Cant.</th><th style="text-align:right;">Costo unit.</th><th style="text-align:right;">Subtotal</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#888;">Sin productos</td></tr>'}
        <tr class="total-row"><td colspan="4" style="text-align:right;">TOTAL ORDEN</td><td style="text-align:right;">₡${formatMoney(o.total || 0)}</td></tr>
        </tbody></table>
        <div class="firma">
            <div>Solicitado por<br><strong>${solicitadoPor}</strong></div>
            <div>Autorizado por<br><strong>${autorizadoPor}</strong></div>
            <div>Recibido conforme</div>
        </div>
        <script>window.onload = function() { window.print(); }<\/script>
        </body></html>`);
    win.document.close();
}

function printPurchaseOrder() {
    const lineasValidas = poLines.filter(l => l.productId && (parseInt(l.cantidad) || 0) > 0);
    if (!lineasValidas.length) { alert('No hay productos para imprimir'); return; }
    printPurchaseOrderData({
        numero: document.getElementById('poNumero')?.value || generatePONumber(),
        proveedor: document.getElementById('poProveedor')?.value || '',
        notas: document.getElementById('poNotas')?.value || '',
        solicitadoPor: document.getElementById('poSolicitadoPor')?.value.trim() || 'M Elena Gutierrez S.',
        autorizadoPor: document.getElementById('poAutorizadoPor')?.value.trim() || 'Wilber Calderon M.',
        estado: currentPO?.estado || 'borrador',
        lineas: lineasValidas,
        total: recalcPOTotals(),
        ultimaActualizacion: new Date().toISOString()
    });
}

function printPurchaseOrderById(id) {
    const o = purchaseOrders.find(x => x.id === id);
    if (!o) { alert('Orden no encontrada'); return; }
    printPurchaseOrderData(o);
}

function updatePOLine(index, field, value) {
    const line = poLines[index]; if (!line) return;
    if (field === 'productId') {
        const product = allProducts.find(p => String(p.id) === String(value));
        line.productId = value;
        line.nombre = product ? product.nombre : '';
        line.nombreOriginal = product ? (product.nombreOriginal || product.nombre) : '';
        line.descripcion = product ? buildProductDescription(product.nombre, product.nombreOriginal) : '';
        if (product) {
            const stock = getStockForProduct(product);
            line.costoUnitario = stock ? (stock.costoUnitario || 0) : (product.precioBase || 0);
        }
    } else if (field === 'cantidad') { line.cantidad = Math.max(1, parseInt(value) || 1); }
    else if (field === 'costoUnitario') { line.costoUnitario = Math.max(0, parseFloat(value) || 0); }
    renderPOLines();
}

function removePOLine(index) { poLines.splice(index, 1); renderPOLines(); }

function recalcPOTotals() {
    const total = poLines.reduce((sum, l) => sum + ((parseInt(l.cantidad) || 0) * (parseFloat(l.costoUnitario) || 0)), 0);
    const el = document.getElementById('poTotals');
    if (el) el.innerHTML = `TOTAL ORDEN: <span style="color:var(--primary,#2e7d32);">₡${formatMoney(total)}</span>`;
    return total;
}

async function savePurchaseOrder(estado) {
    const proveedor = document.getElementById('poProveedor').value.trim();
    if (!proveedor) { alert('Ingrese el proveedor'); return; }
    const lineasValidas = poLines.filter(l => l.productId && (parseInt(l.cantidad) || 0) > 0);
    if (!lineasValidas.length) { alert('Agregue al menos un producto con cantidad válida'); return; }
    const numero = document.getElementById('poNumero').value || generatePONumber();
    const total = recalcPOTotals();
    const lineas = lineasValidas.map(l => ({
        productId: String(l.productId),
        nombre: l.nombre || (allProducts.find(p => String(p.id) === String(l.productId))?.nombre || ''),
        nombreOriginal: l.nombreOriginal || (allProducts.find(p => String(p.id) === String(l.productId))?.nombreOriginal || ''),
        descripcion: getPOLineDescription(l),
        cantidad: parseInt(l.cantidad) || 0,
        costoUnitario: parseFloat(l.costoUnitario) || 0,
        subtotal: (parseInt(l.cantidad) || 0) * (parseFloat(l.costoUnitario) || 0),
        detalle: l.detalle || ''
    }));
    try {
        if (estado === 'aprobada') {
            if (!confirm(`✅ ¿Aprobar la orden ${numero} por ₡${formatMoney(total)}?\n\nSe sumará al inventario cada producto de la orden.`)) return;
            await db.runTransaction(async (transaction) => {
                for (const l of lineas) {
                    const product = allProducts.find(p => String(p.id) === String(l.productId));
                    const stockId = product ? getStockDocId(product) : normalizeString(l.nombre);
                    const stockRef = db.collection('stock').doc(stockId);
                    const stockDoc = await transaction.get(stockRef);
                    let currentStock = 0, stockData = {};
                    if (stockDoc.exists) { currentStock = stockDoc.data().cantidad || 0; stockData = stockDoc.data(); }
                    else { stockData = { id: stockId, nombre: l.nombre, categoria: product ? product.categoria : 'General', precioVenta: product ? product.precioBase : 0, ultimaCompra: '-' }; }
                    const today = new Date().toISOString().split('T')[0];
                    transaction.set(stockRef, { ...stockData, id: stockId, nombre: stockData.nombre || l.nombre, cantidad: currentStock + l.cantidad, costoUnitario: l.costoUnitario > 0 ? l.costoUnitario : (stockData.costoUnitario || 0), ultimaActualizacion: new Date().toISOString(), ultimaCompra: today }, { merge: true });
                    const movementRef = db.collection('stock_movements').doc();
                    transaction.set(movementRef, {
                        productId: l.productId, productName: l.nombre, type: 'entrada', quantity: l.cantidad,
                        reference: numero, notes: `Compra aprobada - Proveedor: ${proveedor}`,
                        costoUnitario: l.costoUnitario,
                        fecha: firebase.firestore.FieldValue.serverTimestamp(), fechaLocal: new Date().toISOString()
                    });
                }
            });
        }
        const data = {
            numero, proveedor,
            notas: document.getElementById('poNotas').value.trim(),
            solicitadoPor: document.getElementById('poSolicitadoPor')?.value.trim() || 'M Elena Gutierrez S.',
            autorizadoPor: document.getElementById('poAutorizadoPor')?.value.trim() || 'Wilber Calderon M.',
            lineas, total, estado,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            ultimaActualizacion: new Date().toISOString()
        };
        if (currentPO && currentPO.id) await db.collection('ordenes_compra').doc(currentPO.id).update(data);
        else { const ref = await db.collection('ordenes_compra').add(data); currentPO = { id: ref.id }; }
        if (estado === 'aprobada') {
            await loadStock(); checkLowStockAlerts();
            if (document.getElementById('view-inventory')?.style.display !== 'none') renderInventoryTable(currentInventoryFilter, document.getElementById('inventorySearch')?.value || '');
            alert('✅ Compra aprobada e inventario actualizado');
        } else { alert('💾 Orden guardada como borrador'); }
        await loadPurchaseOrders();
        if (estado === 'aprobada') editPurchaseOrder(currentPO.id, true);
    } catch (error) {
        console.error('Error guardando orden de compra:', error);
        alert('Error: ' + error.message);
    }
}

async function loadPurchaseOrders() {
    const container = document.getElementById('poList');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-light);">Cargando órdenes...</div>';
    try {
        const snapshot = await db.collection('ordenes_compra').orderBy('fecha', 'desc').limit(60).get();
        purchaseOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPurchaseOrdersList();
    } catch (error) {
        console.error('Error cargando órdenes de compra:', error);
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger);">Error al cargar las órdenes.</div>';
    }
}

function renderPurchaseOrdersList() {
    const container = document.getElementById('poList');
    if (!container) return;
    if (!purchaseOrders.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light);">No hay órdenes de compra registradas.</div>';
        return;
    }
    container.innerHTML = purchaseOrders.map(o => {
        const fecha = o.fecha?.toDate ? o.fecha.toDate().toLocaleString('es-CR') : (o.ultimaActualizacion ? new Date(o.ultimaActualizacion).toLocaleString('es-CR') : '-');
        const aprobada = o.estado === 'aprobada';
        return `
        <div style="background:#fff;border:1px solid var(--border,#ddd);border-radius:10px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;">
                <div>
                    <div style="font-weight:700;">${o.numero || 'S/N'} ${aprobada ? '<span style="color:var(--success);">✅ Aprobada</span>' : '<span style="color:#6d28d9;">🟣 Borrador</span>'}</div>
                    <div style="font-size:0.8rem;color:var(--text-light);">Proveedor: ${o.proveedor || '-'} · ${fecha}</div>
                    <div style="font-size:0.78rem;color:var(--text-light);">${(o.lineas || []).length} producto(s)</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-weight:700;font-size:1.05rem;color:var(--primary,#2e7d32);">₡${formatMoney(o.total || 0)}</div>
                    <button class="btn btn-sm" onclick="editPurchaseOrder('${o.id}')">✏️ Editar</button>
                    <button class="btn btn-sm" onclick="printPurchaseOrderById('${o.id}')">🖨️</button>
                    ${!aprobada ? `<button class="btn btn-success btn-sm" onclick="quickApprovePO('${o.id}')">✅ Aprobar</button>` : ''}
                    <button class="btn btn-sm" style="color:var(--danger);" onclick="deletePurchaseOrder('${o.id}')">🗑️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function editPurchaseOrder(id, silent = false) {
    try {
        const doc = await db.collection('ordenes_compra').doc(id).get();
        if (!doc.exists) { alert('Orden no encontrada'); return; }
        currentPO = { id: doc.id, ...doc.data() };
        poLines = (currentPO.lineas || []).map(l => ({ ...l }));
        document.getElementById('poNumero').value = currentPO.numero || '';
        document.getElementById('poProveedor').value = currentPO.proveedor || '';
        document.getElementById('poNotas').value = currentPO.notas || '';
        document.getElementById('poSolicitadoPor').value = currentPO.solicitadoPor || 'M Elena Gutierrez S.';
        document.getElementById('poAutorizadoPor').value = currentPO.autorizadoPor || 'Wilber Calderon M.';
        document.getElementById('poEstadoBadge').innerHTML = currentPO.estado === 'aprobada' ? '<span style="color:var(--success);">✅ Aprobada</span>' : '<span style="color:#6d28d9;">🟣 Borrador</span>';
        document.getElementById('poEditor').style.display = 'block';
        const readOnly = currentPO.estado === 'aprobada';
        document.getElementById('poActions').style.display = readOnly ? 'none' : 'flex';
        document.getElementById('poApprovedMsg').style.display = readOnly ? 'block' : 'none';
        ['poProveedor', 'poNotas', 'poSolicitadoPor', 'poAutorizadoPor'].forEach(fid => { document.getElementById(fid).disabled = readOnly; });
        renderPOLines();
        if (!silent) document.getElementById('poEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Error cargando orden:', error);
        alert('Error al cargar la orden.');
    }
}

async function quickApprovePO(id) {
    await editPurchaseOrder(id, true);
    if (currentPO && currentPO.estado !== 'aprobada') savePurchaseOrder('aprobada');
}

async function deletePurchaseOrder(id) {
    const o = purchaseOrders.find(x => x.id === id);
    if (!confirm(`¿Eliminar la orden ${o?.numero || id}?${o?.estado === 'aprobada' ? '\n\n⚠️ Esta orden ya fue aprobada: el inventario NO se revertirá.' : ''}`)) return;
    try {
        await db.collection('ordenes_compra').doc(id).delete();
        if (currentPO && currentPO.id === id) closePOEditor();
        await loadPurchaseOrders();
    } catch (error) {
        console.error('Error eliminando orden:', error);
        alert('Error al eliminar la orden.');
    }
}

// Cerrar resultados de clientes al hacer clic fuera
document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-box') && !e.target.closest('.modal-overlay')) {
        const results = document.getElementById('clientResults');
        if (results) results.style.display = 'none';
    }
});