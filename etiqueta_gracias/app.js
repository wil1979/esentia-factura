// ============================================
// FIREBASE
// ============================================
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

// ============================================
// VARIABLES GLOBALES
// ============================================
let allClients = [];
let printQueue = [];
const INCHES_TO_MM = 25.4;
const DEFAULT_SIZE_INCHES = 1.75;
const DEFAULT_SIZE_MM = DEFAULT_SIZE_INCHES * INCHES_TO_MM;
let currentBackgroundImage = null;
let currentQRDataUrl = null;
const AUTOSAVE_KEY = 'eweAutosaveDesign';
let unsavedChanges = 0;
let lastSavedState = null;

// ✅ Detectar si es móvil
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 900);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  loadClients();
  updateLabelSizeFromInches();
  loadPrintSettings();
  updatePrintPreview();
  updateColors();
  updateBorderColor();
  updateTexts();
  updateTextSizes();
  updateTextPositions();
  updateBorderText();
  loadSavedDesignsList();

  // ✅ RECUPERACIÓN AUTOMÁTICA
  recoverAutosave();

  if (document.getElementById('qrEnabled').checked) {
    generateQR();
  }

  ['printPaperSize', 'printMargin', 'printGap', 'printCutBorder', 'printBorderColor', 'printBorderWidth', 'labelSizeInches', 'labelQuantity']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', updatePrintPreview);
    });

  // ✅ Guardar estado inicial (para detectar cambios)
  setTimeout(() => {
    lastSavedState = JSON.stringify(getCurrentDesign());
  }, 1000);

  // ✅ AUTO-GUARDADO cada 30 segundos
  setInterval(() => {
    try {
      const design = getCurrentDesign();
      design._autosave = true;
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(design));
      showAutosaveIndicator('💾 Diseño guardado automáticamente');
    } catch(e) {
      console.warn('No se pudo auto-guardar:', e);
    }
  }, 30000);

  // ✅ Detectar cambios en inputs para mostrar badge
  document.addEventListener('input', trackChanges);
  document.addEventListener('change', trackChanges);

  // ✅ PROTECCIÓN: avisar al salir si hay cambios sin guardar
  window.addEventListener('beforeunload', function(e) {
    if (unsavedChanges > 0) {
      e.preventDefault();
      e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?';
      return e.returnValue;
    }
  });
});

// ✅ Rastrear cambios no guardados
function trackChanges() {
  try {
    const currentState = JSON.stringify(getCurrentDesign());
    if (lastSavedState && currentState !== lastSavedState) {
      unsavedChanges++;
      updateChangesBadge();
    }
  } catch(e) {}
}

// ✅ Actualizar badge de cambios pendientes
function updateChangesBadge() {
  const badge = document.getElementById('changesBadge');
  if (!badge) return;
  if (unsavedChanges > 0) {
    badge.style.display = 'inline-block';
    badge.textContent = unsavedChanges > 99 ? '99+' : unsavedChanges;
  } else {
    badge.style.display = 'none';
  }
}

// ✅ Mostrar indicador de auto-guardado
function showAutosaveIndicator(message, type = 'saved') {
  const indicator = document.getElementById('autosaveIndicator');
  if (!indicator) return;
  indicator.textContent = message;
  indicator.className = 'autosave-indicator show ' + type;
  setTimeout(() => {
    indicator.classList.remove('show');
  }, 2000);
}

// ✅ Recuperar diseño guardado automáticamente
function recoverAutosave() {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return;
    const design = JSON.parse(saved);
    if (!design || !design._autosave) return;

    const hasContent = design.texts && (
      design.texts.main || design.texts.client || design.texts.sub
    );
    if (!hasContent) return;

    const savedDate = design.savedAt ? new Date(design.savedAt).toLocaleString('es-CR') : 'reciente';
    if (confirm(`🔄 Se encontró un diseño sin guardar (${savedDate}).\n\n¿Deseas recuperarlo?`)) {
      applyDesign(design);
      showToast('✅ Diseño recuperado correctamente', 'success');
      lastSavedState = JSON.stringify(design);
      unsavedChanges = 0;
      updateChangesBadge();
    }
  } catch(e) {
    console.warn('No se pudo recuperar autosave:', e);
  }
}

// ✅ Toast notification
function showToast(message, type = 'info') {
  const existing = document.getElementById('eweToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'eweToast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: ${type === 'success' ? '#2d5016' : type === 'error' ? '#a23a36' : type === 'warning' ? '#d4a843' : '#333'};
    color: white; padding: 12px 24px; border-radius: 8px;
    font-family: 'Lora', serif; font-size: 14px; font-weight: 600;
    z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    animation: slideDown 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================
// CLIENTES
// ============================================
async function loadClients() {
  try {
    const snapshot = await db.collection('clientesBD').get();
    allClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error al cargar clientes:', error);
    allClients = [];
  }
}

async function searchClients(query) {
  const resultsDiv = document.getElementById('searchResults');
  if (query.length < 2) { resultsDiv.style.display = 'none'; return; }
  const normalizedQuery = query.toLowerCase();
  const filtered = allClients.filter(client =>
    String(client.nombre || '').toLowerCase().includes(normalizedQuery) ||
    String(client.telefono || '').includes(query) ||
    String(client.cedula || '').includes(query)
  );
  resultsDiv.replaceChildren();
  if (filtered.length > 0) {
    filtered.forEach(client => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'search-result-item';
      const name = document.createElement('strong');
      name.textContent = client.nombre || 'Cliente sin nombre';
      item.append(name);
      if (client.telefono) {
        const phone = document.createElement('small');
        phone.textContent = `Tel. ${client.telefono}`;
        item.append(phone);
      }
      item.addEventListener('click', () => selectClient(client));
      resultsDiv.append(item);
    });
  } else {
    const empty = document.createElement('div');
    empty.className = 'search-result-item empty';
    empty.textContent = 'No se encontraron clientes';
    resultsDiv.append(empty);
  }
  resultsDiv.style.display = 'block';
}

function selectClient(client) {
  const clientData = typeof client === 'string' ? { nombre: client } : client;
  const name = clientData.nombre || '';
  document.getElementById('selectedClient').value = name;
  document.getElementById('textClient').textContent = name;
  document.getElementById('editClientName').value = name;
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('clientSearch').value = '';
  document.getElementById('useCustomClient').checked = false;
  document.getElementById('customClientContainer').style.display = 'none';
}

function toggleCustomClient() {
  const checkbox = document.getElementById('useCustomClient');
  const container = document.getElementById('customClientContainer');
  const input = document.getElementById('customClientName');
  if (checkbox.checked) {
    container.style.display = 'block';
    document.getElementById('selectedClient').value = '';
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('clientSearch').value = '';
    input.focus();
  } else {
    container.style.display = 'none';
    input.value = '';
    if (!document.getElementById('selectedClient').value) {
      document.getElementById('textClient').textContent = 'Cliente';
      document.getElementById('editClientName').value = '';
    }
  }
}

function updateCustomClient() {
  const customName = document.getElementById('customClientName').value.trim();
  document.getElementById('textClient').textContent = customName || 'Cliente';
  document.getElementById('editClientName').value = customName;
}

function updateClientText() {
  const name = document.getElementById('editClientName').value.trim();
  document.getElementById('textClient').textContent = name || 'Cliente';
  if (document.getElementById('useCustomClient').checked) {
    document.getElementById('customClientName').value = name;
  }
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-box')) {
    document.getElementById('searchResults').style.display = 'none';
  }
});

// ============================================
// TAMAÑO DE ETIQUETA
// ============================================
function updateLabelSizeFromInches() {
  const inches = parseFloat(document.getElementById('labelSizeInches').value) || DEFAULT_SIZE_INCHES;
  const mm = inches * INCHES_TO_MM;
  document.getElementById('labelSizeMm').value = mm.toFixed(2);
  updateSizeDisplay(inches, mm);
  adjustLabelVisualSize(inches);
}

function updateLabelSizeFromMm() {
  const mm = parseFloat(document.getElementById('labelSizeMm').value) || DEFAULT_SIZE_MM;
  const inches = mm / INCHES_TO_MM;
  document.getElementById('labelSizeInches').value = inches.toFixed(2);
  updateSizeDisplay(inches, mm);
  adjustLabelVisualSize(inches);
}

function updateLabelSizePx(px) {
  document.getElementById('labelSizePxValue').textContent = px + ' px';
  const wrapper = document.getElementById('labelWrapper');
  wrapper.style.width = px + 'px';
  wrapper.style.height = px + 'px';
  const inches = (px / 400) * DEFAULT_SIZE_INCHES;
  const mm = inches * INCHES_TO_MM;
  document.getElementById('labelSizeInches').value = inches.toFixed(2);
  document.getElementById('labelSizeMm').value = mm.toFixed(2);
  updateSizeDisplay(inches, mm);
}

function updateSizeDisplay(inches, mm) {
  document.getElementById('currentSizeDisplay').textContent = inches.toFixed(2) + '"';
  document.getElementById('currentSizeMm').textContent = mm.toFixed(2) + ' mm';
}

function adjustLabelVisualSize(inches) {
  const px = (inches / DEFAULT_SIZE_INCHES) * 400;
  const wrapper = document.getElementById('labelWrapper');
  wrapper.style.width = px + 'px';
  wrapper.style.height = px + 'px';
  document.getElementById('labelSizePx').value = Math.round(px);
  document.getElementById('labelSizePxValue').textContent = Math.round(px) + ' px';
}

// ============================================
// TEXTOS
// ============================================
function updateTexts() {
  const mainText = document.getElementById('editMainText').value;
  const textMain = document.getElementById('textMain');
  textMain.textContent = mainText;
  textMain.setAttribute('class', 'label-text-main adelia-font');

  const subText = document.getElementById('editSubText').value.trim();
  document.getElementById('textSub').textContent = subText ? '♥ ' + subText + ' ♥' : '';

  document.getElementById('textMessage').textContent = document.getElementById('editMessage1').value;
  document.getElementById('textMessage2').textContent = document.getElementById('editMessage2').value;

  document.getElementById('textSinpeLabel').textContent = document.getElementById('editSinpeLabel').value;
  document.getElementById('textSinpe').textContent = document.getElementById('editSinpe').value;
  document.getElementById('textBrand').textContent = document.getElementById('editBrand').value;
  document.getElementById('textFooter').textContent = document.getElementById('editFooter').value;
}

function applySubTextPreset() {
  const preset = document.getElementById('subTextPreset').value;
  if (preset !== 'custom') document.getElementById('editSubText').value = preset;
  updateTexts();
}

function applyBrandPreset() {
  const preset = document.getElementById('brandPreset').value;
  if (preset !== 'custom') document.getElementById('editBrand').value = preset;
  updateTexts();
}

function updateTextPositions() {
  const map = [['textSub','subPosX','subPosY'], ['textClient','clientPosX','clientPosY']];
  map.forEach(([textId,xId,yId]) => {
    const text = document.getElementById(textId), x = document.getElementById(xId), y = document.getElementById(yId);
    if (text && x && y) { text.setAttribute('x', x.value); text.setAttribute('y', y.value); }
  });
}

function updateTextSizes() {
  document.getElementById('textMain').setAttribute('font-size', document.getElementById('sizeMain').value);
  document.getElementById('textSub').setAttribute('font-size', document.getElementById('sizeSub').value);
  document.getElementById('textMessage').setAttribute('font-size', document.getElementById('sizeMessage').value);
  document.getElementById('textMessage2').setAttribute('font-size', document.getElementById('sizeMessage').value);
  document.getElementById('textSinpeLabel').setAttribute('font-size', document.getElementById('sizeSinpeLabel').value);
  document.getElementById('textSinpe').setAttribute('font-size', document.getElementById('sizeSinpe').value);
  document.getElementById('textBrand').setAttribute('font-size', document.getElementById('sizeBrand').value);
  document.getElementById('textFooter').setAttribute('font-size', document.getElementById('sizeFooter').value);
  document.getElementById('textClient').setAttribute('font-size', document.getElementById('sizeClient').value);
}

// ============================================
// BORDE CIRCULAR
// ============================================
function updateBorderText() {
  const text = document.getElementById('editBorderText').value;
  const repeatedText = text + ' ' + text + ' ' + text;
  document.getElementById('borderTextPath').textContent = repeatedText;
}

function updateBorderSize() {
  const size = document.getElementById('borderTextSize').value;
  document.getElementById('borderTextSizeValue').textContent = size + ' px';
  document.getElementById('borderText').setAttribute('font-size', size);
}

function updateBorderRadius() {
  const radius = document.getElementById('borderRadius').value;
  document.getElementById('borderRadiusValue').textContent = radius + ' px';
  const path = document.getElementById('borderPath');
  path.setAttribute('d', `M 200, 200 m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius*2},0 a ${radius},${radius} 0 1,1 -${radius*2},0`);
}

function updateBorderRotation() {
  const rotation = document.getElementById('borderRotation').value;
  document.getElementById('borderRotationValue').textContent = rotation + '°';
  document.getElementById('borderText').setAttribute('transform', `rotate(${rotation}, 200, 200)`);
}

function updateBorderOffset() {
  const offset = document.getElementById('borderStartOffset').value;
  document.getElementById('borderStartOffsetValue').textContent = offset + '%';
  document.getElementById('borderTextPath').setAttribute('startOffset', offset + '%');
}

function updateBorderSpacing() {
  const spacing = document.getElementById('borderLetterSpacing').value;
  document.getElementById('borderLetterSpacingValue').textContent = spacing + ' px';
  document.getElementById('borderText').style.letterSpacing = spacing + 'px';
}

function updateBorderColor() {
  document.getElementById('borderText').style.fill = document.getElementById('borderColor').value;
}

function updateColors() {
  const setFill = (id, color) => document.getElementById(id).style.fill = color;
  setFill('textMain', document.getElementById('colorMain').value);
  setFill('textSub', document.getElementById('colorSub').value);
  setFill('textMessage', document.getElementById('colorMessage').value);
  setFill('textMessage2', document.getElementById('colorMessage').value);
  setFill('textSinpeLabel', document.getElementById('colorSinpe').value);
  setFill('textSinpe', document.getElementById('colorSinpe').value);
  setFill('textBrand', document.getElementById('colorBrand').value);
  setFill('textFooter', document.getElementById('colorFooter').value);
  setFill('textClient', document.getElementById('colorClient').value);
  document.querySelector('.label-circle').style.stroke = document.getElementById('labelCircleColor').value;
}

function refreshPreview() {
  updateTexts();
  updateTextSizes();
  updateTextPositions();
  updateBorderText();
  updateBorderSize();
  updateBorderRadius();
  updateBorderRotation();
  updateBorderOffset();
  updateBorderSpacing();
  updateBorderColor();
  updateColors();
  updatePrintPreview();
  if (document.getElementById('qrEnabled').checked) generateQR();
}

// ============================================
// FONDO
// ============================================
function handleBackgroundImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('Seleccione una imagen válida.'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    currentBackgroundImage = e.target.result;
    document.getElementById('bgImage').setAttribute('href', currentBackgroundImage);
    document.getElementById('bgRect').setAttribute('opacity', (document.getElementById('bgOpacity').value / 100).toString());
    document.getElementById('bgOpacityValue').textContent = document.getElementById('bgOpacity').value + '%';
  };
  reader.readAsDataURL(file);
}

function updateBackgroundOpacity() {
  const opacity = document.getElementById('bgOpacity').value;
  document.getElementById('bgOpacityValue').textContent = opacity + '%';
  document.getElementById('bgRect').setAttribute('opacity', (opacity / 100).toString());
}

function removeBackgroundImage() {
  currentBackgroundImage = null;
  document.getElementById('bgImage').setAttribute('href', '');
  document.getElementById('bgRect').setAttribute('opacity', '0');
  document.getElementById('bgImageUpload').value = '';
  document.getElementById('bgOpacity').value = 100;
  document.getElementById('bgOpacityValue').textContent = '100%';
}

function resetBackground() {
  removeBackgroundImage();
  document.getElementById('bgColor').value = '#ffffff';
  updateBackgroundColor();
}

function updateBackgroundColor() {
  document.querySelector('.label-circle').style.fill = document.getElementById('bgColor').value;
}

// ============================================
// QR CODE
// ============================================
function toggleQR() {
  const enabled = document.getElementById('qrEnabled').checked;
  const qrGroup = document.getElementById('qrGroup');
  qrGroup.style.display = enabled ? 'block' : 'none';
  if (enabled) generateQR();
}

function generateQR() {
  const content = document.getElementById('qrContent').value.trim();
  const qrImage = document.getElementById('qrImage');
  if (!content) {
    qrImage.setAttribute('href', '');
    return;
  }
  try {
    if (typeof qrcode !== 'function') {
      console.error('Librería qrcode-generator no cargada');
      return;
    }
    const margin = parseInt(document.getElementById('qrMargin').value) || 0;
    document.getElementById('qrMarginValue').textContent = margin;
    const darkColor = document.getElementById('qrColorDark').value;
    const lightColor = document.getElementById('qrColorLight').value;

    const qr = qrcode(0, 'M');
    qr.addData(content);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const cellSize = 10;
    const qrSize = moduleCount * cellSize;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">`;
    svgContent += `<rect width="${qrSize}" height="${qrSize}" fill="${lightColor}"/>`;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          svgContent += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${darkColor}"/>`;
        }
      }
    }
    svgContent += '</svg>';

    const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
    currentQRDataUrl = dataUrl;

    const qrGroup = document.getElementById('qrGroup');
    if (document.getElementById('qrEnabled').checked) {
      qrGroup.style.display = 'block';
    }
    qrImage.setAttribute('href', dataUrl);
    updateQRPosition();
  } catch (error) {
    console.error('Error generando QR:', error);
  }
}

function updateQRPosition() {
  const size = parseInt(document.getElementById('qrSize').value);
  const posX = parseInt(document.getElementById('qrPosX').value);
  const posY = parseInt(document.getElementById('qrPosY').value);
  document.getElementById('qrSizeValue').textContent = size + ' px';
  const qrImage = document.getElementById('qrImage');
  qrImage.setAttribute('width', size);
  qrImage.setAttribute('height', size);
  qrImage.setAttribute('x', posX);
  qrImage.setAttribute('y', posY);
}

function setQRPosition(position) {
  const size = parseInt(document.getElementById('qrSize').value);
  const center = 200 - (size / 2);
  const positions = {
    'center': { x: center, y: center },
    'bottom': { x: center, y: 320 },
    'top-right': { x: 320, y: 60 },
    'bottom-right': { x: 310, y: 310 }
  };
  const pos = positions[position] || { x: center, y: center };
  document.getElementById('qrPosX').value = pos.x;
  document.getElementById('qrPosY').value = pos.y;
  updateQRPosition();
}

// ============================================
// GUARDADO DE DISEÑOS
// ============================================
function getCurrentDesign() {
  return {
    version: '1.2',
    savedAt: new Date().toISOString(),
    texts: {
      main: document.getElementById('editMainText').value,
      sub: document.getElementById('editSubText').value,
      message1: document.getElementById('editMessage1').value,
      message2: document.getElementById('editMessage2').value,
      sinpeLabel: document.getElementById('editSinpeLabel').value,
      sinpe: document.getElementById('editSinpe').value,
      brand: document.getElementById('editBrand').value,
      footer: document.getElementById('editFooter').value,
      client: document.getElementById('editClientName').value,
      border: document.getElementById('editBorderText').value
    },
    positions: {
      sub: { x: document.getElementById('subPosX').value, y: document.getElementById('subPosY').value },
      client: { x: document.getElementById('clientPosX').value, y: document.getElementById('clientPosY').value }
    },
    sizes: {
      main: document.getElementById('sizeMain').value,
      sub: document.getElementById('sizeSub').value,
      message: document.getElementById('sizeMessage').value,
      sinpe: document.getElementById('sizeSinpe').value,
      sinpeLabel: document.getElementById('sizeSinpeLabel').value,
      brand: document.getElementById('sizeBrand').value,
      footer: document.getElementById('sizeFooter').value,
      client: document.getElementById('sizeClient').value,
      border: document.getElementById('borderTextSize').value
    },
    colors: {
      main: document.getElementById('colorMain').value,
      sub: document.getElementById('colorSub').value,
      message: document.getElementById('colorMessage').value,
      sinpe: document.getElementById('colorSinpe').value,
      brand: document.getElementById('colorBrand').value,
      footer: document.getElementById('colorFooter').value,
      client: document.getElementById('colorClient').value,
      border: document.getElementById('borderColor').value,
      labelCircle: document.getElementById('labelCircleColor').value
    },
    border: {
      radius: document.getElementById('borderRadius').value,
      rotation: document.getElementById('borderRotation').value,
      offset: document.getElementById('borderStartOffset').value,
      spacing: document.getElementById('borderLetterSpacing').value
    },
    background: {
      color: document.getElementById('bgColor').value,
      image: currentBackgroundImage,
      opacity: document.getElementById('bgOpacity').value
    },
    qr: {
      enabled: document.getElementById('qrEnabled').checked,
      content: document.getElementById('qrContent').value,
      size: document.getElementById('qrSize').value,
      posX: document.getElementById('qrPosX').value,
      posY: document.getElementById('qrPosY').value,
      colorDark: document.getElementById('qrColorDark').value,
      colorLight: document.getElementById('qrColorLight').value,
      margin: document.getElementById('qrMargin').value
    },
    label: {
      sizeInches: document.getElementById('labelSizeInches').value,
      quantity: document.getElementById('labelQuantity').value
    }
  };
}

function applyDesign(design) {
  if (!design) return;
  if (design.texts) {
    const fields = ['main', 'sub', 'message1', 'message2', 'sinpeLabel', 'sinpe', 'brand', 'footer', 'client', 'border'];
    fields.forEach(field => {
      const elId = 'edit' + field.charAt(0).toUpperCase() + field.slice(1);
      const el = document.getElementById(elId);
      if (el && design.texts[field] !== undefined) el.value = design.texts[field];
    });
  }
  if (design.positions) {
    if (design.positions.sub) { document.getElementById('subPosX').value = design.positions.sub.x; document.getElementById('subPosY').value = design.positions.sub.y; }
    if (design.positions.client) { document.getElementById('clientPosX').value = design.positions.client.x; document.getElementById('clientPosY').value = design.positions.client.y; }
  }
  if (design.sizes) {
    Object.keys(design.sizes).forEach(key => {
      const elId = 'size' + key.charAt(0).toUpperCase() + key.slice(1);
      const el = document.getElementById(elId);
      if (el) el.value = design.sizes[key];
    });
  }
  if (design.colors) {
    Object.keys(design.colors).forEach(key => {
      if (key === 'labelCircle') {
        document.getElementById('labelCircleColor').value = design.colors[key];
      } else if (key === 'border') {
        document.getElementById('borderColor').value = design.colors[key];
      } else {
        const elId = 'color' + key.charAt(0).toUpperCase() + key.slice(1);
        const el = document.getElementById(elId);
        if (el) el.value = design.colors[key];
      }
    });
  }
  if (design.border) {
    if (design.border.radius !== undefined) document.getElementById('borderRadius').value = design.border.radius;
    if (design.border.rotation !== undefined) document.getElementById('borderRotation').value = design.border.rotation;
    if (design.border.offset !== undefined) document.getElementById('borderStartOffset').value = design.border.offset;
    if (design.border.spacing !== undefined) document.getElementById('borderLetterSpacing').value = design.border.spacing;
  }
  if (design.background) {
    if (design.background.color) document.getElementById('bgColor').value = design.background.color;
    if (design.background.image) {
      currentBackgroundImage = design.background.image;
      document.getElementById('bgImage').setAttribute('href', design.background.image);
    }
    if (design.background.opacity !== undefined) {
      document.getElementById('bgOpacity').value = design.background.opacity;
      document.getElementById('bgOpacityValue').textContent = design.background.opacity + '%';
      document.getElementById('bgRect').setAttribute('opacity', (design.background.opacity / 100).toString());
    }
  }
  if (design.qr) {
    document.getElementById('qrEnabled').checked = design.qr.enabled || false;
    if (design.qr.content !== undefined) document.getElementById('qrContent').value = design.qr.content;
    if (design.qr.size !== undefined) document.getElementById('qrSize').value = design.qr.size;
    if (design.qr.posX !== undefined) document.getElementById('qrPosX').value = design.qr.posX;
    if (design.qr.posY !== undefined) document.getElementById('qrPosY').value = design.qr.posY;
    if (design.qr.colorDark !== undefined) document.getElementById('qrColorDark').value = design.qr.colorDark;
    if (design.qr.colorLight !== undefined) document.getElementById('qrColorLight').value = design.qr.colorLight;
    if (design.qr.margin !== undefined) document.getElementById('qrMargin').value = design.qr.margin;
    toggleQR();
  }
  if (design.label) {
    if (design.label.sizeInches !== undefined) document.getElementById('labelSizeInches').value = design.label.sizeInches;
    if (design.label.quantity !== undefined) document.getElementById('labelQuantity').value = design.label.quantity;
  }
  refreshPreview();
}

// ✅ NUEVO: Guardado rápido (sin pedir nombre)
function quickSaveDesign() {
  const design = getCurrentDesign();
  const timestamp = new Date().toLocaleString('es-CR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  }).replace(/[\/\,\:]/g, '-');
  const name = 'Diseño rápido ' + timestamp;
  design.name = name;

  let designs = JSON.parse(localStorage.getItem('eweDesigns') || '[]');
  designs.push(design);

  try {
    localStorage.setItem('eweDesigns', JSON.stringify(designs));
    loadSavedDesignsList();

    // ✅ Guardar también como autosave
    design._autosave = true;
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(design));

    // ✅ Resetear contador de cambios
    lastSavedState = JSON.stringify(design);
    unsavedChanges = 0;
    updateChangesBadge();

    showToast(`💾 Diseño guardado: "${name}"`, 'success');
    showAutosaveIndicator('✅ Guardado correctamente');
  } catch (error) {
    showToast('❌ Error al guardar. Almacenamiento lleno.', 'error');
  }
}

function saveDesign() {
  const name = prompt('Nombre para el diseño:', 'Diseño ' + new Date().toLocaleDateString('es-CR'));
  if (!name) return;
  const design = getCurrentDesign();
  design.name = name;
  let designs = JSON.parse(localStorage.getItem('eweDesigns') || '[]');
  const existing = designs.findIndex(d => d.name === name);
  if (existing >= 0) {
    if (!confirm(`Ya existe "${name}". ¿Reemplazar?`)) return;
    designs[existing] = design;
  } else {
    designs.push(design);
  }
  try {
    localStorage.setItem('eweDesigns', JSON.stringify(designs));
    loadSavedDesignsList();

    // ✅ Resetear contador
    lastSavedState = JSON.stringify(design);
    unsavedChanges = 0;
    updateChangesBadge();

    showToast(`✅ Diseño "${name}" guardado.`, 'success');
  } catch (error) {
    showToast('Error al guardar. Posiblemente el diseño es muy grande.', 'error');
  }
}

function loadSavedDesignsList() {
  const select = document.getElementById('savedDesignsList');
  const designs = JSON.parse(localStorage.getItem('eweDesigns') || '[]');
  select.innerHTML = '<option value="">-- Ninguno --</option>';
  designs.forEach((design, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = design.name + ' (' + new Date(design.savedAt).toLocaleDateString('es-CR') + ')';
    select.appendChild(option);
  });
}

function loadSelectedDesign() {
  const index = document.getElementById('savedDesignsList').value;
  if (index === '') return;
  const designs = JSON.parse(localStorage.getItem('eweDesigns') || '[]');
  const design = designs[index];
  if (design && confirm(`¿Cargar "${design.name}"?`)) {
    applyDesign(design);
    lastSavedState = JSON.stringify(design);
    unsavedChanges = 0;
    updateChangesBadge();
  }
}

function deleteSelectedDesign() {
  const index = document.getElementById('savedDesignsList').value;
  if (index === '') { alert('Seleccione un diseño.'); return; }
  const designs = JSON.parse(localStorage.getItem('eweDesigns') || '[]');
  const name = designs[index].name;
  if (confirm(`¿Eliminar "${name}"?`)) {
    designs.splice(index, 1);
    localStorage.setItem('eweDesigns', JSON.stringify(designs));
    loadSavedDesignsList();
  }
}

function exportDesignJSON() {
  const design = getCurrentDesign();
  design.name = prompt('Nombre del archivo:', 'diseño-esentia') || 'diseño-esentia';
  const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = design.name.replace(/[^a-z0-9]/gi, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadDesignFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const design = JSON.parse(e.target.result);
      if (confirm('¿Cargar diseño desde archivo?')) applyDesign(design);
    } catch (error) {
      alert('Archivo inválido.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ============================================
// UI
// ============================================
function switchTab(tabName, button) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  if (button) button.classList.add('active');
}

function toggleSection(header) {
  const content = header.nextElementSibling;
  const arrow = header.querySelector('span:last-child');
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    arrow.textContent = '▼';
  } else {
    content.classList.add('collapsed');
    arrow.textContent = '▶';
  }
}

function addToQueue() {
  const clientName = document.getElementById('editClientName').value ||
    document.getElementById('selectedClient').value ||
    document.getElementById('textClient').textContent;
  const quantity = parseInt(document.getElementById('labelQuantity').value);
  const labelSize = parseFloat(document.getElementById('labelSizeInches').value);
  const queueItem = {
    id: Date.now(),
    clientName: clientName,
    quantity: quantity,
    labelSize: labelSize,
    backgroundImage: currentBackgroundImage,
    qrDataUrl: currentQRDataUrl,
    config: getCurrentDesign()
  };
  printQueue.push(queueItem);
  showToast(`✅ Agregado a la cola: ${quantity} etiqueta(s)`, 'success');
}

// ============================================
// IMPRESIÓN
// ============================================
function getPrintSettings() {
  const marginMm = Number(document.getElementById('printMarginMm').value);
  const gapMm = Number(document.getElementById('printGapMm').value);
  const borderWidth = Number(document.getElementById('printBorderWidth').value);
  return {
    marginMm: Number.isFinite(marginMm) ? Math.min(20, Math.max(0, marginMm)) : 6.35,
    gapMm: Number.isFinite(gapMm) ? Math.min(10, Math.max(0, gapMm)) : 1.0,
    cutBorder: document.getElementById('printCutBorder').checked,
    borderColor: document.getElementById('printBorderColor').value || '#8b948b',
    borderWidth: Number.isFinite(borderWidth) ? Math.min(2, Math.max(0.1, borderWidth)) : 0.3
  };
}

function loadPrintSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('ewePrintSettings') || 'null');
    if (!saved) return;
    if (Number.isFinite(Number(saved.marginMm))) document.getElementById('printMarginMm').value = saved.marginMm;
    if (Number.isFinite(Number(saved.gapMm))) document.getElementById('printGapMm').value = saved.gapMm;
    if (typeof saved.cutBorder === 'boolean') document.getElementById('printCutBorder').checked = saved.cutBorder;
    if (typeof saved.borderColor === 'string') document.getElementById('printBorderColor').value = saved.borderColor;
    if (Number.isFinite(Number(saved.borderWidth))) document.getElementById('printBorderWidth').value = saved.borderWidth;
  } catch (error) {
    console.warn('No se pudieron cargar ajustes.', error);
  }
}

function updatePrintPreview() {
  const settings = getPrintSettings();
  const wrapper = document.getElementById('labelWrapper');
  wrapper.classList.toggle('show-print-cut-border', settings.cutBorder);
  wrapper.style.setProperty('--print-cut-color', settings.borderColor);
  wrapper.style.setProperty('--print-cut-width', `${settings.borderWidth}mm`);

  const paper = document.getElementById('printPaperSize').value;
  const page = paper === 'a4'
    ? { name: 'A4', widthMm: 210, heightMm: 297 }
    : { name: 'Carta', widthMm: 215.9, heightMm: 279.4 };

  const labelSizeMm = Number(document.getElementById('labelSizeMm').value) || DEFAULT_SIZE_MM;
  const usableWidthMm = page.widthMm - settings.marginMm * 2;
  const usableHeightMm = page.heightMm - settings.marginMm * 2;
  const cols = Math.floor((usableWidthMm + settings.gapMm) / (labelSizeMm + settings.gapMm));
  const rows = Math.floor((usableHeightMm + settings.gapMm) / (labelSizeMm + settings.gapMm));
  const quantity = Math.max(1, Math.floor(Number(document.getElementById('labelQuantity').value) || 1));
  const perSheet = Math.max(0, cols * rows);

  const summary = document.getElementById('printLayoutSummary');
  summary.textContent = perSheet
    ? `Capacidad: ${cols} columnas × ${rows} filas = ${perSheet} etiquetas por hoja ${page.name}. ${quantity} etiqueta(s) usarán ${Math.ceil(quantity / perSheet)} hoja(s).`
    : `La etiqueta no cabe en la hoja ${page.name} con estos márgenes.`;

  updateSheetVisualPreview(cols, rows, quantity, perSheet, labelSizeMm, settings);
}

function updateSheetVisualPreview(cols, rows, quantity, perSheet, labelSizeMm, settings) {
  const container = document.getElementById('sheetPreview');
  if (!container) return;
  container.innerHTML = '';

  if (perSheet === 0) {
    container.innerHTML = '<div style="color:#a23a36; text-align:center; padding:20px; font-size:12px;">⚠️ La etiqueta no cabe en la hoja con esta configuración. Reduce el tamaño o los márgenes.</div>';
    container.style.display = 'block';
    return;
  }

  const scale = 1.5;
  const previewLabelSize = labelSizeMm * scale;
  const previewGap = settings.gapMm * scale;
  const previewMargin = settings.marginMm * scale;

  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${cols}, ${previewLabelSize}px)`;
  container.style.gridTemplateRows = `repeat(${rows}, ${previewLabelSize}px)`;
  container.style.gap = `${previewGap}px`;
  container.style.padding = `${previewMargin}px`;
  container.style.width = 'fit-content';
  container.style.margin = '0 auto';
  container.style.background = '#fff';
  container.style.border = '1px solid #ccc';
  container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';

  const totalToRender = Math.min(quantity, perSheet);
  for (let i = 0; i < perSheet; i++) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'preview-label';
    if (i < totalToRender) {
      labelDiv.style.background = '#f0f5ef';
      labelDiv.style.border = settings.cutBorder ? `1.5px solid ${settings.borderColor}` : '1px dashed #2d5016';
      labelDiv.textContent = 'Etiqueta';
    } else {
      labelDiv.style.background = '#f9f9f9';
      labelDiv.style.border = '1px dotted #ddd';
      labelDiv.style.opacity = '0.4';
      labelDiv.style.color = '#999';
      labelDiv.textContent = 'Vacío';
    }
    container.appendChild(labelDiv);
  }
}

// ============================================
// ✅ IMPRESIÓN - CORREGIDA PARA MÓVIL
// ============================================
// ============================================
// ✅ IMPRESIÓN - CORREGIDA DEFINITIVAMENTE PARA MÓVIL
// ============================================
function printLabels() {
  // 1. Auto-guardar antes de imprimir
  try {
    const design = getCurrentDesign();
    design._autosave = true;
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(design));
    showAutosaveIndicator('💾 Diseño guardado antes de imprimir');
  } catch(e) {}

  const quantityInput = document.getElementById('labelQuantity');
  const quantity = Math.floor(Number(quantityInput.value));
  const labelSizeMm = Number(document.getElementById('labelSizeMm').value);
  const paper = document.getElementById('printPaperSize').value;

  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
    showToast('⚠️ Cantidad entre 1 y 1000 etiquetas', 'warning');
    quantityInput.focus();
    return;
  }
  if (!Number.isFinite(labelSizeMm) || labelSizeMm <= 0) {
    showToast('⚠️ Revise el tamaño de la etiqueta', 'warning');
    return;
  }

  updatePrintPreview();

  const page = paper === 'a4'
    ? { name: 'A4', widthMm: 210, heightMm: 297 }
    : { name: 'Letter', widthMm: 215.9, heightMm: 279.4 };

  const settings = getPrintSettings();
  const marginMm = settings.marginMm;
  const gapMm = settings.gapMm;
  const usableWidthMm = page.widthMm - marginMm * 2;
  const usableHeightMm = page.heightMm - marginMm * 2;
  const columns = Math.floor((usableWidthMm + gapMm) / (labelSizeMm + gapMm));
  const rows = Math.floor((usableHeightMm + gapMm) / (labelSizeMm + gapMm));

  if (columns < 1 || rows < 1) {
    showToast(`⚠️ Etiqueta muy grande para hoja ${page.name}`, 'warning');
    return;
  }

  const perSheet = columns * rows;
  const svg = document.getElementById('labelSvg').cloneNode(true);
  svg.removeAttribute('id');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const pages = [];
  let totalLabels = 0;
  for (let start = 0; start < quantity; start += perSheet) {
    const count = Math.min(perSheet, quantity - start);
    const labels = [];
    for (let i = 0; i < count; i++) {
      labels.push(`<div class="label${settings.cutBorder ? ' cut-border' : ''}"><div class="svg-box">${svg.outerHTML}</div></div>`);
    }
    pages.push(`<section class="sheet">${labels.join('')}</section>`);
    totalLabels += count;
  }

  const pageCss = buildPrintCSS(page, marginMm, usableWidthMm, usableHeightMm, columns, rows, labelSizeMm, gapMm, settings);
  const htmlContent = buildPrintHTML(quantity, pages, pageCss);

  // ✅ DETECCIÓN: móvil usa iframe con botones, desktop usa window.open
  if (isMobileDevice()) {
    printViaIframe(htmlContent);
  } else {
    printViaWindow(htmlContent);
  }

  console.log(`✅ Generadas ${totalLabels} etiquetas en ${pages.length} hoja(s)`);
}

function buildPrintCSS(page, marginMm, usableWidthMm, usableHeightMm, columns, rows, labelSizeMm, gapMm, settings) {
  return `
    @font-face {
      font-family: 'Adelia';
      src: url('fonts/Adelia.ttf') format('truetype'),
           url('fonts/Adelia.otf') format('opentype');
      font-display: swap;
    }
    @page { size: ${page.name}; margin: ${marginMm}mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; font-family: Arial, sans-serif; }
    .sheet {
      width: ${usableWidthMm}mm; height: ${usableHeightMm}mm;
      display: grid !important;
      grid-template-columns: repeat(${columns}, ${labelSizeMm}mm) !important;
      grid-template-rows: repeat(${rows}, ${labelSizeMm}mm) !important;
      gap: ${gapMm}mm !important;
      justify-content: start !important;
      align-content: start !important;
      overflow: hidden !important;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .label {
      width: ${labelSizeMm}mm !important;
      height: ${labelSizeMm}mm !important;
      overflow: hidden; position: relative; display: block;
    }
    .svg-box { width: 100% !important; height: 100% !important; overflow: hidden; }
    .label.cut-border::after {
      content: ""; position: absolute; inset: 2.5%;
      border: ${settings.borderWidth}mm solid ${settings.borderColor};
      border-radius: 50%; pointer-events: none;
    }
    svg { display: block; width: 100% !important; height: 100% !important; }
    .label-circle { fill: white; stroke: #e8dfd5; stroke-width: 2; }
    .border-text-path { fill: #6b8f5e; font-family: Lora, serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
    .leaf-decoration { opacity: .7; }
    .label-text-main, .adelia-font { font-family: 'Adelia', 'Great Vibes', cursive !important; fill: #2d5016; text-anchor: middle; }
    .label-text-sub { font-family: 'Great Vibes', cursive; fill: #2d5016; text-anchor: middle; }
    .label-text-message { font-family: Lora, serif; fill: #444; text-anchor: middle; font-size: 10px; }
    .label-text-sinpe { font-family: 'Playfair Display', serif; fill: #1a1a1a; text-anchor: middle; font-weight: 700; }
    .label-text-brand { font-family: 'Playfair Display', serif; fill: #2d5016; text-anchor: middle; font-weight: 700; }
    .label-text-client { font-family: 'Playfair Display', serif; fill: #1a1a1a; text-anchor: middle; font-weight: 600; }
    .label-text-footer { font-family: 'Dancing Script', cursive; fill: #555; text-anchor: middle; }
    @media screen {
      body { padding: 18px; background: #f1f4ef; }
      .sheet { background: #fff; margin: 0 auto 18px; box-shadow: 0 2px 14px rgba(0,0,0,0.1); }
    }
  `;
}

// ✅ HTML con instrucciones claras para móvil
function buildPrintHTML(quantity, pages, pageCss) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etiquetas para imprimir (${quantity})</title>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>${pageCss}</style>
</head>
<body>
  ${pages.join('\n')}
  <script>
    window.addEventListener('load', function() {
      // ✅ Función de impresión expuesta globalmente
      window.doPrint = function() {
        try {
          window.focus();
          window.print();
          return true;
        } catch(e) {
          console.error('Error al imprimir:', e);
          return false;
        }
      };

      // Intento automático DESPUÉS de que las fuentes carguen
      const tryAutoPrint = () => {
        setTimeout(() => {
          try {
            window.focus();
            window.print();
          } catch(e) {}
        }, 800);
      };

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(tryAutoPrint);
      } else {
        tryAutoPrint();
      }

      // Avisar al padre cuando termine la impresión
      window.addEventListener('afterprint', () => {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'ewe-print-done' }, '*');
        }
      });
    });
  <\/script>
</body>
</html>`;
}

// ✅ DESKTOP: window.open (funciona bien)
function printViaWindow(htmlContent) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('⚠️ Permita ventanas emergentes', 'warning');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ✅ MÓVIL: iframe con srcdoc + botones manuales
function printViaIframe(htmlContent) {
  // Remover overlay anterior si existe
  const existingOverlay = document.getElementById('ewePrintOverlay');
  if (existingOverlay) existingOverlay.remove();

  // Crear overlay fullscreen
  const overlay = document.createElement('div');
  overlay.id = 'ewePrintOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.9);
    display: flex; flex-direction: column;
    align-items: center;
    padding: 0;
    animation: fadeIn 0.3s ease;
  `;

  // ✅ Barra superior con TODOS los botones necesarios
  const topBar = document.createElement('div');
  topBar.style.cssText = `
    width: 100%;
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, #2d5016, #3d6b20);
    color: white;
    padding: 10px 12px;
    gap: 8px;
    flex-wrap: wrap;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  topBar.innerHTML = `
    <span style="font-size: 13px; font-weight: 600; font-family: 'Lora', serif; flex: 1;">
      📄 Vista previa
    </span>
    <button id="ewePrintBtn" style="
      background: #d4a843; color: white; border: none;
      padding: 10px 14px; border-radius: 8px;
      font-weight: 700; cursor: pointer; font-size: 13px;
      font-family: 'Lora', serif;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    ">🖨️ Imprimir</button>
    <button id="eweDownloadBtn" style="
      background: #1976d2; color: white; border: none;
      padding: 10px 14px; border-radius: 8px;
      font-weight: 700; cursor: pointer; font-size: 13px;
      font-family: 'Lora', serif;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    ">💾 Guardar</button>
    <button id="eweClosePrint" style="
      background: #a23a36; color: white; border: none;
      padding: 10px 14px; border-radius: 8px;
      font-weight: 700; cursor: pointer; font-size: 13px;
      font-family: 'Lora', serif;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    ">✕ Cerrar</button>
  `;

  // ✅ Instrucciones para el usuario (solo en móvil)
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    width: 100%;
    background: #fff9e6;
    color: #7a5a00;
    padding: 10px 14px;
    font-size: 12px;
    font-family: 'Lora', serif;
    text-align: center;
    border-bottom: 2px solid #d4a843;
    line-height: 1.4;
  `;
  instructions.innerHTML = `
    <strong>📱 En móvil:</strong> Toca <strong>🖨️ Imprimir</strong> o <strong>💾 Guardar</strong> abajo.
    Si no funciona, usa <strong>💾 Guardar</strong> y abre el archivo descargado.
  `;

  // ✅ Iframe con srcdoc (mucho más confiable que document.write)
  const iframe = document.createElement('iframe');
  iframe.id = 'ewePrintIframe';
  iframe.setAttribute('srcdoc', htmlContent);
  iframe.style.cssText = `
    width: 100%;
    flex: 1;
    background: white;
    border: none;
  `;

  overlay.appendChild(topBar);
  overlay.appendChild(instructions);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  // ✅ Referencia al iframe para usarla en los botones
  let iframeRef = iframe;

  // ✅ BOTÓN: Imprimir
  document.getElementById('ewePrintBtn').addEventListener('click', () => {
    try {
      // Intentar 1: llamar a la función expuesta dentro del iframe
      if (iframeRef.contentWindow && iframeRef.contentWindow.doPrint) {
        const success = iframeRef.contentWindow.doPrint();
        if (success) return;
      }
      // Intentar 2: focus + print directo
      iframeRef.contentWindow.focus();
      setTimeout(() => {
        iframeRef.contentWindow.print();
      }, 100);
    } catch (e) {
      console.error('Error al imprimir iframe:', e);
      showToast('⚠️ Use el botón 💾 Guardar como alternativa', 'warning');
    }
  });

  // ✅ BOTÓN: Guardar/Descargar como HTML
  document.getElementById('eweDownloadBtn').addEventListener('click', () => {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      a.download = `etiquetas-esentia-${timestamp}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('✅ Archivo descargado. Ábrelo e imprímelo.', 'success');
    } catch (e) {
      console.error('Error al descargar:', e);
      showToast('❌ Error al guardar', 'error');
    }
  });

  // ✅ BOTÓN: Cerrar
  document.getElementById('eweClosePrint').addEventListener('click', () => {
    overlay.remove();
  });

  // ✅ Cerrar con tecla Escape (si hay teclado)
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);

  // ✅ Escuchar mensaje "impresión terminada" desde el iframe
  const msgHandler = (e) => {
    if (e.data && e.data.type === 'ewe-print-done') {
      showToast('✅ Impresión completada', 'success');
      window.removeEventListener('message', msgHandler);
    }
  };
  window.addEventListener('message', msgHandler);

  // ✅ Cuando el iframe cargue, intentar auto-imprimir (puede funcionar en algunos móviles)
  iframe.addEventListener('load', () => {
    setTimeout(() => {
      try {
        if (iframe.contentWindow && iframe.contentWindow.doPrint) {
          // No auto-imprimir, dejar que el usuario decida con los botones
          console.log('✅ Iframe cargado y listo para imprimir');
        }
      } catch(e) {}
    }, 1000);
  });

  showToast('📱 Usa los botones de arriba para imprimir o guardar', 'info');
}

function printLabel() { printLabels(); }
function createPDF() { printLabels(); }

function buildPrintCSS(page, marginMm, usableWidthMm, usableHeightMm, columns, rows, labelSizeMm, gapMm, settings) {
  return `
    @font-face {
      font-family: 'Adelia';
      src: url('fonts/Adelia.ttf') format('truetype'),
           url('fonts/Adelia.otf') format('opentype');
      font-display: swap;
    }
    @page { size: ${page.name}; margin: ${marginMm}mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; font-family: Arial, sans-serif; }
    .sheet {
      width: ${usableWidthMm}mm; height: ${usableHeightMm}mm;
      display: grid !important;
      grid-template-columns: repeat(${columns}, ${labelSizeMm}mm) !important;
      grid-template-rows: repeat(${rows}, ${labelSizeMm}mm) !important;
      gap: ${gapMm}mm !important;
      justify-content: start !important;
      align-content: start !important;
      overflow: hidden !important;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }
    .label {
      width: ${labelSizeMm}mm !important;
      height: ${labelSizeMm}mm !important;
      overflow: hidden; position: relative; display: block;
    }
    .svg-box { width: 100% !important; height: 100% !important; overflow: hidden; }
    .label.cut-border::after {
      content: ""; position: absolute; inset: 2.5%;
      border: ${settings.borderWidth}mm solid ${settings.borderColor};
      border-radius: 50%; pointer-events: none;
    }
    svg { display: block; width: 100% !important; height: 100% !important; }
    .label-circle { fill: white; stroke: #e8dfd5; stroke-width: 2; }
    .border-text-path { fill: #6b8f5e; font-family: Lora, serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
    .leaf-decoration { opacity: .7; }
    .label-text-main, .adelia-font { font-family: 'Adelia', 'Great Vibes', cursive !important; fill: #2d5016; text-anchor: middle; }
    .label-text-sub { font-family: 'Great Vibes', cursive; fill: #2d5016; text-anchor: middle; }
    .label-text-message { font-family: Lora, serif; fill: #444; text-anchor: middle; font-size: 10px; }
    .label-text-sinpe { font-family: 'Playfair Display', serif; fill: #1a1a1a; text-anchor: middle; font-weight: 700; }
    .label-text-brand { font-family: 'Playfair Display', serif; fill: #2d5016; text-anchor: middle; font-weight: 700; }
    .label-text-client { font-family: 'Playfair Display', serif; fill: #1a1a1a; text-anchor: middle; font-weight: 600; }
    .label-text-footer { font-family: 'Dancing Script', cursive; fill: #555; text-anchor: middle; }
    @media screen {
      body { padding: 18px; background: #f1f4ef; }
      .sheet { background: #fff; margin: 0 auto 18px; box-shadow: 0 2px 14px rgba(0,0,0,0.1); }
    }
  `;
}

function buildPrintHTML(quantity, pages, pageCss) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etiquetas para imprimir (${quantity})</title>
  <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>${pageCss}</style>
</head>
<body>
  ${pages.join('\n')}
  <script>
    window.addEventListener('load', function() {
      const go = () => setTimeout(() => window.print(), 500);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(go);
      } else {
        go();
      }
    });
    window.addEventListener('afterprint', () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'ewe-print-done' }, '*');
      }
      setTimeout(() => window.close(), 300);
    });
  <\/script>
</body>
</html>`;
}

function printViaWindow(htmlContent) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('⚠️ Permita ventanas emergentes', 'warning');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function printViaIframe(htmlContent) {
  const existingOverlay = document.getElementById('ewePrintOverlay');
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ewePrintOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0,0,0,0.85);
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    padding: 10px;
  `;

  const topBar = document.createElement('div');
  topBar.style.cssText = `
    width: 100%; max-width: 600px;
    display: flex; justify-content: space-between; align-items: center;
    background: #2d5016; color: white;
    padding: 12px 16px; border-radius: 10px 10px 0 0;
    font-family: 'Lora', serif; font-weight: 600;
  `;
  topBar.innerHTML = `
    <span style="font-size: 14px;">📄 Vista previa de impresión</span>
    <button id="eweClosePrint" style="
      background: #d4a843; color: white; border: none;
      padding: 8px 16px; border-radius: 6px;
      font-weight: 600; cursor: pointer; font-size: 13px;
    ">✕ Cerrar</button>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100%; max-width: 600px;
    flex: 1; min-height: 70vh;
    background: white; border: none;
    border-radius: 0 0 10px 10px;
  `;

  overlay.appendChild(topBar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  document.getElementById('eweClosePrint').addEventListener('click', () => {
    overlay.remove();
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      window.removeEventListener('keydown', escHandler);
    }
  };
  window.addEventListener('keydown', escHandler);

  const msgHandler = (e) => {
    if (e.data && e.data.type === 'ewe-print-done') {
      overlay.remove();
      window.removeEventListener('message', msgHandler);
    }
  };
  window.addEventListener('message', msgHandler);

  showToast('📱 Usa el menú del navegador para imprimir o guardar como PDF', 'info');
}

function printLabel() { printLabels(); }
function createPDF() { printLabels(); }