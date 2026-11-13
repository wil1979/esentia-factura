// Calculadora independiente de producción Esentia.
// Conserva la colección Firestore y la clave local usados por la aplicación original.
const firebaseConfigCalculadora = {
  apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
  authDomain: "esentiacreditos-8345f.firebaseapp.com",
  projectId: "esentiacreditos-8345f",
  storageBucket: "esentiacreditos-8345f.firebasestorage.app",
  messagingSenderId: "888658236080",
  appId: "1:888658236080:web:506e5e2085b5a452dba175"
};
let db = null;
let isOnline = navigator.onLine;
let currentImageBase64 = null;
let currentImageUrl = null;
let currentEditingId = null;
let imageTabActive = 'file';
const costosCera = { cera_china: 1000, cera_soya: 2500, cera_abeja: 4000, parafina_gel: 3000, cera_coco: 3500 };

function saveToLocal(key, data) {
  try { localStorage.setItem('esentia_' + key, JSON.stringify(data)); }
  catch (error) { console.error('No se pudo guardar localmente:', error); }
}
function loadFromLocal(key) {
  try { const value = localStorage.getItem('esentia_' + key); return value ? JSON.parse(value) : null; }
  catch (error) { console.error('No se pudo leer el almacenamiento local:', error); return null; }
}
function showToast(message, isError = false, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show' + (isError ? ' error' : type ? ' ' + type : '');
  clearTimeout(window.calcToastTimer);
  window.calcToastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}


document.addEventListener('DOMContentLoaded', () => {
  try {
    if (window.firebase) {
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfigCalculadora);
      db = firebase.firestore();
    }
  } catch (error) { console.warn('Firebase no disponible; se usará historial local.', error); }

  document.getElementById('calcModalOverlay')?.addEventListener('click', event => {
    if (event.target.id === 'calcModalOverlay') cerrarCalculadora();
  });
  document.getElementById('calcTipoCera')?.addEventListener('change', event => {
    const price = costosCera[event.target.value];
    if (price !== undefined) document.getElementById('calcCostoCera').value = price;
    calcularProduccion();
  });
  ['calcPesoVela','calcPorcentajeFragancia','calcCostoCera','calcCostoFragancia',
   'calcCostoMecheEnvase','calcCostosIndirectos','calcManoObra','calcMargenGanancia',
   'calcCostoFragancia','calcPorcentajeAcidoEstearico','calcCostoAcidoEstearicoKg']
    .forEach(id => document.getElementById(id)?.addEventListener('input', calcularProduccion));
  document.getElementById('calcUnidadFragancia')?.addEventListener('change', calcularProduccion);
  window.addEventListener('online', () => { isOnline = true; cargarHistorialCalculadora(); });
  window.addEventListener('offline', () => { isOnline = false; });
  cargarHistorialCalculadora();
});

// ==================== CALCULADORA DE PRODUCCION ====================
function abrirCalculadora() {
    const modal = document.getElementById('calcModalOverlay');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('calcReopen')?.classList.remove('visible');
        calcularProduccion();
    }
}

function cerrarCalculadora() {
    const modal = document.getElementById('calcModalOverlay');
    if (modal) modal.classList.remove('active');
    document.getElementById('calcReopen')?.classList.add('visible');
}

// ===== GESTION DE IMAGENES =====
function cambiarTabImagen(tab) {
    imageTabActive = tab;
    document.querySelectorAll('.calc-imagen-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.calc-imagen-tab[data-tab="' + tab + '"]').classList.add('active');

    if (tab === 'file') {
        document.getElementById('calcImagenFileSection').style.display = 'block';
        document.getElementById('calcImagenUrlSection').style.display = 'none';
    } else {
        document.getElementById('calcImagenFileSection').style.display = 'none';
        document.getElementById('calcImagenUrlSection').style.display = 'block';
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen no debe superar 2MB', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        currentImageBase64 = e.target.result;
        currentImageUrl = null;
        mostrarPreviewImagen(currentImageBase64);
    };
    reader.readAsDataURL(file);
}

function handleUrlImagen() {
    const url = document.getElementById('calcImagenUrlInput').value.trim();
    if (!url) { showToast('Ingresa una URL valida', true); return; }

    currentImageUrl = url;
    currentImageBase64 = null;
    mostrarPreviewImagen(url);
}

function mostrarPreviewImagen(src) {
    const preview = document.getElementById('calcImagenPreview');
    if (preview) {
        preview.src = src;
        preview.style.display = 'block';
        preview.classList.remove('empty');
        preview.innerHTML = '';
    }

    const removeBtn = document.getElementById('calcImagenRemove');
    if (removeBtn) removeBtn.style.display = 'block';
}

function removerImagen() {
    currentImageBase64 = null;
    currentImageUrl = null;

    const preview = document.getElementById('calcImagenPreview');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
        preview.classList.add('empty');
        preview.innerHTML = '🖼️';
    }

    const fileInput = document.getElementById('calcImagenFile');
    if (fileInput) fileInput.value = '';

    const urlInput = document.getElementById('calcImagenUrlInput');
    if (urlInput) urlInput.value = '';

    const removeBtn = document.getElementById('calcImagenRemove');
    if (removeBtn) removeBtn.style.display = 'none';
}

function calcularProduccion() {
    const pesoVela = parseFloat(document.getElementById('calcPesoVela')?.value) || 0;
    let porcentajeFragancia = parseFloat(document.getElementById('calcPorcentajeFragancia')?.value) || 0;
    const costoCeraKg = parseFloat(document.getElementById('calcCostoCera')?.value) || 0;
    const costoFraganciaUnidad = parseFloat(document.getElementById('calcCostoFragancia')?.value) || 0;
    const unidadFragancia = document.getElementById('calcUnidadFragancia')?.value || 'g';
    let porcentajeAcidoEstearico = parseFloat(document.getElementById('calcPorcentajeAcidoEstearico')?.value) || 0;
    const costoAcidoEstearicoKg = parseFloat(document.getElementById('calcCostoAcidoEstearicoKg')?.value) || 0;
    const costoMecheEnvase = parseFloat(document.getElementById('calcCostoMecheEnvase')?.value) || 0;
    const costosIndirectos = parseFloat(document.getElementById('calcCostosIndirectos')?.value) || 0;
    const manoObra = parseFloat(document.getElementById('calcManoObra')?.value) || 0;
    const margenGanancia = parseFloat(document.getElementById('calcMargenGanancia')?.value) || 0;

    if (porcentajeFragancia > 100) {
        const input = document.getElementById('calcPorcentajeFragancia');
        if (input) input.value = 100;
        porcentajeFragancia = 100;
    }

    if (porcentajeAcidoEstearico > 100) {
        document.getElementById('calcPorcentajeAcidoEstearico').value = 100;
        porcentajeAcidoEstearico = 100;
    }

    const pesoVelaKg = pesoVela / 1000;
    const pesoFraganciaKg = pesoVelaKg * (porcentajeFragancia / 100);
    const pesoBaseKg = pesoVelaKg - pesoFraganciaKg;
    // La base restante se divide entre cera y ácido; el porcentaje de ácido es sobre el peso de cera.
    const pesoCeraKg = pesoBaseKg / (1 + porcentajeAcidoEstearico / 100);
    const pesoAcidoEstearicoKg = pesoBaseKg - pesoCeraKg;

    const costoCeraTotal = pesoCeraKg * costoCeraKg;
    const cantidadFragancia = pesoFraganciaKg * 1000;
    const costoFraganciaTotal = cantidadFragancia * costoFraganciaUnidad;
    const costoAcidoEstearicoTotal = pesoAcidoEstearicoKg * costoAcidoEstearicoKg;
    const costoTotal = costoCeraTotal + costoFraganciaTotal + costoAcidoEstearicoTotal + costoMecheEnvase + costosIndirectos + manoObra;
    const gananciaVela = costoTotal * (margenGanancia / 100);
    const precioVenta = costoTotal + gananciaVela;

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('calcPesoFraganciaTotal', (pesoFraganciaKg * 1000).toFixed(1) + 'g');
    setText('calcCostoCeraTotal', '₡' + costoCeraTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoFraganciaTotal', '₡' + costoFraganciaTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoAcidoEstearicoTotal', '₡' + costoAcidoEstearicoTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoMecheEnvaseTotal', '₡' + costoMecheEnvase.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostosIndirectosTotal', '₡' + costosIndirectos.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcManoObraTotal', '₡' + manoObra.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcCostoTotal', '₡' + costoTotal.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcMargenGananciaValor', margenGanancia + '%');
    setText('calcGananciaVela', '₡' + gananciaVela.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
    setText('calcPrecioVenta', '₡' + precioVenta.toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));

    return {
        pesoVela, porcentajeFragancia,
        pesoFraganciaKg: pesoFraganciaKg * 1000,
        pesoCeraKg: pesoCeraKg * 1000,
        costoCeraKg, costoFraganciaUnidad, unidadFragancia,
        porcentajeAcidoEstearico, costoAcidoEstearicoKg,
        pesoAcidoEstearicoGramos: pesoAcidoEstearicoKg * 1000,
        costoMecheEnvase, costosIndirectos, manoObra, margenGanancia,
        costoCeraTotal, costoFraganciaTotal, costoAcidoEstearicoTotal, costoTotal,
        gananciaVela, precioVenta,
        nombreProducto: document.getElementById('calcNombreProducto')?.value || ''
    };
}

function formatearFechaFirestore(fechaGuardado) {
    if (!fechaGuardado) return 'Sin fecha';
    if (typeof fechaGuardado.toDate === 'function') {
        return fechaGuardado.toDate().toLocaleString('es-CR');
    }
    if (fechaGuardado.seconds !== undefined) {
        const date = new Date(fechaGuardado.seconds * 1000 + (fechaGuardado.nanoseconds || 0) / 1000000);
        return date.toLocaleString('es-CR');
    }
    if (fechaGuardado instanceof Date) return fechaGuardado.toLocaleString('es-CR');
    if (typeof fechaGuardado === 'string') return new Date(fechaGuardado).toLocaleString('es-CR');
    return 'Sin fecha';
}

async function guardarCalculoFirestore() {
    const calculo = calcularProduccion();
    if (calculo.costoTotal === 0) {
        showToast('Ingresa los datos antes de guardar', true);
        return;
    }

    try {
        const dataToSave = {
            ...calculo,
            tipoCera: document.getElementById('calcTipoCera')?.value || 'cera_china',
            fechaGuardado: isOnline && db ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
            imagenBase64: currentImageBase64 || null,
            imagenUrl: currentImageUrl || null,
            synced: isOnline && db ? true : false
        };

        if (currentEditingId) {
            if (isOnline && db) {
                await db.collection('calculadora_produccion').doc(currentEditingId).update(dataToSave);
            }
            const localCalcs = loadFromLocal('calculadora_calculos') || [];
            const idx = localCalcs.findIndex(c => c.id === currentEditingId);
            if (idx !== -1) {
                localCalcs[idx] = { ...localCalcs[idx], ...dataToSave };
                saveToLocal('calculadora_calculos', localCalcs);
            }
            showToast('Calculo actualizado');
            currentEditingId = null;

            const saveBtn = document.getElementById('calcBtnSave');
            if (saveBtn) {
                saveBtn.innerHTML = 'Guardar';
                saveBtn.onclick = guardarCalculoFirestore;
                saveBtn.classList.remove('calc-btn-update');
                saveBtn.classList.add('calc-btn-save');
            }
        } else {
            const newId = 'calc_' + Date.now();
            if (isOnline && db) {
                const docRef = await db.collection('calculadora_produccion').add(dataToSave);
                dataToSave.id = docRef.id;
            } else {
                dataToSave.id = newId;
            }
            const localCalcs = loadFromLocal('calculadora_calculos') || [];
            localCalcs.unshift(dataToSave);
            saveToLocal('calculadora_calculos', localCalcs);
            showToast('Calculo guardado');
        }

        cargarHistorialCalculadora();
    } catch (error) {
        console.error('Error guardando:', error);
        showToast('Error al guardar', true);
    }
}

async function cargarHistorialCalculadora() {
    let calculos = [];

    if (isOnline && db) {
        try {
            const snapshot = await db.collection('calculadora_produccion')
                .orderBy('fechaGuardado', 'desc')
                .limit(20)
                .get();
            snapshot.forEach(doc => {
                calculos.push({ id: doc.id, ...doc.data() });
            });
            saveToLocal('calculadora_calculos', calculos);
        } catch (error) {
            console.error('Error cargando desde Firestore:', error);
        }
    }

    if (calculos.length === 0) {
        calculos = loadFromLocal('calculadora_calculos') || [];
    }

    const list = document.getElementById('calcHistorialList');
    if (!list) return;

    if (calculos.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 0.9rem;">No hay calculos guardados.</p>';
        return;
    }

    let html = '';
    calculos.forEach(data => {
        const fecha = formatearFechaFirestore(data.fechaGuardado);
        let imagenHTML = '';

        if (data.imagenBase64) {
            imagenHTML = `<img src="${data.imagenBase64}" class="calc-historial-img" alt="Producto">`;
        } else if (data.imagenUrl) {
            imagenHTML = `<img src="${data.imagenUrl}" class="calc-historial-img" alt="Producto">`;
        } else {
            imagenHTML = '<div class="calc-historial-img-placeholder">🖼️</div>';
        }

        html += `
            <div class="calc-historial-item" onclick="cargarCalculoPorId('${data.id}')">
                ${imagenHTML}
                <div class="calc-historial-item-info">
                    <h4>${data.nombreProducto || 'Sin nombre'}</h4>
                    <p>📅 ${fecha} | 💰 Costo: ₡${(data.costoTotal?.toLocaleString() || 0)} | 💵 Venta: ₡${(data.precioVenta?.toLocaleString() || 0)}</p>
                </div>
                <div class="calc-historial-actions">
                    <button class="btn-edit" onclick="event.stopPropagation(); editarCalculoPorId('${data.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="event.stopPropagation(); eliminarCalculoPorId('${data.id}')" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

async function cargarCalculoPorId(docId) {
    let data = null;

    if (isOnline && db) {
        try {
            const docSnap = await db.collection('calculadora_produccion').doc(docId).get();
            if (docSnap.exists) {
                data = { id: docSnap.id, ...docSnap.data() };
            }
        } catch (e) {
            console.error('Error cargando desde Firestore:', e);
        }
    }

    if (!data) {
        const localCalcs = loadFromLocal('calculadora_calculos') || [];
        data = localCalcs.find(c => c.id === docId);
    }

    if (data) {
        cargarDatosEnFormulario(data);
        showToast('Calculo cargado');
    }
}

async function editarCalculoPorId(docId) {
    let data = null;

    if (isOnline && db) {
        try {
            const docSnap = await db.collection('calculadora_produccion').doc(docId).get();
            if (docSnap.exists) data = { id: docSnap.id, ...docSnap.data() };
        } catch (e) {
            console.error('Error:', e);
        }
    }

    if (!data) {
        const localCalcs = loadFromLocal('calculadora_calculos') || [];
        data = localCalcs.find(c => c.id === docId);
    }

    if (data) {
        cargarDatosEnFormulario(data);
        currentEditingId = docId;
        const saveBtn = document.getElementById('calcBtnSave');
        if (saveBtn) {
            saveBtn.innerHTML = 'Actualizar';
            saveBtn.classList.remove('calc-btn-save');
            saveBtn.classList.add('calc-btn-update');
        }
        showToast('Modo edicion activado');
        abrirCalculadora();
    }
}

function cargarDatosEnFormulario(data) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('calcNombreProducto', data.nombreProducto || '');
    setVal('calcTipoCera', data.tipoCera || 'cera_china');
    setVal('calcPesoVela', data.pesoVela || 0);
    setVal('calcPorcentajeFragancia', data.porcentajeFragancia || 10);
    setVal('calcCostoCera', data.costoCeraKg || 0);
    setVal('calcUnidadFragancia', data.unidadFragancia || 'g');
    setVal('calcCostoFragancia', data.costoFraganciaUnidad ?? (data.costoFraganciaKg ? data.costoFraganciaKg / 1000 : 0));
    setVal('calcPorcentajeAcidoEstearico', data.porcentajeAcidoEstearico ?? 0);
    setVal('calcCostoAcidoEstearicoKg', data.costoAcidoEstearicoKg ?? 0);
    setVal('calcCostoMecheEnvase', data.costoMecheEnvase || 0);
    setVal('calcCostosIndirectos', data.costosIndirectos || 0);
    setVal('calcManoObra', data.manoObra || 0);
    setVal('calcMargenGanancia', data.margenGanancia || 50);
    setVal('calcImagenUrlInput', '');

    if (data.imagenBase64) {
        currentImageBase64 = data.imagenBase64;
        currentImageUrl = null;
        mostrarPreviewImagen(data.imagenBase64);
        cambiarTabImagen('file');
    } else if (data.imagenUrl) {
        currentImageUrl = data.imagenUrl;
        currentImageBase64 = null;
        mostrarPreviewImagen(data.imagenUrl);
        setVal('calcImagenUrlInput', data.imagenUrl);
        cambiarTabImagen('url');
    } else {
        removerImagen();
    }

    calcularProduccion();
}

async function eliminarCalculoPorId(docId) {
    if (!confirm('Eliminar este calculo?')) return;

    try {
        if (isOnline && db) {
            await db.collection('calculadora_produccion').doc(docId).delete();
        }
        const localCalcs = loadFromLocal('calculadora_calculos') || [];
        const filtered = localCalcs.filter(c => c.id !== docId);
        saveToLocal('calculadora_calculos', filtered);
        showToast('Calculo eliminado');
        cargarHistorialCalculadora();
    } catch (e) {
        console.error('Error eliminando:', e);
        showToast('Error al eliminar', true);
    }
}

function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const calculo = calcularProduccion();
    const nombreProducto = document.getElementById('calcNombreProducto')?.value || 'Sin_nombre';

    doc.setFontSize(20);
    doc.text('Esentia - Calculadora de Produccion', 20, 20);
    doc.setFontSize(12);
    doc.text('Fecha: ' + new Date().toLocaleString(), 20, 30);
    doc.text('Producto: ' + nombreProducto, 20, 40);
    doc.setFontSize(14);
    doc.text('Detalles de Costos:', 20, 55);

    let y = 65;
    doc.setFontSize(11);
    doc.text('Peso Total: ' + calculo.pesoVela + 'g', 20, y); y += 10;
    doc.text('Peso Fragancia (' + calculo.porcentajeFragancia + '%): ' + calculo.pesoFraganciaKg.toFixed(1) + 'g', 20, y); y += 10;
    doc.text('Peso Cera (Restante): ' + calculo.pesoCeraKg.toFixed(1) + 'g', 20, y); y += 15;
    doc.text('Costo de Cera: ' + calculo.costoCeraTotal.toLocaleString(), 20, y); y += 10;
    doc.text('Costo de Fragancia (' + calculo.unidadFragancia + '): ' + calculo.costoFraganciaTotal.toLocaleString(), 20, y); y += 10;
    doc.text('Ácido Esteárico (' + calculo.pesoAcidoEstearicoGramos.toFixed(1) + 'g): ' + calculo.costoAcidoEstearicoTotal.toLocaleString(), 20, y); y += 10;
    doc.text('Mecha + Envase: ' + calculo.costoMecheEnvase.toLocaleString(), 20, y); y += 10;
    doc.text('Costos Indirectos: ' + calculo.costosIndirectos.toLocaleString(), 20, y); y += 10;
    doc.text('Mano de Obra: ' + calculo.manoObra.toLocaleString(), 20, y); y += 15;

    doc.setFontSize(13);
    doc.text('COSTO TOTAL: ' + calculo.costoTotal.toLocaleString(), 20, y); y += 15;
    doc.setFontSize(11);
    doc.text('Margen de Ganancia: ' + calculo.margenGanancia + '%', 20, y); y += 10;
    doc.text('Ganancia por Vela: ' + calculo.gananciaVela.toLocaleString(), 20, y); y += 15;

    doc.setFontSize(16);
    doc.setTextColor(245, 158, 11);
    doc.text('PRECIO DE VENTA SUGERIDO: ' + calculo.precioVenta.toLocaleString(), 20, y);

    if (currentImageBase64) {
        try {
            doc.addImage(currentImageBase64, 'JPEG', 150, 20, 40, 40);
        } catch (e) { console.log('No se pudo agregar imagen al PDF'); }
    }

    doc.save('calculadora_' + nombreProducto.replace(/\s+/g, '_') + '.pdf');
    showToast('PDF descargado');
}

function descargarExcel() {
    const calculo = calcularProduccion();
    const nombreProducto = document.getElementById('calcNombreProducto')?.value || 'Sin_nombre';

    const datos = {
        'Producto': nombreProducto,
        'Fecha': new Date().toLocaleString(),
        'Peso Vela (g)': calculo.pesoVela,
        'Porcentaje Fragancia (%)': calculo.porcentajeFragancia,
        'Peso Fragancia (g)': calculo.pesoFraganciaKg.toFixed(2),
        'Peso Cera (g)': calculo.pesoCeraKg.toFixed(2),
        'Costo Cera/kg': calculo.costoCeraKg,
        'Unidad de Fragancia': calculo.unidadFragancia,
        'Costo Fragancia por g/ml': calculo.costoFraganciaUnidad,
        'Ácido Esteárico (%)': calculo.porcentajeAcidoEstearico,
        'Costo Ácido Esteárico/kg': calculo.costoAcidoEstearicoKg,
        'Cantidad Ácido Esteárico (g)': calculo.pesoAcidoEstearicoGramos,
        'Costo Meche+Envase': calculo.costoMecheEnvase,
        'Costos Indirectos': calculo.costosIndirectos,
        'Mano de Obra': calculo.manoObra,
        'Costo Cera Total': calculo.costoCeraTotal,
        'Costo Fragancia Total': calculo.costoFraganciaTotal,
        'Costo Ácido Esteárico Total': calculo.costoAcidoEstearicoTotal,
        'COSTO TOTAL': calculo.costoTotal,
        'Margen Ganancia (%)': calculo.margenGanancia,
        'Ganancia por Vela': calculo.gananciaVela,
        'PRECIO DE VENTA': calculo.precioVenta
    };

    const ws = XLSX.utils.json_to_sheet([datos]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Calculo');
    XLSX.writeFile(wb, 'calculadora_' + nombreProducto.replace(/\s+/g, '_') + '.xlsx');
    showToast('Excel descargado');
}

function limpiarCalculadora() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('calcPesoVela', '');
    setVal('calcPorcentajeFragancia', '10');
    setVal('calcCostoCera', '');
    setVal('calcCostoFragancia', '');
    setVal('calcUnidadFragancia', 'g');
    setVal('calcPorcentajeAcidoEstearico', '0');
    setVal('calcCostoAcidoEstearicoKg', '');
    setVal('calcCostoMecheEnvase', '');
    setVal('calcCostosIndirectos', '');
    setVal('calcManoObra', '');
    setVal('calcMargenGanancia', '50');
    setVal('calcNombreProducto', '');
    setVal('calcTipoCera', 'cera_china');
    setVal('calcImagenUrlInput', '');
    removerImagen();

    currentEditingId = null;
    const saveBtn = document.getElementById('calcBtnSave');
    if (saveBtn) {
        saveBtn.innerHTML = 'Guardar';
        saveBtn.classList.remove('calc-btn-update');
        saveBtn.classList.add('calc-btn-save');
    }

    calcularProduccion();
    showToast('Calculadora limpiada');
}