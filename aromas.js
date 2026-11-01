// ==========================================
// 🎨 AROMALABEL PRO v3 - JavaScript Principal
// ==========================================
'use strict';

// ==========================================
// 📦 VARIABLES GLOBALES
// ==========================================
let logoDataUrl = null;
let imagesList = [];
let printQueue = [];
let projects = JSON.parse(localStorage.getItem('aromaProjects') || '[]');

window.estadoImagenProducto = { activa: false, url: '', tamano: 30, posX: 50, posY: 30, rotacion: 0 };
window.estadoImagenFondo = { url: '', opacity: 0.3, fit: 'contain' };
window.favoritos = JSON.parse(localStorage.getItem('aromalabel_favoritos') || '[]');
window.historial = JSON.parse(localStorage.getItem('aromalabel_historial') || '[]');

let productosData = { ESENCIAS: [], LIMPIEZA: [], VELAS: [] };
let productosFiltrados = [];
let productoActual = null;

// ==========================================
// 🎯 SISTEMA DE PESTAÑAS
// ==========================================
function cambiarTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const content = document.getElementById('tab-' + tabId);
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (content) content.classList.add('active');
  if (btn) btn.classList.add('active');
  document.querySelector('.sidebar').scrollTop = 0;
}

function showSection(sectionId, btn) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const activeBtn = document.querySelector(`.nav-tab[onclick*="${sectionId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }
}

function toggleSection(header) {
  const section = header.closest('.collapsible-section');
  if (section) section.classList.toggle('collapsed');
}

// ==========================================
// 🔄 SINCRONIZACIÓN DE SLIDERS
// ==========================================
function sincronizarValoresSliders() {
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const actualizarDisplay = () => {
      const valor = slider.value;
      let display = document.getElementById(slider.id + 'Val') || document.getElementById(slider.id + 'Valor');
      if (!display) {
        const padre = slider.parentElement;
        if (padre) display = padre.querySelector('span');
      }
      if (display) display.textContent = valor;
      if (typeof updateLabel === 'function') updateLabel();
    };
    slider.addEventListener('input', actualizarDisplay);
    actualizarDisplay();
  });
}

// ==========================================
// 🏷️ FUNCIÓN PRINCIPAL: updateLabel()
// ==========================================
function updateLabel() {
  if (typeof qrcode !== 'function') console.warn('Librería qrcode no disponible');

  // Canvas (para exportación)
  const canvas = document.getElementById('labelCanvas');
  if (canvas) {
    try {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (typeof dibujarImagenFondo === 'function') dibujarImagenFondo(ctx, canvas);
      if (typeof dibujarImagenProducto === 'function') dibujarImagenProducto(ctx, canvas);
    } catch (e) { console.warn('⚠️ Canvas error:', e); }
  }

  const label = document.getElementById('labelPreview');
  if (!label) return;

  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    return el ? (el.value !== undefined ? el.value : fallback) : fallback;
  };
  const getCheck = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  const widthMm = parseInt(getVal('labelWidth', 60));
  const heightMm = parseInt(getVal('labelHeight', 80));
  const paddingMm = parseFloat(getVal('labelPadding', 3));
  const borderRadius = parseInt(getVal('borderRadius', 4));
  const topLine = parseInt(getVal('topLine', 4));
  const bottomLine = parseInt(getVal('bottomLine', 0));
  const areaGap = parseInt(getVal('areaGap', 6));
  const fontBrand = parseInt(getVal('fontBrand', 16));
  const fontBrandSub = parseInt(getVal('fontBrandSub', 8));
  const fontProduct = parseInt(getVal('fontProduct', 22));
  const fontType = parseInt(getVal('fontType', 10));
  const fontDetails = parseInt(getVal('fontDetails', 9));
  const fontInstr = parseInt(getVal('fontInstr', 7));
  const fontBatch = parseInt(getVal('fontBatch', 7));
  const fontOrigin = parseInt(getVal('fontOrigin', 7));
  const qrSizePercent = parseInt(getVal('qrSize', 22));
  // ✅ NUEVO: Controles de posición del QR
const qrPosX = parseInt(getVal('qrPosX', 50));
const qrPosY = parseInt(getVal('qrPosY', 90));
const qrRotation = parseInt(getVal('qrRotation', 0));

// Aplicar variables CSS para posición del QR
label.style.setProperty('--qr-pos-x', qrPosX + '%');
label.style.setProperty('--qr-pos-y', qrPosY + '%');
label.style.setProperty('--qr-rotation', qrRotation + 'deg');
  const brandFont = getVal('brandFont', "'Playfair Display', serif");
  const productFont = getVal('productFont', "'Playfair Display', serif");
  const accentColor = getVal('accentColor', '#c9a96e');
  const textColor = getVal('textColor', '#1a1a1a');
  const bgColor = getVal('bgColor', '#ffffff');
  const qrBgColor = getVal('qrBgColor', '#ffffff');
  const showDivider = getCheck('showDivider');
  const showQR = getCheck('showQR');
  const showBarcode = getCheck('showBarcode');
  const showInstructions = getCheck('showInstructions');
  const showFooter = getCheck('showFooter');
  const vinylMode = getCheck('vinylMode');

  label.style.setProperty('--label-width', widthMm + 'mm');
  label.style.setProperty('--label-height', heightMm + 'mm');
  label.style.setProperty('--label-padding', paddingMm + 'mm');
  label.style.setProperty('--border-radius', borderRadius + 'px');
  label.style.setProperty('--top-line', topLine + 'px');
  label.style.setProperty('--bottom-line', bottomLine + 'px');
  label.style.setProperty('--area-gap', areaGap + 'px');
  label.style.setProperty('--accent-color', accentColor);
  label.style.setProperty('--text-color', textColor);
  label.style.setProperty('--qr-size', qrSizePercent + '%');
  label.style.setProperty('--qr-bg', qrBgColor);
  label.style.setProperty('--brand-font', brandFont);
  label.style.setProperty('--product-font', productFont);
  label.style.borderRadius = borderRadius + 'px';

  if (vinylMode) {
    label.style.backgroundColor = 'transparent';
    label.classList.add('vinyl-mode');
    const container = document.querySelector('.label-container');
    if (container) container.classList.add('vinyl-preview');
  } else {
    label.style.backgroundColor = bgColor;
    label.classList.remove('vinyl-mode');
    const container = document.querySelector('.label-container');
    if (container) container.classList.remove('vinyl-preview');
  }

  const topLineEl = document.getElementById('labelTopLine');
  if (topLineEl) { topLineEl.style.height = topLine + 'px'; topLineEl.style.backgroundColor = accentColor; topLineEl.style.display = topLine > 0 ? 'block' : 'none'; }
  const bottomLineEl = document.getElementById('labelBottomLine');
  if (bottomLineEl) { bottomLineEl.style.height = bottomLine + 'px'; bottomLineEl.style.backgroundColor = accentColor; bottomLineEl.style.display = bottomLine > 0 ? 'block' : 'none'; }

  const textShadowVinyl = vinylMode ? '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7), 0 0 1px rgba(0,0,0,0.3)' : 'none';
  const textShadowName = vinylMode ? '0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.8), 0 0 1px rgba(0,0,0,0.4)' : 'none';
  const textShadowLight = vinylMode ? '0 0 2px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.2)' : 'none';

  const setStyle = (id, styles) => { const el = document.getElementById(id); if (el) Object.assign(el.style, styles); };

  setStyle('previewBrand', { fontSize: fontBrand + 'px', fontFamily: brandFont, color: textColor, textShadow: textShadowVinyl, lineHeight: '1.5', marginBottom: '0.25em', display: 'block', maxWidth: '100%', overflowWrap: 'break-word' });
  setStyle('previewBrandSub', { fontSize: fontBrandSub + 'px', textShadow: textShadowLight, lineHeight: '1.35', margin: '0', display: 'block', maxWidth: '100%', overflowWrap: 'break-word' });
  setStyle('previewProduct', { fontSize: fontProduct + 'px', fontFamily: productFont, color: textColor, textShadow: textShadowName });
  setStyle('previewType', { fontSize: fontType + 'px', textShadow: textShadowLight });
  setStyle('previewDetails', { fontSize: fontDetails + 'px', textShadow: textShadowLight });
  setStyle('previewInstructions', { fontSize: fontInstr + 'px', textShadow: textShadowLight });
  setStyle('previewBatch', { fontSize: fontBatch + 'px', color: textColor, textShadow: textShadowLight });
  setStyle('previewOrigin', { fontSize: fontOrigin + 'px', textShadow: textShadowLight });

  const setText = (id, val, fallback = '') => { const el = document.getElementById(id); if (el) el.textContent = val || fallback; };
  setText('previewBrand', getVal('brandName'), 'Marca');
  setText('previewBrandSub', getVal('brandSub'), '');
  setText('previewProduct', getVal('productName'), 'Producto');
  setText('previewType', getVal('productType'), '');
  setText('previewDetails', getVal('productDetails'), '');
  setText('previewInstructions', getVal('instructions'), '');
  setText('previewBatch', getVal('batchInfo'), '');
  setText('previewOrigin', getVal('originInfo'), '');

  const showPrice = getCheck('showPrice');
  const previewPriceEl = document.getElementById('previewPrice');
  if (previewPriceEl) {
    if (showPrice) {
      const priceValue = getVal('productPrice', '');
      previewPriceEl.textContent = priceValue;
      previewPriceEl.style.display = priceValue ? 'block' : 'none';
      previewPriceEl.style.fontSize = (fontDetails + 1) + 'px';
      previewPriceEl.style.color = accentColor;
      previewPriceEl.style.textShadow = textShadowLight;
    } else { previewPriceEl.style.display = 'none'; }
  }

  const qrEl = document.getElementById('previewQR');
  if (qrEl) {
    if (showQR) {
      qrEl.style.display = 'flex';
      qrEl.style.width = qrSizePercent + '%';
      qrEl.style.aspectRatio = '1 / 1';
      qrEl.style.backgroundColor = '#ffffff';
      qrEl.style.padding = '3px';
      qrEl.style.boxSizing = 'border-box';
      try {
        const qr = qrcode(0, 'H');
        qr.addData(getVal('qrUrl', 'https://example.com'));
        qr.make();
        const moduleCount = qr.getModuleCount();
        let qrHtml = '<table style="border-collapse:collapse;width:100%;height:100%;table-layout:fixed;">';
        for (let row = 0; row < moduleCount; row++) {
          qrHtml += '<tr style="height:' + (100 / moduleCount) + '%;">';
          for (let col = 0; col < moduleCount; col++) {
            const isDark = qr.isDark(row, col);
            qrHtml += '<td style="width:' + (100 / moduleCount) + '%;background:' + (isDark ? '#000000' : '#ffffff') + ';padding:0;margin:0;border:none;">&nbsp;</td>';
          }
          qrHtml += '</tr>';
        }
        qrHtml += '</table>';
        qrEl.innerHTML = qrHtml;
      } catch (e) { qrEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.5rem;color:#999;">QR Error</div>'; }
    } else { qrEl.style.display = 'none'; }
  }

  // Código de barras Code 128: se genera únicamente con el ID real del producto seleccionado.
  const barcodeWrap = document.getElementById('previewBarcodeWrap');
  const barcodeSvg = document.getElementById('previewBarcode');
  const productId = productoActual && productoActual.id != null ? String(productoActual.id).trim() : '';
  if (barcodeWrap && barcodeSvg) {
    if (showBarcode && productId && typeof JsBarcode === 'function') {
      try {
        barcodeWrap.style.display = 'flex';
        JsBarcode(barcodeSvg, productId, { format: 'CODE128', displayValue: true, text: productId, font: 'monospace', fontSize: 10, textMargin: 1, margin: 2, height: 32, width: 1.5, lineColor: '#111111', background: '#ffffff' });
      } catch (e) {
        barcodeWrap.style.display = 'none';
        console.warn('No se pudo generar el código de barras:', e);
      }
    } else {
      barcodeWrap.style.display = 'none';
      barcodeSvg.innerHTML = '';
    }
  }

  setStyle('labelDivider', { display: showDivider ? 'block' : 'none' });
  setStyle('previewInstructions', { display: showInstructions ? 'block' : 'none' });
  setStyle('labelFooter', { display: showFooter ? 'none' : 'block' });

 // Logo existente
 const logoImg = document.getElementById('previewLogoImg');
 const brandText = document.getElementById('previewBrand');
 const brandSub = document.getElementById('previewBrandSub');

 if (logoImg) {
    const showLogoImg = getCheck('showLogoImg');
    
    if (logoDataUrl) {
        logoImg.src = logoDataUrl;
    }
    
    if (showLogoImg && logoDataUrl) {
        logoImg.style.display = 'block';
        logoImg.style.position = 'absolute';
        logoImg.style.zIndex = '3';
        
        if (brandText) brandText.style.display = 'none';
        if (brandSub) brandSub.style.display = 'none';
        
        // ✅ TAMAÑO: Usar porcentaje del contenedor label (no del logo-area)
        const logoSize = parseInt(getVal('logoSize', 80));
        const labelWidth = parseInt(getVal('labelWidth', 60));
        const labelHeight = parseInt(getVal('labelHeight', 80));
        
        // Calcular tamaño en mm basado en el porcentaje
        const sizeMm = Math.min(labelWidth, labelHeight) * (logoSize / 100);
        logoImg.style.width = sizeMm + 'mm';
        logoImg.style.height = 'auto';
        logoImg.style.maxWidth = 'none';
        logoImg.style.maxHeight = 'none';
        
        // Opacidad
        logoImg.style.opacity = (getVal('logoOpa', 100) / 100);
        
        // Posición
        logoImg.style.left = getVal('logoPosX', 50) + '%';
        logoImg.style.top = getVal('logoPosY', 50) + '%';
        logoImg.style.transform = `translate(-50%, -50%) rotate(${getVal('logoRot', 0)}deg)`;
    } else {
        logoImg.style.display = 'none';
        if (brandText) brandText.style.display = 'block';
        if (brandSub) brandSub.style.display = 'block';
    }
    
 }
 
 // ✅ Renderizar imágenes dinámicas de la etiqueta
 imagesList.forEach(img => {
    if (!img.url) return;
    
    let imgEl = document.getElementById(`dynamicImg_${img.id}`);
    
    if (!imgEl) {
        imgEl = document.createElement('img');
        imgEl.id = `dynamicImg_${img.id}`;
        imgEl.style.position = 'absolute';
        imgEl.style.pointerEvents = 'none';
        imgEl.style.zIndex = '2';
        label.appendChild(imgEl);
    }
    
    imgEl.src = img.url;
    imgEl.style.display = 'block';
    
    // Calcular tamaño
    const labelWidth = parseInt(getVal('labelWidth', 60));
    const labelHeight = parseInt(getVal('labelHeight', 80));
    const sizeMm = Math.min(labelWidth, labelHeight) * (img.size / 100);
    
    imgEl.style.width = sizeMm + 'mm';
    imgEl.style.height = 'auto';
    imgEl.style.opacity = (img.opacity / 100);
    imgEl.style.left = img.posX + '%';
    imgEl.style.top = img.posY + '%';
    imgEl.style.transform = `translate(-50%, -50%) rotate(${img.rotation}deg)`;
 });

 // ✅ Limpiar imágenes dinámicas que ya no existen
 const existingDynamicImgs = label.querySelectorAll('img[id^="dynamicImg_"]');
 existingDynamicImgs.forEach(el => {
    const imgId = parseInt(el.id.replace('dynamicImg_', ''));
    const exists = imagesList.some(img => img.id === imgId && img.url);
    if (!exists) el.remove();
 });

  // Imágenes de fondo y producto
  let bgImgEl = document.getElementById('labelBgImage');
  const bgEstado = window.estadoImagenFondo || { url: '', opacity: 0.3, fit: 'contain' };
  if (bgEstado.url) {
    if (!bgImgEl) {
      bgImgEl = document.createElement('img');
      bgImgEl.id = 'labelBgImage';
      bgImgEl.style.position = 'absolute';
      bgImgEl.style.top = '0'; bgImgEl.style.left = '0';
      bgImgEl.style.width = '100%'; bgImgEl.style.height = '100%';
      bgImgEl.style.zIndex = '1';
      bgImgEl.style.pointerEvents = 'none';
      label.insertBefore(bgImgEl, label.firstChild);
    }
    bgImgEl.src = bgEstado.url;
    bgImgEl.style.opacity = bgEstado.opacity;
    bgImgEl.style.objectFit = bgEstado.fit;
    bgImgEl.style.display = 'block';
  } else if (bgImgEl) { bgImgEl.style.display = 'none'; }

  let previewProductImg = document.getElementById('previewProductImg');
  if (window.estadoImagenProducto && window.estadoImagenProducto.activa && window.estadoImagenProducto.url) {
    if (!previewProductImg) {
      previewProductImg = document.createElement('img');
      previewProductImg.id = 'previewProductImg';
      previewProductImg.style.pointerEvents = 'none';
      previewProductImg.style.objectFit = 'contain';
      previewProductImg.style.zIndex = '2';
      previewProductImg.style.position = 'absolute';
      label.appendChild(previewProductImg);
    }
    previewProductImg.src = window.estadoImagenProducto.url;
    previewProductImg.style.display = 'block';
    previewProductImg.style.width = window.estadoImagenProducto.tamano + '%';
    previewProductImg.style.left = window.estadoImagenProducto.posX + '%';
    previewProductImg.style.top = window.estadoImagenProducto.posY + '%';
    previewProductImg.style.transform = `translate(-50%, -50%) rotate(${window.estadoImagenProducto.rotacion}deg)`;
  } else if (previewProductImg) { previewProductImg.remove(); }

 // cambiarForma ()
  aplicarBordes();
 }

 // ==========================================
// 📍 CONTROLES DE POSICIÓN DEL QR
// ==========================================
function resetQRPosition() {
  document.getElementById('qrPosX').value = 50;
  document.getElementById('qrPosY').value = 90;
  document.getElementById('qrSize').value = 22;
  document.getElementById('qrRotation').value = 0;
  updateLabel();
}

function centerQR() {
  document.getElementById('qrPosX').value = 50;
  document.getElementById('qrPosY').value = 50;
  updateLabel();
}

// ==========================================
// 🎨 MEJORA 1: FORMAS DE ETIQUETA
// ==========================================
function cambiarForma(forma, btn) {
    const label = document.getElementById('labelPreview');
    if (!label) return;
    
    // Remover todas las clases de forma
    label.classList.remove('shape-rectangular', 'shape-circular', 'shape-arched-top', 
                          'shape-arched-bottom', 'shape-triangular', 'shape-oval', 
                          'shape-hexagon', 'shape-tag', 'shape-diamond', 'shape-heart');
    
    // Agregar nueva forma
    label.classList.add('shape-' + forma);
    
    // Actualizar botones activos
    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    // Guardar en localStorage
    localStorage.setItem('aromaLabelShape', forma);
    
    updateLabel();
}


// ==========================================
//  PLANTILLAS
// ==========================================
function applyTemplate(type, btn) {
  const templates = {
    small: { w: 50, h: 60 }, medium: { w: 70, h: 90 }, large: { w: 90, h: 110 },
    lid: { w: 50, h: 50 }, luxury: { w: 80, h: 100 }, minimal: { w: 60, h: 40 },
    mini: { w: 30, h: 40 }, micro: { w: 25, h: 35 }, tealight: { w: 35, h: 25 }
  };
  const t = templates[type];
  if (!t) return;
  document.getElementById('labelWidth').value = t.w;
  document.getElementById('labelHeight').value = t.h;
  document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  updateLabel();
}

// ==========================================
// 📦 CATÁLOGO DE PRODUCTOS
// ==========================================
function normalizarURL(img) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  return `https://wil1979.github.io/esentia-factura/${img.replace(/^\/+/, '')}`;
}

function formatPrecio(p) {
  if (!p) return '';
  return `₡${Number(p).toLocaleString('es-CR')}`;
}

async function cargarDatosProductos() {
  try {
    const resE = await fetch('https://wil1979.github.io/esentia-factura/data/productos_esentia.json');
    const dataE = await resE.json();
    Object.keys(dataE).forEach(cat => {
      if (Array.isArray(dataE[cat])) {
        dataE[cat].forEach(p => productosData.ESENCIAS.push({ ...p, categoriaOrigen: cat, tipoCatalogo: 'ESENCIAS' }));
      }
    });
    const resL = await fetch('https://wil1979.github.io/esentia-factura/data/productos_limpieza_completo.json');
    const dataL = await resL.json();
    dataL.forEach(p => productosData.LIMPIEZA.push({ ...p, tipoCatalogo: 'LIMPIEZA' }));
    const resV = await fetch('https://wil1979.github.io/esentia-factura/data/catalogo-velas.json');
    const dataV = await resV.json();
    dataV.forEach(p => productosData.VELAS.push({ ...p, tipoCatalogo: 'VELAS' }));
    console.log('✅ Productos cargados:', { ESENCIAS: productosData.ESENCIAS.length, LIMPIEZA: productosData.LIMPIEZA.length, VELAS: productosData.VELAS.length });
  } catch (e) { console.error('❌ Error cargando productos:', e); }
}

function cargarProductos() {
  const categoria = document.getElementById('categoriaProducto').value;
  const select = document.getElementById('productoSeleccionado');
  const buscador = document.getElementById('buscadorProductos');
  select.innerHTML = '<option value="">-- Mostrar todos --</option>';
  select.disabled = !categoria;
  buscador.value = '';
  buscador.disabled = !categoria;
  if (!categoria) return;
  productosFiltrados = productosData[categoria] || [];
  renderizarProductos(productosFiltrados);
  const exportButton = document.getElementById('btnExportarPNGCatalogo');
  if (exportButton) exportButton.disabled = productosFiltrados.length === 0;
}

function filtrarProductos() {
  const categoria = document.getElementById('categoriaProducto').value;
  const texto = document.getElementById('buscadorProductos').value.toLowerCase().trim();
  if (!categoria) return;
  const todos = productosData[categoria];
  productosFiltrados = !texto ? todos : todos.filter(p => {
    const n = (p.nombre || '').toLowerCase();
    const no = (p.nombreOriginal || '').toLowerCase();
    const c = (p.categoria || p.categoriaOrigen || '').toLowerCase();
    return n.includes(texto) || no.includes(texto) || c.includes(texto);
  });
  renderizarProductos(productosFiltrados);
}

function renderizarProductos(lista) {
  const select = document.getElementById('productoSeleccionado');
  select.innerHTML = `<option value="">-- ${lista.length} productos --</option>`;
  lista.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const nombre = p.nombre || p.nombreOriginal || 'Sin nombre';
    const sub = p.categoriaOrigen ? ` (${p.categoriaOrigen})` : '';
    const badges = [];
    if (p.esNuevo) badges.push('🆕');
    if (p.esBestseller) badges.push('🏆');
    opt.textContent = `${badges.join('')}${nombre}${sub}`;
    select.appendChild(opt);
  });
}

function aplicarProducto() {
  const categoria = document.getElementById('categoriaProducto').value;
  const idx = document.getElementById('productoSeleccionado').value;
  const preview = document.getElementById('previewProducto');
  const contVar = document.getElementById('contenedorVariantes');

  window.estadoImagenProducto = { activa: false, url: '', tamano: 30, posX: 50, posY: 30, rotacion: 0 };
  document.getElementById('usarImagenProducto').checked = false;
  document.getElementById('usarQRProducto').checked = false;
  const controlesImg = document.getElementById('controlesImagen');
  if (controlesImg) controlesImg.style.display = 'none';
  const opcionesQR = document.getElementById('opcionesQR');
  if (opcionesQR) opcionesQR.style.display = 'none';
  const imgVieja = document.getElementById('previewProductImg');
  if (imgVieja) imgVieja.remove();
  const btnImg = document.getElementById('btnAgregarImagen');
  if (btnImg) { btnImg.innerHTML = '➕ Agregar Imagen al Diseñador'; btnImg.style.background = '#c9a96e'; btnImg.disabled = false; }

  if (!categoria || idx === '') { preview.style.display = 'none'; contVar.hidden = true; productoActual = null; return; }

  const producto = productosFiltrados[parseInt(idx)];
  productoActual = producto;

  const nombreSeleccionado = producto.nombre || producto.nombreOriginal || 'Sin Nombre';
  const elProductName = document.getElementById('productName');
  if (elProductName) elProductName.value = nombreSeleccionado;
  const projectNameInput = document.getElementById('projectName');
  if (projectNameInput) projectNameInput.value = nombreSeleccionado;
  const tipo = producto.categoria || producto.categoriaOrigen || producto.tipo || '';
  const elProductType = document.getElementById('productType');
  if (elProductType && tipo) elProductType.value = tipo;
  const info = producto.info || producto.descripcion || producto.beneficios || '';
  const elInstructions = document.getElementById('instructions');
  if (elInstructions && info) elInstructions.value = info;

  const selectVar = document.getElementById('varianteSeleccionada');
  selectVar.innerHTML = '<option value="">-- Seleccionar variante --</option>';
  if (producto.variantes && producto.variantes.length > 0) {
    contVar.hidden = false;
    producto.variantes.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.nombre} — ${formatPrecio(v.precio)}`;
      selectVar.appendChild(opt);
    });
    selectVar.value = '0';
    aplicarVariante();
  } else {
    contVar.hidden = true;
    const detalles = [];
    if (producto.duracion) detalles.push(producto.duracion);
    const elProductDetails = document.getElementById('productDetails');
    if (elProductDetails) elProductDetails.value = detalles.join(' · ');
    const precio = producto.precioOferta || producto.precio;
    const elProductPrice = document.getElementById('productPrice');
    if (elProductPrice) elProductPrice.value = precio ? formatPrecio(precio) : '';
  }

  const imgURL = normalizarURL(producto.imagen);
  const imgPreview = document.getElementById('previewImagen');
  if (imgURL && imgPreview) { imgPreview.src = imgURL; imgPreview.onerror = () => { imgPreview.src = ''; }; }
  const elPreviewNombre = document.getElementById('previewNombre');
  if (elPreviewNombre) elPreviewNombre.textContent = producto.nombre || producto.nombreOriginal;
  const elPreviewCategoria = document.getElementById('previewCategoria');
  if (elPreviewCategoria) elPreviewCategoria.textContent = tipo;

  const badgesDiv = document.getElementById('previewBadges');
  if (badgesDiv) {
    badgesDiv.innerHTML = '';
    const badges = [];
    if (producto.esNuevo) badges.push({ txt: '✨ NUEVO', color: '#28a745' });
    if (producto.esBestseller) badges.push({ txt: ' BESTSELLER', color: '#fd7e14' });
    if (producto.calificacion && producto.calificacion >= 4.5) badges.push({ txt: `⭐ ${producto.calificacion}`, color: '#ffc107', textDark: true });
    badges.forEach(b => {
      const span = document.createElement('span');
      span.textContent = b.txt;
      span.style.cssText = `padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${b.color}; color: ${b.textDark ? '#1a1a1a' : '#fff'};`;
      badgesDiv.appendChild(span);
    });
  }

  const precioPreview = producto.precioOferta || producto.precio;
  const elPreviewPrecio = document.getElementById('previewPrecio');
  if (elPreviewPrecio) elPreviewPrecio.innerHTML = precioPreview ? formatPrecio(precioPreview) : '';
  preview.style.display = 'block';

  agregarAlHistorial(producto);
  actualizarUIFavoritos();
  if (typeof updateLabel === 'function') updateLabel();
}

function aplicarVariante() {
  if (!productoActual) return;
  const idx = document.getElementById('varianteSeleccionada').value;
  if (idx === '') return;
  const variante = productoActual.variantes[idx];
  let detalles = [];
  if (productoActual.duracion) detalles.push(productoActual.duracion);
  detalles.push(variante.nombre);
  const elProductDetails = document.getElementById('productDetails');
  if (elProductDetails) elProductDetails.value = detalles.join(' · ');
  const elProductPrice = document.getElementById('productPrice');
  if (elProductPrice) elProductPrice.value = formatPrecio(variante.precio);
  const elPreviewPrecio = document.getElementById('previewPrecio');
  if (elPreviewPrecio) elPreviewPrecio.innerHTML = formatPrecio(variante.precio);
  if (typeof updateLabel === 'function') updateLabel();
}

// ==========================================
// ❤️ FAVORITOS E HISTORIAL
// ==========================================
function obtenerIdUnico(producto) { return `${producto.tipoCatalogo || 'UNK'}-${producto.id || producto.nombre}`; }

function toggleFavorito() {
  if (!productoActual) return;
  const productoId = obtenerIdUnico(productoActual);
  const idx = window.favoritos.findIndex(f => f.idUnico === productoId);
  if (idx >= 0) window.favoritos.splice(idx, 1);
  else {
    window.favoritos.push({ idUnico: productoId, nombre: productoActual.nombre || productoActual.nombreOriginal, categoria: productoActual.categoria || productoActual.categoriaOrigen, imagen: productoActual.imagen, tipoCatalogo: productoActual.tipoCatalogo });
  }
  localStorage.setItem('aromalabel_favoritos', JSON.stringify(window.favoritos));
  actualizarUIFavoritos();
  renderizarFavoritos();
}

function actualizarUIFavoritos() {
  const icono = document.getElementById('iconoFavorito');
  const texto = document.getElementById('textoFavorito');
  const btn = document.getElementById('btnFavorito');
  const contador = document.getElementById('contadorFavoritos');
  const esFav = productoActual && window.favoritos.some(f => f.idUnico === obtenerIdUnico(productoActual));
  if (icono) icono.textContent = esFav ? '❤️' : '🤍';
  if (texto) texto.textContent = esFav ? 'En favoritos' : 'Agregar a favoritos';
  if (btn) { btn.style.background = esFav ? '#ffe6e6' : '#fff'; btn.style.borderColor = esFav ? '#ff6b6b' : '#e9ecef'; }
  if (contador) contador.textContent = window.favoritos.length;
}

function renderizarFavoritos() {
  const lista = document.getElementById('listaFavoritos');
  if (!lista) return;
  if (window.favoritos.length === 0) { lista.innerHTML = '<div style="text-align:center;color:#999;padding:10px;">💡 Haz ❤️ en un producto</div>'; return; }
  lista.innerHTML = window.favoritos.map((fav, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #f0f0f0;cursor:pointer;" onclick="cargarDesdeFavorito(${i})"> <span>❤️</span> <div style="flex:1;min-width:0;"> <div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fav.nombre}</div> <div style="font-size:9px;color:#888;">${fav.categoria || ''}</div> </div> <button onclick="event.stopPropagation();eliminarFavorito(${i})" style="padding:2px 6px;background:#dc3545;color:white;border:none;border-radius:3px;cursor:pointer;font-size:9px;">✕</button> </div>`).join('');
}

function cargarDesdeFavorito(index) {
  const fav = window.favoritos[index];
  if (!fav) return;
  const productos = productosData[fav.tipoCatalogo] || [];
  const producto = productos.find(p => obtenerIdUnico(p) === fav.idUnico);
  if (producto) {
    document.getElementById('categoriaProducto').value = fav.tipoCatalogo;
    cargarProductos();
    const idx = productosFiltrados.findIndex(p => obtenerIdUnico(p) === fav.idUnico);
    if (idx >= 0) { document.getElementById('productoSeleccionado').value = idx; aplicarProducto(); }
  }
}

function eliminarFavorito(index) {
  window.favoritos.splice(index, 1);
  localStorage.setItem('aromalabel_favoritos', JSON.stringify(window.favoritos));
  renderizarFavoritos();
  actualizarUIFavoritos();
}

function agregarAlHistorial(producto) {
  if (!producto) return;
  const productoId = obtenerIdUnico(producto);
  window.historial = window.historial.filter(h => h.idUnico !== productoId);
  window.historial.unshift({ idUnico: productoId, nombre: producto.nombre || producto.nombreOriginal, categoria: producto.categoria || producto.categoriaOrigen, tipoCatalogo: producto.tipoCatalogo, fechaUso: new Date().toISOString() });
  if (window.historial.length > 10) window.historial = window.historial.slice(0, 10);
  localStorage.setItem('aromalabel_historial', JSON.stringify(window.historial));
  const contador = document.getElementById('contadorHistorial');
  if (contador) contador.textContent = window.historial.length;
  renderizarHistorial();
}

function renderizarHistorial() {
  const lista = document.getElementById('listaHistorial');
  if (!lista) return;
  if (window.historial.length === 0) { lista.innerHTML = '<div style="text-align:center;color:#999;padding:10px;">🕐 Tus últimos productos aparecerán aquí</div>'; return; }
  lista.innerHTML = window.historial.map((h, i) => `<div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #f0f0f0;cursor:pointer;" onclick="cargarDesdeHistorial(${i})"> <span style="color:#888;">${i + 1}.</span> <div style="flex:1;min-width:0;"> <div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.nombre}</div> <div style="font-size:9px;color:#888;">${h.categoria || ''}</div> </div> </div>`).join('');
}

function cargarDesdeHistorial(index) {
  const h = window.historial[index];
  if (!h) return;
  const productos = productosData[h.tipoCatalogo] || [];
  const producto = productos.find(p => obtenerIdUnico(p) === h.idUnico);
  if (producto) {
    document.getElementById('categoriaProducto').value = h.tipoCatalogo;
    cargarProductos();
    const idx = productosFiltrados.findIndex(p => obtenerIdUnico(p) === h.idUnico);
    if (idx >= 0) { document.getElementById('productoSeleccionado').value = idx; aplicarProducto(); }
  }
}

function limpiarHistorial() {
  if (confirm('¿Limpiar todo el historial?')) {
    window.historial = [];
    localStorage.setItem('aromalabel_historial', JSON.stringify(window.historial));
    renderizarHistorial();
    const contador = document.getElementById('contadorHistorial');
    if (contador) contador.textContent = '0';
  }
}

function mostrarTab(tab) {
  const tabFav = document.getElementById('tabFavoritos');
  const tabHist = document.getElementById('tabHistorial');
  const contFav = document.getElementById('contenidoFavoritos');
  const contHist = document.getElementById('contenidoHistorial');
  if (tab === 'favoritos') {
    tabFav.style.background = '#c9a96e'; tabFav.style.color = 'white';
    tabHist.style.background = '#e9ecef'; tabHist.style.color = '#555';
    contFav.style.display = 'block'; contHist.style.display = 'none';
  } else {
    tabHist.style.background = '#c9a96e'; tabHist.style.color = 'white';
    tabFav.style.background = '#e9ecef'; tabFav.style.color = '#555';
    contHist.style.display = 'block'; contFav.style.display = 'none';
  }
}

// ==========================================
// 🔍 BÚSQUEDA GLOBAL
// ==========================================
function busquedaGlobal() {
  const texto = document.getElementById('buscadorGlobal').value.toLowerCase().trim();
  const contenedor = document.getElementById('resultadosGlobal');
  if (!texto || texto.length < 2) { contenedor.style.display = 'none'; return; }
  const resultados = [];
  ['ESENCIAS', 'LIMPIEZA', 'VELAS'].forEach(cat => {
    (productosData[cat] || []).forEach(p => {
      const n = (p.nombre || '').toLowerCase();
      const no = (p.nombreOriginal || '').toLowerCase();
      const c = (p.categoria || p.categoriaOrigen || '').toLowerCase();
      if (n.includes(texto) || no.includes(texto) || c.includes(texto)) resultados.push({ producto: p, categoria: cat });
    });
  });
  const top = resultados.slice(0, 15);
  if (top.length === 0) { contenedor.innerHTML = '<div style="padding:10px;text-align:center;color:#999;">😕 Sin resultados</div>'; }
  else {
    contenedor.innerHTML = top.map(r => {
      const p = r.producto;
      const icono = r.categoria === 'ESENCIAS' ? '🌸' : r.categoria === 'LIMPIEZA' ? '🧼' : '🕯️';
      const precio = p.precioOferta || p.precio;
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #f0f0f0;cursor:pointer;border-radius:4px;" onmouseover="this.style.background='#e8f4fd'" onmouseout="this.style.background='transparent'" onclick="seleccionarBusquedaGlobal('${r.categoria}','${obtenerIdUnico(p).replace(/'/g, "\\'")}')"> <span style="font-size:16px;">${icono}</span> <div style="flex:1;min-width:0;"> <div style="font-weight:bold;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nombre || p.nombreOriginal}</div> <div style="font-size:10px;color:#888;">${p.categoria || p.categoriaOrigen || ''} · ${formatPrecio(precio)}</div> </div> </div>`;
    }).join('');
  }
  contenedor.style.display = 'block';
}

function seleccionarBusquedaGlobal(categoria, idUnico) {
  document.getElementById('categoriaProducto').value = categoria;
  cargarProductos();
  const idx = productosFiltrados.findIndex(p => obtenerIdUnico(p) === idUnico);
  if (idx >= 0) {
    document.getElementById('productoSeleccionado').value = idx;
    aplicarProducto();
    document.getElementById('buscadorGlobal').value = '';
    document.getElementById('resultadosGlobal').style.display = 'none';
  }
}

// ==========================================
// 🖼️ IMÁGENES
// ==========================================
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    logoDataUrl = e.target.result;
    const preview = document.getElementById('logoPreview');
    if (preview) { preview.src = logoDataUrl; preview.style.display = 'block'; }
    updateLabel();
  };
  reader.readAsDataURL(file);
}

function updateLogoControls() {
    ['logoSize', 'logoRot', 'logoOpa'].forEach(id => {
        const val = document.getElementById(id + 'Val');
        const input = document.getElementById(id);
        if (val && input) val.textContent = input.value;
    });
    
    // También actualizar logoPosX y logoPosY si existen
    const posX = document.getElementById('logoPosX');
    const posY = document.getElementById('logoPosY');
    if (posX && posY) {
        // No hay spans para estos, pero los valores están en los inputs
    }
    
    // IMPORTANTE: Llamar a updateLabel() para aplicar los cambios
    if (typeof updateLabel === 'function') {
        updateLabel();
    }
}

function actualizarImagenFondo() {
  window.estadoImagenFondo = {
    url: document.getElementById('bgImageUrl')?.value || '',
    opacity: (parseInt(document.getElementById('bgImageOpacity')?.value || 30)) / 100,
    fit: document.getElementById('bgImageFit')?.value || 'contain'
  };
  updateLabel();
}

function dibujarImagenFondo(ctx, canvas) {
  const estado = window.estadoImagenFondo;
  if (!estado.url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    ctx.save();
    ctx.globalAlpha = estado.opacity;
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    ctx.restore();
  };
  img.src = estado.url;
}

function toggleImagenProducto() {
  const checkbox = document.getElementById('usarImagenProducto');
  const controles = document.getElementById('controlesImagen');
  window.estadoImagenProducto.activa = checkbox.checked;
  controles.style.display = checkbox.checked ? 'block' : 'none';
  if (checkbox.checked && !window.estadoImagenProducto.url && productoActual?.imagen) {
    window.estadoImagenProducto.url = normalizarURL(productoActual.imagen);
  } else if (!checkbox.checked) {
    window.estadoImagenProducto.url = '';
    const imgVieja = document.getElementById('previewProductImg');
    if (imgVieja) imgVieja.remove();
  }
  actualizarImagen();
}

function actualizarImagen() {
  window.estadoImagenProducto.tamano = parseInt(document.getElementById('tamanoImagen').value);
  window.estadoImagenProducto.posX = parseInt(document.getElementById('posXImagen').value);
  window.estadoImagenProducto.posY = parseInt(document.getElementById('posYImagen').value);
  window.estadoImagenProducto.rotacion = parseInt(document.getElementById('rotacionImagen').value);
  document.getElementById('tamanoImagenValor').textContent = window.estadoImagenProducto.tamano;
  document.getElementById('posXImagenValor').textContent = window.estadoImagenProducto.posX;
  document.getElementById('posYImagenValor').textContent = window.estadoImagenProducto.posY;
  document.getElementById('rotacionImagenValor').textContent = window.estadoImagenProducto.rotacion;
  updateLabel();
}

function resetearImagen() {
  document.getElementById('tamanoImagen').value = 30;
  document.getElementById('posXImagen').value = 50;
  document.getElementById('posYImagen').value = 30;
  document.getElementById('rotacionImagen').value = 0;
  actualizarImagen();
}

function centrarImagen() {
  document.getElementById('posXImagen').value = 50;
  document.getElementById('posYImagen').value = 50;
  actualizarImagen();
}

async function agregarImagenProducto() {
  if (!productoActual?.imagen) { alert('⚠️ Primero selecciona un producto con imagen'); return; }
  const url = normalizarURL(productoActual.imagen);
  window.estadoImagenProducto.url = url;
  window.estadoImagenProducto.activa = true;
  document.getElementById('usarImagenProducto').checked = true;
  document.getElementById('controlesImagen').style.display = 'block';
  actualizarImagen();
}

function dibujarImagenProducto(ctx, canvas) {
  if (!window.estadoImagenProducto.activa || !window.estadoImagenProducto.url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    const state = window.estadoImagenProducto;
    const tamano = Math.min(canvas.width, canvas.height) * (state.tamano / 100);
    const x = canvas.width * state.posX / 100;
    const y = canvas.height * state.posY / 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(state.rotacion * Math.PI / 180);
    ctx.drawImage(img, -tamano / 2, -tamano / 2, tamano, tamano);
    ctx.restore();
  };
  img.src = window.estadoImagenProducto.url;
}

// ==========================================
//  QR
// ==========================================
function toggleQRProducto() {
  const checked = document.getElementById('usarQRProducto').checked;
  const opcionesQR = document.getElementById('opcionesQR');
  const elQrUrl = document.getElementById('qrUrl');
  if (!checked) { opcionesQR.style.display = 'none'; if (elQrUrl) elQrUrl.value = ''; updateLabel(); return; }
  if (!productoActual) { alert('⚠️ Primero selecciona un producto'); document.getElementById('usarQRProducto').checked = false; return; }
  opcionesQR.style.display = 'block';
  actualizarQR();
}

function actualizarQR() {
  if (!productoActual) return;
  const tipoQR = document.querySelector('input[name="tipoQR"]:checked')?.value || 'facebook';
  const elQrUrl = document.getElementById('qrUrl');
  let contenido = '';
  switch(tipoQR) {
    case 'facebook': contenido = 'https://www.facebook.com/profile.php?id=61579078480913'; break;
    case 'producto': contenido = `https://wil1979.github.io/esentia-factura/producto.html?id=${productoActual.id}`; break;
    case 'json':
      const variante = productoActual.variantes ? productoActual.variantes[document.getElementById('varianteSeleccionada')?.value || 0] : null;
      contenido = JSON.stringify({ id: productoActual.id, nombre: productoActual.nombre || productoActual.nombreOriginal, precio: variante ? variante.precio : (productoActual.precioOferta || productoActual.precio) });
      break;
  }
  if (elQrUrl) elQrUrl.value = contenido;
  updateLabel();
}

// ==========================================
// ⌨️ ATAJOS DE TECLADO
// ==========================================
document.addEventListener('keydown', function(e) {
  const tag = e.target.tagName.toLowerCase();
  const esInput = tag === 'input' || tag === 'textarea' || tag === 'select';
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (typeof saveProject === 'function') saveProject(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); toggleFavorito(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !esInput) { e.preventDefault(); cambiarTab('producto'); setTimeout(() => document.getElementById('buscadorGlobal')?.focus(), 100); }
  
    
    // Ctrl/Cmd + S: Guardar proyecto
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && !esInput) {
        e.preventDefault();
        saveProject();
    }
    
    // Ctrl/Cmd + D: Duplicar etiqueta
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !esInput) {
        e.preventDefault();
        duplicateLabel();
    }
    
    // Ctrl/Cmd + P: Imprimir
    if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !esInput) {
        e.preventDefault();
        window.print();
    }
    
    // Ctrl/Cmd + N: Nuevo proyecto
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !esInput) {
        e.preventDefault();
        newProject();
    }
    
    // Ctrl/Cmd + Z: Deshacer (si implementas historial)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !esInput) {
        e.preventDefault();
        undo();
    }
    
    // F5: Actualizar vista previa
    if (e.key === 'F5' && !esInput) {
        e.preventDefault();
        updateLabel();
    }
    
    // Escape: Cerrar modales
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // Flechas: Ajustar posición de imagen (si está seleccionada)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !esInput) {
        e.preventDefault();
        adjustImagePosition(e.key, e.shiftKey ? 10 : 1);
    }

});

// ==========================================
// 💾 PROYECTOS
// ==========================================
function getCurrentConfig() {
  return {
    width: document.getElementById('labelWidth').value,
    height: document.getElementById('labelHeight').value,
    padding: document.getElementById('labelPadding').value,
    borderRadius: document.getElementById('borderRadius').value,
    topLine: document.getElementById('topLine').value,
    bottomLine: document.getElementById('bottomLine').value,
    areaGap: document.getElementById('areaGap').value,
    fontBrand: document.getElementById('fontBrand').value,
    fontBrandSub: document.getElementById('fontBrandSub').value,
    fontProduct: document.getElementById('fontProduct').value,
    fontType: document.getElementById('fontType').value,
    fontDetails: document.getElementById('fontDetails').value,
    fontInstr: document.getElementById('fontInstr').value,
    fontBatch: document.getElementById('fontBatch').value,
    fontOrigin: document.getElementById('fontOrigin').value,
    qrSize: document.getElementById('qrSize').value,
    brandFont: document.getElementById('brandFont').value,
    productFont: document.getElementById('productFont').value,
    accentColor: document.getElementById('accentColor').value,
    textColor: document.getElementById('textColor').value,
    bgColor: document.getElementById('bgColor').value,
    qrColor: document.getElementById('qrColor').value,
    qrBgColor: document.getElementById('qrBgColor').value,
    showDivider: document.getElementById('showDivider').checked,
    showQR: document.getElementById('showQR').checked,
    showInstructions: document.getElementById('showInstructions').checked,
    showFooter: document.getElementById('showFooter').checked,
    vinylMode: document.getElementById('vinylMode') ? document.getElementById('vinylMode').checked : false,
    images: getImagesConfig(),
    imagenProducto: window.estadoImagenProducto ? { ...window.estadoImagenProducto } : null
  };
}
function getCurrentContent() {
  const getVal = (id, fallback = '') => { const el = document.getElementById(id); return el ? (el.value !== undefined ? el.value : fallback) : fallback; };
  return {
    projectName: getVal('projectName', 'Mi Etiqueta'), brandName: getVal('brandName', 'Marca'), brandSub: getVal('brandSub', ''),
    productName: getVal('productName', 'Producto'), productType: getVal('productType', ''), productDetails: getVal('productDetails', ''), productPrice: getVal('productPrice', ''),
    showPrice: document.getElementById('showPrice')?.checked || false, instructions: getVal('instructions', ''), qrUrl: getVal('qrUrl', ''), batchInfo: getVal('batchInfo', ''), originInfo: getVal('originInfo', '')
  };
}

function getImagesConfig() { return imagesList.map(img => ({ ...img })); }

function showToast(message, type = 'info') {
  const colores = { success: '#4caf50', danger: '#e74c3c', info: '#2196f3', warning: '#ff9800' };
  let container = document.querySelector('.toast-container');
  if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colores[type] || colores.info;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function saveProject() {
  try {
    const nombreProducto = productoActual && (productoActual.nombre || productoActual.nombreOriginal);
    const projectNameInput = document.getElementById('projectName');
    const projectName = nombreProducto || projectNameInput?.value || 'Sin nombre';
    if (projectNameInput && nombreProducto) projectNameInput.value = projectName;
    const project = { id: Date.now(), name: projectName, date: new Date().toLocaleDateString('es-ES'), config: getCurrentConfig(), content: getCurrentContent(), logoDataUrl: logoDataUrl, images: getImagesConfig(), lastModified: new Date().toISOString() };
    const existingIdx = projects.findIndex(p => p.name === project.name);
    if (existingIdx >= 0) { project.id = projects[existingIdx].id; projects[existingIdx] = project; showToast('✅ Proyecto actualizado', 'success'); }
    else { projects.push(project); showToast('💾 Proyecto guardado', 'success'); }
    localStorage.setItem('aromaProjects', JSON.stringify(projects));
    loadAllProjects();
  } catch (e) { showToast('❌ Error al guardar: ' + e.message, 'danger'); console.error(e); }
}

// Función para generar thumbnail de proyecto
async function generateProjectThumbnail(project) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const widthMm = parseInt(project.config.labelWidth) || 60;
    const heightMm = parseInt(project.config.labelHeight) || 80;
    
    // Escala: 4px por mm
    canvas.width = widthMm * 4;
    canvas.height = heightMm * 4;
    
    // Fondo
    ctx.fillStyle = project.config.vinylMode ? 'transparent' : (project.config.bgColor || '#ffffff');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texto simplificado
    ctx.fillStyle = project.config.textColor || '#1a1a1a';
    ctx.textAlign = 'center';
    
    // Marca
    if (project.content.brandName) {
        ctx.font = `bold ${Math.min(canvas.width, canvas.height) * 0.15}px Playfair Display`;
        ctx.fillText(project.content.brandName, canvas.width / 2, canvas.height * 0.2);
    }
    
    // Producto
    if (project.content.productName) {
        ctx.font = `bold ${Math.min(canvas.width, canvas.height) * 0.12}px Playfair Display`;
        ctx.fillText(project.content.productName, canvas.width / 2, canvas.height * 0.5);
    }
    
    return canvas.toDataURL('image/png');
}

// Modificar loadAllProjects()
async function loadAllProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    if (projects.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><h3>No hay proyectos guardados</h3><p>Crea tu primera etiqueta en el Diseñador y guárdala aquí.</p></div>';
        return;
    }
    
    // Generar thumbnails para todos los proyectos
    for (const project of projects) {
        if (!project.thumbnail) {
            try {
                project.thumbnail = await generateProjectThumbnail(project);
            } catch (e) {
                console.error('Error generando thumbnail:', e);
                project.thumbnail = null;
            }
        }
    }
    
    // Guardar thumbnails en localStorage
    localStorage.setItem('aromaProjects', JSON.stringify(projects));
    
    // Renderizar
    grid.innerHTML = projects.map(p => `
        <div class="project-card" onclick="loadProject(${p.id})">
            <div class="project-preview">
                ${p.thumbnail ? 
                    `<img src="${p.thumbnail}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain;">` : 
                    '<div style="font-size:3rem;">🏷️</div>'
                }
            </div>
            <div class="project-name">${p.name}</div>
            <div class="project-meta">📅 ${p.date}</div>
            <div class="project-actions">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();loadProject(${p.id})">📂 Cargar</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteProject(${p.id})">️</button>
            </div>
        </div>
    `).join('');
}

function loadProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) { showToast('❌ Proyecto no encontrado', 'danger'); return; }
  try {
    if (project.config) {
      Object.keys(project.config).forEach(key => {
        const el = document.getElementById(key);
        if (el) { if (el.type === 'checkbox') el.checked = project.config[key]; else el.value = project.config[key]; }
      });
      if (project.config.estadoImagenProducto) window.estadoImagenProducto = { ...project.config.estadoImagenProducto };
      if (project.config.estadoImagenFondo) window.estadoImagenFondo = { ...project.config.estadoImagenFondo };
    }
    if (project.content) {
      Object.keys(project.content).forEach(key => {
        if (key === 'showPrice') { const el = document.getElementById('showPrice'); if (el) el.checked = project.content[key]; }
        else { const el = document.getElementById(key); if (el) el.value = project.content[key]; }
      });
    }
    if (project.logoDataUrl) { logoDataUrl = project.logoDataUrl; const preview = document.getElementById('logoPreview'); if (preview) { preview.src = logoDataUrl; preview.style.display = 'block'; } }
    if (project.images && Array.isArray(project.images)) { imagesList = project.images.map(img => ({ ...img })); renderImagesList(); }
    sincronizarValoresSliders();
    updateLabel();
    if (typeof showSection === 'function') showSection('designer');
    showToast(`✅ Proyecto "${project.name}" cargado`, 'success');
  } catch (e) { showToast('❌ Error al cargar: ' + e.message, 'danger'); console.error(e); }
}

function deleteProject(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  projects = projects.filter(p => p.id !== id);
  localStorage.setItem('aromaProjects', JSON.stringify(projects));
  loadAllProjects();
  showToast('🗑️ Proyecto eliminado', 'info');
}

function addToPrintQueue() {
  const labelPreview = document.getElementById('labelPreview');
  if (!labelPreview) { showToast('❌ No se encontró la vista previa', 'danger'); return; }
  try {
    const labelClone = labelPreview.cloneNode(true);
    const nombreProducto = productoActual && (productoActual.nombre || productoActual.nombreOriginal);
    const item = { id: Date.now(), name: nombreProducto || document.getElementById('projectName')?.value || 'Sin nombre', config: getCurrentConfig(), content: getCurrentContent(), logoDataUrl: logoDataUrl, html: labelClone.outerHTML, qty: 1 };
    printQueue.push(item);
    updatePrintQueueDisplay();
    updateSheetPreview();
    showToast('➕ Etiqueta añadida a la cola', 'success');
  } catch (e) { showToast('❌ Error: ' + e.message, 'danger'); console.error(e); }
}

function updatePrintQueueDisplay() {
  const queueEl = document.getElementById('printQueueList');
  if (!queueEl) return;
  queueEl.innerHTML = '';
  if (printQueue.length === 0) {
    queueEl.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">No hay etiquetas en la cola.</div>';
    return;
  }

  printQueue.forEach((item, i) => {
    const card = document.createElement('article');
    card.className = 'batch-item queue-design-item';
    const preview = document.createElement('div');
    preview.className = 'queue-design-preview';
    preview.setAttribute('aria-label', `Vista previa del diseño ${i + 1}`);
    preview.innerHTML = item.html || '';
    const label = preview.querySelector('.label');
    if (label) {
      const widthMm = parseFloat(item.config?.width) || 60;
      const heightMm = parseFloat(item.config?.height) || 80;
      const scale = Math.min(1, 150 / (widthMm * 3.7795), 165 / (heightMm * 3.7795));
      label.style.width = `${widthMm}mm`;
      label.style.height = `${heightMm}mm`;
      label.style.transform = `scale(${scale})`;
      label.style.transformOrigin = 'top left';
      label.style.boxShadow = '0 1px 5px rgba(0,0,0,.18)';
      label.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      label.removeAttribute('id');
      preview.style.width = `${widthMm * 3.7795 * scale}px`;
      preview.style.height = `${heightMm * 3.7795 * scale}px`;
    } else {
      preview.textContent = 'Vista previa no disponible';
    }

    const controls = document.createElement('div');
    controls.className = 'queue-design-controls';
    const title = document.createElement('div');
    title.className = 'queue-design-title';
    title.textContent = `${i + 1}. ${item.name || item.content?.productName || 'Diseño sin nombre'}`;
    const qtyLabel = document.createElement('label');
    qtyLabel.className = 'queue-qty-label';
    qtyLabel.textContent = 'Cantidad';
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.className = 'qty-input';
    qty.min = '1';
    qty.step = '1';
    qty.value = Math.max(1, parseInt(item.qty, 10) || 1);
    qty.setAttribute('aria-label', `Cantidad para ${item.name || 'este diseño'}`);
    qty.addEventListener('change', () => {
      item.qty = Math.max(1, parseInt(qty.value, 10) || 1);
      qty.value = item.qty;
      updateSheetPreview();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger btn-sm';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', () => {
      printQueue.splice(i, 1);
      updatePrintQueueDisplay();
      updateSheetPreview();
    });
    controls.append(title, qtyLabel, qty, remove);
    card.append(preview, controls);
    queueEl.appendChild(card);
  });
}

function updateSheetPreview() {
  const total = printQueue.reduce((sum, item) => sum + item.qty, 0);
  const statsEl = document.getElementById('printStats');
  if (statsEl) statsEl.innerHTML = `<div class="stat"><div class="stat-value">${total}</div><div class="stat-label">Etiquetas</div></div><div class="stat"><div class="stat-value">${printQueue.length}</div><div class="stat-label">Diseños</div></div>`;
}

async function renderLabelForPrint(item) {
  const container = document.createElement('div'); container.style.cssText = 'position:absolute;left:-9999px;top:0;';
  container.innerHTML = item.html; document.body.appendChild(container);
  const label = container.querySelector('.label');
  const c = item.config;
  label.style.setProperty('--label-width', c.width + 'mm'); label.style.setProperty('--label-height', c.height + 'mm');
  label.style.setProperty('--label-padding', c.padding + 'mm'); label.style.setProperty('--border-radius', c.borderRadius + 'px');
  label.style.setProperty('--top-line', c.topLine + 'px'); label.style.setProperty('--bottom-line', (c.bottomLine || 0) + 'px');
  label.style.setProperty('--area-gap', c.areaGap + 'px'); label.style.setProperty('--accent-color', c.accentColor);
  label.style.setProperty('--text-color', c.textColor); label.style.setProperty('--qr-size', c.qrSize + '%');
  label.style.setProperty('--qr-bg', c.qrBgColor); label.style.setProperty('--brand-font', c.brandFont || "'Adelia', cursive");
  label.style.setProperty('--product-font', c.productFont || "'Playfair Display', serif");
  // Modo vinil: fondo transparente para impresión
  if (c.vinylMode) {
    label.style.backgroundColor = 'transparent';
    label.classList.add('vinyl-mode');
  } else {
    label.style.backgroundColor = c.bgColor;
    label.classList.remove('vinyl-mode');
  }
  label.style.borderRadius = c.borderRadius + 'px'; label.style.boxShadow = 'none';

  const content = item.content;
  const brandEl = label.querySelector('.label-logo'); const brandSubEl = label.querySelector('.label-logo-sub');
  const productEl = label.querySelector('.label-name'); const typeEl = label.querySelector('.label-type');
  const detailsEl = label.querySelector('.label-details'); const instrEl = label.querySelector('.label-instructions');
  const batchEl = label.querySelector('.label-batch'); const originEl = label.querySelector('#previewOrigin');
  if (brandEl) { brandEl.textContent = content.brandName || ''; brandEl.style.fontSize = c.fontBrand + 'px'; brandEl.style.fontFamily = c.brandFont; brandEl.style.color = c.textColor; if (c.vinylMode) brandEl.style.textShadow = '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7), 0 0 1px rgba(0,0,0,0.3)'; else brandEl.style.textShadow = 'none'; }
  if (brandSubEl) { brandSubEl.textContent = content.brandSub || ''; brandSubEl.style.fontSize = c.fontBrandSub + 'px'; if (c.vinylMode) brandSubEl.style.textShadow = '0 0 2px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.2)'; else brandSubEl.style.textShadow = 'none'; }
  if (productEl) { productEl.textContent = content.productName || ''; productEl.style.fontSize = c.fontProduct + 'px'; productEl.style.fontFamily = c.productFont; productEl.style.color = c.textColor; if (c.vinylMode) productEl.style.textShadow = '0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.8), 0 0 1px rgba(0,0,0,0.4)'; else productEl.style.textShadow = 'none'; }
  if (typeEl) { typeEl.textContent = content.productType || ''; typeEl.style.fontSize = c.fontType + 'px'; typeEl.style.color = c.accentColor; if (c.vinylMode) typeEl.style.textShadow = '0 0 3px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.3)'; else typeEl.style.textShadow = 'none'; }
  if (detailsEl) { detailsEl.textContent = content.productDetails || ''; detailsEl.style.fontSize = c.fontDetails + 'px'; if (c.vinylMode) detailsEl.style.textShadow = '0 0 2px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.2)'; else detailsEl.style.textShadow = 'none'; }
  if (instrEl) { instrEl.textContent = content.instructions || ''; instrEl.style.fontSize = c.fontInstr + 'px'; instrEl.style.display = c.showInstructions ? 'block' : 'none'; if (c.vinylMode) instrEl.style.textShadow = '0 0 2px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.2)'; else instrEl.style.textShadow = 'none'; }
  if (batchEl) { batchEl.textContent = content.batchInfo || ''; batchEl.style.fontSize = c.fontBatch + 'px'; batchEl.style.color = c.textColor; if (c.vinylMode) batchEl.style.textShadow = '0 0 2px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.2)'; else batchEl.style.textShadow = 'none'; }
  if (originEl) { originEl.textContent = content.originInfo || ''; originEl.style.fontSize = c.fontOrigin + 'px'; if (c.vinylMode) originEl.style.textShadow = '0 0 2px rgba(255,255,255,0.9), 0 0 1px rgba(0,0,0,0.2)'; else originEl.style.textShadow = 'none'; }

  const topLineEl = label.querySelector('.label-top-line');
  if (topLineEl) { topLineEl.style.height = c.topLine + 'px'; topLineEl.style.backgroundColor = c.accentColor; topLineEl.style.display = c.topLine > 0 ? 'block' : 'none'; }
  const bottomLineEl = label.querySelector('.label-bottom-line');
  if (bottomLineEl) { bottomLineEl.style.height = (c.bottomLine || 0) + 'px'; bottomLineEl.style.backgroundColor = c.accentColor; bottomLineEl.style.display = (c.bottomLine || 0) > 0 ? 'block' : 'none'; }
  const dividerEl = label.querySelector('.label-divider'); if (dividerEl) dividerEl.style.display = c.showDivider ? 'block' : 'none';
  const footerEl = label.querySelector('.label-footer'); if (footerEl) footerEl.style.display = c.showFooter !== false ? 'flex' : 'none';

  const qrEl = label.querySelector('.label-qr');
  if (qrEl && c.showQR) {
    qrEl.style.display = 'flex';
    qrEl.style.width = c.qrSize + '%';
    qrEl.style.height = 'auto';
    qrEl.style.aspectRatio = '1 / 1';
    // Fondo blanco opaco + quiet zone para vinil transparente
    qrEl.style.backgroundColor = '#ffffff';
    qrEl.style.padding = '3px';
    qrEl.style.boxSizing = 'border-box';
    try {
      const qr = qrcode(0, 'H'); // máxima corrección de errores (30%)
      qr.addData(content.qrUrl || 'https://example.com');
      qr.make();
      const moduleCount = qr.getModuleCount();
      // Generar QR como tabla HTML para máxima compatibilidad
      let qrHtml = '<table style="border-collapse:collapse;width:100%;height:100%;table-layout:fixed;">';
      for (let row = 0; row < moduleCount; row++) {
        qrHtml += '<tr style="height:' + (100 / moduleCount) + '%;">';
        for (let col = 0; col < moduleCount; col++) {
          const isDark = qr.isDark(row, col);
          qrHtml += '<td style="width:' + (100 / moduleCount) + '%;background:' + (isDark ? '#000000' : '#ffffff') + ';padding:0;margin:0;border:none;min-width:1px;min-height:1px;">&nbsp;</td>';
        }
        qrHtml += '</tr>';
      }
      qrHtml += '</table>';
      qrEl.innerHTML = qrHtml;
    } catch (e) { 
      console.error('QR render error:', e);
      qrEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.5rem;color:#999;text-align:center;padding:2px;">QR<br>Error</div>'; 
    }
  } else if (qrEl) { qrEl.style.display = 'none'; }

  const logoImg = label.querySelector('.label-logo-img');
  if (logoImg) {
    if (item.logoDataUrl) {
      logoImg.src = item.logoDataUrl; logoImg.style.display = 'block';
      if (brandEl) brandEl.style.display = 'none'; if (brandSubEl) brandSubEl.style.display = 'none';
      logoImg.style.maxHeight = (parseInt(c.height) * 0.15) + 'mm';
    } else { logoImg.style.display = 'none'; if (brandEl) brandEl.style.display = 'block'; if (brandSubEl) brandSubEl.style.display = 'block'; }
  }

  const logoArea = label.querySelector('.label-logo-area'); const productArea = label.querySelector('.label-product');
  if (logoArea) logoArea.style.padding = (parseInt(c.areaGap) * 0.5) + 'px 0';
  if (productArea) productArea.style.padding = (parseInt(c.areaGap) * 0.5) + 'px 0';
  if (instrEl) instrEl.style.padding = (parseInt(c.areaGap) * 0.5) + 'px 0';
  if (footerEl) footerEl.style.paddingTop = c.areaGap + 'px';

  if (item.logoDataUrl && logoImg) { await new Promise(resolve => { if (logoImg.complete) resolve(); else { logoImg.onload = resolve; logoImg.onerror = resolve; } }); }
  const canvas = await html2canvas(label, { scale: 4, backgroundColor: c.vinylMode ? null : c.bgColor, useCORS: true, logging: false });
  document.body.removeChild(container);
  return canvas;
}

function printLabels() {
    if (printQueue.length === 0) {
        showToast('️ No hay etiquetas en la cola', 'warning');
        return;
    }

    // ✅ OBTENER DIMENSIONES DE LA PRIMERA ETIQUETA
    const firstItem = printQueue[0];
    const widthMm = parseInt(firstItem.config.width) || 60;
    const heightMm = parseInt(firstItem.config.height) || 80;

    // Crear contenedor temporal para impresión
    const printContainer = document.createElement('div');
    printContainer.className = 'print-area';
    printContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 9999;
        padding: 20px;
        box-sizing: border-box;
        overflow: auto;
        display: flex;
        flex-wrap: wrap;
        align-content: flex-start;
        gap: 10px;
    `;

    // Agregar todas las etiquetas
    printQueue.forEach(item => {
        const qty = item.qty || 1;
        for (let i = 0; i < qty; i++) {
            const labelDiv = document.createElement('div');
            labelDiv.innerHTML = item.html;
            labelDiv.style.cssText = `
                page-break-inside: avoid;
                break-inside: avoid;
                margin: 5px;
                width: ${widthMm}mm;
                height: ${heightMm}mm;
            `;
            printContainer.appendChild(labelDiv);
        }
    });

    document.body.appendChild(printContainer);
    
    // Imprimir
    setTimeout(() => {
        window.print();
        // Limpiar después de imprimir
        setTimeout(() => {
            document.body.removeChild(printContainer);
        }, 1000);
    }, 500);
}

async function exportSinglePDF() {
    showToast('📄 Generando PDF...', 'info');
    try {
        if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
            showToast('⚠️ Librería jsPDF no cargada', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const widthMm = parseInt(document.getElementById('labelWidth').value);
        const heightMm = parseInt(document.getElementById('labelHeight').value);
        
        // Crear PDF con tamaño de etiqueta
        const pdf = new jsPDF({
            orientation: heightMm > widthMm ? 'portrait' : 'landscape',
            unit: 'mm',
            format: [widthMm, heightMm]
        });

        // Generar canvas de la etiqueta actual
        const fakeItem = {
            config: getCurrentConfig(),
            content: getCurrentContent(),
            logoDataUrl: logoDataUrl,
            html: document.getElementById('labelPreview').outerHTML
        };
        
        const canvas = await renderLabelForPrint(fakeItem);
        const imgData = canvas.toDataURL('image/png');
        
        pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
        pdf.save('etiqueta_' + (document.getElementById('productName')?.value || 'etiqueta') + '.pdf');
        showToast('✅ PDF exportado', 'success');
    } catch (e) {
        showToast('❌ Error: ' + e.message, 'danger');
        console.error(e);
    }
}

async function exportQueuePDF() {
    if (printQueue.length === 0) {
        showToast('️ No hay etiquetas en la cola', 'warning');
        return;
    }

    showToast('📄 Generando PDF con ' + printQueue.length + ' diseños...', 'info');
    
    try {
        if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
            showToast('⚠️ Librería jsPDF no cargada', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        
        // ✅ OBTENER DIMENSIONES DE LA PRIMERA ETIQUETA EN COLA
        const firstItem = printQueue[0];
        const widthMm = parseInt(firstItem.config.width) || 60;
        const heightMm = parseInt(firstItem.config.height) || 80;
        
        // Crear PDF en tamaño carta o A4
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular cuántas etiquetas caben por página
        const cols = Math.floor((pageWidth - 20) / (widthMm + 5));
        const rows = Math.floor((pageHeight - 20) / (heightMm + 5));
        const labelsPerPage = cols * rows;

        let labelIndex = 0;
        let isFirstPage = true;

        for (let item of printQueue) {
            const qty = item.qty || 1;
            
            for (let i = 0; i < qty; i++) {
                // Calcular posición en la página
                const pageIndex = Math.floor(labelIndex / labelsPerPage);
                const posInPage = labelIndex % labelsPerPage;
                const col = posInPage % cols;
                const row = Math.floor(posInPage / cols);
                
                // Agregar nueva página si es necesario
                if (posInPage === 0 && !isFirstPage) {
                    pdf.addPage();
                }
                isFirstPage = false;

                // Generar canvas de la etiqueta
                const canvas = await renderLabelForPrint(item);
                const imgData = canvas.toDataURL('image/png');
                
                // Calcular posición
                const x = 10 + col * (widthMm + 5);
                const y = 10 + row * (heightMm + 5);
                
                pdf.addImage(imgData, 'PNG', x, y, widthMm, heightMm);
                labelIndex++;
            }
        }

        pdf.save('etiquetas_impression_' + new Date().getTime() + '.pdf');
        showToast('✅ PDF con ' + labelIndex + ' etiquetas exportado', 'success');
    } catch (e) {
        showToast('❌ Error: ' + e.message, 'danger');
        console.error(e);
    }
}
async function exportPNG() {
  showToast('️ Generando PNG...', 'info');
  try {
    const fakeItem = { config: getCurrentConfig(), content: getCurrentContent(), logoDataUrl: logoDataUrl, html: document.getElementById('labelPreview').outerHTML };
    const canvas = await renderLabelForPrint(fakeItem);
    const link = document.createElement('a');
    link.download = 'etiqueta_' + (document.getElementById('productName')?.value || 'etiqueta') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('✅ PNG exportado', 'success');
  } catch (e) { showToast('❌ Error: ' + e.message, 'danger'); console.error(e); }
}

async function exportCatalogPNGs(button) {
  const category = document.getElementById('categoriaProducto')?.value;
  const products = category ? (productosData[category] || []) : [];
  const status = document.getElementById('estadoExportacionCatalogo');
  if (!category) { showToast('Selecciona primero la categoría/catálogo JSON.', 'warning'); return; }
  if (!products.length) { showToast('No hay productos cargados en esta categoría. Espera a que cargue el catálogo.', 'warning'); return; }
  if (typeof JSZip === 'undefined') { showToast('No se pudo cargar el generador ZIP. Revisa tu conexión e inténtalo de nuevo.', 'danger'); return; }

  const idsToSave = ['brandName', 'brandSub', 'productName', 'productType', 'productDetails', 'productPrice', 'showPrice', 'instructions', 'qrUrl', 'projectName', 'batchInfo', 'originInfo'];
  const savedFields = {};
  idsToSave.forEach(id => {
    const el = document.getElementById(id);
    if (el) savedFields[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  const variantSelect = document.getElementById('varianteSeleccionada');
  const savedVariant = variantSelect?.value;
  const savedProduct = productoActual;
  const savedImageState = window.estadoImagenProducto ? { ...window.estadoImagenProducto } : null;
  const useProductImage = document.getElementById('usarImagenProducto')?.checked || false;
  const useProductQR = document.getElementById('usarQRProducto')?.checked || false;
  const originalImageToggle = document.getElementById('usarImagenProducto')?.checked;
  const originalQrToggle = document.getElementById('usarQRProducto')?.checked;
  const zip = new JSZip();
  const exportFolder = zip.folder(String(category).toLowerCase());
  const failures = [];
  let generated = 0;

  if (button) button.disabled = true;
  if (status) status.textContent = `Preparando ${products.length} productos…`;
  showToast(`Generando ${products.length} PNG del catálogo ${category}…`, 'info');

  try {
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const name = product.nombre || product.nombreOriginal || `producto_${i + 1}`;
      try {
        productoActual = product;
        const nameEl = document.getElementById('productName');
        const projectEl = document.getElementById('projectName');
        const typeEl = document.getElementById('productType');
        const detailsEl = document.getElementById('productDetails');
        const priceEl = document.getElementById('productPrice');
        const instructionsEl = document.getElementById('instructions');
        if (nameEl) nameEl.value = name;
        if (projectEl) projectEl.value = name;
        if (typeEl) typeEl.value = product.categoria || product.categoriaOrigen || product.tipo || savedFields.productType || '';
        if (instructionsEl) instructionsEl.value = product.info || product.descripcion || product.beneficios || savedFields.instructions || '';

        const variant = Array.isArray(product.variantes) && product.variantes.length ? product.variantes[0] : null;
        if (variantSelect) variantSelect.value = variant ? '0' : '';
        const detailParts = [];
        if (product.duracion) detailParts.push(product.duracion);
        if (variant?.nombre) detailParts.push(variant.nombre);
        if (detailsEl) detailsEl.value = detailParts.join(' · ');
        const productPrice = variant ? variant.precio : (product.precioOferta || product.precio);
        if (priceEl) priceEl.value = productPrice ? formatPrecio(productPrice) : '';

        if (useProductImage && product.imagen && savedImageState) {
          window.estadoImagenProducto = { ...savedImageState, activa: true, url: normalizarURL(product.imagen) };
        } else if (savedImageState) {
          window.estadoImagenProducto = useProductImage
            ? { ...savedImageState, activa: false, url: '' }
            : { ...savedImageState };
        }
        const qrType = document.querySelector('input[name="tipoQR"]:checked')?.value;
        if (useProductQR && (qrType === 'producto' || qrType === 'json')) actualizarQR();
        else updateLabel();

        // Esperar un momento para que la vista previa y las imágenes del producto se actualicen.
        await new Promise(resolve => setTimeout(resolve, 80));
        const currentLabel = document.getElementById('labelPreview');
        const item = {
          config: getCurrentConfig(),
          content: getCurrentContent(),
          logoDataUrl: logoDataUrl,
          html: currentLabel.outerHTML
        };
        const canvas = await renderLabelForPrint(item);
        const pngBlob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo crear el PNG')), 'image/png');
        });
        const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'producto';
        const productId = slug(product.id ?? 'sin_id');
        const indexPart = String(i + 1).padStart(4, '0');
        exportFolder.file(`${indexPart}_${productId}_${slug(name)}.png`, pngBlob);
        generated++;
      } catch (e) {
        failures.push(`${name}: ${e.message}`);
        console.error(`Error exportando PNG del producto ${name}:`, e);
      }
      if (status) status.textContent = `Generando PNG: ${i + 1} de ${products.length}`;
      if (i % 5 === 4) await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (!generated) throw new Error('No se pudo generar ningún PNG. Comprueba las imágenes y el diseño.');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etiquetas_${String(category).toLowerCase()}_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    const summary = failures.length ? `Se exportaron ${generated}; ${failures.length} con error.` : `ZIP creado con ${generated} PNG.`;
    if (status) status.textContent = summary;
    showToast(`✅ ${summary}`, failures.length ? 'warning' : 'success');
  } catch (e) {
    if (status) status.textContent = `Error: ${e.message}`;
    showToast(`❌ ${e.message}`, 'danger');
    console.error('Error en exportación de catálogo:', e);
  } finally {
    idsToSave.forEach(id => {
      const el = document.getElementById(id);
      if (el && Object.prototype.hasOwnProperty.call(savedFields, id)) {
        if (el.type === 'checkbox') el.checked = savedFields[id];
        else el.value = savedFields[id];
      }
    });
    if (variantSelect && savedVariant != null) variantSelect.value = savedVariant;
    if (originalImageToggle != null) document.getElementById('usarImagenProducto').checked = originalImageToggle;
    if (originalQrToggle != null) document.getElementById('usarQRProducto').checked = originalQrToggle;
    productoActual = savedProduct;
    if (savedImageState) window.estadoImagenProducto = { ...savedImageState };
    updateLabel();
    if (button) button.disabled = false;
  }
}

function exportProject() {
  try {
    const project = { name: document.getElementById('projectName')?.value || 'Sin nombre', date: new Date().toLocaleDateString('es-ES'), config: getCurrentConfig(), content: getCurrentContent(), logoDataUrl: logoDataUrl, images: getImagesConfig() };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = project.name.replace(/[^a-z0-9]/gi, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Proyecto exportado', 'success');
  } catch (e) { showToast('❌ Error: ' + e.message, 'danger'); }
}

function importProject(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const project = JSON.parse(e.target.result);
      project.id = Date.now();
      project.date = project.date || new Date().toLocaleDateString('es-ES');
      const existingIdx = projects.findIndex(p => p.name === project.name);
      if (existingIdx >= 0) projects[existingIdx] = project; else projects.push(project);
      localStorage.setItem('aromaProjects', JSON.stringify(projects));
      loadProject(project.id);
      showToast('📥 Proyecto importado: ' + project.name, 'success');
    } catch (err) { showToast('❌ Archivo inválido', 'danger'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ==========================================
// 🖼️ GESTIÓN DE IMÁGENES DINÁMICAS
// ==========================================
function addImageItem() {
  const id = Date.now();
  imagesList.push({ id: id, url: '', size: 30, posX: 50, posY: 50, rotation: 0, opacity: 100 });
  renderImagesList();
}

function removeImageItem(id) {
  imagesList = imagesList.filter(img => img.id !== id);
  renderImagesList();
  if (typeof updateLabel === 'function') updateLabel();
}

function updateImageItem(id, field, value) {
  const img = imagesList.find(i => i.id === id);
  if (img) { img[field] = isNaN(value) ? value : Number(value); if (typeof updateLabel === 'function') updateLabel(); }
}

function renderImagesList() {
    const container = document.getElementById('imagesContainer');
    if (!container) return;
    
    if (imagesList.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:10px; font-size:11px;">No hay imágenes adicionales</div>';
        return;
    }
    
    container.innerHTML = imagesList.map(img => `
        <div class="image-item" style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:11px; font-weight:bold; color:#555;">Imagen #${img.id.toString().slice(-4)}</span>
                <button onclick="removeImageItem(${img.id})" style="background:#dc3545; color:white; border:none; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:10px;">✕</button>
            </div>
            
            <!-- ✅ Preview de la imagen -->
            <div style="width:100%; height:80px; background:white; border:1px solid #ddd; border-radius:6px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                ${img.url ? `<img src="${img.url}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.parentElement.innerHTML='<span style=\\'color:#999;font-size:10px;\\'>❌ Error al cargar imagen</span>'">` : '<span style="color:#999;font-size:10px;">Sin imagen</span>'}
            </div>
            
            <!-- ✅ Input para URL -->
            <input type="text" placeholder="URL de la imagen" value="${img.url || ''}" 
                   oninput="updateImageItem(${img.id}, 'url', this.value)"
                   style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:11px; margin-bottom:8px; box-sizing:border-box;">
            
            <!-- ✅ Botón para subir imagen local -->
            <div style="margin-bottom:8px;">
                <label style="display:inline-block; padding:6px 12px; background:#2196f3; color:white; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">
                    📁 Subir imagen local
                    <input type="file" accept="image/*" style="display:none;" onchange="handleImageUpload(${img.id}, this)">
                </label>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:10px;">
                <div>
                    <label>Tamaño (%) <span id="sizeVal_${img.id}">${img.size}</span></label>
                    <input type="range" min="5" max="100" value="${img.size}" 
                           oninput="updateImageItem(${img.id}, 'size', this.value); document.getElementById('sizeVal_${img.id}').textContent=this.value" style="width:100%;">
                </div>
                <div>
                    <label>Opacidad (%) <span id="opVal_${img.id}">${img.opacity}</span></label>
                    <input type="range" min="10" max="100" value="${img.opacity}" 
                           oninput="updateImageItem(${img.id}, 'opacity', this.value); document.getElementById('opVal_${img.id}').textContent=this.value" style="width:100%;">
                </div>
                <div>
                    <label>Pos X (%) <span id="xVal_${img.id}">${img.posX}</span></label>
                    <input type="range" min="0" max="100" value="${img.posX}" 
                           oninput="updateImageItem(${img.id}, 'posX', this.value); document.getElementById('xVal_${img.id}').textContent=this.value" style="width:100%;">
                </div>
                <div>
                    <label>Pos Y (%) <span id="yVal_${img.id}">${img.posY}</span></label>
                    <input type="range" min="0" max="100" value="${img.posY}" 
                           oninput="updateImageItem(${img.id}, 'posY', this.value); document.getElementById('yVal_${img.id}').textContent=this.value" style="width:100%;">
                </div>
                <div style="grid-column: span 2;">
                    <label>Rotación (°) <span id="rotVal_${img.id}">${img.rotation}</span></label>
                    <input type="range" min="0" max="360" value="${img.rotation}" 
                           oninput="updateImageItem(${img.id}, 'rotation', this.value); document.getElementById('rotVal_${img.id}').textContent=this.value" style="width:100%;">
                </div>
            </div>
        </div>
    `).join('');
    
    // ✅ Actualizar vista previa después de renderizar
    if (typeof updateLabel === 'function') updateLabel();
}

// ✅ Nueva función para manejar subida de imagen local
function handleImageUpload(imageId, input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        updateImageItem(imageId, 'url', dataUrl);
        
        // Actualizar el input de URL también
        const urlInput = document.querySelector(`input[oninput*="updateImageItem(${imageId}, 'url'"]`);
        if (urlInput) urlInput.value = dataUrl;
        
        // Re-renderizar para mostrar preview
        renderImagesList();
    };
    reader.readAsDataURL(file);
}

// Función para generar lote automático (YYYYMM)
function generarLoteAutomatico() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}${mes}${dia}`;
}

// Función para generar fecha de expiración (MM/AÑO+1)
function generarExpiracionAutomatica() {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const añoSiguiente = ahora.getFullYear() + 2;
    return `${mes}/${añoSiguiente}`;
}

// Función para actualizar campos automáticamente
function actualizarLoteYExpiracion() {
    const batchInput = document.getElementById('batchInfo');
    const originInput = document.getElementById('originInfo');
    
    if (batchInput) {
        const lote = generarLoteAutomatico();
        const exp = generarExpiracionAutomatica();
        batchInput.value = `Lote: ${lote} | Exp: ${exp}`;
    }
    
    // Actualizar vista previa
    if (typeof updateLabel === 'function') {
        updateLabel();
    }
    
    showToast('✅ Lote y expiración actualizados', 'success');
}

// Generar URL con parámetros
function generateShareableURL() {
    const config = getCurrentConfig();
    const content = getCurrentContent();
    
    const params = new URLSearchParams();
    params.set('brand', content.brandName);
    params.set('product', content.productName);
    params.set('width', config.labelWidth);
    params.set('height', config.labelHeight);
    params.set('shape', config.labelShape || 'rectangular');
    params.set('accent', config.accentColor);
    // ... agregar más parámetros
    
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    return url;
}

// Cargar desde URL
function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('brand')) {
        document.getElementById('brandName').value = params.get('brand');
    }
    if (params.has('product')) {
        document.getElementById('productName').value = params.get('product');
    }
    if (params.has('width')) {
        document.getElementById('labelWidth').value = params.get('width');
    }
    // ... cargar más parámetros
    
    updateLabel();
}

// Botón para compartir
function shareDesign() {
    const url = generateShareableURL();
    
    // Copiar al portapapeles
    navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 URL copiada al portapapeles', 'success');
    }).catch(() => {
        // Fallback
        prompt('Copia esta URL:', url);
    });
}

function exportProductSheet() {
    const content = getCurrentContent();
    const config = getCurrentConfig();
    
    const sheet = {
        producto: content.productName,
        marca: content.brandName,
        tipo: content.productType,
        detalles: content.productDetails,
        precio: content.productPrice,
        instrucciones: content.instructions,
        dimensiones: {
            ancho: `${config.labelWidth}mm`,
            alto: `${config.labelHeight}mm`
        },
        colores: {
            acento: config.accentColor,
            texto: config.textColor,
            fondo: config.bgColor
        },
        fecha: new Date().toLocaleDateString('es-ES')
    };
    
    // Exportar como PDF
    const doc = new jspdf.jsPDF();
    doc.setFontSize(20);
    doc.text('Ficha Técnica del Producto', 20, 20);
    doc.setFontSize(12);
    doc.text(`Producto: ${sheet.producto}`, 20, 40);
    doc.text(`Marca: ${sheet.marca}`, 20, 50);
    doc.text(`Tipo: ${sheet.tipo}`, 20, 60);
    doc.text(`Precio: ${sheet.precio}`, 20, 70);
    doc.text(`Dimensiones: ${sheet.dimensiones.ancho} x ${sheet.dimensiones.alto}`, 20, 80);
    doc.text(`Instrucciones: ${sheet.instrucciones.substring(0, 100)}...`, 20, 90);
    
    doc.save(`ficha_tecnica_${content.productName}.pdf`);
}

const aromaCombinations = {
    'Lavanda': ['CalmDream', 'Zen Bamboo', 'Crystal Embrace'],
    'Vainilla': ['Sweet Comfort', 'CocoVanilla Dream', 'Caramel Bliss'],
    'Cítricos': ['Citrus Energy', 'Fresh Apple', 'Tropical Peach Mango'],
    'Floral': ['Floral Bliss', 'Romantic Rose', 'Paradise Bloom']
};

function suggestAromas(currentAroma) {
    const suggestions = [];
    
    // Buscar combinaciones
    for (const [key, values] of Object.entries(aromaCombinations)) {
        if (currentAroma.toLowerCase().includes(key.toLowerCase())) {
            suggestions.push(...values);
        }
    }
    
    // Si no hay combinaciones, sugerir aleatorias
    if (suggestions.length === 0) {
        const allAromas = Object.values(aromaCombinations).flat();
        suggestions.push(...allAromas.sort(() => 0.5 - Math.random()).slice(0, 3));
    }
    
    return suggestions.slice(0, 3);
}

// Mostrar sugerencias
function showAromaSuggestions() {
    const currentProduct = document.getElementById('productName').value;
    const suggestions = suggestAromas(currentProduct);
    
    if (suggestions.length > 0) {
        const message = `💡 Te sugerimos probar también:\n\n${suggestions.join('\n')}`;
        showToast(message, 'info');
    }
}

function sendToWhatsApp() {
    const content = getCurrentContent();
    const config = getCurrentConfig();
    
    // Generar imagen de la etiqueta
    exportPNG().then(() => {
        const message = `🕯️ *${content.productName}*\n\n` +
                       `Marca: ${content.brandName}\n` +
                       `Tipo: ${content.productType}\n` +
                       `Precio: ${content.productPrice}\n\n` +
                       `¡Me encantó esta etiqueta! ¿La puedo pedir?`;
        
        const phone = '506XXXXXXXX'; // Reemplazar con número real
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        
        window.open(url, '_blank');
    });
}

function bulkGenerateLabels() {
    const products = [
        { name: 'Lavanda', type: 'Aromaterapia', price: '3,000' },
        { name: 'Vainilla', type: 'Dulce', price: '₡3,500' },
        { name: 'Cítricos', type: 'Fresco', price: '₡3,000' }
        // ... más productos
    ];
    
    products.forEach((product, index) => {
        setTimeout(() => {
            // Actualizar campos
            document.getElementById('productName').value = product.name;
            document.getElementById('productType').value = product.type;
            document.getElementById('productPrice').value = product.price;
            
            // Actualizar vista previa
            updateLabel();
            
            // Exportar
            setTimeout(() => {
                exportPNG();
            }, 500);
        }, index * 1000);
    });
}


// ==========================================
// 🖼️ MEJORA 2: BORDES PERSONALIZABLES
// ==========================================
function aplicarBordes() {
    const label = document.getElementById('labelPreview');
    if (!label) return;
    
    const fullBorder = document.getElementById('fullBorder')?.checked || false;
    const topBorderOnly = document.getElementById('topBorderOnly')?.checked || false;
    const bottomBorderOnly = document.getElementById('bottomBorderOnly')?.checked || false;
    const borderWidth = document.getElementById('borderWidth')?.value || 2;
    const borderColor = document.getElementById('borderColor')?.value || '#c9a96e';
    const borderStyle = document.getElementById('borderStyle')?.value || 'solid';
    
    // Resetear bordes
    label.style.border = 'none';
    label.style.borderTop = 'none';
    label.style.borderBottom = 'none';
    label.style.borderLeft = 'none';
    label.style.borderRight = 'none';
    
    const borderValue = `${borderWidth}px ${borderStyle} ${borderColor}`;
    
    if (fullBorder) {
        label.style.border = borderValue;
    } else if (topBorderOnly) {
        label.style.borderTop = borderValue;
    } else if (bottomBorderOnly) {
        label.style.borderBottom = borderValue;
    }
}

// ==========================================
// ⌨️ MEJORA 3: ATAJOS DE TECLADO EXPANDIDOS
// ==========================================
document.addEventListener('keydown', function(e) {
    const tag = e.target.tagName.toLowerCase();
    const esInput = tag === 'input' || tag === 'textarea' || tag === 'select';
    
    // Ctrl/Cmd + S: Guardar proyecto
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && !esInput) {
        e.preventDefault();
        if (typeof saveProject === 'function') saveProject();
    }
    
    // Ctrl/Cmd + D: Duplicar etiqueta (añadir a cola)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !esInput) {
        e.preventDefault();
        if (typeof addToPrintQueue === 'function') addToPrintQueue();
    }
    
    // Ctrl/Cmd + P: Imprimir
    if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !esInput) {
        e.preventDefault();
        window.print();
    }
    
    // Ctrl/Cmd + N: Nuevo proyecto (limpiar formulario)
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !esInput) {
        e.preventDefault();
        if (confirm('¿Crear nuevo proyecto? Se perderán los cambios no guardados.')) {
            document.getElementById('projectName').value = 'Mi Etiqueta';
            document.getElementById('brandName').value = 'Esentia';
            document.getElementById('brandSub').value = 'Velas Artesanales';
            document.getElementById('productName').value = 'Lavanda';
            updateLabel();
        }
    }
    
    // Ctrl/Cmd + E: Exportar PDF
    if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !esInput) {
        e.preventDefault();
        if (typeof exportSinglePDF === 'function') exportSinglePDF();
    }
    
    // Ctrl/Cmd + F: Buscar producto
    if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !esInput) {
        e.preventDefault();
        cambiarTab('producto');
        setTimeout(() => document.getElementById('buscadorGlobal')?.focus(), 100);
    }
    
    // Ctrl/Cmd + G: Toggle guías
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !esInput) {
        e.preventDefault();
        const container = document.querySelector('.label-container');
        if (container) {
            container.classList.toggle('show-guides');
        }
    }
    
    // Escape: Cerrar modales
    if (e.key === 'Escape') {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('show');
    }
    
    // F5: Forzar actualización de vista previa
    if (e.key === 'F5') {
        e.preventDefault();
        updateLabel();
    }
});

// ==========================================
// 🚀 CARGAR FORMA GUARDADA AL INICIAR
// ==========================================
function cargarFormaGuardada() {
    const formaGuardada = localStorage.getItem('aromaLabelShape') || 'rectangular';
    const btn = document.querySelector(`.shape-btn[onclick*="${formaGuardada}"]`);
    if (btn) {
        cambiarForma(formaGuardada, btn);
    }
}

// Agregar al DOMContentLoaded existente
const originalDOMContentLoaded = document.addEventListener;
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(cargarFormaGuardada, 500);
});

// ==========================================
// 🔗 COMPARTIR DISEÑO POR URL
// ==========================================

/**
 * Genera URL compartible con todos los parámetros del diseño
 */
function generateShareableURL() {
    const config = getCurrentConfig();
    const content = getCurrentContent();
    
    const params = new URLSearchParams();
    
    // Contenido
    params.set('brand', content.brandName);
    params.set('brandSub', content.brandSub);
    params.set('product', content.productName);
    params.set('type', content.productType);
    params.set('details', content.productDetails);
    params.set('instructions', content.instructions);
    params.set('batch', content.batchInfo);
    params.set('origin', content.originInfo);
    
    // Configuración
    params.set('width', config.labelWidth);
    params.set('height', config.labelHeight);
    params.set('padding', config.labelPadding);
    params.set('borderRadius', config.borderRadius);
    params.set('topLine', config.topLine);
    params.set('bottomLine', config.bottomLine);
    params.set('areaGap', config.areaGap);
    
    // Fuentes
    params.set('fontBrand', config.fontBrand);
    params.set('fontProduct', config.fontProduct);
    params.set('brandFont', config.brandFont);
    params.set('productFont', config.productFont);
    
    // Colores
    params.set('accent', config.accentColor);
    params.set('textColor', config.textColor);
    params.set('bgColor', config.bgColor);
    
    // Visibilidad
    params.set('showDivider', config.showDivider ? '1' : '0');
    params.set('showQR', config.showQR ? '1' : '0');
    params.set('showInstructions', config.showInstructions ? '1' : '0');
    params.set('showFooter', config.showFooter ? '1' : '0');
    params.set('vinylMode', config.vinylMode ? '1' : '0');
    
    const baseURL = window.location.origin + window.location.pathname;
    return `${baseURL}?${params.toString()}`;
}

/**
 * Carga diseño desde parámetros URL
 */
function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    if (!params.has('brand') && !params.has('product')) {
        return false; // No hay parámetros
    }
    
    try {
        // Contenido
        if (params.has('brand')) document.getElementById('brandName').value = params.get('brand');
        if (params.has('brandSub')) document.getElementById('brandSub').value = params.get('brandSub');
        if (params.has('product')) document.getElementById('productName').value = params.get('product');
        if (params.has('type')) document.getElementById('productType').value = params.get('type');
        if (params.has('details')) document.getElementById('productDetails').value = params.get('details');
        if (params.has('instructions')) document.getElementById('instructions').value = params.get('instructions');
        if (params.has('batch')) document.getElementById('batchInfo').value = params.get('batch');
        if (params.has('origin')) document.getElementById('originInfo').value = params.get('origin');
        
        // Configuración
        if (params.has('width')) document.getElementById('labelWidth').value = params.get('width');
        if (params.has('height')) document.getElementById('labelHeight').value = params.get('height');
        if (params.has('padding')) document.getElementById('labelPadding').value = params.get('padding');
        if (params.has('borderRadius')) document.getElementById('borderRadius').value = params.get('borderRadius');
        if (params.has('topLine')) document.getElementById('topLine').value = params.get('topLine');
        if (params.has('bottomLine')) document.getElementById('bottomLine').value = params.get('bottomLine');
        if (params.has('areaGap')) document.getElementById('areaGap').value = params.get('areaGap');
        
        // Fuentes
        if (params.has('fontBrand')) document.getElementById('fontBrand').value = params.get('fontBrand');
        if (params.has('fontProduct')) document.getElementById('fontProduct').value = params.get('fontProduct');
        if (params.has('brandFont')) document.getElementById('brandFont').value = params.get('brandFont');
        if (params.has('productFont')) document.getElementById('productFont').value = params.get('productFont');
        
        // Colores
        if (params.has('accent')) document.getElementById('accentColor').value = params.get('accent');
        if (params.has('textColor')) document.getElementById('textColor').value = params.get('textColor');
        if (params.has('bgColor')) document.getElementById('bgColor').value = params.get('bgColor');
        
        // Visibilidad
        if (params.has('showDivider')) document.getElementById('showDivider').checked = params.get('showDivider') === '1';
        if (params.has('showQR')) document.getElementById('showQR').checked = params.get('showQR') === '1';
        if (params.has('showInstructions')) document.getElementById('showInstructions').checked = params.get('showInstructions') === '1';
        if (params.has('showFooter')) document.getElementById('showFooter').checked = params.get('showFooter') === '1';
        if (params.has('vinylMode')) document.getElementById('vinylMode').checked = params.get('vinylMode') === '1';
        
        // Sincronizar sliders y actualizar
        sincronizarValoresSliders();
        updateLabel();
        
        showToast('🔗 Diseño cargado desde URL', 'success');
        return true;
    } catch (e) {
        console.error('Error al cargar desde URL:', e);
        showToast('⚠️ Error al cargar diseño', 'warning');
        return false;
    }
}

/**
 * Comparte el diseño (copia URL al portapapeles)
 */
function shareDesign() {
    const url = generateShareableURL();
    
    // Intentar usar Web Share API primero
    if (navigator.share) {
        navigator.share({
            title: 'Mi Diseño de Etiqueta - AromaLabel Pro',
            text: `Mira este diseño de etiqueta: ${document.getElementById('productName').value}`,
            url: url
        }).catch(err => {
            console.log('Share API cancelado');
            copyToClipboard(url);
        });
    } else {
        // Fallback: copiar al portapapeles
        copyToClipboard(url);
    }
}

/**
 * Copia texto al portapapeles
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(' URL copiada al portapapeles', 'success');
    }).catch(() => {
        // Fallback antiguo
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('🔗 URL copiada', 'success');
    });
}

/**
 * Acortar URL para compartir (opcional)
 */
function getShortURL() {
    const params = new URLSearchParams();
    
    // Solo parámetros esenciales para URL más corta
    params.set('p', document.getElementById('productName').value);
    params.set('b', document.getElementById('brandName').value);
    params.set('w', document.getElementById('labelWidth').value);
    params.set('h', document.getElementById('labelHeight').value);
    params.set('ac', document.getElementById('accentColor').value);
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// ==========================================
// 🚀 INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  sincronizarValoresSliders();
  cargarDatosProductos();
  renderizarFavoritos();
  renderizarHistorial();
  actualizarUIFavoritos();
  loadAllProjects();
  actualizarLoteYExpiracion();
  cambiarForma();
   //verificarElementosCriticos();
    

    
  
   
  const contFav = document.getElementById('contadorFavoritos');
  const contHist = document.getElementById('contadorHistorial');
  if (contFav) contFav.textContent = window.favoritos.length;
  if (contHist) contHist.textContent = window.historial.length;
  setTimeout(updateLabel, 300);
 

   // Agregar event listeners a los controles del logo
    const logoControls = ['logoSize', 'logoRot', 'logoOpa', 'logoPosX', 'logoPosY'];
    logoControls.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateLogoControls);
            el.addEventListener('change', updateLogoControls);
        }
    });

    // Sincronizar sliders de posición del QR
['qrPosX', 'qrPosY', 'qrSize', 'qrRotation'].forEach(id => {
  const slider = document.getElementById(id);
  const display = document.getElementById(id + 'Val');
  if (slider && display) {
    slider.addEventListener('input', () => {
      display.textContent = slider.value;
    });
  }
});

    // Intentar cargar desde URL
    const loadedFromURL = loadFromURL();
    
    if (!loadedFromURL) {
        setTimeout(updateLabel, 300);
    }

     console.log('🚀 AromaLabel Pro v3 inicializado correctamente');
});
