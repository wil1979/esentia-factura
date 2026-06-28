// velas.js — AromaLabel Pro — Modularizado
// ============================================================
// MÓDULO: Estado Global
// ============================================================
const state = {
  currentProject: null,
  logoData: null,
  printQueue: JSON.parse(localStorage.getItem('printQueue') || '[]'),
  projects: JSON.parse(localStorage.getItem('aromaProjects') || '[]'),
  qrInstance: null
};

const PAPER_SIZES = {
  A4: { w: 210, h: 297 },
  Carta: { w: 216, h: 279 },
  Oficio: { w: 216, h: 356 },
  A3: { w: 297, h: 420 },
  A5: { w: 148, h: 210 }
};

// ============================================================
// MÓDULO: Captura Segura con html2canvas
// ============================================================
async function safeCaptureLabel() {
  const original = document.getElementById('labelPreview');
  const clone = original.cloneNode(true);

  let container = document.getElementById('captureContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'captureContainer';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
  }
  container.innerHTML = '';
  container.appendChild(clone);

  const W = parseFloat(document.getElementById('dimW').value) || 60;
  const H = parseFloat(document.getElementById('dimH').value) || 80;
  const scale = 3;

  clone.style.width = (W * scale) + 'px';
  clone.style.height = (H * scale) + 'px';
  clone.style.position = 'relative';
  clone.style.display = 'flex';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';

  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const computed = window.getComputedStyle(el);
    const bg = computed.backgroundImage;
    if (bg && bg.includes('gradient')) {
      el.style.backgroundImage = 'none';
      el.style.backgroundColor = computed.backgroundColor || '#ffffff';
    }
  });

  await new Promise(r => setTimeout(r, 100));

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: W * scale,
      height: H * scale,
      x: 0, y: 0,
      scrollX: 0, scrollY: 0,
      windowWidth: W * scale + 100,
      windowHeight: H * scale + 100
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('html2canvas failed, trying fallback:', err);
    const canvas2 = await html2canvas(original, {
      scale: 1,
      backgroundColor: document.getElementById('colorBg').value || '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    return canvas2.toDataURL('image/png');
  }
}

// ============================================================
// MÓDULO: Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando AromaLabel Pro...');
  setupTabs();
  setupTemplates();
  setupImageControls();
  setupVectorControls();
  setupBrandNameControls();
  setupFormListeners();
  setupZoomControls();
  setupDraggableImage();
  setupResizeHandles();
  setupActionButtons();
  setupPrintControls();
  renderProjectsList();
  renderPrintQueue();
  updatePreview();
  updatePrintStats();

  await initializeFirebase();
});

// ============================================================
// MÓDULO: Firebase (stub — reemplaza con tus módulos reales)
// ============================================================
async function initializeFirebase() {
  const badge = document.getElementById('connectionStatus');
  try {
    let initAuth, testConnection, syncProjects;
    try {
      const fbStorage = await import('./modules/firebaseStorage.js');
      const fb2 = await import('./modules/firebase2.js');
      initAuth = fbStorage.initAuth;
      syncProjects = fbStorage.syncProjects;
      testConnection = fb2.testConnection;
    } catch (e) {
      console.log('Firebase modules not found, running in local mode');
      badge.textContent = '⚠️ Modo local';
      badge.classList.add('error');
      return;
    }

    const conn = await testConnection();
    console.log('📡 Estado de conexión:', conn);
    const user = await initAuth();
    if (user) {
      badge.textContent = `✅ Conectado (${user.uid.slice(0, 6)}...)`;
      badge.classList.add('connected');
      try {
        state.projects = await syncProjects();
        renderProjectsList();
      } catch (e) {
        console.warn('Sync failed:', e);
      }
    } else {
      badge.textContent = '⚠️ Modo local';
      badge.classList.add('error');
    }
  } catch (error) {
    console.error('❌ Error Firebase:', error);
    badge.textContent = '❌ Sin conexión';
    badge.classList.add('error');
  }
}

// ============================================================
// MÓDULO: Tabs
// ============================================================
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'print') updatePrintStats();
    });
  });
}

// ============================================================
// MÓDULO: Plantillas
// ============================================================
function setupTemplates() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('dimW').value = btn.dataset.w;
      document.getElementById('dimH').value = btn.dataset.h;
      updatePreview();
    });
  });
}

// ============================================================
// MÓDULO: Controles de Imagen
// ============================================================
function setupImageControls() {
  const logoInput = document.getElementById('logoInput');
  const imageControls = document.getElementById('imageControls');
  const previewLogo = document.getElementById('previewLogo');

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.logoData = ev.target.result;
      previewLogo.src = state.logoData;
      previewLogo.style.display = 'block';
      imageControls.style.display = 'block';
      document.getElementById('imgSize').value = 100;
      document.getElementById('imgX').value = 50;
      document.getElementById('imgY').value = 50;
      document.getElementById('imgOpacity').value = 100;
      document.getElementById('imgRotation').value = 0;
      document.getElementById('imgFilter').value = 'none';
      document.getElementById('imgCircle').checked = false;
      applyImageStyles();
    };
    reader.readAsDataURL(file);
  });

  ['imgSize', 'imgX', 'imgY', 'imgOpacity', 'imgRotation', 'imgFilter', 'imgCircle', 'imgLayer']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', applyImageStyles);
        el.addEventListener('change', applyImageStyles);
      }
    });

  document.getElementById('removeImage').addEventListener('click', () => {
    state.logoData = null;
    previewLogo.style.display = 'none';
    previewLogo.src = '';
    imageControls.style.display = 'none';
    logoInput.value = '';
    updatePreview();
  });
}

function applyImageStyles() {
  const logo = document.getElementById('previewLogo');
  if (!logo || logo.style.display === 'none') return;

  const size = document.getElementById('imgSize').value;
  const x = document.getElementById('imgX').value;
  const y = document.getElementById('imgY').value;
  const opacity = document.getElementById('imgOpacity').value;
  const rotation = document.getElementById('imgRotation').value;
  const filter = document.getElementById('imgFilter').value;
  const circle = document.getElementById('imgCircle').checked;
  const layer = document.getElementById('imgLayer')?.value || 'front';
  const labelContent = document.querySelector('.label-content');

  logo.classList.remove('layer-front', 'layer-behind', 'layer-background');
  logo.classList.add('layer-' + layer);

  if (layer === 'background') {
    if (logo.parentElement !== labelContent) {
      labelContent.insertBefore(logo, labelContent.firstChild);
    }
    labelContent.classList.add('has-bg-image');
    logo.style.setProperty('--bg-opacity', opacity / 100);
    logo.style.filter = filter;
    logo.style.cursor = 'default';
    document.querySelectorAll('.img-resize-handle').forEach(h => h.style.display = 'none');
    return;
  }

  const brandArea = document.querySelector('.brand-area');
  if (logo.parentElement !== brandArea) {
    brandArea.insertBefore(logo, brandArea.firstChild);
  }
  labelContent.classList.remove('has-bg-image');
  document.querySelectorAll('.img-resize-handle').forEach(h => h.style.display = '');

  logo.style.width = size + '%';
  logo.style.maxWidth = 'none';
  logo.style.position = 'absolute';
  logo.style.left = x + '%';
  logo.style.top = y + '%';
  logo.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
  logo.style.opacity = opacity / 100;
  logo.style.filter = filter;
  logo.style.borderRadius = circle ? '50%' : '0';
  logo.style.cursor = 'move';
  logo.style.zIndex = layer === 'front' ? '5' : '0';
}

// ============================================================
// MÓDULO: Controles del Vector Decorativo (Splash)
// ============================================================
function setupVectorControls() {
  const vectorIds = ['showVector', 'vectorColor', 'vectorOpacity', 'vectorX', 'vectorY', 'vectorScale', 'vectorRotation'];
  vectorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', applyVectorStyles);
      el.addEventListener('change', applyVectorStyles);
    }
  });
}

function applyVectorStyles() {
  const vectorContainer = document.getElementById('vectorContainer');
  const vectorSplash = document.getElementById('vectorSplash');
  if (!vectorContainer || !vectorSplash) return;

  const show = document.getElementById('showVector').checked;
  const color = document.getElementById('vectorColor').value;
  const opacity = document.getElementById('vectorOpacity').value;
  const x = document.getElementById('vectorX').value;
  const y = document.getElementById('vectorY').value;
  const scale = document.getElementById('vectorScale').value;
  const rotation = document.getElementById('vectorRotation').value;

  vectorContainer.style.display = show ? 'block' : 'none';
  vectorSplash.style.fill = color;
  vectorContainer.style.opacity = opacity / 100;
  vectorContainer.style.left = x + '%';
  vectorContainer.style.top = y + '%';
  vectorContainer.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale / 100})`;
}

// ============================================================
// MÓDULO: Controles del Nombre de Marca (brand-name)
// ============================================================
function setupBrandNameControls() {
  const brandIds = ['brandNameText', 'brandFont', 'brandNameColor', 'brandNameBold'];
  brandIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', applyBrandNameStyles);
      el.addEventListener('change', applyBrandNameStyles);
    }
  });
}

function applyBrandNameStyles() {
  const previewBrandName = document.getElementById('previewBrandName');
  if (!previewBrandName) return;

  const text = document.getElementById('brandNameText').value || 'Esentia';
  const font = document.getElementById('brandFont').value;
  const color = document.getElementById('brandNameColor').value;
  const bold = document.getElementById('brandNameBold').checked;
  const size = document.getElementById('fsBrand').value;

  previewBrandName.textContent = text;
  previewBrandName.style.fontFamily = `'${font}', serif`;
  previewBrandName.style.color = color;
  previewBrandName.style.fontWeight = bold ? '700' : '400';
  previewBrandName.style.fontSize = size + 'px';
}

// ============================================================
// MÓDULO: Imagen Arrastrable
// ============================================================
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let imgStartX = 50, imgStartY = 50;

function setupDraggableImage() {
  const logo = document.getElementById('previewLogo');
  const brandArea = document.querySelector('.brand-area');
  if (!logo || !brandArea) return;

  brandArea.style.position = 'relative';
  brandArea.style.minHeight = '40px';

  logo.addEventListener('mousedown', startDrag);
  logo.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('mousemove', drag);
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);
}

function startDrag(e) {
  const logo = document.getElementById('previewLogo');
  if (logo.style.display === 'none') return;
  isDragging = true;
  e.preventDefault();
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  dragStartX = clientX;
  dragStartY = clientY;
  imgStartX = parseFloat(document.getElementById('imgX').value) || 50;
  imgStartY = parseFloat(document.getElementById('imgY').value) || 50;
  logo.style.cursor = 'grabbing';
}

function drag(e) {
  if (!isDragging) return;
  e.preventDefault();
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  const brandArea = document.querySelector('.brand-area');
  const rect = brandArea.getBoundingClientRect();
  const newX = Math.max(0, Math.min(100, imgStartX + (deltaX / rect.width) * 100));
  const newY = Math.max(0, Math.min(100, imgStartY + (deltaY / rect.height) * 100));
  document.getElementById('imgX').value = Math.round(newX);
  document.getElementById('imgY').value = Math.round(newY);
  applyImageStyles();
}

function endDrag() {
  isDragging = false;
  const logo = document.getElementById('previewLogo');
  if (logo) logo.style.cursor = 'move';
}

// ============================================================
// MÓDULO: Resize Handles de Imagen
// ============================================================
let isResizing = false;
let resizeStartSize = 100;
let resizeStartX = 0, resizeStartY = 0;

function setupResizeHandles() {
  document.querySelectorAll('.img-resize-handle').forEach(h => {
    h.addEventListener('mousedown', startResize);
    h.addEventListener('touchstart', startResize, { passive: false });
  });
  document.addEventListener('mousemove', doResize);
  document.addEventListener('touchmove', doResize, { passive: false });
  document.addEventListener('mouseup', endResize);
  document.addEventListener('touchend', endResize);
}

function startResize(e) {
  e.preventDefault();
  e.stopPropagation();
  isResizing = true;
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  resizeStartX = clientX;
  resizeStartY = clientY;
  resizeStartSize = parseFloat(document.getElementById('imgSize').value) || 100;
}

function doResize(e) {
  if (!isResizing) return;
  e.preventDefault();
  const clientX = e.clientX || (e.touches && e.touches[0].clientX);
  const clientY = e.clientY || (e.touches && e.touches[0].clientY);
  const deltaX = clientX - resizeStartX;
  const deltaY = clientY - resizeStartY;
  const delta = Math.max(deltaX, deltaY);
  const logo = document.getElementById('previewLogo');
  const rect = logo.getBoundingClientRect();
  const sizeChange = (delta / rect.width) * 100;
  let newSize = resizeStartSize + sizeChange;
  newSize = Math.max(10, Math.min(200, newSize));
  document.getElementById('imgSize').value = Math.round(newSize);
  applyImageStyles();
}

function endResize() {
  isResizing = false;
}

// ============================================================
// MÓDULO: Zoom Controls
// ============================================================
function setupZoomControls() {
  const slider = document.getElementById('zoomSlider');
  const zoomIn = document.getElementById('zoomIn');
  const zoomOut = document.getElementById('zoomOut');
  const zoomReset = document.getElementById('zoomReset');
  const zoomValue = document.getElementById('zoomValue');

  if (!slider) return;

  function updateZoom() {
    zoomValue.textContent = slider.value + '%';
    updatePreview();
  }

  slider.addEventListener('input', updateZoom);

  zoomIn.addEventListener('click', () => {
    let val = parseInt(slider.value) + 25;
    if (val > 300) val = 300;
    slider.value = val;
    updateZoom();
  });

  zoomOut.addEventListener('click', () => {
    let val = parseInt(slider.value) - 25;
    if (val < 50) val = 50;
    slider.value = val;
    updateZoom();
  });

  zoomReset.addEventListener('click', () => {
    slider.value = 100;
    updateZoom();
  });

  const preview = document.getElementById('labelPreview');
  if (preview) {
    preview.parentElement.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        let val = parseInt(slider.value);
        if (e.deltaY < 0) val += 15;
        else val -= 15;
        val = Math.max(50, Math.min(300, val));
        slider.value = val;
        updateZoom();
      }
    }, { passive: false });
  }
}

// ============================================================
// MÓDULO: Form Listeners
// ============================================================
function setupFormListeners() {
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (input.type === 'file' || input.id.startsWith('img') ||
        input.id.startsWith('vector') || input.id === 'brandNameText' ||
        input.id === 'brandFont' || input.id === 'brandNameColor' ||
        input.id === 'brandNameBold') return;
    input.addEventListener('input', () => {
      updatePreview();
      if (input.closest('#tab-print') || input.id.startsWith('margin') ||
          input.id.startsWith('space') || input.id === 'paperSize' || input.id === 'orientation') {
        updatePrintStats();
      }
    });
    input.addEventListener('change', () => {
      updatePreview();
      if (input.closest('#tab-print') || input.id.startsWith('margin') ||
          input.id.startsWith('space') || input.id === 'paperSize' || input.id === 'orientation') {
        updatePrintStats();
      }
    });
  });
}

// ============================================================
// MÓDULO: Vista Previa Principal
// ============================================================
function updatePreview() {
  const W = parseFloat(document.getElementById('dimW').value) || 60;
  const H = parseFloat(document.getElementById('dimH').value) || 80;
  const zoomSlider = document.getElementById('zoomSlider');
  const zoom = zoomSlider ? (parseFloat(zoomSlider.value) || 100) / 100 : 1;
  const baseScale = 3;
  const scale = baseScale * zoom;
  const padding = parseFloat(document.getElementById('padding').value) || 3;
  const radius = parseFloat(document.getElementById('radius').value) || 4;
  const lineTop = parseFloat(document.getElementById('lineTop').value) || 0;
  const lineBottom = parseFloat(document.getElementById('lineBottom').value) || 0;
  const spacing = parseFloat(document.getElementById('spacing').value) || 6;
  const colorAccent = document.getElementById('colorAccent').value || '#c9a96e';
  const colorText = document.getElementById('colorText').value || '#1a1a1a';
  const colorBg = document.getElementById('colorBg').value || '#ffffff';
  const colorLines = document.getElementById('colorLines').value || '#c9a96e';
  const colorQr = document.getElementById('colorQr').value || '#1a1a1a';
  const colorQrBg = document.getElementById('colorQrBg').value || '#ffffff';

  const preview = document.getElementById('labelPreview');
  const labelContent = preview.querySelector('.label-content');

  preview.style.width = (W * scale) + 'px';
  preview.style.height = (H * scale) + 'px';
  preview.style.background = colorBg;
  preview.style.color = colorText;
  preview.style.borderRadius = radius + 'px';

  labelContent.style.padding = padding + 'mm';
  labelContent.style.gap = spacing + 'px';

  // Líneas decorativas
  let topLine = labelContent.querySelector('.line-top');
  let bottomLine = labelContent.querySelector('.line-bottom');

  if (!topLine) {
    topLine = document.createElement('div');
    topLine.className = 'line-top';
    topLine.style.width = '100%';
    topLine.style.flexShrink = '0';
    topLine.style.borderRadius = '1px';
    labelContent.insertBefore(topLine, labelContent.firstChild);
  }
  if (!bottomLine) {
    bottomLine = document.createElement('div');
    bottomLine.className = 'line-bottom';
    bottomLine.style.width = '100%';
    bottomLine.style.flexShrink = '0';
    bottomLine.style.borderRadius = '1px';
    const qrArea = labelContent.querySelector('.qr-area');
    if (qrArea) labelContent.insertBefore(bottomLine, qrArea);
    else labelContent.appendChild(bottomLine);
  }

  if (lineTop > 0) {
    topLine.style.display = 'block';
    topLine.style.height = lineTop + 'px';
    topLine.style.background = colorLines;
  } else {
    topLine.style.display = 'none';
  }

  if (lineBottom > 0) {
    bottomLine.style.display = 'block';
    bottomLine.style.height = lineBottom + 'px';
    bottomLine.style.background = colorLines;
  } else {
    bottomLine.style.display = 'none';
  }

  // QR URL default
  const qrUrlInput = document.getElementById('qrUrl');
  if (!qrUrlInput.value || qrUrlInput.value.trim() === '') {
    qrUrlInput.value = 'https://www.facebook.com/profile.php?id=61579078480913';
  }

  // Textos
  const product = document.getElementById('productName').value || 'Lavanda';
  const type = document.getElementById('productType').value || 'Vela Aromática de Soya';
  const details = document.getElementById('productDetails').value || '180g · 40h';
  const safety = document.getElementById('safetyInstructions').value;
  const legal = document.getElementById('legalInfo').value || 'Lote: 001 | Exp: 12/2026';
  const safetyBold = document.getElementById('safetyBold').checked;

  preview.querySelector('.product-name').textContent = product;
  preview.querySelector('.product-type').textContent = type;
  preview.querySelector('.product-details').textContent = details;
  preview.querySelector('.safety-area p').textContent = safety;
  preview.querySelector('.lot').textContent = legal;

  // Fuentes
  preview.querySelector('.product-name').style.fontFamily =
    `'${document.getElementById('productFont').value}', serif`;

  // Tamaños
  const fsSubbrand = document.getElementById('fsSubbrand').value;
  const fsProduct = document.getElementById('fsProduct').value;
  const fsType = document.getElementById('fsType').value;
  const fsDetails = document.getElementById('fsDetails').value;
  const fsSafety = document.getElementById('fsSafety').value;
  const fsLot = document.getElementById('fsLot').value;
  const fsOrigin = document.getElementById('fsOrigin').value;

  preview.querySelector('.brand-sub').style.fontSize = fsSubbrand + 'px';
  preview.querySelector('.product-name').style.fontSize = fsProduct + 'px';
  preview.querySelector('.product-type').style.fontSize = fsType + 'px';
  preview.querySelector('.product-details').style.fontSize = fsDetails + 'px';
  preview.querySelector('.safety-area').style.fontSize = fsSafety + 'px';
  preview.querySelector('.lot').style.fontSize = fsLot + 'px';
  preview.querySelector('.origin').style.fontSize = fsOrigin + 'px';

  preview.querySelector('.safety-area p').style.fontWeight = safetyBold ? '700' : '400';

  // Visibilidad
  preview.querySelector('.divider').style.display =
    document.getElementById('showDivider').checked ? 'block' : 'none';
  preview.querySelector('.safety-area').style.display =
    document.getElementById('showSafety').checked ? 'block' : 'none';
  preview.querySelector('.footer-area').style.display =
    document.getElementById('showLegal').checked ? 'flex' : 'none';

  const qrArea = preview.querySelector('.qr-area');
  const showQR = document.getElementById('showQR').checked;
  qrArea.style.display = showQR ? 'flex' : 'none';

  // Posición QR
  const qrPosX = document.getElementById('qrPosX').value;
  const qrPosY = document.getElementById('qrPosY').value;

  qrArea.style.justifyContent = qrPosX === 'center' ? 'center' : (qrPosX === 'left' ? 'flex-start' : 'flex-end');
  qrArea.style.alignItems = qrPosY === 'center' ? 'center' : (qrPosY === 'top' ? 'flex-start' : 'flex-end');
  qrArea.style.order = qrPosY === 'top' ? '-1' : '10';

  if (showQR) {
    drawQR(qrUrlInput.value);
  }

  // Aplicar estilos de imagen, vector y brand-name
  applyImageStyles();
  applyVectorStyles();
  applyBrandNameStyles();

  preview.querySelector('.label-dimensions').textContent = `${W} × ${H} mm`;
}

function drawQR(text) {
  const qrContainer = document.getElementById('qrContainer');
  const size = parseInt(document.getElementById('qrSize').value) || 22;
  const scale = 3;
  const px = Math.round(size * scale);

  if (!text || text.trim() === '') {
    text = 'https://www.facebook.com/profile.php?id=61579078480913';
  }

  qrContainer.innerHTML = '';

  try {
    new QRCode(qrContainer, {
      text: text,
      width: px,
      height: px,
      colorDark: document.getElementById('colorQr').value || '#1a1a1a',
      colorLight: document.getElementById('colorQrBg').value || '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (error) {
    console.error('❌ Error generando QR:', error);
    qrContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:'+px+'px;height:'+px+'px;background:#f0f0f0;color:#999;font-size:10px;border-radius:4px;">QR</div>';
  }
}

// ============================================================
// MÓDULO: Botones de Acción
// ============================================================
function setupActionButtons() {
  document.getElementById('btnSave').addEventListener('click', saveProject);
  document.getElementById('btnAddQueue').addEventListener('click', addToQueue);
  document.getElementById('btnPNG').addEventListener('click', exportPNG);
  document.getElementById('btnPDF').addEventListener('click', exportLabelPDF);
  document.getElementById('btnExport').addEventListener('click', exportProject);
  document.getElementById('btnImport').addEventListener('click', importProject);
  document.getElementById('btnSync').addEventListener('click', syncWithFirestore);
  document.getElementById('btnRefresh').addEventListener('click', () => {
    state.projects = JSON.parse(localStorage.getItem('aromaProjects') || '[]');
    renderProjectsList();
  });
}

async function syncWithFirestore() {
  try {
    const { syncProjects } = await import('./modules/firebaseStorage.js');
    state.projects = await syncProjects();
    renderProjectsList();
    console.log('✅ Sincronización completada');
  } catch (e) {
    console.warn('⚠️ Sincronización falló, usando modo local:', e.message);
  }
}

// ============================================================
// MÓDULO: Exportar PNG
// ============================================================
async function exportPNG() {
  const btn = document.getElementById('btnPNG');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Generando...';
  btn.disabled = true;

  try {
    const imgData = await safeCaptureLabel();
    const link = document.createElement('a');
    link.download = `etiqueta-${document.getElementById('projectName').value || 'esentia'}-${Date.now()}.png`;
    link.href = imgData;
    link.click();
  } catch (err) {
    console.error('Error PNG:', err);
    alert('❌ Error al generar PNG: ' + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ============================================================
// MÓDULO: Exportar PDF de Etiqueta
// ============================================================
async function exportLabelPDF() {
  const { jsPDF } = window.jspdf;
  const btn = document.getElementById('btnPDF');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Generando...';
  btn.disabled = true;

  try {
    const imgData = await safeCaptureLabel();
    const W = parseFloat(document.getElementById('dimW').value) || 60;
    const H = parseFloat(document.getElementById('dimH').value) || 80;

    const pdf = new jsPDF({
      orientation: W > H ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [W, H]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, W, H);
    pdf.save(`etiqueta-${document.getElementById('projectName').value || 'esentia'}-${Date.now()}.pdf`);
  } catch (err) {
    console.error('Error PDF:', err);
    alert('❌ Error al generar PDF: ' + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ============================================================
// MÓDULO: Colección de Datos del Proyecto
// ============================================================
function collectProjectData() {
  const fields = ['projectName','brandNameText','productName','productType','productDetails',
    'safetyInstructions','qrUrl','legalInfo','brandFont','productFont',
    'dimW','dimH','padding','radius','lineTop','lineBottom','spacing',
    'fsBrand','fsSubbrand','fsProduct','fsType','fsDetails','fsSafety',
    'fsLot','fsOrigin','qrSize','colorAccent','colorText','colorBg',
    'colorLines','colorQr','colorQrBg','qrPosX','qrPosY',
    'brandNameColor','vectorColor','vectorOpacity','vectorX','vectorY',
    'vectorScale','vectorRotation'];
  const data = { id: Date.now().toString() };
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) data[f] = el.type === 'checkbox' ? el.checked : el.value;
  });
  ['showDivider','showQR','showSafety','showLegal','safetyBold',
   'brandNameBold','showVector','imgCircle'].forEach(f => {
    const el = document.getElementById(f);
    if (el) data[f] = el.checked;
  });
  data.logoData = state.logoData;
  data.imageControls = {
    size: document.getElementById('imgSize').value,
    x: document.getElementById('imgX').value,
    y: document.getElementById('imgY').value,
    opacity: document.getElementById('imgOpacity').value,
    rotation: document.getElementById('imgRotation').value,
    filter: document.getElementById('imgFilter').value,
    circle: document.getElementById('imgCircle').checked,
    layer: document.getElementById('imgLayer').value
  };
  data.createdAt = new Date().toISOString();
  return data;
}

// ============================================================
// MÓDULO: Guardar Proyecto
// ============================================================
async function saveProject() {
  const project = collectProjectData();
  if (!project.projectName) {
    alert('⚠️ Ingresa un nombre para el proyecto');
    return;
  }
  try {
    try {
      const { saveProjectToFirestore } = await import('./modules/firebaseStorage.js');
      await saveProjectToFirestore(project);
    } catch (e) {
      console.warn('Firebase save failed, saving locally only');
    }
    const idx = state.projects.findIndex(p => p.id === project.id);
    if (idx >= 0) state.projects[idx] = project;
    else state.projects.push(project);
    localStorage.setItem('aromaProjects', JSON.stringify(state.projects));
    renderProjectsList();
    alert('✅ Proyecto guardado');
  } catch (e) {
    alert('❌ Error al guardar: ' + e.message);
  }
}

function addToQueue() {
  const project = collectProjectData();
  state.printQueue.push(project);
  localStorage.setItem('printQueue', JSON.stringify(state.printQueue));
  renderPrintQueue();
  updatePrintStats();
  alert('✅ Añadido a la cola de impresión');
}

function exportProject() {
  const project = collectProjectData();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proyecto-${project.projectName || 'etiqueta'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        loadProjectIntoForm(data);
        alert('✅ Proyecto importado');
      } catch (err) {
        alert('❌ Archivo inválido');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function loadProjectIntoForm(data) {
  Object.keys(data).forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = data[key];
    else el.value = data[key];
  });
  if (data.logoData) {
    state.logoData = data.logoData;
    document.getElementById('previewLogo').src = data.logoData;
    document.getElementById('previewLogo').style.display = 'block';
    document.getElementById('imageControls').style.display = 'block';
  }
  if (data.imageControls) {
    document.getElementById('imgSize').value = data.imageControls.size;
    document.getElementById('imgX').value = data.imageControls.x;
    document.getElementById('imgY').value = data.imageControls.y;
    document.getElementById('imgOpacity').value = data.imageControls.opacity;
    document.getElementById('imgRotation').value = data.imageControls.rotation;
    document.getElementById('imgFilter').value = data.imageControls.filter;
    document.getElementById('imgCircle').checked = data.imageControls.circle;
    if (data.imageControls.layer) {
      document.getElementById('imgLayer').value = data.imageControls.layer;
    }
  }
  updatePreview();
}

// ============================================================
// MÓDULO: Lista de Proyectos
// ============================================================
function renderProjectsList() {
  const list = document.getElementById('projectsList');
  if (!state.projects.length) {
    list.innerHTML = `<div class="empty-state">
      <p>📁 No hay proyectos guardados</p>
      <p>Crea tu primera etiqueta en el Diseñador y guárdala aquí.</p>
    </div>`;
    return;
  }
  list.innerHTML = state.projects.map(p => `
    <div class="project-card" data-id="${p.id}">
      <h3>${p.projectName || 'Sin nombre'}</h3>
      <div class="meta">${p.productName || ''} · ${p.dimW}×${p.dimH}mm</div>
      <div class="meta">${p.lastModified ? new Date(p.lastModified).toLocaleString() : ''}</div>
      <div class="actions">
        <button onclick="window.__loadProject('${p.id}')">📂 Cargar</button>
        <button onclick="window.__deleteProject('${p.id}')" class="btn-danger">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.__loadProject = async (id) => {
  const p = state.projects.find(x => x.id.toString() === id.toString());
  if (p) loadProjectIntoForm(p);
  document.querySelector('[data-tab="designer"]').click();
};

window.__deleteProject = async (id) => {
  if (!confirm('¿Eliminar este proyecto?')) return;
  try {
    const { deleteProjectFromFirestore } = await import('./modules/firebaseStorage.js');
    await deleteProjectFromFirestore(id);
  } catch (e) { console.warn(e); }
  state.projects = state.projects.filter(p => p.id.toString() !== id.toString());
  localStorage.setItem('aromaProjects', JSON.stringify(state.projects));
  renderProjectsList();
};

// ============================================================
// MÓDULO: Cola de Impresión y Estadísticas
// ============================================================
function setupPrintControls() {
  document.getElementById('btnClearQueue').addEventListener('click', () => {
    state.printQueue = [];
    localStorage.setItem('printQueue', '[]');
    renderPrintQueue();
    updatePrintStats();
  });
  document.getElementById('btnPrint').addEventListener('click', printLabels);
  document.getElementById('btnExportPDF').addEventListener('click', exportPrintPDF);
}

function renderPrintQueue() {
  const list = document.getElementById('printQueue');
  if (!state.printQueue.length) {
    list.innerHTML = '<p class="empty">No hay etiquetas en cola.</p>';
  } else {
    list.innerHTML = state.printQueue.map((p, i) => `
      <div class="queue-item" data-index="${i}">
        <div class="queue-info">
          <strong>${i+1}.</strong> ${p.projectName || 'Sin nombre'} - ${p.productName || ''}
          <span class="queue-dims">(${p.dimW}×${p.dimH}mm)</span>
        </div>
        <div class="queue-qty">
          <label>Cantidad: <input type="number" class="qty-input" data-idx="${i}" value="1" min="1" max="999"></label>
          <button class="btn-remove-item" data-idx="${i}">🗑️</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.qty-input').forEach(input => {
      input.addEventListener('change', updatePrintStats);
      input.addEventListener('input', updatePrintStats);
    });
    list.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        state.printQueue.splice(idx, 1);
        localStorage.setItem('printQueue', JSON.stringify(state.printQueue));
        renderPrintQueue();
        updatePrintStats();
      });
    });
  }
  document.getElementById('statLabels').textContent = state.printQueue.length;
}

function updatePrintStats() {
  if (!state.printQueue.length) {
    document.getElementById('statLabels').textContent = '0';
    document.getElementById('statPerSheet').textContent = '0';
    document.getElementById('statSheets').textContent = '0';
    document.getElementById('statEfficiency').textContent = '0';
    document.getElementById('printPreviewSheet').innerHTML = '';
    return;
  }

  const paperSize = document.getElementById('paperSize').value;
  const orientation = document.getElementById('orientation').value;
  const marginTop = parseFloat(document.getElementById('marginTop').value) || 10;
  const marginLeft = parseFloat(document.getElementById('marginLeft').value) || 10;
  const marginRight = parseFloat(document.getElementById('marginRight').value) || 10;
  const marginBottom = parseFloat(document.getElementById('marginBottom').value) || 10;
  const spaceH = parseFloat(document.getElementById('spaceH').value) || 5;
  const spaceV = parseFloat(document.getElementById('spaceV').value) || 5;

  let paperW = PAPER_SIZES[paperSize].w;
  let paperH = PAPER_SIZES[paperSize].h;

  if (orientation === 'landscape') {
    [paperW, paperH] = [paperH, paperW];
  }

  const qtyInputs = document.querySelectorAll('.qty-input');
  let totalLabels = 0;

  state.printQueue.forEach((item, i) => {
    const qty = qtyInputs[i] ? parseInt(qtyInputs[i].value) || 1 : 1;
    totalLabels += qty;
  });

  const labelW = parseFloat(state.printQueue[0].dimW) || 60;
  const labelH = parseFloat(state.printQueue[0].dimH) || 80;

  const usableW = paperW - marginLeft - marginRight;
  const usableH = paperH - marginTop - marginBottom;

  const cols = Math.floor((usableW + spaceH) / (labelW + spaceH)) || 1;
  const rows = Math.floor((usableH + spaceV) / (labelH + spaceV)) || 1;
  const perSheet = cols * rows;
  const sheetsNeeded = Math.ceil(totalLabels / perSheet);

  const labelArea = labelW * labelH * totalLabels;
  const paperArea = paperW * paperH * sheetsNeeded;
  const efficiency = paperArea > 0 ? Math.round((labelArea / paperArea) * 100) : 0;

  document.getElementById('statLabels').textContent = totalLabels;
  document.getElementById('statPerSheet').textContent = perSheet;
  document.getElementById('statSheets').textContent = sheetsNeeded;
  document.getElementById('statEfficiency').textContent = efficiency;

  renderPrintPreview(paperW, paperH, labelW, labelH, marginTop, marginLeft, marginRight, marginBottom, spaceH, spaceV, cols, rows, perSheet, totalLabels);
}

async function renderPrintPreview(paperW, paperH, labelW, labelH, marginT, marginL, marginR, marginB, spaceH, spaceV, cols, rows, perSheet, totalLabels) {
  const container = document.getElementById('printPreviewSheet');
  const previewScale = Math.min(280 / paperW, 380 / paperH);

  container.innerHTML = '';
  container.style.width = (paperW * previewScale) + 'px';
  container.style.height = (paperH * previewScale) + 'px';
  container.style.position = 'relative';
  container.style.background = '#fff';
  container.style.border = '2px solid #d4c8b8';
  container.style.margin = '0 auto';
  container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';

  const marginDiv = document.createElement('div');
  marginDiv.style.position = 'absolute';
  marginDiv.style.left = (marginL * previewScale) + 'px';
  marginDiv.style.top = (marginT * previewScale) + 'px';
  marginDiv.style.width = ((paperW - marginL - marginR) * previewScale) + 'px';
  marginDiv.style.height = ((paperH - marginT - marginB) * previewScale) + 'px';
  marginDiv.style.background = '#faf8f5';
  marginDiv.style.border = '1px dashed #c9a96e';
  container.appendChild(marginDiv);

  let labelImgData = null;
  try {
    labelImgData = await safeCaptureLabel();
  } catch (e) {
    console.warn('No se pudo capturar preview:', e);
  }

  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (count >= perSheet || count >= totalLabels) break;
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.left = ((marginL + c * (labelW + spaceH)) * previewScale) + 'px';
      label.style.top = ((marginT + r * (labelH + spaceV)) * previewScale) + 'px';
      label.style.width = (labelW * previewScale) + 'px';
      label.style.height = (labelH * previewScale) + 'px';
      label.style.border = '1px solid #c9a96e';
      label.style.borderRadius = '2px';
      label.style.overflow = 'hidden';
      label.style.background = '#fff';

      if (labelImgData) {
        const img = document.createElement('img');
        img.src = labelImgData;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        label.appendChild(img);
      } else {
        label.style.background = '#c9a96e';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
        label.style.color = '#fff';
        label.style.fontSize = Math.max(8, labelW * previewScale * 0.15) + 'px';
        label.style.fontWeight = '700';
        label.textContent = count + 1;
      }

      container.appendChild(label);
      count++;
    }
  }

  const totalSheets = Math.ceil(totalLabels / perSheet);
  const indicator = document.createElement('div');
  indicator.style.position = 'absolute';
  indicator.style.bottom = '4px';
  indicator.style.right = '4px';
  indicator.style.fontSize = '10px';
  indicator.style.color = '#8a7a6a';
  indicator.style.background = 'rgba(255,255,255,0.9)';
  indicator.style.padding = '2px 6px';
  indicator.style.borderRadius = '4px';
  indicator.textContent = `Hoja 1 de ${totalSheets}`;
  container.appendChild(indicator);
}

// ============================================================
// MÓDULO: Impresión Real
// ============================================================
async function printLabels() {
  if (!state.printQueue.length) {
    alert('⚠️ No hay etiquetas en cola');
    return;
  }

  const btn = document.getElementById('btnPrint');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Preparando...';
  btn.disabled = true;

  try {
    const paperSize = document.getElementById('paperSize').value;
    const orientation = document.getElementById('orientation').value;
    let paperW = PAPER_SIZES[paperSize].w;
    let paperH = PAPER_SIZES[paperSize].h;
    if (orientation === 'landscape') [paperW, paperH] = [paperH, paperW];

    const marginTop = parseFloat(document.getElementById('marginTop').value) || 10;
    const marginLeft = parseFloat(document.getElementById('marginLeft').value) || 10;
    const marginRight = parseFloat(document.getElementById('marginRight').value) || 10;
    const marginBottom = parseFloat(document.getElementById('marginBottom').value) || 10;
    const spaceH = parseFloat(document.getElementById('spaceH').value) || 5;
    const spaceV = parseFloat(document.getElementById('spaceV').value) || 5;

    const qtyInputs = document.querySelectorAll('.qty-input');
    let totalLabels = 0;
    const items = [];

    state.printQueue.forEach((item, i) => {
      const qty = qtyInputs[i] ? parseInt(qtyInputs[i].value) || 1 : 1;
      for (let q = 0; q < qty; q++) {
        items.push(item);
      }
      totalLabels += qty;
    });

    if (totalLabels === 0) {
      alert('⚠️ La cantidad total es 0');
      return;
    }

    const labelW = parseFloat(items[0].dimW) || 60;
    const labelH = parseFloat(items[0].dimH) || 80;
    const usableW = paperW - marginLeft - marginRight;
    const usableH = paperH - marginTop - marginBottom;
    const cols = Math.max(1, Math.floor((usableW + spaceH) / (labelW + spaceH)));
    const rows = Math.max(1, Math.floor((usableH + spaceV) / (labelH + spaceV)));
    const perSheet = cols * rows;
    const totalSheets = Math.ceil(totalLabels / perSheet);

    const imgData = await safeCaptureLabel();

    let printHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Imprimir Etiquetas</title>
  <style>
    @page { size: ${paperSize} ${orientation}; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', sans-serif; }
    .sheet {
      width: ${paperW}mm;
      height: ${paperH}mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
      background: white;
    }
    .sheet:last-child { page-break-after: auto; }
    .label {
      position: absolute;
      overflow: hidden;
    }
    .label img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    @media print {
      .sheet { page-break-after: always; }
      .sheet:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>`;

    let labelIdx = 0;
    for (let sheet = 0; sheet < totalSheets; sheet++) {
      printHTML += '<div class="sheet">';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (labelIdx >= totalLabels) break;
          const x = marginLeft + c * (labelW + spaceH);
          const y = marginTop + r * (labelH + spaceV);
          printHTML += `<div class="label" style="left:${x}mm;top:${y}mm;width:${labelW}mm;height:${labelH}mm;">
            <img src="${imgData}" alt="etiqueta">
          </div>`;
          labelIdx++;
        }
      }
      printHTML += '</div>';
    }

    printHTML += '</body></html>';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('⚠️ Permite ventanas emergentes para imprimir');
      return;
    }

    printWindow.document.write(printHTML);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 300);
    };
    setTimeout(() => {
      if (printWindow.document.readyState === 'complete') {
        printWindow.print();
      }
    }, 800);

  } catch (err) {
    console.error('Error al imprimir:', err);
    alert('❌ Error al preparar impresión: ' + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ============================================================
// MÓDULO: Exportar PDF de Impresión
// ============================================================
async function exportPrintPDF() {
  if (!state.printQueue.length) {
    alert('⚠️ No hay etiquetas en cola');
    return;
  }

  const { jsPDF } = window.jspdf;
  const btn = document.getElementById('btnExportPDF');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Generando...';
  btn.disabled = true;

  try {
    const paperSize = document.getElementById('paperSize').value;
    const orientation = document.getElementById('orientation').value;
    let paperW = PAPER_SIZES[paperSize].w;
    let paperH = PAPER_SIZES[paperSize].h;
    if (orientation === 'landscape') [paperW, paperH] = [paperH, paperW];

    const marginTop = parseFloat(document.getElementById('marginTop').value) || 10;
    const marginLeft = parseFloat(document.getElementById('marginLeft').value) || 10;
    const marginRight = parseFloat(document.getElementById('marginRight').value) || 10;
    const marginBottom = parseFloat(document.getElementById('marginBottom').value) || 10;
    const spaceH = parseFloat(document.getElementById('spaceH').value) || 5;
    const spaceV = parseFloat(document.getElementById('spaceV').value) || 5;

    const qtyInputs = document.querySelectorAll('.qty-input');
    let totalLabels = 0;

    state.printQueue.forEach((item, i) => {
      totalLabels += qtyInputs[i] ? parseInt(qtyInputs[i].value) || 1 : 1;
    });

    const labelW = parseFloat(state.printQueue[0].dimW) || 60;
    const labelH = parseFloat(state.printQueue[0].dimH) || 80;
    const usableW = paperW - marginLeft - marginRight;
    const usableH = paperH - marginTop - marginBottom;
    const cols = Math.max(1, Math.floor((usableW + spaceH) / (labelW + spaceH)));
    const rows = Math.max(1, Math.floor((usableH + spaceV) / (labelH + spaceV)));
    const perSheet = cols * rows;
    const totalSheets = Math.ceil(totalLabels / perSheet);

    const imgData = await safeCaptureLabel();

    const pdf = new jsPDF({
      orientation: paperW > paperH ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [paperW, paperH]
    });

    let labelCount = 0;
    for (let sheet = 0; sheet < totalSheets; sheet++) {
      if (sheet > 0) pdf.addPage([paperW, paperH]);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (labelCount >= totalLabels) break;
          const x = marginLeft + c * (labelW + spaceH);
          const y = marginTop + r * (labelH + spaceV);
          pdf.addImage(imgData, 'PNG', x, y, labelW, labelH);
          labelCount++;
        }
      }
    }

    pdf.save(`etiquetas-${state.printQueue[0].projectName || 'batch'}-${Date.now()}.pdf`);
  } catch (err) {
    console.error('Error PDF:', err);
    alert('❌ Error al generar PDF: ' + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}