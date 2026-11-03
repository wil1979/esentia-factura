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
const LOW_STOCK_THRESHOLD = 5;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-CR');
    document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
    try {
        await Promise.all([loadClients(), loadStock(), loadProducts()]);
        document.getElementById('loadingOverlay').style.opacity = '0';
        setTimeout(() => { document.getElementById('loadingOverlay').style.display = 'none'; }, 300);
        checkLowStockAlerts();
    } catch (error) { console.error("Error crítico:", error); }
});

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
    } catch (error) {
        console.error("❌ Error cargando stock:", error);
    }
}

function getStockForProduct(product) {
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

function normalizeString(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/\s+/g, '');
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
    if (outOfStockCount > 0 || lowStockCount > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `⚠️ <strong>Alerta de Inventario:</strong> ${outOfStockCount} producto(s) agotado(s) y ${lowStockCount} con stock bajo. <a href="#" onclick="switchView('inventory', event); return false;" style="color: inherit; text-decoration: underline;">Ver inventario</a>`;
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
    let errors = [];
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
                    if (Array.isArray(items)) items.forEach(p => { p.categoriaDetectada = categoria; productsToProcess.push(p); });
                }
            }
            const mapped = productsToProcess.map(p => {
                const precioBase = (p.precioOferta && p.precioOferta > 0) ? p.precioOferta : (p.precioOriginal || 0);
                return {
                    id: String(p.id),
                    nombre: p.nombre || p.nombreOriginal || 'Producto sin nombre',
                    precioBase: parseFloat(precioBase),
                    categoria: p.categoriaDetectada || item.catDefault,
                    variantes: p.variantes || []
                };
            });
            allProducts = allProducts.concat(mapped);
        } catch (error) {
            console.error(`❌ Error cargando ${item.catDefault}:`, error);
            errors.push(item.catDefault);
        }
    }
    if (errors.length > 0) {
        document.getElementById('loadErrorBanner').style.display = 'block';
        document.getElementById('loadErrorBanner').innerHTML = `⚠️ No se pudieron cargar: <strong>${errors.join(', ')}</strong>.`;
    }
    renderProducts(allProducts);
}

// ==========================================
// NAVEGACIÓN
// ==========================================
function switchView(view, event) {
    document.getElementById('view-pos').style.display = view === 'pos' ? 'grid' : 'none';
    document.getElementById('view-inventory').style.display = view === 'inventory' ? 'grid' : 'none';
    document.getElementById('view-receivables').style.display = view === 'receivables' ? 'grid' : 'none';
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    
    if (view === 'inventory') {
        renderInventoryTable();
        loadStockMovements();
    } else if (view === 'receivables') {
        loadReceivables();
    }
}

// ==========================================
// CUENTAS POR COBRAR
// ==========================================
async function loadReceivables() {
    const container = document.getElementById('receivablesList');
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
                    id: inv.id,
                    numero: inv.numero,
                    clienteId: inv.clienteId,
                    clienteNombre: inv.clienteNombre || 'Cliente Contado',
                    clienteTelefono: inv.clienteTelefono,
                    total: totalFactura,
                    abonado: totalAbonado,
                    saldo: saldoPendiente,
                    fecha: dateObj,
                    dias: diffDays,
                    urgencia: urgency,
                    items: inv.items
                });

                const currentDebt = clientDebtMap.get(inv.clienteId) || { nombre: inv.clienteNombre || 'Cliente', total: 0 };
                clientDebtMap.set(inv.clienteId, { ...currentDebt, total: currentDebt.total + saldoPendiente });
            }
        }

        receivables.sort((a, b) => {
            const urgencyOrder = { urgent: 0, warning: 1, normal: 2 };
            if (urgencyOrder[a.urgencia] !== urgencyOrder[b.urgencia]) {
                return urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia];
            }
            return b.saldo - a.saldo;
        });

        allReceivables = receivables;

        const totalDebt = receivables.reduce((sum, r) => sum + r.saldo, 0);
        const urgentCount = receivables.filter(r => r.urgencia === 'urgent').length;
        
        let topClient = '-';
        let topDebt = 0;
        clientDebtMap.forEach((data, clientId) => {
            if (data.total > topDebt) {
                topDebt = data.total;
                topClient = data.nombre.split(' ')[0];
            }
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

    if (receivables.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: var(--success);"><div style="font-size: 4rem; margin-bottom: 15px;"></div><h3 style="color: var(--primary); margin-bottom: 10px;">¡Excelente!</h3><p>No hay facturas pendientes de cobro.</p></div>';
        return;
    }

    container.innerHTML = receivables.map(r => {
        const urgencyClass = r.urgencia === 'urgent' ? 'urgent' : (r.urgencia === 'warning' ? 'warning' : 'normal');
        const daysClass = r.urgencia === 'urgent' ? 'days-urgent' : (r.urgencia === 'warning' ? 'days-warning' : 'days-normal');
        const daysText = r.dias === 0 ? 'Hoy' : (r.dias === 1 ? '1 día' : `${r.dias} días`);
        const urgencyLabel = r.urgencia === 'urgent' ? '🔴 URGENTE' : (r.urgencia === 'warning' ? '🟡 Moderada' : '🔵 Reciente');
        const dateStr = r.fecha.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });

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
                    <div class="receivable-total">de ₡${formatMoney(r.total)}</div>
                </div>
            </div>
            <div class="receivable-footer">
                <div class="receivable-date"> ${dateStr}</div>
                <div class="receivable-days ${daysClass}"> ${daysText} de antigüedad</div>
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
    element.classList.add('active');
    applyReceivablesFilters();
}

function filterReceivablesTable(query) {
    applyReceivablesFilters(query);
}

function applyReceivablesFilters(searchQuery = '') {
    const q = searchQuery.toLowerCase();
    let filtered = allReceivables;

    if (currentReceivableFilter === 'urgent') {
        filtered = filtered.filter(r => r.urgencia === 'urgent');
    } else if (currentReceivableFilter === 'warning') {
        filtered = filtered.filter(r => r.urgencia === 'warning');
    } else if (currentReceivableFilter === 'normal') {
        filtered = filtered.filter(r => r.urgencia === 'normal');
    } else if (currentReceivableFilter === 'high') {
        filtered = filtered.filter(r => r.saldo > 50000);
    }

    if (q) {
        filtered = filtered.filter(r => 
            r.clienteNombre.toLowerCase().includes(q) || 
            (r.numero && r.numero.toLowerCase().includes(q))
        );
    }

    renderReceivablesList(filtered);
}

async function sendReminder(invoiceId) {
    try {
        const doc = await db.collection('facturas').doc(invoiceId).get();
        if (!doc.exists) { alert('Factura no encontrada'); return; }
        
        const factura = { id: doc.id, ...doc.data() };
        const abonos = factura.abonos || [];
        const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
        const saldoPendiente = Math.max(0, (parseFloat(factura.total) || 0) - totalAbonado);

        let phone = '';
        const clienteLocal = allClients.find(c => c.id === factura.clienteId);
        if (clienteLocal && clienteLocal.telefono) {
            phone = String(clienteLocal.telefono).replace(/\D/g, '');
            if (phone.length === 8) phone = '506' + phone;
        } else if (factura.clienteTelefono) {
            phone = String(factura.clienteTelefono).replace(/\D/g, '');
            if (phone.length === 8) phone = '506' + phone;
        }

        if (!phone) {
            phone = prompt(`Ingrese el número de WhatsApp para enviar recordatorio:`);
            if (!phone) return;
            phone = String(phone).replace(/\D/g, '');
            if (phone.length === 8) phone = '506' + phone;
        }

        const dateObj = factura.fecha?.toDate ? factura.fecha.toDate() : new Date(factura.fecha);
        const dateStr = dateObj.toLocaleDateString('es-CR');

        const today = new Date();
        const diffTime = Math.abs(today - dateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let message = `🌿 *RECORDATORIO DE PAGO* 🌿\n\n`;
        message += `Estimado/a ${factura.clienteNombre || 'Cliente'},\n\n`;
        message += `Le recordamos amablemente que tiene un saldo pendiente en nuestra tienda EWE Esentia:\n\n`;
        message += `📄 Factura: ${factura.numero || 'S/N'}\n`;
        message += `📅 Fecha: ${dateStr} (${diffDays} días)\n`;
        message += `💰 *Saldo Pendiente: ₡${formatMoney(saldoPendiente)}*\n\n`;
        
        if (abonos.length > 0) {
            message += `Total abonado: ₡${formatMoney(totalAbonado)}\n`;
        }
        
        message += `\nLe agradecemos realizar el pago a la brevedad posible.\n\n`;
        message += ` *Datos para el pago:*\n`;
        message += `SINPE Móvil: 7295-2454\n`;
        message += `EWE Esentia\n\n`;
        message += `¡Gracias por su preferencia! 🙏`;

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
        console.error("Error enviando recordatorio:", error);
        alert('Error al enviar el recordatorio.');
    }
}

// ==========================================
// CLIENTES
// ==========================================
function openNewClientModal() {
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientId').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientModal').classList.add('active');
}
function closeNewClientModal() { document.getElementById('newClientModal').classList.remove('active'); }

async function saveNewClient() {
    const nombre = document.getElementById('newClientName').value.trim();
    const cedula = document.getElementById('newClientId').value.trim();
    const telefono = document.getElementById('newClientPhone').value.trim();
    if (!nombre) { alert('El nombre del cliente es obligatorio'); return; }
    try {
        const newClientData = {
            nombre, cedula: cedula || 'N/A', telefono: telefono || 'N/A',
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('clientesBD').add(newClientData);
        const newClient = { id: docRef.id, ...newClientData };
        allClients.push(newClient);
        selectClient(newClient.id);
        closeNewClientModal();
        alert('✅ Cliente agregado exitosamente');
    } catch (error) {
        console.error("Error guardando cliente:", error);
        alert('Error al guardar el cliente.');
    }
}

function searchClients(query) {
    const resultsDiv = document.getElementById('clientResults');
    if (query.length < 2) { resultsDiv.style.display = 'none'; return; }
    const filtered = allClients.filter(c => {
        const q = query.toLowerCase();
        return (c.nombre || '').toLowerCase().includes(q) || 
               (c.cedula || c.id || '').toLowerCase().includes(q) || 
               (c.telefono || '').toLowerCase().includes(q);
    });
    if (filtered.length > 0) {
        resultsDiv.innerHTML = filtered.map(c => `
            <div class="result-item" onclick="selectClient('${c.id}')">
                <div class="result-name">${c.nombre || 'Sin nombre'}</div>
                <div class="result-meta">CC: ${c.cedula || c.id || 'N/A'} | Tel: ${c.telefono || 'N/A'}</div>
            </div>`).join('');
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
    document.getElementById('invoiceClientInfo').innerHTML = `<strong>${currentClient.nombre || 'Cliente'}</strong><br><span style="font-size: 0.8rem; color: #666;">CC: ${currentClient.cedula || currentClient.id}</span>`;
}

function clearClient() {
    currentClient = null;
    document.getElementById('selectedClientInfo').style.display = 'none';
    document.getElementById('invoiceClientInfo').innerHTML = '<em>Seleccione un cliente</em>';
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
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentAmount').max = saldo;
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
function closePaymentModal() { document.getElementById('paymentModal').classList.remove('active'); currentPaymentInvoice = null; selectedPaymentMethod = null; }
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
    if (amount > 0) {
        preview.style.display = 'block';
        document.getElementById('newBalancePreview').textContent = `₡${formatMoney(newBalance)}`;
    } else { preview.style.display = 'none'; }
}
async function confirmPayment() {
    if (!selectedPaymentMethod) { alert('Seleccione un método de pago'); return; }
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
        const newAbono = {
            monto: amount,
            metodo: selectedPaymentMethod,
            nota: note || '-',
            fecha: new Date()
        };
        await db.collection('facturas').doc(currentPaymentInvoice.id).update({
            abonos: firebase.firestore.FieldValue.arrayUnion(newAbono)
        });
        alert(`✅ Abono de ₡${formatMoney(amount)} registrado exitosamente`);
        closePaymentModal();
        if (document.getElementById('view-receivables').style.display !== 'none') {
            loadReceivables();
        } else {
            openHistoryModal();
        }
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
        let clientName = factura.clienteNombre || 'Cliente';
        const clienteLocal = allClients.find(c => c.id === factura.clienteId);
        if (clienteLocal && clienteLocal.telefono) {
            phone = String(clienteLocal.telefono).replace(/\D/g, '');
            if (phone.length === 8) phone = '506' + phone;
        } else if (factura.clienteTelefono) {
            phone = String(factura.clienteTelefono).replace(/\D/g, '');
            if (phone.length === 8) phone = '506' + phone;
        }
        if (!phone) {
            phone = prompt(`Ingrese el número de WhatsApp para reenviar la factura ${factura.numero}:`);
            if (!phone) return;
            phone = String(phone).replace(/\D/g, '');
            if (phone.length === 8) phone = '506' + phone;
        }

        const abonos = factura.abonos || [];
        const totalAbonado = abonos.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
        const totalFactura = parseFloat(factura.total) || 0;
        const saldoPendiente = Math.max(0, totalFactura - totalAbonado);

        let message = `🌿 *FACTURA EWE ESENTIA* 🌿\n Factura: ${factura.numero || 'S/N'}\n👤 Cliente: ${clientName}\n`;
        const dateObj = factura.fecha?.toDate ? factura.fecha.toDate() : new Date(factura.fecha);
        message += ` Fecha: ${dateObj.toLocaleDateString('es-CR')}\n━━━━━━━━━━━━━━━━━━\n`;
        if (factura.items && factura.items.length > 0) {
            factura.items.forEach(item => {
                const desc = item.descuentoPct > 0 ? `${item.nombre} (-${item.descuentoPct}%)` : item.nombre;
                message += `▪️ ${item.cantidad} x ${desc}\n   ₡${formatMoney(item.precioFinalUnitario * item.cantidad)}\n`;
            });
        }
        message += `━━━━━━━━━━━━━━━━━━\nSubtotal: ₡${formatMoney(factura.subtotal || 0)}\nIVA (13%): ${formatMoney(factura.impuesto || 0)}\n💰 *TOTAL: ₡${formatMoney(totalFactura)}*\n\n`;
        if (abonos.length > 0) {
            message += `💳 *PAGOS REALIZADOS:*\n`;
            abonos.forEach((a, idx) => {
                const aDate = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
                message += `  ${idx + 1}. ₡${formatMoney(a.monto)} - ${a.metodo} (${aDate.toLocaleDateString('es-CR')})\n`;
            });
            message += `\nTotal Abonado: ₡${formatMoney(totalAbonado)}\n`;
            if (saldoPendiente > 0) message += `⚠️ *SALDO PENDIENTE: ₡${formatMoney(saldoPendiente)}*\n\n`;
            else message += `✅ *FACTURA PAGADA*\n\n`;
        }
        message += `¡Gracias por su compra! 🙏\n💳 SINPE Móvil: 7295-2454`;
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
                const discountText = item.descuentoPct > 0 ? `${item.descuentoPct}%` : '-';
                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;">
                            <div style="font-weight: 600;">${item.nombre}</div>
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
        document.getElementById('detailTotalFinal').textContent = `${formatMoney(totalFactura)}`;

        const paymentsSection = document.getElementById('detailPaymentsSection');
        if (abonos.length > 0 || saldoPendiente > 0) {
            paymentsSection.style.display = 'block';
            if (abonos.length > 0) {
                const paymentsTable = document.getElementById('detailPaymentsTable');
                paymentsTable.innerHTML = abonos.map(a => {
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
            document.getElementById('detailPaymentBtn').style.display = saldoPendiente > 0 ? 'flex' : 'none';
        } else {
            paymentsSection.style.display = 'none';
            document.getElementById('detailPaymentBtn').style.display = 'none';
        }

        document.getElementById('invoiceDetailModal').classList.add('active');
    } catch (error) {
        console.error("Error abriendo detalle de factura:", error);
        alert('Error al cargar el detalle de la factura.');
    }
}
function closeInvoiceDetailModal() { document.getElementById('invoiceDetailModal').classList.remove('active'); currentDetailInvoice = null; }
function resendInvoiceFromDetail() { if (currentDetailInvoice) resendInvoice(currentDetailInvoice.id); }
function openPaymentModalFromDetail() {
    if (currentDetailInvoice) {
        closeInvoiceDetailModal();
        setTimeout(() => openPaymentModal(currentDetailInvoice.id), 300);
    }
}

// ==========================================
// PRODUCTOS Y CARRITO
// ==========================================
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 20px;">No se encontraron productos</div>';
        return;
    }
    grid.innerHTML = products.map(p => {
        const hasVariants = p.variantes && p.variantes.length > 0;
        const stock = getStockForProduct(p);
        const stockStatus = getStockStatus(stock);
        const isOutOfStock = stock && stock.cantidad <= 0;
        const isLowStock = stock && stock.cantidad > 0 && stock.cantidad <= LOW_STOCK_THRESHOLD;
        return `
        <div class="product-card ${hasVariants ? 'has-variants' : ''} ${isOutOfStock ? 'out-of-stock' : ''} ${isLowStock ? 'low-stock' : ''}" 
             onclick="${isOutOfStock ? `alert('️ Producto agotado.'); return false;` : `openProductModal('${p.id}')`}">
            <div class="stock-badge ${stockStatus.class}">${stockStatus.label}</div>
            <div class="product-category">${p.categoria}</div>
            <div class="product-name">${p.nombre}</div>
            <div class="product-price">Desde ₡${formatMoney(p.precioBase)}</div>
            <div class="product-code">ID: ${p.id}</div>
        </div>`;
    }).join('');
}

function filterProducts(query) {
    if (!query) { renderProducts(allProducts); return; }
    const q = query.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.nombre.toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q)
    );
    renderProducts(filtered);
}

function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('modalProductId').value = product.id;
    document.getElementById('modalProductName').textContent = product.nombre;
    document.getElementById('modalQuantity').value = 1;
    document.getElementById('modalDiscount').value = 0;

    const stock = getStockForProduct(product);
    const stockBar = document.getElementById('modalStockBar');
    const stockIcon = document.getElementById('modalStockIcon');
    const stockQty = document.getElementById('modalStockQty');
    const stockText = document.getElementById('modalStockText');
    const maxQtyLabel = document.getElementById('maxQtyLabel');
    const pricePreview = document.getElementById('modalPricePreview');

    if (stock) {
        stockQty.textContent = stock.cantidad;
        maxQtyLabel.textContent = stock.cantidad;
        document.getElementById('modalQuantity').max = stock.cantidad;
        if (stock.cantidad <= 0) {
            stockIcon.textContent = '❌';
            stockText.textContent = 'Producto agotado.';
            stockBar.style.background = '#fee2e2';
            pricePreview.classList.add('warning');
        } else if (stock.cantidad <= LOW_STOCK_THRESHOLD) {
            stockIcon.textContent = '⚠️';
            stockText.textContent = `¡Últimas ${stock.cantidad} unidades!`;
            stockBar.style.background = '#fef3c7';
            pricePreview.classList.remove('warning');
        } else {
            stockIcon.textContent = '✅';
            stockText.textContent = 'Stock suficiente';
            stockBar.style.background = '#dcfce7';
            pricePreview.classList.remove('warning');
        }
    } else {
        stockQty.textContent = '?';
        maxQtyLabel.textContent = '∞';
        document.getElementById('modalQuantity').max = 999;
        stockIcon.textContent = '️';
        stockText.textContent = 'Sin registro en inventario.';
        stockBar.style.background = '#f0f9ff';
        pricePreview.classList.remove('warning');
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
    } else {
        variantGroup.style.display = 'none';
    }
    updateModalPricePreview();
    document.getElementById('productModal').classList.add('active');
}

function validateQuantity() {
    const qtyInput = document.getElementById('modalQuantity');
    const maxQty = parseInt(qtyInput.max) || 999;
    const qty = parseInt(qtyInput.value) || 1;
    if (qty > maxQty) { qtyInput.value = maxQty; alert(`️ Stock máximo: ${maxQty} unidades`); }
    if (qty < 1) qtyInput.value = 1;
    updateModalPricePreview();
}

function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }

function updateModalPricePreview() {
    const productId = document.getElementById('modalProductId').value;
    const product = allProducts.find(p => p.id === productId);
    let basePrice = product.precioBase;
    const variantSelect = document.getElementById('modalVariantSelect');
    if (variantSelect.style.display !== 'none' && variantSelect.value !== 'base') {
        basePrice = parseFloat(variantSelect.options[variantSelect.selectedIndex].dataset.price);
    }
    const qty = parseInt(document.getElementById('modalQuantity').value) || 1;
    const discountPct = parseFloat(document.getElementById('modalDiscount').value) || 0;
    const priceWithDiscount = basePrice * (1 - (discountPct / 100));
    const totalFinal = priceWithDiscount * qty;
    document.getElementById('modalOriginalPrice').textContent = `${formatMoney(basePrice)} c/u`;
    document.getElementById('modalFinalPrice').textContent = `₡${formatMoney(totalFinal)}`;
    document.getElementById('modalDiscountText').textContent = discountPct > 0 ? `Descuento: ${discountPct}% (-₡${formatMoney(basePrice * qty - totalFinal)})` : '';
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

function confirmAddToCart() {
    const productId = document.getElementById('modalProductId').value;
    const product = allProducts.find(p => p.id === productId);
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
    const currentInCart = cart.filter(item => item.id === product.id && (!variantName || item.nombre.includes(variantName)))
                              .reduce((sum, item) => sum + item.cantidad, 0);
    const totalRequested = currentInCart + qty;
    if (stock && totalRequested > stock.cantidad) {
        alert(`️ Stock insuficiente.\nDisponible: ${stock.cantidad}\nEn carrito: ${currentInCart}\nSolicitado: ${qty}\nMáximo: ${stock.cantidad - currentInCart}`);
        return;
    }
    const discountPct = parseFloat(document.getElementById('modalDiscount').value) || 0;
    const finalPriceUnit = basePrice * (1 - (discountPct / 100));
    const displayName = variantName ? `${product.nombre} (${variantName})` : product.nombre;
    cart.push({
        id: product.id, nombre: displayName,
        precioUnitario: basePrice, descuentoPct: discountPct,
        precioFinalUnitario: finalPriceUnit, cantidad: qty,
        stockId: stock ? stock.id : null
    });
    closeProductModal();
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 40px 20px; font-size: 0.9rem;">Carrito vacío.<br>Agregue productos o escanee un código.</div>';
        updateTotals(); return;
    }
    container.innerHTML = cart.map((item, index) => {
        const product = allProducts.find(p => p.id === item.id);
        const stock = product ? getStockForProduct(product) : null;
        const stockWarning = stock && item.cantidad >= stock.cantidad ? '<div class="cart-item-stock-warning">️ Últimas unidades</div>' : '';
        return `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.nombre}</div>
                ${item.descuentoPct > 0 ? `<div class="cart-item-discount">🏷️ -${item.descuentoPct}% descuento</div>` : ''}
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
    updateTotals();
}

function updateCartItemQty(index, change) {
    const item = cart[index];
    const product = allProducts.find(p => p.id === item.id);
    const stock = product ? getStockForProduct(product) : null;
    const newQty = item.cantidad + change;
    if (stock && newQty > stock.cantidad) { alert(`⚠️ Stock máximo: ${stock.cantidad} unidades`); return; }
    if (newQty <= 0) cart.splice(index, 1);
    else cart[index].cantidad = newQty;
    renderCart();
}

function removeFromCart(index) { cart.splice(index, 1); renderCart(); }
function clearCart() { if (cart.length === 0) return; if (confirm('¿Limpiar el carrito?')) { cart = []; renderCart(); } }

function updateTotals() {
    // Obtener costo de transporte
    transportCost = parseFloat(document.getElementById('transportCost').value) || 0;
    
    // Calcular totales de productos
    const totalConIva = cart.reduce((sum, item) => sum + (item.precioFinalUnitario * item.cantidad), 0);
    const subtotalReal = totalConIva / 1.13;
    const ivaReal = totalConIva - subtotalReal;
    
    // Total de productos (con IVA)
    const productsTotal = subtotalReal + ivaReal;
    
    // Total final (productos + transporte)
    const finalTotal = productsTotal + transportCost;
    
    currentSubtotal = subtotalReal;
    currentIva = ivaReal;
    currentTotal = finalTotal;
    
    // Actualizar UI
    document.getElementById('subtotalAmount').textContent = `₡${formatMoney(subtotalReal)}`;
    document.getElementById('taxAmount').textContent = `₡${formatMoney(ivaReal)}`;
    document.getElementById('productsTotal').textContent = `₡${formatMoney(productsTotal)}`;
    
    // Mostrar/ocultar fila de transporte
    const transportRow = document.getElementById('transportRow');
    if (transportCost > 0) {
        transportRow.style.display = 'flex';
        document.getElementById('transportAmount').textContent = `₡${formatMoney(transportCost)}`;
    } else {
        transportRow.style.display = 'none';
    }
    
    document.getElementById('totalAmount').textContent = `₡${formatMoney(finalTotal)}`;
}

function formatMoney(amount) { return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'); }

// ==========================================
// GUARDAR FACTURA CON TRANSPORTE
// ==========================================
async function saveInvoice() {
    if (cart.length === 0) { alert('El carrito está vacío'); return; }
    if (!currentClient) { alert('Seleccione un cliente'); return; }

    try {
        await db.runTransaction(async (transaction) => {
            const stockReads = [];
            const productsInCart = [];
            for (const item of cart) {
                const product = allProducts.find(p => p.id === item.id);
                if (!product) continue;
                const stockId = normalizeString(product.nombre);
                const stockRef = db.collection('stock').doc(stockId);
                const stockDoc = await transaction.get(stockRef);
                stockReads.push({ product, item, stockRef, stockDoc, stockId });
                productsInCart.push({ product, item, stockDoc });
            }

            for (const { product, item, stockDoc } of productsInCart) {
                const currentStock = stockDoc.exists ? (stockDoc.data().cantidad || 0) : 0;
                const totalInCart = cart.filter(i => {
                    const p = allProducts.find(prod => prod.id === i.id);
                    return p && normalizeString(p.nombre) === normalizeString(product.nombre);
                }).reduce((sum, i) => sum + i.cantidad, 0);
                if (totalInCart > currentStock) {
                    throw new Error(`Stock insuficiente para "${product.nombre}": necesita ${totalInCart}, disponible ${currentStock}`);
                }
            }

            const invoiceRef = db.collection('facturas').doc();
            const invoiceData = {
    numero: currentInvoiceNumber,
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
    clienteId: currentClient ? currentClient.id : 'contado',
    clienteNombre: currentClient ? currentClient.nombre : 'Cliente Contado',
    clienteTelefono: currentClient ? currentClient.telefono : '',
    clienteDireccion: currentClient ? (currentClient.direccion || '') : '', // NUEVO
    clienteProvincia: currentClient ? (currentClient.provincia || '') : '', // NUEVO
    items: cart,
    subtotal: currentSubtotal,
    impuesto: currentIva,
    transporte: transportCost,
    total: currentTotal,
    abonos: [],
    estado: 'pagada'
};
            transaction.set(invoiceRef, invoiceData);

            for (const { product, item, stockRef, stockDoc, stockId } of stockReads) {
                const currentStock = stockDoc.exists ? (stockDoc.data().cantidad || 0) : 0;
                const stockData = stockDoc.exists ? stockDoc.data() : {
                    nombre: product.nombre, categoria: product.categoria,
                    precioVenta: product.precioBase, cantidad: 0, costoUnitario: 0, ultimaCompra: '-'
                };
                const newCantidad = Math.max(0, currentStock - item.cantidad);
                transaction.set(stockRef, { ...stockData, cantidad: newCantidad, ultimaActualizacion: new Date().toISOString() }, { merge: true });
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
        });

        alert('✅ Factura guardada y stock actualizado');
        cart = []; renderCart();
        document.getElementById('transportCost').value = '';
        currentInvoiceNumber = generateInvoiceNumber();
        document.getElementById('invoiceNumber').textContent = currentInvoiceNumber;
        await loadStock();
        renderProducts(allProducts);
        checkLowStockAlerts();
    } catch (error) {
        console.error("Error guardando factura:", error);
        if (error.message.includes('Stock insuficiente')) alert('⚠️ ' + error.message);
        else alert('Error al guardar: ' + error.message);
    }
}

// ==========================================
// INVENTARIO
// ==========================================
function renderInventoryTable(filter = 'all', searchQuery = '') {
    const tbody = document.getElementById('inventoryTableBody');
    const q = searchQuery.toLowerCase();
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
        if (q && !p.nombre.toLowerCase().includes(q) && !p.categoria.toLowerCase().includes(q)) return;
        const stockCellClass = stockStatus.status === 'ok' ? 'ok' : (stockStatus.status === 'low' ? 'low' : 'out');
        const lastPurchase = stock && stock.ultimaCompra ? new Date(stock.ultimaCompra).toLocaleDateString('es-CR') : '-';
        rows.push(`
            <tr>
                <td><strong>${p.nombre}</strong><br><small style="color: #999;">ID: ${p.id}</small></td>
                <td>${p.categoria}</td>
                <td>₡${formatMoney(p.precioBase)}</td>
                <td class="stock-cell ${stockCellClass}">${stockQty} ${stockStatus.status === 'out' ? '❌' : (stockStatus.status === 'low' ? '⚠️' : '✅')}</td>
                <td>₡${stock ? formatMoney(stock.costoUnitario) : '-'}</td>
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
    element.classList.add('active');
    renderInventoryTable(filter, document.getElementById('inventorySearch').value);
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
            const stockId = normalizeString(product.nombre);
            const stockRef = db.collection('stock').doc(stockId);
            const stockDoc = await transaction.get(stockRef);
            let currentStock = 0, stockData = {};
            if (stockDoc.exists) {
                currentStock = stockDoc.data().cantidad || 0;
                stockData = stockDoc.data();
            } else {
                stockData = { nombre: product.nombre, categoria: product.categoria, precioVenta: product.precioBase, ultimaCompra: '-' };
            }
            const newCantidad = currentStock + quantity;
            const today = new Date().toISOString().split('T')[0];
            transaction.set(stockRef, { ...stockData, cantidad: newCantidad, costoUnitario: cost > 0 ? cost : (stockData.costoUnitario || 0), ultimaActualizacion: new Date().toISOString(), ultimaCompra: today }, { merge: true });
            const movementRef = db.collection('stock_movements').doc();
            transaction.set(movementRef, {
                productId: product.id, productName: product.nombre, type: 'entrada',
                quantity: quantity, reference: 'Reabastecimiento manual',
                notes: note || 'Compra a proveedor', costoUnitario: cost,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                fechaLocal: new Date().toISOString()
            });
        });
        alert(`✅ Stock actualizado: ${product.nombre}\n+${quantity} unidades`);
        closeRestockModal();
        await loadStock();
        renderInventoryTable(currentInventoryFilter, document.getElementById('inventorySearch').value);
        renderProducts(allProducts);
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
        renderMovementsTable();
    } catch (error) { console.error("Error cargando movimientos:", error); }
}

function renderMovementsTable(filter = 'all') {
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

let currentMovementFilter = 'all';
function filterMovements(filter, element) {
    currentMovementFilter = filter;
    const tabs = element.parentElement.querySelectorAll('.filter-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    renderMovementsTable(filter);
}

// ==========================================
// ESCÁNER
// ==========================================
function openScanner() {
    document.getElementById('scannerModal').classList.add('active');
    if (!html5QrcodeScanner) html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 };
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
    .catch(err => { console.error("Error cámara:", err); alert("No se pudo acceder a la cámara."); closeScanner(); });
}
function closeScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().then(() => { document.getElementById('scannerModal').classList.remove('active'); })
        .catch(err => console.error("Error al detener:", err));
    } else { document.getElementById('scannerModal').classList.remove('active'); }
}
function onScanSuccess(decodedText, decodedResult) {
    const searchCode = String(decodedText).trim();
    const product = allProducts.find(p => String(p.id) === searchCode);
    if (product) {
        const stock = getStockForProduct(product);
        if (stock && stock.cantidad <= 0) { alert(`❌ Producto agotado: ${product.nombre}`); return; }
        closeScanner();
        setTimeout(() => { openProductModal(product.id); }, 300);
    } else { alert(`❌ Producto no encontrado.\nCódigo: ${searchCode}`); }
}
function onScanFailure(error) { }

// ==========================================
// IMPRESIÓN Y WHATSAPP
// ==========================================
function printTicket() {
    if (cart.length === 0 || !currentClient) { alert('Carrito vacío o cliente no seleccionado'); return; }
    document.getElementById('ticketDate').textContent = new Date().toLocaleString('es-CR');
    document.getElementById('ticketInvoiceNum').textContent = document.getElementById('invoiceNumber').textContent;
    document.getElementById('ticketClientName').textContent = currentClient.nombre || 'Cliente Contado';
    document.getElementById('ticketClientId').textContent = currentClient.cedula || currentClient.id || 'N/A';
    document.getElementById('ticketItems').innerHTML = cart.map(item => {
        const desc = item.descuentoPct > 0 ? `${item.cantidad} x ${item.nombre} (-${item.descuentoPct}%)` : `${item.cantidad} x ${item.nombre}`;
        return `<div class="ticket-item"><div class="ticket-item-desc">${desc}</div><div>₡${formatMoney(item.precioFinalUnitario * item.cantidad)}</div></div>`;
    }).join('');
    document.getElementById('ticketSubtotal').textContent = `₡${formatMoney(currentSubtotal)}`;
    document.getElementById('ticketTax').textContent = `₡${formatMoney(currentIva)}`;
    document.getElementById('ticketProductsTotal').textContent = `₡${formatMoney(currentSubtotal + currentIva)}`;
    
    // Transporte
    if (transportCost > 0) {
        document.getElementById('ticketTransportLine').style.display = 'flex';
        document.getElementById('ticketTransport').textContent = `₡${formatMoney(transportCost)}`;
    } else {
        document.getElementById('ticketTransportLine').style.display = 'none';
    }
    
    document.getElementById('ticketTotal').textContent = `₡${formatMoney(currentTotal)}`;
    window.print();
}

function sendWhatsApp() {
    if (cart.length === 0) { alert('El carrito está vacío'); return; }
    let phone = currentClient && currentClient.telefono ? String(currentClient.telefono).replace(/\D/g, '') : '';
    let clientName = currentClient ? (currentClient.nombre || "Cliente") : "Cliente";
    if (phone.length === 8) phone = '506' + phone;
    if (!phone) {
        phone = prompt("Ingrese el número de WhatsApp:");
        if (!phone) return;
        phone = String(phone).replace(/\D/g, '');
        if (phone.length === 8) phone = '506' + phone;
    }
    
    let message = `🌿 *FACTURA EWE ESENTIA* 🌿\n📄 Factura: ${document.getElementById('invoiceNumber').textContent}\n👤 Cliente: ${clientName}\n📅 Fecha: ${new Date().toLocaleDateString('es-CR')}\n`;
    
    // NUEVO: Agregar dirección si existe
    if (currentClient && currentClient.direccion) {
        message += `📍 *Dirección de envío:* ${currentClient.direccion}`;
        if (currentClient.provincia) message += ` - ${currentClient.provincia}`;
        message += `\n`;
    }
    
    message += `━━━━━━━━━━━━━━━━━━\n`;
    cart.forEach(item => {
        const desc = item.descuentoPct > 0 ? `${item.nombre} (-${item.descuentoPct}%)` : item.nombre;
        message += `▪️ ${item.cantidad} x ${desc}\n   ₡${formatMoney(item.precioFinalUnitario * item.cantidad)}\n`;
    });
    message += `━━━━━━━━━━━━━━━━━━\nSubtotal: ₡${formatMoney(currentSubtotal)}\nIVA (13%): ₡${formatMoney(currentIva)}\n`;
    
    if (transportCost > 0) {
        message += `🚚 Transporte: ₡${formatMoney(transportCost)}\n`;
    }
    
    message += `💰 *TOTAL A PAGAR: ₡${formatMoney(currentTotal)}*\n\n¡Gracias por su compra! 🙏\n💳 SINPE Móvil: 7295-2454`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}
// ==========================================
// GESTIÓN DE DIRECCIONES DE CLIENTES
// ==========================================

// Abrir modal para EDITAR cliente existente
function openEditClientModal() {
    if (!currentClient) return;
    
    document.getElementById('clientModalTitle').textContent = '✏️ Editar Cliente';
    document.getElementById('editClientId').value = currentClient.id;
    document.getElementById('newClientName').value = currentClient.nombre || '';
    document.getElementById('newClientId').value = currentClient.cedula || '';
    document.getElementById('newClientPhone').value = currentClient.telefono || '';
    document.getElementById('newClientAddress').value = currentClient.direccion || '';
    document.getElementById('newClientProvince').value = currentClient.provincia || '';
    document.getElementById('newClientCanton').value = currentClient.canton || '';
    
    // Mostrar coordenadas si existen
    if (currentClient.lat && currentClient.lng) {
        document.getElementById('locationStatus').textContent = 
            `📍 Coordenadas guardadas: ${currentClient.lat.toFixed(5)}, ${currentClient.lng.toFixed(5)}`;
    } else {
        document.getElementById('locationStatus').textContent = '';
    }
    
    document.getElementById('newClientModal').classList.add('active');
}

// Obtener ubicación actual del dispositivo
function getCurrentLocation() {
    const statusDiv = document.getElementById('locationStatus');
    
    if (!navigator.geolocation) {
        statusDiv.textContent = '❌ Tu navegador no soporta geolocalización';
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
            
            // Usar Nominatim (OpenStreetMap) para obtener dirección - GRATIS
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`
                );
                const data = await response.json();
                
                document.getElementById('newClientAddress').value = data.display_name || '';
                if (data.address) {
                    document.getElementById('newClientProvince').value = data.address.state || '';
                    document.getElementById('newClientCanton').value = data.address.city || data.address.town || '';
                }
                
                // Guardar coordenadas en atributos data para usarlas después
                document.getElementById('newClientAddress').dataset.lat = lat;
                document.getElementById('newClientAddress').dataset.lng = lng;
                
                statusDiv.textContent = `✅ Ubicación obtenida: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                statusDiv.className = '';
                statusDiv.style.color = 'var(--success)';
            } catch (error) {
                statusDiv.textContent = '⚠️ No se pudo obtener la dirección, pero las coordenadas están listas';
                statusDiv.className = '';
                statusDiv.style.color = 'var(--warning)';
                document.getElementById('newClientAddress').dataset.lat = lat;
                document.getElementById('newClientAddress').dataset.lng = lng;
            }
        },
        (error) => {
            let msg = '❌ Error: ';
            switch(error.code) {
                case error.PERMISSION_DENIED: msg += 'Permiso denegado'; break;
                case error.POSITION_UNAVAILABLE: msg += 'Ubicación no disponible'; break;
                case error.TIMEOUT: msg += 'Tiempo agotado'; break;
            }
            statusDiv.textContent = msg;
            statusDiv.className = '';
            statusDiv.style.color = 'var(--danger)';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// Guardar cliente (nuevo o editado)
async function saveNewClient() {
    const nombre = document.getElementById('newClientName').value.trim();
    const cedula = document.getElementById('newClientId').value.trim();
    const telefono = document.getElementById('newClientPhone').value.trim();
    const direccion = document.getElementById('newClientAddress').value.trim();
    const provincia = document.getElementById('newClientProvince').value.trim();
    const canton = document.getElementById('newClientCanton').value.trim();
    const editId = document.getElementById('editClientId').value;
    
    if (!nombre) { alert('El nombre del cliente es obligatorio'); return; }
    if (!telefono) { alert('El teléfono es obligatorio'); return; }
    
    // Coordenadas opcionales
    const lat = parseFloat(document.getElementById('newClientAddress').dataset.lat) || null;
    const lng = parseFloat(document.getElementById('newClientAddress').dataset.lng) || null;
    
    const clientData = {
        nombre,
        cedula: cedula || 'N/A',
        telefono,
        direccion: direccion || '',
        provincia: provincia || '',
        canton: canton || '',
        lat: lat,
        lng: lng,
        ultimaActualizacion: new Date().toISOString()
    };
    
    try {
        let docRef;
        if (editId) {
            // Actualizar cliente existente
            await db.collection('clientesBD').doc(editId).update(clientData);
            docRef = { id: editId };
            
            // Actualizar en el array local
            const index = allClients.findIndex(c => c.id === editId);
            if (index !== -1) {
                allClients[index] = { id: editId, ...clientData };
            }
            
            alert('✅ Cliente actualizado exitosamente');
        } else {
            // Crear nuevo cliente
            clientData.fechaRegistro = firebase.firestore.FieldValue.serverTimestamp();
            docRef = await db.collection('clientesBD').add(clientData);
            allClients.push({ id: docRef.id, ...clientData });
            alert('✅ Cliente agregado exitosamente');
        }
        
        // Seleccionar automáticamente
        selectClient(docRef.id);
        closeNewClientModal();
        
        // Limpiar campos
        document.getElementById('editClientId').value = '';
        document.getElementById('clientModalTitle').textContent = '➕ Nuevo Cliente';
        
    } catch (error) {
        console.error("Error guardando cliente:", error);
        alert('Error al guardar el cliente: ' + error.message);
    }
}

function closeNewClientModal() {
    document.getElementById('newClientModal').classList.remove('active');
    // Limpiar formulario
    document.getElementById('editClientId').value = '';
    document.getElementById('newClientName').value = '';
    document.getElementById('newClientId').value = '';
    document.getElementById('newClientPhone').value = '';
    document.getElementById('newClientAddress').value = '';
    document.getElementById('newClientProvince').value = '';
    document.getElementById('newClientCanton').value = '';
    document.getElementById('locationStatus').textContent = '';
    delete document.getElementById('newClientAddress').dataset.lat;
    delete document.getElementById('newClientAddress').dataset.lng;
    document.getElementById('clientModalTitle').textContent = '➕ Nuevo Cliente';
}

// Actualizar selectClient para mostrar dirección
function selectClient(clientId) {
    currentClient = allClients.find(c => c.id === clientId);
    if (!currentClient) return;
    
    document.getElementById('clientSearch').value = '';
    document.getElementById('clientResults').style.display = 'none';
    document.getElementById('selectedClientInfo').style.display = 'flex';
    document.getElementById('clientNameDisplay').textContent = currentClient.nombre || 'N/A';
    document.getElementById('clientIdDisplay').textContent = currentClient.cedula || currentClient.id || 'N/A';
    document.getElementById('clientPhoneDisplay').textContent = currentClient.telefono || 'N/A';
    
    // Mostrar dirección si existe
    const addressDiv = document.getElementById('clientAddressDisplay');
    const addressText = document.getElementById('clientAddressText');
    const uberBtn = document.getElementById('uberBtn');
    
    if (currentClient.direccion) {
        let addressHTML = currentClient.direccion;
        if (currentClient.provincia) addressHTML += `<br><small>📍 ${currentClient.provincia}`;
        if (currentClient.canton) addressHTML += `, ${currentClient.canton}`;
        if (currentClient.provincia) addressHTML += `</small>`;
        
        addressText.innerHTML = addressHTML;
        addressDiv.style.display = 'block';
        uberBtn.style.display = 'block'; // Mostrar botón Uber solo si hay dirección
    } else {
        addressDiv.style.display = 'none';
        uberBtn.style.display = 'none';
    }
    
    document.getElementById('invoiceClientInfo').innerHTML = `
        <strong>${currentClient.nombre || 'Cliente'}</strong>
        <br><span style="font-size: 0.8rem; color: #666;">CC: ${currentClient.cedula || currentClient.id}</span>
        ${currentClient.direccion ? `<br><span style="font-size: 0.75rem; color: var(--info);">📍 ${currentClient.provincia || ''} ${currentClient.canton || ''}</span>` : ''}
    `;
}

// ==========================================
// SOLICITAR UBER (Deep Link)
// ==========================================
function requestUber() {
    if (!currentClient) {
        alert('Seleccione un cliente primero');
        return;
    }
    
    if (!currentClient.direccion) {
        alert('El cliente no tiene dirección registrada. Edítelo y agregue la dirección.');
        return;
    }
    
    const address = encodeURIComponent(currentClient.direccion);
    const province = currentClient.provincia ? encodeURIComponent(currentClient.provincia + ', Costa Rica') : 'Costa+Rica';
    
    // Opción 1: Deep link de Uber (abre la app con destino prellenado)
    const uberWebLink = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${address},%20${province}`;
    
    // Opción 2: Intent de Android (si está en móvil)
    const uberAndroidLink = `uber://?action=setPickup&pickup=my_location&dropoff[formatted_address]=${address}`;
    
    // Opción 3: Google Maps como respaldo
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${address},%20${province}`;
    
    // Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const options = confirm(
        `🚗 Solicitar transporte para:\n\n${currentClient.nombre}\n📍 ${currentClient.direccion}\n\n` +
        `Aceptar = Abrir Uber\nCancelar = Abrir Google Maps`
    );
    
    if (options) {
        // Intentar abrir Uber primero
        if (isMobile) {
            // En móvil, intentar el intent de la app
            window.location.href = uberAndroidLink;
            // Fallback a web después de 1 segundo si no abre
            setTimeout(() => {
                window.open(uberWebLink, '_blank');
            }, 1000);
        } else {
            // En desktop, abrir web
            window.open(uberWebLink, '_blank');
        }
    } else {
        // Abrir Google Maps
        window.open(mapsLink, '_blank');
    }
}

// Función alternativa para servicios de mensajería en CR
function requestDelivery(service) {
    if (!currentClient || !currentClient.direccion) {
        alert('Cliente sin dirección registrada');
        return;
    }
    
    const address = encodeURIComponent(currentClient.direccion);
    const phone = currentClient.telefono ? encodeURIComponent(currentClient.telefono) : '';
    
    const links = {
        'didi': `https://www.didiglobal.com/`,
        'indriver': `https://indriver.com/`,
        'maps': `https://www.google.com/maps/search/?api=1&query=${address}`,
        'whatsapp': `https://wa.me/50672952454?text=${encodeURIComponent(
            `Hola, necesito enviar un paquete a:\n\n📍 ${currentClient.direccion}\n👤 ${currentClient.nombre}\n📞 ${currentClient.telefono}`
        )}`
    };
    
    if (links[service]) {
        window.open(links[service], '_blank');
    }
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-box') && !e.target.closest('.modal-overlay')) {
        document.getElementById('clientResults').style.display = 'none';
    }
});