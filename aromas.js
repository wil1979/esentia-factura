'use strict';

// ==========================================
// 📦 VARIABLES GLOBALES
// ==========================================
let logoDataUrl = null;
let imagesList = [];
let printQueue = [];
let projects = JSON.parse(localStorage.getItem('aromaProjects') || '[]');
let codigoBarrasActual = '';
let productosData = { ESENCIAS: [], LIMPIEZA: [], VELAS: [] };
let productosFiltrados = [];
let productoActual = null;

function obtenerCodigoBarrasProducto(producto) {
  if (!producto) return '';
  const candidatos = [producto.id, producto.codigo, producto.codigoBarras, producto.barcode, producto.sku, producto.SKU];
  const valor = candidatos.find(v => v !== undefined && v !== null && String(v).trim() !== '');
  return valor == null ? '' : String(valor).trim();
}

window.estadoImagenProducto = { activa: false, url: '', tamano: 30, posX: 50, posY: 30, rotacion: 0, opacidad: 22 };
window.estadoImagenFondo = { url: '', opacity: 0.3, fit: 'contain' };
window.favoritos = JSON.parse(localStorage.getItem('aromalabel_favoritos') || '[]');
window.historial = JSON.parse(localStorage.getItem('aromalabel_historial') || '[]');

// ==========================================
// 💡 PLANTILLAS DE SEGURIDAD
// ==========================================
const plantillasSeguridad = {
  VELAS: "🕯️ VELAS Y CANDELAS:\n• Quemar sobre superficie resistente al calor.\n• No dejar sin supervisión.\n• Mantener alejado de corrientes de aire, niños y mascotas.\n• No quemar más de 4 horas seguidas.\n• Detener cuando queden 1cm de cera.\n• Mantener la mecha recortada a 5mm.",
  ESENCIAS: "🌸 ESENCIAS AROMÁTICAS:\n• Uso exclusivo para difusores o ambientación.\n• No ingerir ni aplicar directamente sobre la piel.\n• Mantener en lugar fresco, oscuro y fuera del alcance de niños y mascotas.\n• En caso de contacto con ojos, lavar con abundante agua.\n• No usar cerca de llamas abiertas.",
  LIMPIEZA: "🧼 PRODUCTOS DE LIMPIEZA:\n• Mantener fuera del alcance de los niños.\n• En caso de contacto con los ojos, lavar con abundante agua.\n• No mezclar con otros productos químicos.\n• Utilizar en áreas ventiladas.\n• Usar guantes si se tiene piel sensible.\n• No ingerir."
};

window.aplicarPlantillaSeguridad = function() {
  const select = document.getElementById('safetyPreset');
  if (!select) return;
  const tipo = select.value;
  if (plantillasSeguridad[tipo]) {
    const txtArea = document.getElementById('instructions');
    if (txtArea) {
      txtArea.value = plantillasSeguridad[tipo];
      updateLabel();
      showToast('🛡️ Instrucciones actualizadas: ' + tipo, 'success');
    }
  }
};

// ==========================================
// 🔔 TOAST
// ==========================================
function showToast(message, type = 'info') {
  const colores = { success: '#4caf50', danger: '#e74c3c', info: '#2196f3', warning: '#ff9800' };
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.background = colores[type] || colores.info;
  toast.innerHTML = '<span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('fade-out');
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}

// ==========================================
// 🎯 PESTAÑAS Y SECCIONES
// ==========================================
window.cambiarTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(function(c) { 
    c.classList.remove('active'); 
  });
  document.querySelectorAll('.tab-btn').forEach(function(b) { 
    b.classList.remove('active'); 
  });
  const content = document.getElementById('tab-' + tabId);
  const btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
  if (content) {
    content.classList.add('active');
  }
  if (btn) btn.classList.add('active');
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) sidebar.scrollTop = 0;
};

window.showSection = function(sectionId, btn) {
  document.querySelectorAll('.section').forEach(function(sec) { sec.classList.remove('active'); });
  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(function(tab) { tab.classList.remove('active'); });
  if (btn) btn.classList.add('active');
};

window.toggleSection = function(header) {
  const section = header.closest('.collapsible-section');
  if (section) section.classList.toggle('collapsed');
};

// ==========================================
// 🔄 SINCRONIZACIÓN DE SLIDERS
// ==========================================
function sincronizarValoresSliders() {
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(function(slider) {
    const actualizarDisplay = function() {
      const valor = slider.value;
      let display = document.getElementById(slider.id + 'Val') || document.getElementById(slider.id + 'Valor');
      if (display) display.textContent = valor;
      if (typeof updateLabel === 'function') updateLabel();
    };
    slider.addEventListener('input', actualizarDisplay);
    actualizarDisplay();
  });
}

// ==========================================
// 🛠️ GENERADOR DE CANVAS DE QR
// ==========================================
function buildQRCanvas(data, sizePx, dark, light) {
  if (typeof qrcode !== 'function') {
    throw new Error('Librería qrcode no cargada');
  }
  const qr = qrcode(0, 'M');
  qr.addData(data || 'https://example.com');
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  const total = n + quiet * 2;
  
  const cellSize = Math.max(2, Math.floor(sizePx / total));
  const canvasSize = cellSize * total;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  
  ctx.fillStyle = light || '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = dark || '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect((c + quiet) * cellSize, (r + quiet) * cellSize, cellSize, cellSize);
      }
    }
  }
  return canvas;
}

// ==========================================
// 🏷️ FUNCIÓN PRINCIPAL: updateLabel()
// ==========================================
window.updateLabel = function() {
  const label = document.getElementById('labelPreview');
  if (!label) return;

  const getVal = function(id, fallback) {
    fallback = fallback || '';
    const el = document.getElementById(id);
    return el ? (el.value !== undefined ? el.value : fallback) : fallback;
  };
  const getCheck = function(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  const widthMm = parseInt(getVal('labelWidth', 60));
  const heightMm = parseInt(getVal('labelHeight', 80));
  const paddingMm = parseFloat(getVal('labelPadding', 1.5));
  const borderRadius = parseInt(getVal('borderRadius', 4));
  const areaGap = Math.max(0, Math.min(30, parseFloat(getVal('areaGap', 2)) || 0));
  const fontBrand = parseInt(getVal('fontBrand', 21));
  const fontBrandSub = parseInt(getVal('fontBrandSub', 0));
  const fontProduct = parseInt(getVal('fontProduct', 19));
  const fontType = parseInt(getVal('fontType', 10));
  const fontDetails = parseInt(getVal('fontDetails', 9));
  const fontInstr = parseInt(getVal('fontInstr', 10));
  const fontBatch = parseInt(getVal('fontBatch', 9));
  const fontOrigin = parseInt(getVal('fontOrigin', 8));
  const instructionsWidth = Math.max(20, Math.min(100, parseInt(getVal('instructionsWidth', 100)) || 100));
  const instructionsHeight = Math.max(10, Math.min(100, parseInt(getVal('instructionsHeight', 100)) || 100));

  const qrSizePercent = parseInt(getVal('qrSize', 34));
  const qrSizeMm = Math.max(12, Math.min(Math.min(widthMm, heightMm) * 0.8, Math.min(widthMm, heightMm) * (qrSizePercent / 100)));
  const qrPosX = parseInt(getVal('qrPosX', 20));
  const qrPosY = parseInt(getVal('qrPosY', 80));
  const qrRotation = parseInt(getVal('qrRotation', 0));
  const barcodePosX = parseInt(getVal('barcodePosX', 71));
  const barcodePosY = parseInt(getVal('barcodePosY', 89));
  const barcodeRotation = parseInt(getVal('barcodeRotation', 0));

  const brandFont = getVal('brandFont', "'Playfair Display', serif");
  const productFont = getVal('productFont', "'Playfair Display', serif");
  const accentColor = getVal('accentColor', '#c9a96e');
  const textColor = getVal('textColor', '#1a1a1a');
  const bgColor = getVal('bgColor', '#ffffff');

  const showQR = getCheck('showQR') || getCheck('usarQRProducto');
  const showBarcode = getCheck('showBarcode');
  const showInstructions = getCheck('showInstructions');
  const showFooter = getCheck('showFooter');
  const vinylMode = getCheck('vinylMode');
  const boldTextMode = getCheck('boldTextMode');
  const frostedBg = getCheck('frostedBg');
  const showDivider = getCheck('showDivider');

  label.style.setProperty('--label-width', widthMm + 'mm');
  label.style.setProperty('--label-height', heightMm + 'mm');
  label.style.setProperty('--label-padding', paddingMm + 'mm');
  label.style.setProperty('--border-radius', borderRadius + 'px');
  label.style.setProperty('--area-gap', areaGap + 'px');
  label.style.setProperty('--accent-color', accentColor);
  label.style.setProperty('--text-color', textColor);
  label.style.setProperty('--qr-size', qrSizePercent + '%');
  label.style.setProperty('--brand-font', brandFont);
  label.style.setProperty('--product-font', productFont);
  label.style.borderRadius = borderRadius + 'px';

  if (boldTextMode) label.classList.add('bold-text');
  else label.classList.remove('bold-text');

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

  const _vb = document.getElementById('vinylBadge');
  if (_vb) _vb.style.display = vinylMode ? 'inline-flex' : 'none';
  const _pvb = document.getElementById('printVinylBadge');
  if (_pvb) _pvb.style.display = vinylMode ? 'inline-flex' : 'none';

  const textShadowVinyl = vinylMode ? '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.7)' : 'none';
  const textShadowName = vinylMode ? '0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.8)' : 'none';
  const textShadowLight = vinylMode ? '0 0 2px rgba(255,255,255,0.9)' : 'none';

  const setStyle = function(id, styles) {
    const el = document.getElementById(id);
    if (el) Object.assign(el.style, styles);
  };

  setStyle('previewBrand', { fontSize: fontBrand + 'px', fontFamily: brandFont, color: textColor, textShadow: textShadowVinyl });
  setStyle('previewBrandSub', { fontSize: fontBrandSub + 'px', textShadow: textShadowLight });
  setStyle('previewProduct', { fontSize: fontProduct + 'px', fontFamily: productFont, color: textColor, textShadow: textShadowName });
  setStyle('previewType', { fontSize: fontType + 'px', textShadow: textShadowLight });
  setStyle('previewDetails', { fontSize: fontDetails + 'px', textShadow: textShadowLight });
  setStyle('previewInstructions', {
    fontSize: fontInstr + 'px',
    textShadow: textShadowLight,
    width: instructionsWidth + '%',
    maxHeight: instructionsHeight + '%',
    maxWidth: '100%',
    boxSizing: 'border-box'
  });

  const instructionsWidthVal = document.getElementById('instructionsWidthVal');
  const instructionsHeightVal = document.getElementById('instructionsHeightVal');
  if (instructionsWidthVal) instructionsWidthVal.textContent = instructionsWidth;
  if (instructionsHeightVal) instructionsHeightVal.textContent = instructionsHeight;

  setStyle('previewBatch', { fontSize: fontBatch + 'px', color: textColor, textShadow: textShadowLight });
  setStyle('previewOrigin', { fontSize: fontOrigin + 'px', textShadow: textShadowLight });

  const setText = function(id, val, fallback) {
    fallback = fallback || '';
    const el = document.getElementById(id);
    if (el) el.textContent = val || fallback;
  };
  setText('previewBrand', getVal('brandName'), 'Marca');
  setText('previewBrandSub', getVal('brandSub'), '');
  setText('previewProduct', getVal('productName'), 'Producto');
  setText('previewType', getVal('productType'), '');
  setText('previewInstructions', getVal('instructions'), '');
  setText('previewBatch', getVal('batchInfo'), '');
  setText('previewOrigin', getVal('originInfo'), '');

  const showDetails = getCheck('showDetails');
  const previewDetailsEl = document.getElementById('previewDetails');
  if (previewDetailsEl) {
    previewDetailsEl.textContent = getVal('productDetails', '');
    previewDetailsEl.style.display = showDetails ? 'block' : 'none';
  }

  const showPrice = getCheck('showPrice');
  const previewPriceEl = document.getElementById('previewPrice');
  if (previewPriceEl) {
    const priceValue = getVal('productPrice', '');
    if (showPrice && priceValue) {
      previewPriceEl.textContent = priceValue;
      previewPriceEl.style.display = 'block';
      previewPriceEl.style.fontSize = (fontDetails + 1) + 'px';
      previewPriceEl.style.color = accentColor;
      previewPriceEl.style.fontWeight = '700';
    } else {
      previewPriceEl.style.display = 'none';
    }
  }

  const previewInstructionsEl = document.getElementById('previewInstructions');
  if (previewInstructionsEl) {
    if (frostedBg) previewInstructionsEl.classList.add('frosted-bg');
    else previewInstructionsEl.classList.remove('frosted-bg');
  }

  const dividerEl = document.getElementById('labelDivider');
  if (dividerEl) {
    const dividerColor = getVal('dividerColor', '#c9a96e');
    const dividerWidth = parseInt(getVal('dividerWidth', 1));
    dividerEl.style.borderTop = dividerWidth + 'px solid ' + dividerColor;
    if (showDivider) dividerEl.classList.add('visible');
    else dividerEl.classList.remove('visible');
  }

  // 📱 RENDERIZADO DEL QR EN LA VISTA PREVIA
  const qrEl = document.getElementById('previewQR');
  if (qrEl) {
    if (showQR) {
      qrEl.style.display = 'flex';
      qrEl.style.setProperty('width', qrSizeMm + 'mm', 'important');
      qrEl.style.setProperty('height', qrSizeMm + 'mm', 'important');
      qrEl.style.setProperty('min-width', qrSizeMm + 'mm', 'important');
      qrEl.style.setProperty('min-height', qrSizeMm + 'mm', 'important');
      qrEl.style.aspectRatio = '1 / 1';
      qrEl.style.backgroundColor = '#ffffff';
      qrEl.style.padding = '2px';
      qrEl.style.boxSizing = 'border-box';
      qrEl.style.position = 'absolute';
      qrEl.style.left = qrPosX + '%';
      qrEl.style.top = qrPosY + '%';
      qrEl.style.transform = 'translate(-50%, -50%) rotate(' + qrRotation + 'deg)';
      qrEl.style.zIndex = '6';
      
      try {
        const qrCanvas = buildQRCanvas(
          getVal('qrUrl', 'https://example.com'),
          300,
          getVal('qrColor', '#000000') || '#000000',
          '#ffffff'
        );
        qrCanvas.style.width = '100%';
        qrCanvas.style.height = '100%';
        qrCanvas.style.display = 'block';
        qrEl.innerHTML = '';
        qrEl.appendChild(qrCanvas);
      } catch (e) {
        console.warn('Error al renderizar el QR:', e);
      }
    } else {
      qrEl.style.display = 'none';
    }
  }

  const barcodeWrap = document.getElementById('previewBarcodeWrap');
  const barcodeSvg = document.getElementById('previewBarcode');
  const productId = obtenerCodigoBarrasProducto(productoActual) || codigoBarrasActual;
  if (barcodeWrap && barcodeSvg) {
    if (showBarcode && productId && typeof JsBarcode === 'function') {
      try {
        barcodeWrap.style.display = 'flex';
        barcodeWrap.classList.add('is-positioned');
        barcodeWrap.style.position = 'absolute';
        barcodeWrap.style.left = barcodePosX + '%';
        barcodeWrap.style.top = barcodePosY + '%';
        barcodeWrap.style.transform = 'translate(-50%, -50%) rotate(' + barcodeRotation + 'deg)';
        barcodeWrap.style.zIndex = '6';
        JsBarcode(barcodeSvg, productId, {
          format: 'CODE128', displayValue: true, text: productId,
          font: 'monospace', fontSize: 10, textMargin: 1, margin: 2,
          height: 32, width: 1.5, lineColor: '#111', background: '#fff'
        });
      } catch (e) {
        barcodeWrap.style.display = 'none';
        console.warn('Barcode error:', e);
      }
    } else {
      barcodeWrap.style.display = 'none';
    }
  }

  setStyle('previewInstructions', { display: showInstructions ? 'block' : 'none' });
  setStyle('labelFooter', { display: showFooter ? 'flex' : 'none' });

  const setAreaPosition = function(id, xId, yId) {
    const area = document.getElementById(id);
    if (!area) return;
    const x = parseFloat(getVal(xId, 0)) || 0;
    const y = parseFloat(getVal(yId, 0)) || 0;
    area.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  };
  setAreaPosition('labelLogoArea', 'logoAreaX', 'logoAreaY');
  setAreaPosition('labelProduct', 'productAreaX', 'productAreaY');
  setAreaPosition('previewInstructions', 'instructionsAreaX', 'instructionsAreaY');
  setAreaPosition('labelFooter', 'footerAreaX', 'footerAreaY');

  const logoImg = document.getElementById('previewLogoImg');
  const brandText = document.getElementById('previewBrand');
  const brandSub = document.getElementById('previewBrandSub');
  if (logoImg) {
    const showLogoImg = getCheck('showLogoImg');
    if (logoDataUrl) logoImg.src = logoDataUrl;
    if (showLogoImg && logoDataUrl) {
      logoImg.style.display = 'block';
      logoImg.style.position = 'absolute';
      logoImg.style.zIndex = '3';
      if (brandText) brandText.style.display = 'none';
      if (brandSub) brandSub.style.display = 'none';
      const logoSize = parseInt(getVal('logoSize', 80));
      const sizeMm = Math.min(widthMm, heightMm) * (logoSize / 100);
      logoImg.style.width = sizeMm + 'mm';
      logoImg.style.height = 'auto';
      logoImg.style.opacity = (getVal('logoOpa', 100) / 100);
      logoImg.style.left = getVal('logoPosX', 50) + '%';
      logoImg.style.top = getVal('logoPosY', 50) + '%';
      logoImg.style.transform = 'translate(-50%, -50%) rotate(' + getVal('logoRot', 0) + 'deg)';
    } else {
      logoImg.style.display = 'none';
      if (brandText) brandText.style.display = 'block';
      if (brandSub) brandSub.style.display = 'block';
    }
  }

  imagesList.forEach(function(img) {
    if (!img.url) return;
    let imgEl = document.getElementById('dynamicImg_' + img.id);
    if (!imgEl) {
      imgEl = document.createElement('img');
      imgEl.id = 'dynamicImg_' + img.id;
      imgEl.style.position = 'absolute';
      imgEl.style.pointerEvents = 'none';
      imgEl.style.zIndex = '2';
      label.appendChild(imgEl);
    }
    imgEl.src = img.url;
    imgEl.style.display = 'block';
    const sizeMm = Math.min(widthMm, heightMm) * (img.size / 100);
    imgEl.style.width = sizeMm + 'mm';
    imgEl.style.height = 'auto';
    imgEl.style.opacity = (img.opacity / 100);
    imgEl.style.left = img.posX + '%';
    imgEl.style.top = img.posY + '%';
    imgEl.style.transform = 'translate(-50%, -50%) rotate(' + img.rotation + 'deg)';
  });

  const existingDynamicImgs = label.querySelectorAll('img[id^="dynamicImg_"]');
  existingDynamicImgs.forEach(function(el) {
    const imgId = parseInt(el.id.replace('dynamicImg_', ''));
    const exists = imagesList.some(function(img) { return img.id === imgId && img.url; });
    if (!exists) el.remove();
  });

  let bgImgEl = document.getElementById('labelBgImage');
  const bgEstado = window.estadoImagenFondo || { url: '', opacity: 0.3, fit: 'contain' };
  if (bgEstado.url) {
    if (!bgImgEl) {
      bgImgEl = document.createElement('img');
      bgImgEl.id = 'labelBgImage';
      bgImgEl.style.position = 'absolute';
      bgImgEl.style.top = '0';
      bgImgEl.style.left = '0';
      bgImgEl.style.width = '100%';
      bgImgEl.style.height = '100%';
      bgImgEl.style.zIndex = '1';
      bgImgEl.style.pointerEvents = 'none';
      label.insertBefore(bgImgEl, label.firstChild);
    }
    bgImgEl.src = bgEstado.url;
    bgImgEl.style.opacity = bgEstado.opacity;
    bgImgEl.style.objectFit = bgEstado.fit;
    bgImgEl.style.display = 'block';
  } else if (bgImgEl) {
    bgImgEl.style.display = 'none';
  }

  let previewProductImg = document.getElementById('previewProductImg');
  if (window.estadoImagenProducto && window.estadoImagenProducto.activa && window.estadoImagenProducto.url) {
    if (!previewProductImg) {
      previewProductImg = document.createElement('img');
      previewProductImg.id = 'previewProductImg';
    }
    if (previewProductImg.parentElement !== label) label.appendChild(previewProductImg);
    previewProductImg.classList.add('label-product-img');
    previewProductImg.src = window.estadoImagenProducto.url;
    previewProductImg.style.display = 'block';
    previewProductImg.style.width = window.estadoImagenProducto.tamano + '%';
    previewProductImg.style.height = 'auto';
    previewProductImg.style.left = window.estadoImagenProducto.posX + '%';
    previewProductImg.style.top = window.estadoImagenProducto.posY + '%';
    previewProductImg.style.opacity = (Number(window.estadoImagenProducto.opacidad || 22) / 100).toFixed(2);
    previewProductImg.style.transform = 'translate(-50%, -50%) rotate(' + window.estadoImagenProducto.rotacion + 'deg)';
  } else if (previewProductImg) {
    previewProductImg.style.display = 'none';
  }

  aplicarBordes();
};

// ==========================================
// 📍 CONTROLES QR Y BARRAS
// ==========================================
window.resetQRPosition = function() {
  const posX = document.getElementById('qrPosX');
  const posY = document.getElementById('qrPosY');
  const size = document.getElementById('qrSize');
  const rotation = document.getElementById('qrRotation');

  if (posX) posX.value = 20;
  if (posY) posY.value = 80;
  if (size) size.value = 34;
  if (rotation) rotation.value = 0;

  updateLabel();
};

window.centerQR = function() {
  const posX = document.getElementById('qrPosX');
  const posY = document.getElementById('qrPosY');
  if (posX) posX.value = 50;
  if (posY) posY.value = 50;
  updateLabel();
  showToast('📍 QR centrado en la etiqueta', 'info');
};

window.resetBarcodePosition = function() {
  const defaults = { barcodePosX: 71, barcodePosY: 89, barcodeRotation: 0 };
  Object.keys(defaults).forEach(function(id) {
    const input = document.getElementById(id);
    if (input) input.value = defaults[id];
  });
  updateLabel();
};

window.centerBarcode = function() {
  const x = document.getElementById('barcodePosX');
  const y = document.getElementById('barcodePosY');
  if (x) x.value = 50;
  if (y) y.value = 50;
  updateLabel();
};

window.resetearPosicionesAreas = function() {
  ['logoAreaX', 'logoAreaY', 'productAreaX', 'productAreaY', 'instructionsAreaX', 'instructionsAreaY', 'footerAreaX', 'footerAreaY'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = 0;
  });
  updateLabel();
  showToast('🔄 Posiciones reseteadas', 'info');
};

// ==========================================
// 🎨 FORMAS Y BORDES
// ==========================================
window.cambiarForma = function(forma, btn) {
  const label = document.getElementById('labelPreview');
  if (!label) return;
  label.classList.remove('shape-rectangular', 'shape-circular', 'shape-arched-top', 'shape-arched-bottom', 'shape-triangular', 'shape-oval', 'shape-hexagon', 'shape-tag', 'shape-diamond');
  if (forma) label.classList.add('shape-' + forma);
  document.querySelectorAll('.shape-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  if (forma) localStorage.setItem('aromaLabelShape', forma);
  updateLabel();
};

window.aplicarBordes = function() {
  const label = document.getElementById('labelPreview');
  if (!label) return;
  const fullBorder = document.getElementById('fullBorder') ? document.getElementById('fullBorder').checked : false;
  const topBorderOnly = document.getElementById('topBorderOnly') ? document.getElementById('topBorderOnly').checked : false;
  const bottomBorderOnly = document.getElementById('bottomBorderOnly') ? document.getElementById('bottomBorderOnly').checked : false;
  const borderWidth = document.getElementById('borderWidth') ? document.getElementById('borderWidth').value : 2;
  const borderColor = document.getElementById('borderColor') ? document.getElementById('borderColor').value : '#c9a96e';
  const borderStyle = document.getElementById('borderStyle') ? document.getElementById('borderStyle').value : 'solid';
  label.style.border = 'none';
  label.style.borderTop = 'none';
  label.style.borderBottom = 'none';
  label.style.borderLeft = 'none';
  label.style.borderRight = 'none';
  const borderValue = borderWidth + 'px ' + borderStyle + ' ' + borderColor;
  if (fullBorder) label.style.border = borderValue;
  else {
    if (topBorderOnly) label.style.borderTop = borderValue;
    if (bottomBorderOnly) label.style.borderBottom = borderValue;
  }
  label.style.setProperty('--border-width', borderWidth + 'px');
  label.style.setProperty('--border-style', borderStyle);
  label.style.setProperty('--border-color', borderColor);
};

// ==========================================
// 📦 CATÁLOGO
// ==========================================
function normalizarURL(img) {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  return 'https://wil1979.github.io/esentia-factura/' + img.replace(/^\/+/, '');
}

function formatPrecio(p) {
  if (!p) return '';
  return '₡' + Number(p).toLocaleString('es-CR');
}

async function cargarDatosProductos() {
  try {
    const resE = await fetch('https://wil1979.github.io/esentia-factura/data/productos_esentia.json');
    const dataE = await resE.json();
    Object.keys(dataE).forEach(function(cat) {
      if (Array.isArray(dataE[cat])) {
        dataE[cat].forEach(function(p) { productosData.ESENCIAS.push(Object.assign({}, p, { categoriaOrigen: cat, tipoCatalogo: 'ESENCIAS' })); });
      }
    });
    const resL = await fetch('https://wil1979.github.io/esentia-factura/data/productos_limpieza_completo.json');
    const dataL = await resL.json();
    dataL.forEach(function(p) { productosData.LIMPIEZA.push(Object.assign({}, p, { tipoCatalogo: 'LIMPIEZA' })); });
    const resV = await fetch('https://wil1979.github.io/esentia-factura/data/catalogo-velas.json');
    const dataV = await resV.json();
    dataV.forEach(function(p) { productosData.VELAS.push(Object.assign({}, p, { tipoCatalogo: 'VELAS' })); });
  } catch (e) { console.error('❌ Error cargando productos:', e); }
}

window.cargarProductos = function() {
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
};

window.filtrarProductos = function() {
  const categoria = document.getElementById('categoriaProducto').value;
  const texto = document.getElementById('buscadorProductos').value.toLowerCase().trim();
  if (!categoria) return;
  const todos = productosData[categoria];
  productosFiltrados = !texto ? todos : todos.filter(function(p) {
    const n = (p.nombre || '').toLowerCase();
    const no = (p.nombreOriginal || '').toLowerCase();
    const c = (p.categoria || p.categoriaOrigen || '').toLowerCase();
    return n.includes(texto) || no.includes(texto) || c.includes(texto);
  });
  renderizarProductos(productosFiltrados);
};

function renderizarProductos(lista) {
  const select = document.getElementById('productoSeleccionado');
  select.innerHTML = '<option value="">-- ' + lista.length + ' productos --</option>';
  lista.forEach(function(p, i) {
    const opt = document.createElement('option');
    opt.value = i;
    const nombre = p.nombre || p.nombreOriginal || 'Sin nombre';
    const sub = p.categoriaOrigen ? '(' + p.categoriaOrigen + ')' : '';
    const badges = [];
    if (p.esNuevo) badges.push('🆕');
    if (p.esBestseller) badges.push('🏆');
    opt.textContent = badges.join('') + nombre + sub;
    select.appendChild(opt);
  });
}

window.aplicarProducto = function() {
  const categoria = document.getElementById('categoriaProducto').value;
  const idx = document.getElementById('productoSeleccionado').value;
  const preview = document.getElementById('previewProducto');
  const contVar = document.getElementById('contenedorVariantes');

  window.estadoImagenProducto = { activa: false, url: '', tamano: 30, posX: 50, posY: 30, rotacion: 0, opacidad: 22 };
  const checkUsarImg = document.getElementById('usarImagenProducto');
  if (checkUsarImg) checkUsarImg.checked = false;
  const checkUsarQR = document.getElementById('usarQRProducto');
  if (checkUsarQR) checkUsarQR.checked = false;
  const controlesImg = document.getElementById('controlesImagen');
  if (controlesImg) controlesImg.style.display = 'none';
  const opcionesQR = document.getElementById('opcionesQR');
  if (opcionesQR) opcionesQR.style.display = 'none';
  const imgVieja = document.getElementById('previewProductImg');
  if (imgVieja) imgVieja.style.display = 'none';

  const customUrlInput = document.getElementById('customImageUrl');
  if (customUrlInput) customUrlInput.value = '';

  if (!categoria || idx === '') {
    if (preview) preview.style.display = 'none';
    if (contVar) contVar.hidden = true;
    productoActual = null;
    return;
  }

  const producto = productosFiltrados[parseInt(idx)];
  productoActual = producto;
  codigoBarrasActual = obtenerCodigoBarrasProducto(producto);

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
    producto.variantes.forEach(function(v, i) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = v.nombre + ' — ' + formatPrecio(v.precio);
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
  if (imgURL && imgPreview) {
    imgPreview.src = imgURL;
    imgPreview.onerror = function() { imgPreview.src = ''; };
  }
  const elPreviewNombre = document.getElementById('previewNombre');
  if (elPreviewNombre) elPreviewNombre.textContent = producto.nombre || producto.nombreOriginal;
  const elPreviewCategoria = document.getElementById('previewCategoria');
  if (elPreviewCategoria) elPreviewCategoria.textContent = tipo;
  const badgesDiv = document.getElementById('previewBadges');
  if (badgesDiv) {
    badgesDiv.innerHTML = '';
    const badges = [];
    if (producto.esNuevo) badges.push({ txt: '✨ NUEVO', color: '#28a745' });
    if (producto.esBestseller) badges.push({ txt: '🏆 BESTSELLER', color: '#fd7e14' });
    if (producto.calificacion && producto.calificacion >= 4.5) badges.push({ txt: '⭐ ' + producto.calificacion, color: '#ffc107', textDark: true });
    badges.forEach(function(b) {
      const span = document.createElement('span');
      span.textContent = b.txt;
      span.style.cssText = 'padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ' + b.color + '; color: ' + (b.textDark ? '#1a1a1a' : '#fff') + '; margin-right: 4px;';
      badgesDiv.appendChild(span);
    });
  }
  const precioPreview = producto.precioOferta || producto.precio;
  const elPreviewPrecio = document.getElementById('previewPrecio');
  if (elPreviewPrecio) elPreviewPrecio.innerHTML = precioPreview ? formatPrecio(precioPreview) : '';
  if (preview) preview.style.display = 'block';

  agregarAlHistorial(producto);
  actualizarUIFavoritos();
  updateLabel();
};

window.aplicarVariante = function() {
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
  updateLabel();
};

// ==========================================
// ❤️ FAVORITOS E HISTORIAL
// ==========================================
function obtenerIdUnico(producto) {
  return (producto.tipoCatalogo || 'UNK') + '-' + (producto.id || producto.nombre);
}

window.toggleFavorito = function() {
  if (!productoActual) return;
  const productoId = obtenerIdUnico(productoActual);
  const idx = window.favoritos.findIndex(function(f) { return f.idUnico === productoId; });
  if (idx >= 0) window.favoritos.splice(idx, 1);
  else {
    window.favoritos.push({
      idUnico: productoId,
      nombre: productoActual.nombre || productoActual.nombreOriginal,
      categoria: productoActual.categoria || productoActual.categoriaOrigen,
      imagen: productoActual.imagen,
      tipoCatalogo: productoActual.tipoCatalogo
    });
  }
  localStorage.setItem('aromalabel_favoritos', JSON.stringify(window.favoritos));
  actualizarUIFavoritos();
  renderizarFavoritos();
};

function actualizarUIFavoritos() {
  const icono = document.getElementById('iconoFavorito');
  const texto = document.getElementById('textoFavorito');
  const btn = document.getElementById('btnFavorito');
  const contador = document.getElementById('contadorFavoritos');
  const esFav = productoActual && window.favoritos.some(function(f) { return f.idUnico === obtenerIdUnico(productoActual); });
  if (icono) icono.textContent = esFav ? '❤️' : '🤍';
  if (texto) texto.textContent = esFav ? 'En favoritos' : 'Agregar a favoritos';
  if (btn) { btn.style.background = esFav ? '#ffe6e6' : '#fff'; btn.style.borderColor = esFav ? '#ff6b6b' : '#e9ecef'; }
  if (contador) contador.textContent = window.favoritos.length;
}

function renderizarFavoritos() {
  const lista = document.getElementById('listaFavoritos');
  if (!lista) return;
  if (window.favoritos.length === 0) { lista.innerHTML = '<div style="text-align:center;color:#999;padding:10px;">💡 Haz ❤️ en un producto</div>'; return; }
  lista.innerHTML = window.favoritos.map(function(fav, i) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #f0f0f0;cursor:pointer;" onclick="cargarDesdeFavorito(' + i + ')"> <span>❤️</span> <div style="flex:1;min-width:0;"> <div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + fav.nombre + '</div> <div style="font-size:9px;color:#888;">' + (fav.categoria || '') + '</div> </div> <button onclick="event.stopPropagation();eliminarFavorito(' + i + ')" style="padding:2px 6px;background:#dc3545;color:white;border:none;border-radius:3px;cursor:pointer;font-size:9px;">✕</button> </div>';
  }).join('');
}

window.cargarDesdeFavorito = function(index) {
  const fav = window.favoritos[index];
  if (!fav) return;
  const productos = productosData[fav.tipoCatalogo] || [];
  const producto = productos.find(function(p) { return obtenerIdUnico(p) === fav.idUnico; });
  if (producto) {
    document.getElementById('categoriaProducto').value = fav.tipoCatalogo;
    cargarProductos();
    const idx = productosFiltrados.findIndex(function(p) { return obtenerIdUnico(p) === fav.idUnico; });
    if (idx >= 0) { document.getElementById('productoSeleccionado').value = idx; aplicarProducto(); }
  }
};

window.eliminarFavorito = function(index) {
  window.favoritos.splice(index, 1);
  localStorage.setItem('aromalabel_favoritos', JSON.stringify(window.favoritos));
  renderizarFavoritos();
  actualizarUIFavoritos();
};

function agregarAlHistorial(producto) {
  if (!producto) return;
  const productoId = obtenerIdUnico(producto);
  window.historial = window.historial.filter(function(h) { return h.idUnico !== productoId; });
  window.historial.unshift({
    idUnico: productoId,
    nombre: producto.nombre || producto.nombreOriginal,
    categoria: producto.categoria || producto.categoriaOrigen,
    tipoCatalogo: producto.tipoCatalogo,
    fechaUso: new Date().toISOString()
  });
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
  lista.innerHTML = window.historial.map(function(h, i) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #f0f0f0;cursor:pointer;" onclick="cargarDesdeHistorial(' + i + ')"> <span style="color:#888;">' + (i + 1) + '.</span> <div style="flex:1;min-width:0;"> <div style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + h.nombre + '</div> <div style="font-size:9px;color:#888;">' + (h.categoria || '') + '</div> </div> </div>';
  }).join('');
}

window.cargarDesdeHistorial = function(index) {
  const h = window.historial[index];
  if (!h) return;
  const productos = productosData[h.tipoCatalogo] || [];
  const producto = productos.find(function(p) { return obtenerIdUnico(p) === h.idUnico; });
  if (producto) {
    document.getElementById('categoriaProducto').value = h.tipoCatalogo;
    cargarProductos();
    const idx = productosFiltrados.findIndex(function(p) { return obtenerIdUnico(p) === h.idUnico; });
    if (idx >= 0) { document.getElementById('productoSeleccionado').value = idx; aplicarProducto(); }
  }
};

window.limpiarHistorial = function() {
  if (confirm('¿Limpiar todo el historial?')) {
    window.historial = [];
    localStorage.setItem('aromalabel_historial', JSON.stringify(window.historial));
    renderizarHistorial();
    const contador = document.getElementById('contadorHistorial');
    if (contador) contador.textContent = '0';
  }
};

// ==========================================
// 🔍 BÚSQUEDA GLOBAL
// ==========================================
window.busquedaGlobal = function() {
  const texto = document.getElementById('buscadorGlobal').value.toLowerCase().trim();
  const contenedor = document.getElementById('resultadosGlobal');
  if (!texto || texto.length < 2) { contenedor.style.display = 'none'; return; }
  const resultados = [];
  ['ESENCIAS', 'LIMPIEZA', 'VELAS'].forEach(function(cat) {
    (productosData[cat] || []).forEach(function(p) {
      const n = (p.nombre || '').toLowerCase();
      const no = (p.nombreOriginal || '').toLowerCase();
      const c = (p.categoria || p.categoriaOrigen || '').toLowerCase();
      if (n.includes(texto) || no.includes(texto) || c.includes(texto)) {
        resultados.push({ producto: p, categoria: cat });
      }
    });
  });
  const top = resultados.slice(0, 15);
  if (top.length === 0) {
    contenedor.innerHTML = '<div style="padding:10px;text-align:center;color:#999;">😕 Sin resultados</div>';
  } else {
    contenedor.innerHTML = top.map(function(r) {
      const p = r.producto;
      const icono = r.categoria === 'ESENCIAS' ? '🌸' : r.categoria === 'LIMPIEZA' ? '🧼' : '🕯️';
      const precio = p.precioOferta || p.precio;
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #f0f0f0;cursor:pointer;border-radius:4px;" onclick="seleccionarBusquedaGlobal(\'' + r.categoria + '\',\'' + obtenerIdUnico(p).replace(/'/g, "\\'") + '\')"> <span style="font-size:16px;">' + icono + '</span> <div style="flex:1;min-width:0;"> <div style="font-weight:bold;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (p.nombre || p.nombreOriginal) + '</div> <div style="font-size:10px;color:#888;">' + (p.categoria || p.categoriaOrigen || '') + ' · ' + formatPrecio(precio) + '</div> </div> </div>';
    }).join('');
  }
  contenedor.style.display = 'block';
};

window.seleccionarBusquedaGlobal = function(categoria, idUnico) {
  document.getElementById('categoriaProducto').value = categoria;
  cargarProductos();
  const idx = productosFiltrados.findIndex(function(p) { return obtenerIdUnico(p) === idUnico; });
  if (idx >= 0) {
    document.getElementById('productoSeleccionado').value = idx;
    aplicarProducto();
    document.getElementById('buscadorGlobal').value = '';
    document.getElementById('resultadosGlobal').style.display = 'none';
  }
};

// ==========================================
// 🖼️ LOGO E IMÁGENES
// ==========================================
window.handleLogoUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    logoDataUrl = e.target.result;
    const preview = document.getElementById('logoPreview');
    if (preview) { preview.src = logoDataUrl; preview.style.display = 'block'; }
    const showLogoImg = document.getElementById('showLogoImg');
    if (showLogoImg) showLogoImg.checked = true;
    updateLabel();
    showToast('✅ Logo cargado', 'success');
  };
  reader.readAsDataURL(file);
};

window.cargarLogoDesdeURL = function() {
  const urlInput = document.getElementById('logoUrl');
  if (!urlInput) return;
  const url = urlInput.value.trim();
  if (!url) return;
  logoDataUrl = url;
  const preview = document.getElementById('logoPreview');
  if (preview) { preview.src = url; preview.style.display = 'block'; }
  const showLogoImg = document.getElementById('showLogoImg');
  if (showLogoImg) showLogoImg.checked = true;
  updateLabel();
};

window.updateLogoControls = function() {
  ['logoSize', 'logoRot', 'logoOpa', 'logoPosX', 'logoPosY'].forEach(function(id) {
    const val = document.getElementById(id + 'Val');
    const input = document.getElementById(id);
    if (val && input) val.textContent = input.value;
  });
  updateLabel();
};

window.toggleImagenProducto = function() {
  const checkbox = document.getElementById('usarImagenProducto');
  const controles = document.getElementById('controlesImagen');
  window.estadoImagenProducto.activa = checkbox.checked;
  controles.style.display = checkbox.checked ? 'block' : 'none';
  if (checkbox.checked) {
    const customUrlInput = document.getElementById('customImageUrl');
    const customUrl = customUrlInput ? customUrlInput.value.trim() : '';
    if (customUrl) {
      window.estadoImagenProducto.url = customUrl;
    } else if (productoActual && productoActual.imagen) {
      window.estadoImagenProducto.url = normalizarURL(productoActual.imagen);
    } else {
      window.estadoImagenProducto.url = '';
    }
  } else {
    window.estadoImagenProducto.url = '';
    const imgVieja = document.getElementById('previewProductImg');
    if (imgVieja) imgVieja.style.display = 'none';
  }
  actualizarImagen();
};

window.actualizarImagen = function() {
  window.estadoImagenProducto.tamano = parseInt(document.getElementById('tamanoImagen').value);
  window.estadoImagenProducto.posX = parseInt(document.getElementById('posXImagen').value);
  window.estadoImagenProducto.posY = parseInt(document.getElementById('posYImagen').value);
  window.estadoImagenProducto.rotacion = parseInt(document.getElementById('rotacionImagen').value);
  const opacityInput = document.getElementById('opacidadImagen');
  window.estadoImagenProducto.opacidad = opacityInput ? parseInt(opacityInput.value) : 22;
  document.getElementById('tamanoImagenValor').textContent = window.estadoImagenProducto.tamano;
  document.getElementById('posXImagenValor').textContent = window.estadoImagenProducto.posX;
  document.getElementById('posYImagenValor').textContent = window.estadoImagenProducto.posY;
  document.getElementById('rotacionImagenValor').textContent = window.estadoImagenProducto.rotacion;
  const opacityValue = document.getElementById('opacidadImagenValor');
  if (opacityValue) opacityValue.textContent = window.estadoImagenProducto.opacidad;
  updateLabel();
};

window.resetearImagen = function() {
  document.getElementById('tamanoImagen').value = 30;
  document.getElementById('posXImagen').value = 50;
  document.getElementById('posYImagen').value = 30;
  document.getElementById('rotacionImagen').value = 0;
  document.getElementById('opacidadImagen').value = 22;
  actualizarImagen();
};

window.centrarImagen = function() {
  document.getElementById('posXImagen').value = 50;
  document.getElementById('posYImagen').value = 50;
  actualizarImagen();
};

window.agregarImagenProducto = function() {
  const customUrlInput = document.getElementById('customImageUrl');
  const urlPersonalizada = customUrlInput ? customUrlInput.value.trim() : '';
  if (urlPersonalizada) {
    window.estadoImagenProducto.url = urlPersonalizada;
  } else if (productoActual && productoActual.imagen) {
    window.estadoImagenProducto.url = normalizarURL(productoActual.imagen);
  } else {
    alert('⚠️ El producto no tiene imagen y no has ingresado una URL.');
    return;
  }
  window.estadoImagenProducto.activa = true;
  document.getElementById('usarImagenProducto').checked = true;
  document.getElementById('controlesImagen').style.display = 'block';
  actualizarImagen();
  showToast('🖼️ Imagen agregada al diseñador', 'success');
};

window.actualizarImagenDesdeURL = function() {
  const customUrlInput = document.getElementById('customImageUrl');
  if (!customUrlInput) return;
  const url = customUrlInput.value.trim();
  const checkbox = document.getElementById('usarImagenProducto');
  if (url && checkbox && checkbox.checked) {
    window.estadoImagenProducto.url = url;
    window.estadoImagenProducto.activa = true;
    updateLabel();
  }
};

window.handleBgImageUpload = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    window.estadoImagenFondo.url = dataUrl;
    const urlInput = document.getElementById('bgImageUrl');
    if (urlInput) urlInput.value = dataUrl.substring(0, 50) + '... [imagen local]';
    const previewWrap = documentgetElementById('bgImagePreviewWrap');
    const preview = document.getElementById('bgImagePreview');
    if (preview) preview.src = dataUrl;
    if (previewWrap) previewWrap.style.display = 'block';
    updateLabel();
    showToast('✅ Imagen de fondo cargada', 'success');
  };
  reader.readAsDataURL(file);
};

window.actualizarImagenFondo = function() {
  const urlInput = document.getElementById('bgImageUrl');
  const opacityInput = document.getElementById('bgImageOpacity');
  const fitInput = document.getElementById('bgImageFit');
  const opacityVal = document.getElementById('bgImageOpacityVal');
  const url = urlInput ? urlInput.value.trim() : '';
  if (url && url.indexOf('[imagen local]') === -1) {
    windowestadoImagenFondo.url = url;
    const previewWrap = document.getElementById('bgImagePreviewWrap');
    const preview = document.getElementById('bgImagePreview');
    if (preview) preview.src = url;
    if (previewWrap) previewWrap.style.display = 'block';
  } else if (!url) {
    window.estadoImagenFondo.url = '';
    const previewWrap = document.getElementById('bgImagePreviewWrap');
    if (previewWrap) previewWrap.style.display = 'none';
  }
  window.estadoImagenFondo.opacity = opacityInput ? (parseInt(opacityInput.value) / 100) : 0.3;
  window.estadoImagenFondo.fit = fitInput ? fitInput.value : 'contain';
  if (opacityVal && opacityInput) opacityVal.textContent = opacityInput.value;
  updateLabel();
};

window.quitarImagenFondo = function() {
  window.estadoImagenFondo = { url: '', opacity: 0.3, fit: 'contain' };
  const urlInput = document.getElementById('bgImageUrl');
  if (urlInput) urlInput.value = '';
  const fileInput = document.getElementById('bgImageUpload');
  if (fileInput) fileInput.value = '';
  const previewWrap = document.getElementById('bgImagePreviewWrap');
  if (previewWrap) previewWrap.style.display = 'none';
  updateLabel();
  showToast('🗑️ Imagen de fondo quitada', 'info');
};

// ==========================================
// 📱 CONTROLES Y SINCRO DEL QR
// ==========================================
window.toggleQRProducto = function() {
  const checkbox = document.getElementById('usarQRProducto');
  const opcionesQR = document.getElementById('opcionesQR');
  const showQRCheckbox = document.getElementById('showQR');

  if (!checkbox) return;

  if (!checkbox.checked) {
    if (opcionesQR) opcionesQR.style.display = 'none';
    if (showQRCheckbox) showQRCheckbox.checked = false;
    updateLabel();
    return;
  }

  if (opcionesQR) opcionesQR.style.display = 'block';
  if (showQRCheckbox) showQRCheckbox.checked = true;
  
  actualizarQR();
};

window.actualizarQR = function() {
  const elQrUrl = document.getElementById('qrUrl');
  let contenido = '';
  
  if (productoActual) {
    const tipoQR = document.querySelector('input[name="tipoQR"]:checked');
    const tipoQRValue = tipoQR ? tipoQR.value : 'facebook';
    
    switch(tipoQRValue) {
      case 'facebook':
        contenido = 'https://www.facebook.com/profile.php?id=61579078480913';
        break;
      case 'producto':
        contenido = 'https://wil1979.github.io/esentia-factura/producto.html?id=' + (productoActual.id || '');
        break;
      case 'json':
        const varSel = document.getElementById('varianteSeleccionada');
        const variante = productoActual.variantes ? productoActual.variantes[varSel ? varSel.value || 0 : 0] : null;
        contenido = JSON.stringify({
          id: productoActual.id || '',
          nombre: productoActual.nombre || productoActual.nombreOriginal || '',
          precio: variante ? variante.precio : (productoActual.precioOferta || productoActual.precio || 0)
        });
        break;
      default:
        contenido = elQrUrl ? elQrUrl.value : 'https://example.com';
    }
  } else {
    contenido = elQrUrl && elQrUrl.value ? elQrUrl.value : 'https://example.com';
  }

  if (elQrUrl) elQrUrl.value = contenido;
  updateLabel();
};

// ==========================================
// 💾 PROYECTOS
// ==========================================
function getCurrentConfig() {
  const gv = function(id, fallback) {
    fallback = fallback || '';
    const el = document.getElementById(id);
    return el ? (el.value !== undefined ? el.value : fallback) : fallback;
  };
  const gc = function(id, fallback) {
    fallback = fallback || false;
    const el = document.getElementById(id);
    return el ? (el.checked !== undefined ? el.checked : fallback) : fallback;
  };
  return {
    width: gv('labelWidth', 60),
    height: gv('labelHeight', 80),
    padding: gv('labelPadding', 1.5),
    borderRadius: gv('borderRadius', 4),
    areaGap: gv('areaGap', 2),
    logoAreaX: gv('logoAreaX', 0),
    logoAreaY: gv('logoAreaY', 0),
    productAreaX: gv('productAreaX', 0),
    productAreaY: gv('productAreaY', 0),
    instructionsAreaX: gv('instructionsAreaX', 0),
    instructionsAreaY: gv('instructionsAreaY', 0),
    footerAreaX: gv('footerAreaX', 0),
    footerAreaY: gv('footerAreaY', 0),
    fontBrand: gv('fontBrand', 21),
    fontBrandSub: gv('fontBrandSub', 0),
    fontProduct: gv('fontProduct', 19),
    fontType: gv('fontType', 10),
    fontDetails: gv('fontDetails', 9),
    fontInstr: gv('fontInstr', 10),
    fontBatch: gv('fontBatch', 9),
    fontOrigin: gv('fontOrigin', 8),
    instructionsWidth: gv('instructionsWidth', 100),
    instructionsHeight: gv('instructionsHeight', 100),
    qrSize: gv('qrSize', 34),
    brandFont: gv('brandFont'),
    productFont: gv('productFont'),
    accentColor: gv('accentColor', '#c9a96e'),
    textColor: gv('textColor', '#1a1a1a'),
    bgColor: gv('bgColor', '#ffffff'),
    qrColor: gv('qrColor', '#000000'),
    qrBgColor: gv('qrBgColor', '#ffffff'),
    showDivider: gc('showDivider', false),
    dividerColor: gv('dividerColor', '#c9a96e'),
    dividerWidth: gv('dividerWidth', 1),
    showQR: gc('showQR', false) || gc('usarQRProducto', false),
    showInstructions: gc('showInstructions', true),
    showFooter: gc('showFooter', true),
    vinylMode: gc('vinylMode', false),
    boldTextMode: gc('boldTextMode', false),
    frostedBg: gc('frostedBg', false),
    images: getImagesConfig(),
    showDetails: gc('showDetails', false),
    showPrice: gc('showPrice', false),
    labelShape: localStorage.getItem('aromaLabelShape') || 'rectangular',
    qrPosX: gv('qrPosX', 20),
    qrPosY: gv('qrPosY', 80),
    qrRotation: gv('qrRotation', 0),
    barcodePosX: gv('barcodePosX', 71),
    barcodePosY: gv('barcodePosY', 89),
    barcodeRotation: gv('barcodeRotation', 0),
    showBarcode: gc('showBarcode', false),
    productId: obtenerCodigoBarrasProducto(productoActual) || codigoBarrasActual,
    fullBorder: gc('fullBorder', false),
    topBorderOnly: gc('topBorderOnly', false),
    bottomBorderOnly: gc('bottomBorderOnly', false),
    borderWidth: gv('borderWidth', 2),
    borderColor: gv('borderColor', '#c9a96e'),
    borderStyle: gv('borderStyle', 'solid'),
    showLogoImg: gc('showLogoImg', false),
    logoSize: gv('logoSize', 80),
    logoPosX: gv('logoPosX', 50),
    logoPosY: gv('logoPosY', 50),
    logoRot: gv('logoRot', 0),
    logoOpa: gv('logoOpa', 100),
    estadoImagenFondo: window.estadoImagenFondo ? Object.assign({}, window.estadoImagenFondo) : null,
    imagenProducto: window.estadoImagenProducto ? Object.assign({}, window.estadoImagenProducto) : null
  };
}

function getCurrentContent() {
  const gv = function(id, fallback) {
    fallback = fallback || '';
    const el = document.getElementById(id);
    return el ? (el.value !== undefined ? el.value : fallback) : fallback;
  };
  return {
    projectName: gv('projectName', 'Mi Etiqueta'),
    brandName: gv('brandName', 'Esentia'),
    brandSub: gv('brandSub', ''),
    productName: gv('productName', 'Producto'),
    productType: gv('productType', ''),
    productDetails: gv('productDetails', ''),
    productPrice: gv('productPrice', ''),
    showPrice: document.getElementById('showPrice') ? document.getElementById('showPrice').checked : false,
    showDetails: document.getElementById('showDetails') ? document.getElementById('showDetails').checked : false,
    showDivider: document.getElementById('showDivider') ? document.getElementById('showDivider').checked : false,
    showQR: (document.getElementById('showQR') ? document.getElementById('showQR').checked : false) || (document.getElementById('usarQRProducto') ? document.getElementById('usarQRProducto').checked : false),
    showInstructions: document.getElementById('showInstructions') ? document.getElementById('showInstructions').checked : false,
    showFooter: document.getElementById('showFooter') ? document.getElementById('showFooter').checked : false,
    instructions: gv('instructions', ''),
    batchInfo: gv('batchInfo', ''),
    originInfo: gv('originInfo', ''),
    qrUrl: gv('qrUrl', '')
  };
}

function getImagesConfig() { return imagesList.map(function(img) { return Object.assign({}, img); }); }

window.saveProject = function() {
  try {
    const nombreProducto = productoActual && (productoActual.nombre || productoActual.nombreOriginal);
    const projectNameInput = document.getElementById('projectName');
    const projectName = nombreProducto || (projectNameInput ? projectNameInput.value : '') || 'Sin nombre';
    if (projectNameInput && nombreProducto) projectNameInput.value = projectName;
    const project = {
      id: Date.now(),
      name: projectName,
      date: new Date().toLocaleDateString('es-ES'),
      config: getCurrentConfig(),
      content: getCurrentContent(),
      logoDataUrl: logoDataUrl,
      images: getImagesConfig(),
      lastModified: new Date().toISOString()
    };
    const existingIdx = projects.findIndex(function(p) { return p.name === project.name; });
    if (existingIdx >= 0) {
      project.id = projects[existingIdx].id;
      projects[existingIdx] = project;
      showToast('✅ Proyecto actualizado', 'success');
    } else {
      projects.push(project);
      showToast('💾 Proyecto guardado', 'success');
    }
    localStorage.setItem('aromaProjects', JSON.stringify(projects));
    loadAllProjects();
  } catch (e) {
    showToast('❌ Error al guardar: ' + e.message, 'danger');
    console.error(e);
  }
};

async function generateProjectThumbnail(project) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const widthMm = parseInt(project.config.width) || 60;
  const heightMm = parseInt(project.config.height) || 80;
  canvas.width = widthMm * 4;
  canvas.height = heightMm * 4;
  ctx.fillStyle = project.config.vinylMode ? 'transparent' : (project.config.bgColor || '#ffffff');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = project.config.textColor || '#1a1a1a';
  ctx.textAlign = 'center';
  if (project.content.brandName) {
    ctx.font = 'bold ' + Math.min(canvas.width, canvas.height) * 0.15 + 'px Playfair Display';
    ctx.fillText(project.content.brandName, canvas.width / 2, canvas.height * 0.2);
  }
  if (project.content.productName) {
    ctx.font = 'bold ' + Math.min(canvas.width, canvas.height) * 0.12 + 'px Playfair Display';
    ctx.fillText(project.content.productName, canvas.width / 2, canvas.height * 0.5);
  }
  return canvas.toDataURL('image/png');
}

async function loadAllProjects() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  if (projects.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><h3>No hay proyectos guardados</h3><p>Crea tu primera etiqueta en el Diseñador y guárdala aquí.</p></div>';
    return;
  }
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    if (!project.thumbnail) {
      try { project.thumbnail = await generateProjectThumbnail(project); }
      catch (e) { project.thumbnail = null; }
    }
  }
  localStorage.setItem('aromaProjects', JSON.stringify(projects));
  grid.innerHTML = projects.map(function(p) {
    return '<div class="project-card" onclick="loadProject(' + p.id + ')"> <div class="project-preview"> ' + (p.thumbnail ? '<img src="' + p.thumbnail + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:contain;">' : '<div style="font-size:3rem;">🏷️</div>') + ' </div> <div class="project-name">' + p.name + '</div> <div class="project-meta">📅 ' + p.date + '</div> <div class="project-actions"> <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();loadProject(' + p.id + ')">📂 Cargar</button> <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteProject(' + p.id + ')">🗑️</button> </div> </div>';
  }).join('');
}

window.loadProject = function(id) {
  const project = projects.find(function(p) { return p.id === id; });
  if (!project) { showToast('❌ Proyecto no encontrado', 'danger'); return; }
  try {
    if (project.config) {
      Object.keys(project.config).forEach(function(key) {
        const el = document.getElementById(key);
        if (el) {
          if (el.type === 'checkbox') el.checked = project.config[key];
          else el.value = project.config[key];
        }
      });
      if (project.config.productId != null) codigoBarrasActual = String(project.config.productId).trim();
      if (project.config.imagenProducto) window.estadoImagenProducto = Object.assign({}, project.config.imagenProducto);
      if (project.config.estadoImagenFondo) window.estadoImagenFondo = Object.assign({}, project.config.estadoImagenFondo);
    }
    if (project.content) {
      Object.keys(project.content).forEach(function(key) {
        const el = document.getElementById(key);
        if (el) {
          if (el.type === 'checkbox') el.checked = project.content[key];
          else el.value = project.content[key];
        }
      });
    }
    if (project.logoDataUrl) {
      logoDataUrl = project.logoDataUrl;
      const preview = document.getElementById('logoPreview');
      if (preview) { preview.src = logoDataUrl; preview.style.display = 'block'; }
    }
    if (project.images && Array.isArray(project.images)) {
      imagesList = project.images.map(function(img) { return Object.assign({}, img); });
      renderImagesList();
    }
    if (project.config && project.config.labelShape) {
      const _sb = document.querySelector('.shape-btn[onclick*="' + project.config.labelShape + '"]');
      if (_sb) cambiarForma(project.config.labelShape, _sb);
    }
    sincronizarValoresSliders();
    updateLabel();
    showSection('designer');
    showToast('✅ Proyecto "' + project.name + '" cargado', 'success');
  } catch (e) {
    showToast('❌ Error al cargar: ' + e.message, 'danger');
    console.error(e);
  }
};

window.deleteProject = function(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  projects = projects.filter(function(p) { return p.id !== id; });
  localStorage.setItem('aromaProjects', JSON.stringify(projects));
  loadAllProjects();
  showToast('🗑️ Proyecto eliminado', 'info');
};

// ==========================================
// 🖨️ IMPRESIÓN Y RENDERIZADO RÁPIDO
// ==========================================
window.addToPrintQueue = function() {
  const labelPreview = document.getElementById('labelPreview');
  if (!labelPreview) { showToast('❌ No se encontró la vista previa', 'danger'); return; }
  try {
    const labelClone = labelPreview.cloneNode(true);
    const nombreProducto = productoActual && (productoActual.nombre || productoActual.nombreOriginal);
    const item = {
      id: Date.now(),
      name: nombreProducto || (document.getElementById('projectName') ? document.getElementById('projectName').value : '') || 'Sin nombre',
      config: getCurrentConfig(),
      content: getCurrentContent(),
      logoDataUrl: logoDataUrl,
      html: labelClone.outerHTML,
      qty: 1
    };
    printQueue.push(item);
    updatePrintQueueDisplay();
    updateSheetPreview();
    showToast('➕ Etiqueta añadida a la cola', 'success');
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'danger');
    console.error(e);
  }
};

function updatePrintQueueDisplay() {
  const queueEl = document.getElementById('printQueueList');
  if (!queueEl) return;
  queueEl.innerHTML = '';
  if (printQueue.length === 0) {
    queueEl.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">No hay etiquetas en la cola.</div>';
    return;
  }
  printQueue.forEach(function(item, i) {
    const card = document.createElement('article');
    card.className = 'queue-design-item';
    const preview = document.createElement('div');
    preview.className = 'queue-design-preview';
    preview.innerHTML = item.html || '';
    const label = preview.querySelector('.label');
    if (label) {
      const widthMm = parseFloat(item.config && item.config.width) || 60;
      const heightMm = parseFloat(item.config && item.config.height) || 80;
      const scale = Math.min(1, 150 / (widthMm * 3.7795), 165 / (heightMm * 3.7795));
      label.style.width = widthMm + 'mm';
      label.style.height = heightMm + 'mm';
      label.style.transform = 'scale(' + scale + ')';
      label.style.transformOrigin = 'top left';
      label.style.boxShadow = '0 1px 5px rgba(0,0,0,.18)';
      label.querySelectorAll('[id]').forEach(function(el) { el.removeAttribute('id'); });
      label.removeAttribute('id');
      preview.style.width = (widthMm * 3.7795 * scale) + 'px';
      preview.style.height = (heightMm * 3.7795 * scale) + 'px';
    }
    const controls = document.createElement('div');
    controls.className = 'queue-design-controls';
    const title = document.createElement('div');
    title.className = 'queue-design-title';
    title.textContent = (i + 1) + '. ' + (item.name || (item.content && item.content.productName) || 'Diseño sin nombre');
    const qtyLabel = document.createElement('label');
    qtyLabel.className = 'queue-qty-label';
    qtyLabel.textContent = 'Cantidad';
    const qty = document.createElement('input');
    qty.type = 'number';
    qty.className = 'qty-input';
    qty.min = '1';
    qty.step = '1';
    qty.value = Math.max(1, parseInt(item.qty, 10) || 1);
    qty.addEventListener('change', function() {
      item.qty = Math.max(1, parseInt(qty.value, 10) || 1);
      qty.value = item.qty;
      updateSheetPreview();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger btn-sm';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', function() {
      printQueue.splice(i, 1);
      updatePrintQueueDisplay();
      updateSheetPreview();
    });
    controls.append(title, qtyLabel, qty, remove);
    card.append(preview, controls);
    queueEl.appendChild(card);
  });
}

const SHEET_SIZES = { 'A4': [210, 297], 'Carta': [216, 279], 'Oficio': [216, 356], 'A3': [297, 420], 'A5': [148, 210] };

window.updateSheetPreview = function() {
  const total = printQueue.reduce(function(sum, item) { return sum + Math.max(1, parseInt(item.qty) || 1); }, 0);
  const designs = printQueue.length;
  let per = 0, sheets = 0, eff = 0, sheetName = 'A4';
  const sheetSel = document.getElementById('sheetSize');
  if (sheetSel) sheetName = sheetSel.value;
  if (designs > 0) {
    const w = parseFloat(printQueue[0].config && printQueue[0].config.width) || 60;
    const h = parseFloat(printQueue[0].config && printQueue[0].config.height) || 80;
    const gv = function(id, d) { const el = document.getElementById(id); const n = el ? parseFloat(el.value) : NaN; return isNaN(n) ? d : n; };
    const dims = SHEET_SIZES[sheetName] || SHEET_SIZES['A4'];
    const pw = dims[0], ph = dims[1];
    const ml = gv('marginLeft', 3), mr = gv('marginRight', 3);
    const mt = gv('marginTop', 3), mb = gv('marginBottom', 3);
    const sx = gv('spaceX', 0), sy = gv('spaceY', 0);
    const cols = Math.max(0, Math.floor((pw - ml - mr + sx) / (w + sx)));
    const rows = Math.max(0, Math.floor((ph - mt - mb + sy) / (h + sy)));
    per = cols * rows;
    sheets = per > 0 ? Math.ceil(total / per) : 0;
    eff = (sheets > 0 && per > 0) ? Math.round((total / (sheets * per)) * 100) : 0;
  }
  const statsEl = document.getElementById('printStats');
  if (statsEl) statsEl.innerHTML =
    '<div class="stat"><div class="stat-value">' + total + '</div><div class="stat-label">Etiquetas en Cola</div></div>' +
    '<div class="stat"><div class="stat-value">' + per + '</div><div class="stat-label">Por Hoja (' + sheetName + ')</div></div>' +
    '<div class="stat"><div class="stat-value">' + sheets + '</div><div class="stat-label">Hojas Necesarias</div></div>' +
    '<div class="stat"><div class="stat-value stat-highlight">' + eff + '%</div><div class="stat-label">Eficiencia</div></div>';
};

const PRINT_RENDER_SCALE = 4;

async function renderLabelForPrint(item) {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;';
  container.innerHTML = item.html || '';
  document.body.appendChild(container);
  const label = container.querySelector('.label');
  if (!label) { document.body.removeChild(container); throw new Error('Etiqueta no disponible'); }
  
  const c = item.config || {};
  const content = item.content || {};
  const num = function(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; };
  const widthMm = num(c.width, 60);
  const heightMm = num(c.height, 80);
  const areaGap = Math.max(0, Math.min(30, num(c.areaGap, 2)));
  const qrSizeMm = Math.max(12, Math.min(Math.min(widthMm, heightMm) * 0.8, Math.min(widthMm, heightMm) * (num(c.qrSize, 34) / 100)));
  const instructionsWidth = Math.max(20, Math.min(100, num(c.instructionsWidth, 100)));
  const instructionsHeight = Math.max(10, Math.min(100, num(c.instructionsHeight, 100)));

  label.style.setProperty('--label-width', widthMm + 'mm');
  label.style.setProperty('--label-height', heightMm + 'mm');
  label.style.setProperty('--label-padding', num(c.padding, 1.5) + 'mm');
  label.style.setProperty('--border-radius', num(c.borderRadius, 4) + 'px');
  label.style.setProperty('--area-gap', areaGap + 'px');
  label.style.setProperty('--accent-color', c.accentColor || '#c9a96e');
  label.style.setProperty('--text-color', c.textColor || '#1a1a1a');
  label.style.setProperty('--qr-size', num(c.qrSize, 34) + '%');
  label.style.setProperty('--brand-font', c.brandFont || "'Playfair Display', serif");
  label.style.setProperty('--product-font', c.productFont || "'Playfair Display', serif");

  label.className = 'label' + (c.vinylMode ? ' vinyl-mode' : '') + (c.labelShape ? ' shape-' + c.labelShape : '') + (c.boldTextMode ? ' bold-text' : '');
  if (c.vinylMode) label.style.backgroundColor = 'transparent';
  else label.style.backgroundColor = c.bgColor || '#ffffff';
  label.style.borderRadius = num(c.borderRadius, 4) + 'px';
  label.style.boxShadow = 'none';

  const bw = num(c.borderWidth, 2), bc = c.borderColor || '#c9a96e', bs = c.borderStyle || 'solid';
  if (c.fullBorder) label.style.border = bw + 'px ' + bs + ' ' + bc;
  else {
    if (c.topBorderOnly) label.style.borderTop = bw + 'px ' + bs + ' ' + bc;
    if (c.bottomBorderOnly) label.style.borderBottom = bw + 'px ' + bs + ' ' + bc;
  }

  const brandEl = label.querySelector('.label-logo');
  const brandSubEl = label.querySelector('.label-logo-sub');
  const productEl = label.querySelector('.label-name');
  const typeEl = label.querySelector('.label-type');
  const detailsEl = label.querySelector('#previewDetails');
  const priceEl = label.querySelector('#previewPrice');
  const instrEl = label.querySelector('.label-instructions');
  const batchEl = label.querySelector('.label-batch');
  const originEl = label.querySelector('#previewOrigin');
  const dividerEl = label.querySelector('#labelDivider');

  if (brandEl) { brandEl.textContent = content.brandName || ''; brandEl.style.fontSize = num(c.fontBrand, 21) + 'px'; brandEl.style.fontFamily = c.brandFont || 'inherit'; brandEl.style.color = c.textColor || '#1a1a1a'; }
  if (brandSubEl) { brandSubEl.textContent = content.brandSub || ''; brandSubEl.style.fontSize = num(c.fontBrandSub, 0) + 'px'; }
  if (productEl) { productEl.textContent = content.productName || 'Producto'; productEl.style.display = 'block'; productEl.style.fontSize = num(c.fontProduct, 19) + 'px'; productEl.style.fontFamily = c.productFont || 'inherit'; productEl.style.color = c.textColor || '#1a1a1a'; }
  if (typeEl) { typeEl.textContent = content.productType || ''; typeEl.style.fontSize = num(c.fontType, 10) + 'px'; typeEl.style.color = c.accentColor || '#c9a96e'; }
  if (detailsEl) { detailsEl.textContent = content.productDetails || ''; detailsEl.style.fontSize = num(c.fontDetails, 9) + 'px'; detailsEl.style.display = c.showDetails ? 'block' : 'none'; }
  if (priceEl) {
    if (c.showPrice && content.productPrice) {
      priceEl.textContent = content.productPrice;
      priceEl.style.display = 'block';
      priceEl.style.fontSize = (num(c.fontDetails, 9) + 1) + 'px';
      priceEl.style.color = c.accentColor || '#c9a96e';
      priceEl.style.fontWeight = 'bold';
    } else priceEl.style.display = 'none';
  }

  const productImg = label.querySelector('#previewProductImg');
  const productImgState = c.imagenProducto || {};
  if (productImg) {
    const imageActive = productImgState.activa !== false && (productImgState.url || productImg.getAttribute('src'));
    productImg.classList.add('label-product-img');
    productImg.style.position = 'absolute';
    productImg.style.left = num(productImgState.posX, 50) + '%';
    productImg.style.top = num(productImgState.posY, 30) + '%';
    productImg.style.width = num(productImgState.tamano, 30) + '%';
    productImg.style.height = 'auto';
    productImg.style.opacity = String(num(productImgState.opacidad, 22) / 100);
    productImg.style.transform = 'translate(-50%, -50%) rotate(' + num(productImgState.rotacion, 0) + 'deg)';
    productImg.style.zIndex = '2';
    productImg.style.pointerEvents = 'none';
    productImg.style.display = imageActive ? 'block' : 'none';
  }
  if (dividerEl) {
    const dividerColor = c.dividerColor || '#c9a96e';
    const dividerWidth = num(c.dividerWidth, 1);
    dividerEl.style.borderTop = dividerWidth + 'px solid ' + dividerColor;
    if (c.showDivider) dividerEl.classList.add('visible');
    else dividerEl.classList.remove('visible');
  }

  if (instrEl) {
    instrEl.textContent = content.instructions || '';
    instrEl.style.fontSize = num(c.fontInstr, 10) + 'px';
    instrEl.style.width = instructionsWidth + '%';
    instrEl.style.maxHeight = instructionsHeight + '%';
    instrEl.style.maxWidth = '100%';
    instrEl.style.boxSizing = 'border-box';
    instrEl.style.display = c.showInstructions !== false ? 'block' : 'none';
    if (c.frostedBg) instrEl.classList.add('frosted-bg');
    else instrEl.classList.remove('frosted-bg');
  }
  if (batchEl) { batchEl.textContent = content.batchInfo || ''; batchEl.style.fontSize = num(c.fontBatch, 9) + 'px'; batchEl.style.color = c.textColor || '#1a1a1a'; }
  if (originEl) { originEl.textContent = content.originInfo || ''; originEl.style.fontSize = num(c.fontOrigin, 8) + 'px'; }

  const footerEl = label.querySelector('.label-footer');
  if (footerEl) footerEl.style.display = c.showFooter !== false ? 'flex' : 'none';

  // 📱 GENERACIÓN DE QR PARA EXPORTACIÓN/IMPRESIÓN
  const qrEl = label.querySelector('.label-qr') || label.querySelector('#previewQR');
  if (qrEl) {
    const isQrVisible = c.showQR || c.usarQRProducto;
    if (isQrVisible) {
      qrEl.style.display = 'block';
      qrEl.style.setProperty('width', qrSizeMm + 'mm', 'important');
      qrEl.style.setProperty('height', qrSizeMm + 'mm', 'important');
      qrEl.style.setProperty('min-width', qrSizeMm + 'mm', 'important');
      qrEl.style.setProperty('min-height', qrSizeMm + 'mm', 'important');
      qrEl.style.aspectRatio = '1 / 1';
      qrEl.style.backgroundColor = '#ffffff';
      qrEl.style.padding = '2px';
      qrEl.style.boxSizing = 'border-box';
      qrEl.style.position = 'absolute';
      qrEl.style.left = (c.qrPosX != null ? c.qrPosX : 20) + '%';
      qrEl.style.top = (c.qrPosY != null ? c.qrPosY : 80) + '%';
      qrEl.style.transform = 'translate(-50%, -50%) rotate(' + (c.qrRotation || 0) + 'deg)';
      qrEl.style.zIndex = '6';
      
      try {
        const qrCanvas = buildQRCanvas(
          content.qrUrl || 'https://example.com', 
          400 * PRINT_RENDER_SCALE, 
          c.qrColor || '#000000', 
          '#ffffff'
        );
        qrCanvas.style.width = '100%';
        qrCanvas.style.height = '100%';
        qrCanvas.style.display = 'block';
        qrEl.innerHTML = '';
        qrEl.appendChild(qrCanvas);
      } catch (e) {
        console.warn('Error al generar el QR para impresión:', e);
      }
    } else {
      qrEl.style.display = 'none';
    }
  }

  const barcodeWrap = label.querySelector('.label-barcode-wrap');
  const barcodeId = c.productId || '';
  if (barcodeWrap) {
    if (c.showBarcode && barcodeId && typeof JsBarcode === 'function') {
      try {
        barcodeWrap.style.display = 'flex';
        barcodeWrap.classList.add('is-positioned');
        barcodeWrap.style.position = 'absolute';
        barcodeWrap.style.left = (c.barcodePosX != null ? c.barcodePosX : 71) + '%';
        barcodeWrap.style.top = (c.barcodePosY != null ? c.barcodePosY : 89) + '%';
        barcodeWrap.style.transform = 'translate(-50%, -50%) rotate(' + (c.barcodeRotation || 0) + 'deg)';
        barcodeWrap.style.zIndex = '6';
        const bcCanvas = document.createElement('canvas');
        JsBarcode(bcCanvas, barcodeId, {
          format: 'CODE128', displayValue: true, text: barcodeId,
          font: 'monospace', fontSize: 10 * PRINT_RENDER_SCALE,
          textMargin: 1 * PRINT_RENDER_SCALE, margin: 2 * PRINT_RENDER_SCALE,
          height: 32 * PRINT_RENDER_SCALE, width: 1.5 * PRINT_RENDER_SCALE,
          lineColor: '#111111', background: '#ffffff'
        });
        bcCanvas.style.maxWidth = '90%';
        bcCanvas.style.maxHeight = '14mm';
        bcCanvas.style.display = 'block';
        const oldSvg = barcodeWrap.querySelector('svg');
        if (oldSvg) oldSvg.style.display = 'none';
        const oldCanvas = barcodeWrap.querySelector('canvas');
        if (oldCanvas && oldCanvas !== bcCanvas) oldCanvas.remove();
        barcodeWrap.appendChild(bcCanvas);
      } catch (e) { barcodeWrap.style.display = 'none'; }
    } else {
      barcodeWrap.style.display = 'none';
    }
  }

  const logoArea = label.querySelector('.label-logo-area');
  const productArea = label.querySelector('.label-product');
  if (logoArea) logoArea.style.padding = areaGap + 'px 0';
  if (productArea) productArea.style.padding = areaGap + 'px 0';
  if (instrEl) instrEl.style.padding = areaGap + 'px 0';
  if (footerEl) footerEl.style.paddingTop = areaGap + 'px';

  const setPrintAreaPosition = function(area, xKey, yKey) {
    if (!area) return;
    const x = num(c[xKey], 0);
    const y = num(c[yKey], 0);
    area.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  };
  setPrintAreaPosition(logoArea, 'logoAreaX', 'logoAreaY');
  setPrintAreaPosition(productArea, 'productAreaX', 'productAreaY');
  setPrintAreaPosition(instrEl, 'instructionsAreaX', 'instructionsAreaY');
  setPrintAreaPosition(footerEl, 'footerAreaX', 'footerAreaY');

  const imgs = label.querySelectorAll('img');
  await Promise.all(Array.from(imgs).map(function(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function(res) { img.onload = res; img.onerror = res; setTimeout(res, 2000); });
  }));
  await new Promise(function(r) { setTimeout(r, 60); });

  const canvas = await html2canvas(label, {
    scale: PRINT_RENDER_SCALE,
    backgroundColor: c.vinylMode ? null : (c.bgColor || '#ffffff'),
    useCORS: true,
    logging: false,
    width: label.offsetWidth,
    height: label.offsetHeight
  });
  document.body.removeChild(container);
  return canvas;
}

window.printLabels = async function() {
  if (printQueue.length === 0) { showToast('🖨️ No hay etiquetas en la cola', 'warning'); return; }
  showToast('🖨️ Preparando impresión...', 'info');
  const firstItem = printQueue[0];
  const widthMm = parseInt(firstItem.config && firstItem.config.width) || 60;
  const heightMm = parseInt(firstItem.config && firstItem.config.height) || 80;
  try {
    const printContainer = document.createElement('div');
    printContainer.className = 'print-area';
    const sheetName = document.getElementById('sheetSize') ? document.getElementById('sheetSize').value : 'A4';
    const sheet = SHEET_SIZES[sheetName] || SHEET_SIZES.A4;
    const readMm = function(id, fallback) {
      const el = document.getElementById(id);
      const value = el ? parseFloat(el.value) : NaN;
      return Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    const marginTop = readMm('marginTop', 3);
    const marginRight = readMm('marginRight', 3);
    const marginBottom = readMm('marginBottom', 3);
    const marginLeft = readMm('marginLeft', 3);
    const spaceX = readMm('spaceX', 0);
    const spaceY = readMm('spaceY', 0);
    printContainer.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:' + sheet[0] + 'mm', 'height:' + sheet[1] + 'mm',
      'background:white', 'z-index:9999',
      'padding:' + marginTop + 'mm ' + marginRight + 'mm ' + marginBottom + 'mm ' + marginLeft + 'mm',
      'box-sizing:border-box', 'overflow:hidden', 'display:flex',
      'flex-wrap:wrap', 'align-content:flex-start',
      'column-gap:' + spaceX + 'mm', 'row-gap:' + spaceY + 'mm'
    ].join(';');
    const cache = new Map();
    const getCanvas = async function(item) {
      if (!cache.has(item.id)) cache.set(item.id, await renderLabelForPrint(item));
      return cache.get(item.id);
    };
    for (let i = 0; i < printQueue.length; i++) {
      const item = printQueue[i];
      const qty = Math.max(1, parseInt(item.qty) || 1);
      const itW = parseFloat(item.config && item.config.width) || widthMm;
      const itH = parseFloat(item.config && item.config.height) || heightMm;
      const src = await getCanvas(item);
      for (let j = 0; j < qty; j++) {
        const copy = document.createElement('canvas');
        copy.width = src.width;
        copy.height = src.height;
        copy.getContext('2d').drawImage(src, 0, 0);
        copy.style.width = itW + 'mm';
        copy.style.height = itH + 'mm';
        copy.style.flex = '0 0 auto';
        copy.style.display = 'block';
        copy.style.margin = '0';
        copy.style.objectFit = 'fill';
        copy.style.pageBreakInside = 'avoid';
        copy.style.breakInside = 'avoid';
        printContainer.appendChild(copy);
      }
    }
    document.body.appendChild(printContainer);
    await new Promise(function(r) { setTimeout(r, 400); });
    window.print();
    setTimeout(function() { if (printContainer.parentNode) document.body.removeChild(printContainer); }, 1500);
  } catch (e) {
    showToast('❌ Error al imprimir: ' + e.message, 'danger');
    console.error(e);
  }
};

// ==========================================
// 📄 EXPORTACIÓN PDF / PNG
// ==========================================
window.exportSinglePDF = async function() {
  showToast('📄 Generando PDF...', 'info');
  try {
    if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
      showToast('⚠️ Librería jsPDF no cargada', 'warning');
      return;
    }
    const { jsPDF } = window.jspdf;
    const widthMm = parseInt(document.getElementById('labelWidth').value);
    const heightMm = parseInt(document.getElementById('labelHeight').value);
    const pdf = new jsPDF({
      orientation: heightMm > widthMm ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [widthMm, heightMm]
    });
    const fakeItem = {
      config: getCurrentConfig(),
      content: getCurrentContent(),
      logoDataUrl: logoDataUrl,
      html: document.getElementById('labelPreview').outerHTML
    };
    const canvas = await renderLabelForPrint(fakeItem);
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm);
    pdf.save('etiqueta_' + (document.getElementById('productName') ? document.getElementById('productName').value : 'etiqueta') + '.pdf');
    showToast('✅ PDF exportado', 'success');
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'danger');
    console.error(e);
  }
};

window.exportQueuePDF = async function() {
  if (printQueue.length === 0) { showToast('⚠️ No hay etiquetas en la cola', 'warning'); return; }
  showToast('📄 Generando PDF con ' + printQueue.length + ' diseños...', 'info');
  try {
    if (typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
      showToast('⚠️ Librería jsPDF no cargada', 'warning');
      return;
    }
    const { jsPDF } = window.jspdf;
    const firstItem = printQueue[0];
    const widthMm = parseInt(firstItem.config.width) || 60;
    const heightMm = parseInt(firstItem.config.height) || 80;
    const sheetName = document.getElementById('sheetSize') ? document.getElementById('sheetSize').value : 'A4';
    const sheet = SHEET_SIZES[sheetName] || SHEET_SIZES.A4;
    const readMm = function(id, fallback) {
      const el = document.getElementById(id);
      const value = el ? parseFloat(el.value) : NaN;
      return Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    const marginTop = readMm('marginTop', 3);
    const marginRight = readMm('marginRight', 3);
    const marginBottom = readMm('marginBottom', 3);
    const marginLeft = readMm('marginLeft', 3);
    const spaceX = readMm('spaceX', 0);
    const spaceY = readMm('spaceY', 0);
    const pdf = new jsPDF({
      orientation: sheet[1] >= sheet[0] ? 'portrait' : 'landscape',
      unit: 'mm', format: [sheet[0], sheet[1]]
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pdfCache = new Map();
    const getItemCanvas = async function(item) {
      if (!pdfCache.has(item.id)) pdfCache.set(item.id, await renderLabelForPrint(item));
      return pdfCache.get(item.id);
    };
    let cursor = 0;
    let curW = parseFloat(firstItem.config && firstItem.config.width) || 60;
    let curH = parseFloat(firstItem.config && firstItem.config.height) || 80;
    let cols = Math.max(1, Math.floor((pageWidth - marginLeft - marginRight + spaceX) / (curW + spaceX)));
    let rows = Math.max(1, Math.floor((pageHeight - marginTop - marginBottom + spaceY) / (curH + spaceY)));
    let labelIndex = 0;
    for (let i = 0; i < printQueue.length; i++) {
      const item = printQueue[i];
      const qty = Math.max(1, parseInt(item.qty) || 1);
      const w = parseFloat(item.config && item.config.width) || 60;
      const h = parseFloat(item.config && item.config.height) || 80;
      if (w !== curW || h !== curH) {
        pdf.addPage();
        curW = w; curH = h;
        cols = Math.max(1, Math.floor((pageWidth - marginLeft - marginRight + spaceX) / (w + spaceX)));
        rows = Math.max(1, Math.floor((pageHeight - marginTop - marginBottom + spaceY) / (h + spaceY)));
        cursor = 0;
      }
      const perPage = cols * rows;
      for (let j = 0; j < qty; j++) {
        if (cursor >= perPage) { pdf.addPage(); cursor = 0; }
        const col = cursor % cols;
        const row = Math.floor(cursor / cols);
        const x = marginLeft + col * (w + spaceX);
        const y = marginTop + row * (h + spaceY);
        const canvas = await getItemCanvas(item);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, w, h);
        cursor++;
        labelIndex++;
      }
    }
    pdf.save('etiquetas_impresion_' + new Date().getTime() + '.pdf');
    showToast('✅ PDF con ' + labelIndex + ' etiquetas exportado', 'success');
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'danger');
    console.error(e);
  }
};

window.exportPNG = async function() {
  showToast('🖼️ Generando PNG...', 'info');
  try {
    const fakeItem = {
      config: getCurrentConfig(),
      content: getCurrentContent(),
      logoDataUrl: logoDataUrl,
      html: document.getElementById('labelPreview').outerHTML
    };
    const canvas = await renderLabelForPrint(fakeItem);
    const link = document.createElement('a');
    link.download = 'etiqueta_' + (document.getElementById('productName') ? document.getElementById('productName').value : 'etiqueta') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('✅ PNG exportado', 'success');
  } catch (e) {
    showToast('❌ Error: ' + e.message, 'danger');
    console.error(e);
  }
};

window.exportCatalogPNGs = async function(button) {
  const category = document.getElementById('categoriaProducto') ? document.getElementById('categoriaProducto').value : '';
  const products = category ? (productosData[category] || []) : [];
  const status = document.getElementById('estadoExportacionCatalogo');
  if (!category) { showToast('Selecciona primero la categoría.', 'warning'); return; }
  if (!products.length) { showToast('No hay productos cargados.', 'warning'); return; }
  if (typeof JSZip === 'undefined') { showToast('No se pudo cargar JSZip.', 'danger'); return; }
  showToast('Generando ' + products.length + ' PNG...', 'info');
  if (button) button.disabled = true;
  if (status) status.textContent = 'Preparando ' + products.length + ' productos…';
  try {
    const zip = new JSZip();
    const exportFolder = zip.folder(String(category).toLowerCase());
    let generated = 0;
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const name = product.nombre || product.nombreOriginal || 'producto_' + (i + 1);
      try {
        const nameEl = document.getElementById('productName');
        const projectEl = document.getElementById('projectName');
        const typeEl = document.getElementById('productType');
        const detailsEl = document.getElementById('productDetails');
        const priceEl = document.getElementById('productPrice');
        const instructionsEl = document.getElementById('instructions');
        if (nameEl) nameEl.value = name;
        if (projectEl) projectEl.value = name;
        if (typeEl) typeEl.value = product.categoria || product.categoriaOrigen || '';
        if (instructionsEl) instructionsEl.value = product.info || product.descripcion || '';
        const precio = product.precioOferta || product.precio;
        if (priceEl) priceEl.value = precio ? formatPrecio(precio) : '';
        updateLabel();
        await new Promise(function(r) { setTimeout(r, 80); });
        const currentLabel = document.getElementById('labelPreview');
        const item = {
          config: getCurrentConfig(),
          content: getCurrentContent(),
          logoDataUrl: logoDataUrl,
          html: currentLabel.outerHTML
        };
        const canvas = await renderLabelForPrint(item);
        const pngBlob = await new Promise(function(resolve, reject) {
          canvas.toBlob(function(blob) { blob ? resolve(blob) : reject(new Error('No se pudo crear el PNG')); }, 'image/png');
        });
        const slug = function(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'producto'; };
        const productId = slug(product.id !== undefined ? product.id : 'sin_id');
        const indexPart = String(i + 1).padStart(4, '0');
        exportFolder.file(indexPart + '_' + productId + '_' + slug(name) + '.png', pngBlob);
        generated++;
      } catch (e) { console.warn('Error en ' + name + ':', e); }
      if (status) status.textContent = 'Generando PNG: ' + (i + 1) + ' de ' + products.length;
      if (i % 5 === 4) await new Promise(function(r) { setTimeout(r, 0); });
    }
    if (!generated) throw new Error('No se pudo generar ningún PNG.');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'etiquetas_' + String(category).toLowerCase() + '_' + new Date().toISOString().slice(0, 10) + '.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
    if (status) status.textContent = '✅ ZIP creado con ' + generated + ' PNG.';
    showToast('✅ ZIP creado con ' + generated + ' PNG.', 'success');
  } catch (e) {
    if (status) status.textContent = 'Error: ' + e.message;
    showToast('❌ ' + e.message, 'danger');
  } finally {
    if (button) button.disabled = false;
  }
};

window.exportProject = function() {
  try {
    const project = {
      name: document.getElementById('projectName') ? document.getElementById('projectName').value : 'Sin nombre',
      date: new Date().toLocaleDateString('es-ES'),
      config: getCurrentConfig(),
      content: getCurrentContent(),
      logoDataUrl: logoDataUrl,
      images: getImagesConfig()
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = project.name.replace(/[^a-z0-9]/gi, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Proyecto exportado', 'success');
  } catch (e) { showToast('❌ Error: ' + e.message, 'danger'); }
};

window.importProject = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const project = JSON.parse(e.target.result);
      project.id = Date.now();
      project.date = project.date || new Date().toLocaleDateString('es-ES');
      const existingIdx = projects.findIndex(function(p) { return p.name === project.name; });
      if (existingIdx >= 0) projects[existingIdx] = project;
      else projects.push(project);
      localStorage.setItem('aromaProjects', JSON.stringify(projects));
      loadProject(project.id);
      showToast('📥 Proyecto importado: ' + project.name, 'success');
    } catch (err) { showToast('❌ Archivo inválido', 'danger'); }
  };
  reader.readAsText(file);
  event.target.value = '';
};

// ==========================================
// 🖼️ IMÁGENES DINÁMICAS
// ==========================================
window.addImageItem = function() {
  const id = Date.now();
  imagesList.push({ id: id, url: '', size: 30, posX: 50, posY: 50, rotation: 0, opacity: 100 });
  renderImagesList();
};

window.removeImageItem = function(id) {
  imagesList = imagesList.filter(function(img) { return img.id !== id; });
  renderImagesList();
  updateLabel();
};

window.updateImageItem = function(id, field, value) {
  const img = imagesList.find(function(i) { return i.id === id; });
  if (img) { img[field] = isNaN(value) ? value : Number(value); updateLabel(); }
};

function renderImagesList() {
  const container = document.getElementById('imagesContainer');
  if (!container) return;
  if (imagesList.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#999; padding:10px; font-size:11px;">No hay imágenes adicionales</div>';
    return;
  }
  container.innerHTML = imagesList.map(function(img) {
    return '<div class="image-item" style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;"> <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"> <span style="font-size:11px; font-weight:bold; color:#555;">Imagen #' + img.id.toString().slice(-4) + '</span> <button onclick="removeImageItem(' + img.id + ')" style="background:#dc3545; color:white; border:none; border-radius:4px; padding:2px 6px; cursor:pointer; font-size:10px;">✕</button> </div> <div style="width:100%; height:80px; background:white; border:1px solid #ddd; border-radius:6px; margin-bottom:8px; display:flex; align-items:center; justify-content:center; overflow:hidden;"> ' + (img.url ? '<img src="' + img.url + '" style="max-width:100%; max-height:100%; object-fit:contain;">' : '<span style="color:#999;font-size:10px;">Sin imagen</span>') + ' </div> <div style="margin-bottom:8px;"> <label style="display:inline-block; padding:6px 12px; background:#2196f3; color:white; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold; margin-right:6px;"> 📁 Subir local <input type="file" accept="image/*" style="display:none;" onchange="handleImageUpload(' + img.id + ', this)"> </label> </div> <input type="text" placeholder="🌐 O URL de la imagen" value="' + (img.url && img.url.indexOf('data:') !== 0 ? img.url : '') + '" oninput="updateImageItem(' + img.id + ', \'url\', this.value)" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:11px; margin-bottom:8px; box-sizing:border-box;"> <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:10px;"> <div> <label>Tamaño (%) <span id="sizeVal_' + img.id + '">' + img.size + '</span></label> <input type="range" min="5" max="100" value="' + img.size + '" oninput="updateImageItem(' + img.id + ', \'size\', this.value); document.getElementById(\'sizeVal_' + img.id + '\').textContent=this.value" style="width:100%;"> </div> <div> <label>Opacidad (%) <span id="opVal_' + img.id + '">' + img.opacity + '</span></label> <input type="range" min="10" max="100" value="' + img.opacity + '" oninput="updateImageItem(' + img.id + ', \'opacity\', this.value); document.getElementById(\'opVal_' + img.id + '\').textContent=this.value" style="width:100%;"> </div> <div> <label>Pos X (%) <span id="xVal_' + img.id + '">' + img.posX + '</span></label> <input type="range" min="0" max="100" value="' + img.posX + '" oninput="updateImageItem(' + img.id + ', \'posX\', this.value); document.getElementById(\'xVal_' + img.id + '\').textContent=this.value" style="width:100%;"> </div> <div> <label>Pos Y (%) <span id="yVal_' + img.id + '">' + img.posY + '</span></label> <input type="range" min="0" max="100" value="' + img.posY + '" oninput="updateImageItem(' + img.id + ', \'posY\', this.value); document.getElementById(\'yVal_' + img.id + '\').textContent=this.value" style="width:100%;"> </div> <div style="grid-column: span 2;"> <label>Rotación (°) <span id="rotVal_' + img.id + '">' + img.rotation + '</span></label> <input type="range" min="0" max="360" value="' + img.rotation + '" oninput="updateImageItem(' + img.id + ', \'rotation\', this.value); document.getElementById(\'rotVal_' + img.id + '\').textContent=this.value" style="width:100%;"> </div> </div> </div>';
  }).join('');
  updateLabel();
}

window.handleImageUpload = function(imageId, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    updateImageItem(imageId, 'url', dataUrl);
    renderImagesList();
  };
  reader.readAsDataURL(file);
};

// ==========================================
// 📅 LOTE Y EXPIRACIÓN
// ==========================================
function generarLoteAutomatico() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return '' + año + mes + dia;
}

function generarExpiracionAutomatica() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const añoSiguiente = ahora.getFullYear() + 1;
  return mes + '/' + añoSiguiente;
}

window.actualizarLoteYExpiracion = function() {
  const batchInput = document.getElementById('batchInfo');
  if (batchInput) {
    const lote = generarLoteAutomatico();
    const exp = generarExpiracionAutomatica();
    batchInput.value = 'Lote: ' + lote + ' | Exp: ' + exp;
  }
  updateLabel();
  showToast('✅ Lote y expiración actualizados', 'success');
};

// ==========================================
// 🔗 COMPARTIR
// ==========================================
function generateShareableURL() {
  const config = getCurrentConfig();
  const content = getCurrentContent();
  const params = new URLSearchParams();
  params.set('brand', content.brandName);
  params.set('brandSub', content.brandSub);
  params.set('product', content.productName);
  params.set('type', content.productType);
  params.set('details', content.productDetails);
  params.set('instructions', content.instructions);
  params.set('batch', content.batchInfo);
  params.set('origin', content.originInfo);
  params.set('width', config.width);
  params.set('height', config.height);
  params.set('accent', config.accentColor);
  params.set('showDetails', config.showDetails ? '1' : '0');
  params.set('showPrice', config.showPrice ? '1' : '0');
  params.set('vinylMode', config.vinylMode ? '1' : '0');
  params.set('boldTextMode', config.boldTextMode ? '1' : '0');
  params.set('frostedBg', config.frostedBg ? '1' : '0');
  return window.location.origin + window.location.pathname + '?' + params.toString();
}

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('brand') && !params.has('product')) return false;
  try {
    if (params.has('brand')) document.getElementById('brandName').value = params.get('brand');
    if (params.has('brandSub')) document.getElementById('brandSub').value = params.get('brandSub');
    if (params.has('product')) document.getElementById('productName').value = params.get('product');
    if (params.has('type')) document.getElementById('productType').value = params.get('type');
    if (params.has('details')) document.getElementById('productDetails').value = params.get('details');
    if (params.has('instructions')) document.getElementById('instructions').value = params.get('instructions');
    if (params.has('batch')) document.getElementById('batchInfo').value = params.get('batch');
    if (params.has('origin')) document.getElementById('originInfo').value = params.get('origin');
    if (params.has('width')) document.getElementById('labelWidth').value = params.get('width');
    if (params.has('height')) document.getElementById('labelHeight').value = params.get('height');
    if (params.has('accent')) document.getElementById('accentColor').value = params.get('accent');
    if (params.has('showDetails')) document.getElementById('showDetails').checked = params.get('showDetails') === '1';
    if (params.has('showPrice')) document.getElementById('showPrice').checked = params.get('showPrice') === '1';
    if (params.has('vinylMode')) document.getElementById('vinylMode').checked = params.get('vinylMode') === '1';
    if (params.has('boldTextMode')) document.getElementById('boldTextMode').checked = params.get('boldTextMode') === '1';
    if (params.has('frostedBg')) document.getElementById('frostedBg').checked = params.get('frostedBg') === '1';
    sincronizarValoresSliders();
    updateLabel();
    showToast('🔗 Diseño cargado desde URL', 'success');
    return true;
  } catch (e) {
    console.error('Error al cargar desde URL:', e);
    return false;
  }
}

window.shareDesign = function() {
  const url = generateShareableURL();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showToast('🔗 URL copiada al portapapeles', 'success');
    }).catch(function() { prompt('Copia esta URL:', url); });
  } else {
    prompt('Copia esta URL:', url);
  }
};

// ==========================================
// ⌨️ ATAJOS DE TECLADO
// ==========================================
document.addEventListener('keydown', function(e) {
  const tag = e.target.tagName.toLowerCase();
  const esInput = tag === 'input' || tag === 'textarea' || tag === 'select';
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && !esInput) {
    e.preventDefault();
    saveProject();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !esInput) {
    e.preventDefault();
    addToPrintQueue();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !esInput) {
    e.preventDefault();
    window.print();
  }
  if (e.key === 'F5' && !esInput) {
    e.preventDefault();
    updateLabel();
  }
});

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

  const formaGuardada = localStorage.getItem('aromaLabelShape') || 'rectangular';
  const btnShape = document.querySelector('.shape-btn[onclick*="' + formaGuardada + '"]');
  if (btnShape) cambiarForma(formaGuardada, btnShape);

  const loadedFromURL = loadFromURL();
  if (!loadedFromURL) {
    setTimeout(updateLabel, 300);
  }

  console.log('🚀 AromaLabel Pro v4.2 inicializado correctamente');
});