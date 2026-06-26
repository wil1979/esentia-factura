// velas.js
import { initAuth, getConnectionStatus, saveProjectToFirestore,
         loadProjectsFromFirestore, deleteProjectFromFirestore,
         syncProjects } from './modules/firebaseStorage.js';
import { testConnection } from './modules/firebase2.js';

// ===== ESTADO GLOBAL =====
const state = {
  currentProject: null,
  logoData: null,
  printQueue: JSON.parse(localStorage.getItem('printQueue') || '[]'),
  projects: JSON.parse(localStorage.getItem('aromaProjects') || '[]')
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Iniciando AromaLabel Pro...');
  setupTabs();
  setupTemplates();
  setupImageControls();
  setupFormListeners();
  setupActionButtons();
  setupPrintControls();
  renderProjectsList();
  renderPrintQueue();
  updatePreview();

  // 🔥 Conexión a Firebase
  await initializeFirebase();
});

// ===== FIREBASE =====
async function initializeFirebase() {
  const badge = document.getElementById('connectionStatus');
  try {
    // 1. Probar conexión directa
    const conn = await testConnection();
    console.log('📡 Estado de conexión:', conn);

    // 2. Iniciar autenticación anónima
    const user = await initAuth();
    const status = getConnectionStatus();

    if (user && status.authenticated) {
      badge.textContent = `✅ Conectado (${user.uid.slice(0, 6)}...)`;
      badge.classList.add('connected');
      // Sincronizar proyectos al conectar
      await syncWithFirestore();
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

async function syncWithFirestore() {
  try {
    state.projects = await syncProjects();
    renderProjectsList();
    console.log('✅ Sincronización completada');
  } catch (e) {
    console.warn('⚠️ Sincronización falló, usando modo local:', e.message);
  }
}

// ===== TABS =====
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ===== PLANTILLAS =====
function setupTemplates() {
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('dimW').value = btn.dataset.w;
      document.getElementById('dimH').value = btn.dataset.h;
      updatePreview();
    });
  });
}

// ===== CONTROLES DE IMAGEN =====
function setupImageControls() {
  const logoInput = document.getElementById('logoInput');
  const imageControls = document.getElementById('imageControls');
  const previewLogo = document.getElementById('previewLogo');

  // Subir imagen
  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.logoData = ev.target.result;
      previewLogo.src = state.logoData;
      previewLogo.style.display = 'block';
      imageControls.style.display = 'block';
      // Resetear controles
      document.getElementById('imgSize').value = 500;
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

  // Controles en vivo
  ['imgSize', 'imgX', 'imgY', 'imgOpacity', 'imgRotation', 'imgFilter', 'imgCircle']
    .forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', applyImageStyles);
      el.addEventListener('change', applyImageStyles);
    });

  // Eliminar imagen
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
  const size = document.getElementById('imgSize').value;
  const x = document.getElementById('imgX').value;
  const y = document.getElementById('imgY').value;
  const opacity = document.getElementById('imgOpacity').value;
  const rotation = document.getElementById('imgRotation').value;
  const filter = document.getElementById('imgFilter').value;
  const circle = document.getElementById('imgCircle').checked;

  logo.style.maxWidth = size + '%';
  logo.style.transform = `translate(${x - 50}%, ${y - 50}%) rotate(${rotation}deg)`;
  logo.style.opacity = opacity / 100;
  logo.style.filter = filter;
  logo.style.borderRadius = circle ? '50%' : '0';
}

// ===== FORMULARIOS =====
function setupFormListeners() {
  const inputs = document.querySelectorAll(
    'input, select, textarea'
  );
  inputs.forEach(input => {
    if (input.type === 'file' || input.id.startsWith('img')) return;
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });
}

// ===== VISTA PREVIA =====
function updatePreview() {
  const W = parseFloat(document.getElementById('dimW').value) || 60;
  const H = parseFloat(document.getElementById('dimH').value) || 80;
  const scale = 3; // px por mm
  const padding = parseFloat(document.getElementById('padding').value) || 3;
  const radius = parseFloat(document.getElementById('radius').value) || 4;
  const lineTop = parseFloat(document.getElementById('lineTop').value) || 4;
  const lineBottom = parseFloat(document.getElementById('lineBottom').value) || 0;
  const spacing = parseFloat(document.getElementById('spacing').value) || 6;
  const colorAccent = document.getElementById('colorAccent').value || '#c9a96e';

  const preview = document.getElementById('labelPreview');
  const labelContent = preview.querySelector('.label-content');

  preview.style.width = (W * scale) + 'px';
  preview.style.height = (H * scale) + 'px';
  preview.style.background = document.getElementById('colorBg').value;
  preview.style.color = document.getElementById('colorText').value;
  preview.style.borderRadius = radius + 'px';

  // Padding interno del contenido
  labelContent.style.padding = padding + 'mm';
  labelContent.style.gap = spacing + 'px';

  // Líneas decorativas superior e inferior
  const topLine = labelContent.querySelector('.line-top') || createLine('line-top');
  const bottomLine = labelContent.querySelector('.line-bottom') || createLine('line-bottom');

  if (lineTop > 0) {
    topLine.style.display = 'block';
    topLine.style.height = lineTop + 'px';
    topLine.style.background = colorAccent;
  } else {
    topLine.style.display = 'none';
  }

  if (lineBottom > 0) {
    bottomLine.style.display = 'block';
    bottomLine.style.height = lineBottom + 'px';
    bottomLine.style.background = colorAccent;
  } else {
    bottomLine.style.display = 'none';
  }

  // QR - Asegurar que tenga URL válida
  const qrUrlInput = document.getElementById('qrUrl');
  if (!qrUrlInput.value || qrUrlInput.value.trim() === '') {
    qrUrlInput.value = 'https://www.facebook.com/profile.php?id=61579078480913';
  }

  // Textos
  const brand = document.getElementById('projectName').value || 'Esentia';
  const product = document.getElementById('productName').value || 'Lavanda';
  const type = document.getElementById('productType').value || 'Vela Aromática de Soya';
  const details = document.getElementById('productDetails').value || '180g · 40h';
  const safety = document.getElementById('safetyInstructions').value;
  const legal = document.getElementById('legalInfo').value || 'Lote: 001 | Exp: 12/2026';

  preview.querySelector('.brand-name').textContent = brand;
  preview.querySelector('.product-name').textContent = product;
  preview.querySelector('.product-type').textContent = type;
  preview.querySelector('.product-details').textContent = details;
  preview.querySelector('.safety-area p').textContent = safety;
  preview.querySelector('.lot').textContent = legal;

  // Fuentes
  preview.querySelector('.brand-name').style.fontFamily =
    `'${document.getElementById('brandFont').value}', serif`;
  preview.querySelector('.product-name').style.fontFamily =
    `'${document.getElementById('productFont').value}', serif`;

  // Tamaños
  const fsBrand = document.getElementById('fsBrand').value;
  const fsSubbrand = document.getElementById('fsSubbrand').value;
  const fsProduct = document.getElementById('fsProduct').value;
  const fsType = document.getElementById('fsType').value;
  const fsDetails = document.getElementById('fsDetails').value;
  const fsSafety = document.getElementById('fsSafety').value;
  const fsLot = document.getElementById('fsLot').value;
  const fsOrigin = document.getElementById('fsOrigin').value;

  preview.querySelector('.brand-name').style.fontSize = fsBrand + 'px';
  preview.querySelector('.brand-sub').style.fontSize = fsSubbrand + 'px';
  preview.querySelector('.product-name').style.fontSize = fsProduct + 'px';
  preview.querySelector('.product-type').style.fontSize = fsType + 'px';
  preview.querySelector('.product-details').style.fontSize = fsDetails + 'px';
  preview.querySelector('.safety-area').style.fontSize = fsSafety + 'px';
  preview.querySelector('.lot').style.fontSize = fsLot + 'px';
  preview.querySelector('.origin').style.fontSize = fsOrigin + 'px';

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

  // QR - SOLO UNA VEZ
  if (showQR) {
    drawQR(qrUrlInput.value);
  }

  // Dimensiones label
  preview.querySelector('.label-dimensions').textContent = `${W} × ${H} mm`;
}

function createLine(className) {
  const line = document.createElement('div');
  line.className = className;
  line.style.width = '100%';
  line.style.flexShrink = '0';
  const labelContent = document.querySelector('.label-content');
  labelContent.insertBefore(line, labelContent.firstChild);
  return line;
}

function drawQR(text) {
  const qrContainer = document.getElementById('qrContainer');
  const size = parseInt(document.getElementById('qrSize').value) || 22;
  const scale = 3;
  const px = size * scale;

  // URL por defecto si está vacía
  if (!text || text.trim() === '') {
    text = 'https://www.facebook.com/profile.php?id=61579078480913';
  }

  // 🧹 LIMPIAR COMPLETAMENTE el contenedor
  qrContainer.innerHTML = '';

  // Generar QR en el contenedor DIV (QRCode.js crea su propio canvas interno)
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
    qrContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:'+px+'px;height:'+px+'px;background:#f0f0f0;color:#999;font-size:10px;">QR</div>';
  }
}

// ===== BOTONES DE ACCIÓN =====
function setupActionButtons() {
  document.getElementById('btnSave').addEventListener('click', saveProject);
  document.getElementById('btnAddQueue').addEventListener('click', addToQueue);
  document.getElementById('btnPNG').addEventListener('click', exportPNG);
  document.getElementById('btnExport').addEventListener('click', exportProject);
  document.getElementById('btnImport').addEventListener('click', importProject);
  document.getElementById('btnSync').addEventListener('click', syncWithFirestore);
  document.getElementById('btnRefresh').addEventListener('click', () => {
    state.projects = JSON.parse(localStorage.getItem('aromaProjects') || '[]');
    renderProjectsList();
  });
}

function collectProjectData() {
  const fields = ['projectName','productName','productType','productDetails',
    'safetyInstructions','qrUrl','legalInfo','brandFont','productFont',
    'dimW','dimH','padding','radius','lineTop','lineBottom','spacing',
    'fsBrand','fsSubbrand','fsProduct','fsType','fsDetails','fsSafety',
    'fsLot','fsOrigin','qrSize','colorAccent','colorText','colorBg',
    'colorQr','colorQrBg'];
  const data = { id: Date.now().toString() };
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) data[f] = el.type === 'checkbox' ? el.checked : el.value;
  });
  ['showDivider','showQR','showSafety','showLegal'].forEach(f => {
    data[f] = document.getElementById(f).checked;
  });
  data.logoData = state.logoData;
  data.imageControls = {
    size: document.getElementById('imgSize').value,
    x: document.getElementById('imgX').value,
    y: document.getElementById('imgY').value,
    opacity: document.getElementById('imgOpacity').value,
    rotation: document.getElementById('imgRotation').value,
    filter: document.getElementById('imgFilter').value,
    circle: document.getElementById('imgCircle').checked
  };
  data.createdAt = new Date().toISOString();
  return data;
}

async function saveProject() {
  const project = collectProjectData();
  if (!project.projectName) {
    alert('⚠️ Ingresa un nombre para el proyecto');
    return;
  }
  try {
    await saveProjectToFirestore(project);
    // Actualizar local
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
  alert('✅ Añadido a la cola de impresión');
}

function exportPNG() {
  alert('🖼️ Exportar PNG (requiere html2canvas)');
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
    applyImageStyles();
  }
  updatePreview();
}

// ===== LISTA DE PROYECTOS =====
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
    await deleteProjectFromFirestore(id);
  } catch (e) { console.warn(e); }
  state.projects = state.projects.filter(p => p.id.toString() !== id.toString());
  localStorage.setItem('aromaProjects', JSON.stringify(state.projects));
  renderProjectsList();
};

// ===== COLA DE IMPRESIÓN =====
function setupPrintControls() {
  document.getElementById('btnClearQueue').addEventListener('click', () => {
    state.printQueue = [];
    localStorage.setItem('printQueue', '[]');
    renderPrintQueue();
  });
  document.getElementById('btnPrint').addEventListener('click', () => {
    alert('🖨️ Imprimiendo ' + state.printQueue.length + ' etiquetas');
  });
}

function renderPrintQueue() {
  const list = document.getElementById('printQueue');
  if (!state.printQueue.length) {
    list.innerHTML = '<p class="empty">No hay etiquetas en cola.</p>';
  } else {
    list.innerHTML = state.printQueue.map((p, i) => `
      <div style="padding:0.5rem;border-bottom:1px solid #eee;">
        ${i+1}. ${p.projectName} - ${p.productName} (${p.dimW}×${p.dimH}mm)
      </div>
    `).join('');
  }
  document.getElementById('statLabels').textContent = state.printQueue.length;
}
