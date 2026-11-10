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
    updateTextSizes(); // ✅ IMPORTANTE: aplicar tamaños iniciales
    updateBorderText();
    loadSavedDesignsList();

    // ✅ Generar QR inicial si está habilitado
    if (document.getElementById('qrEnabled').checked) {
        generateQR();
    }

    ['printPaperSize', 'printMargin', 'printGap', 'printCutBorder', 'printBorderColor', 'printBorderWidth', 'labelSizeInches', 'labelQuantity']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updatePrintPreview);
        });
});

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
// ✅ TEXTOS - CORREGIDO: ahora incluye TODOS los textos
// ============================================
function updateTexts() {
    // Título (Adelia)
    const mainText = document.getElementById('editMainText').value;
    const textMain = document.getElementById('textMain');
    textMain.textContent = mainText;
    textMain.setAttribute('class', 'label-text-main adelia-font');

    // Subtítulo
    const subText = document.getElementById('editSubText').value;
    document.getElementById('textSub').textContent = '♥ ' + subText + ' ♥';

    // Mensajes
    document.getElementById('textMessage').textContent = document.getElementById('editMessage1').value;
    document.getElementById('textMessage2').textContent = document.getElementById('editMessage2').value;

    // SINPE (etiqueta + número)
    document.getElementById('textSinpeLabel').textContent = document.getElementById('editSinpeLabel').value;
    document.getElementById('textSinpe').textContent = document.getElementById('editSinpe').value;

    // Marca
    document.getElementById('textBrand').textContent = document.getElementById('editBrand').value;

    // ✅ Footer
    document.getElementById('textFooter').textContent = document.getElementById('editFooter').value;
}

// ✅ CORREGIDO: ahora actualiza TODOS los tamaños incluyendo sinpeLabel y footer
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

// ✅ CORREGIDO: ahora incluye textSinpeLabel y textFooter
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
// ✅ QR CODE - CORREGIDO
// ============================================
function toggleQR() {
    const enabled = document.getElementById('qrEnabled').checked;
    const qrGroup = document.getElementById('qrGroup');
    qrGroup.style.display = enabled ? 'block' : 'none';
    if (enabled) {
        generateQR();
    }
}

function generateQR() {
    const content = document.getElementById('qrContent').value.trim();
    const qrImage = document.getElementById('qrImage');

    if (!content) {
        qrImage.setAttribute('href', '');
        return;
    }

    try {
        // Verificar que la librería esté cargada
        if (typeof qrcode !== 'function') {
            console.error('Librería qrcode-generator no cargada');
            return;
        }

        const margin = parseInt(document.getElementById('qrMargin').value) || 0;
        document.getElementById('qrMarginValue').textContent = margin;

        const darkColor = document.getElementById('qrColorDark').value;
        const lightColor = document.getElementById('qrColorLight').value;

        // Generar QR
        const qr = qrcode(0, 'M');
        qr.addData(content);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const cellSize = 10;
        const qrSize = moduleCount * cellSize;

        // Construir SVG del QR
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

        // Convertir a data URL
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
        currentQRDataUrl = dataUrl;

        // ✅ IMPORTANTE: Asegurar que el grupo QR esté visible si está habilitado
        const qrGroup = document.getElementById('qrGroup');
        if (document.getElementById('qrEnabled').checked) {
            qrGroup.style.display = 'block';
        }

        qrImage.setAttribute('href', dataUrl);
        updateQRPosition();

        console.log('✅ QR generado correctamente:', content.substring(0, 30) + '...');
    } catch (error) {
        console.error('Error generando QR:', error);
        alert('No se pudo generar el QR: ' + error.message);
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
        version: '1.1',
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
        alert(`✅ Diseño "${name}" guardado.`);
    } catch (error) {
        alert('Error al guardar. Posiblemente el diseño es muy grande.');
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
    //alert(`✅ Agregado a la cola:\n\nCliente: ${clientName || 'Sin nombre'}\nCantidad: ${quantity}\nTamaño: ${labelSize}"`);
}

// ============================================
// IMPRESIÓN
// ============================================
function getPrintSettings() {
    const margin = Number(document.getElementById('printMargin').value);
    const gap = Number(document.getElementById('printGap').value);
    const borderWidth = Number(document.getElementById('printBorderWidth').value);
    return {
        margin: Number.isFinite(margin) ? Math.min(1, Math.max(0, margin)) : 0.25,
        gap: Number.isFinite(gap) ? Math.min(0.5, Math.max(0, gap)) : 0.04,
        cutBorder: document.getElementById('printCutBorder').checked,
        borderColor: document.getElementById('printBorderColor').value || '#8b948b',
        borderWidth: Number.isFinite(borderWidth) ? Math.min(2, Math.max(0.1, borderWidth)) : 0.3
    };
}

function loadPrintSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem('ewePrintSettings') || 'null');
        if (!saved) return;
        if (Number.isFinite(Number(saved.margin))) document.getElementById('printMargin').value = saved.margin;
        if (Number.isFinite(Number(saved.gap))) document.getElementById('printGap').value = saved.gap;
        if (typeof saved.cutBorder === 'boolean') document.getElementById('printCutBorder').checked = saved.cutBorder;
        if (typeof saved.borderColor === 'string') document.getElementById('printBorderColor').value = saved.borderColor;
        if (Number.isFinite(Number(saved.borderWidth))) document.getElementById('printBorderWidth').value = saved.borderWidth;
    } catch (error) {
        console.warn('No se pudieron cargar ajustes.', error);
    }
}

function updatePrintPreview() {
    const settings = getPrintSettings();
    document.getElementById('printMargin').value = settings.margin;
    document.getElementById('printGap').value = settings.gap;
    document.getElementById('printBorderWidth').value = settings.borderWidth;
    try { localStorage.setItem('ewePrintSettings', JSON.stringify(settings)); } catch (error) {}

    const wrapper = document.getElementById('labelWrapper');
    wrapper.classList.toggle('show-print-cut-border', settings.cutBorder);
    wrapper.style.setProperty('--print-cut-color', settings.borderColor);
    wrapper.style.setProperty('--print-cut-width', `${settings.borderWidth}mm`);

    const paper = document.getElementById('printPaperSize').value;
    const page = paper === 'a4'
        ? { name: 'A4', width: 8.2677, height: 11.6929 }
        : { name: 'Carta', width: 8.5, height: 11 };

    const sizeInches = Number(document.getElementById('labelSizeInches').value) || 1.75;
    const usableWidth = page.width - settings.margin * 2;
    const usableHeight = page.height - settings.margin * 2;
    const cols = Math.floor((usableWidth + settings.gap) / (sizeInches + settings.gap));
    const rows = Math.floor((usableHeight + settings.gap) / (sizeInches + settings.gap));
    const quantity = Math.max(1, Math.floor(Number(document.getElementById('labelQuantity').value) || 1));
    const perSheet = Math.max(0, cols * rows);

    const summary = document.getElementById('printLayoutSummary');
    summary.textContent = perSheet
        ? `Vista actualizada: ${perSheet} etiquetas por hoja ${page.name}; ${quantity} etiqueta(s) usarán ${Math.ceil(quantity / perSheet)} hoja(s).`
        : `La etiqueta no cabe en la hoja ${page.name}.`;
}

// ============================================
// IMPRESIÓN Y CONFIGURACIÓN (ACTUALIZADO A MM)
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
    
    // Actualizar vista del borde de corte en el preview principal
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

    // ✅ Generar vista previa visual de la hoja
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

    // Escala para la vista previa: 1mm = 1.5px (ajustable para que quepa bien en el panel)
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

    const totalToRender = Math.min(quantity, perSheet); // Solo renderizamos una hoja para la preview
    
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

function printLabels() {
    const quantityInput = document.getElementById('labelQuantity');
    const quantity = Math.floor(Number(quantityInput.value));
    const labelSizeMm = Number(document.getElementById('labelSizeMm').value);
    const paper = document.getElementById('printPaperSize').value;

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
        alert('Indique una cantidad entre 1 y 1000 etiquetas.');
        quantityInput.focus();
        return;
    }
    if (!Number.isFinite(labelSizeMm) || labelSizeMm <= 0) {
        alert('Revise el tamaño de la etiqueta antes de imprimir.');
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
        alert(`La etiqueta de ${labelSizeMm.toFixed(1)} mm no cabe en una hoja ${page.name} con el margen seleccionado.`);
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

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.');
        return;
    }

    // ✅ CSS de impresión usando unidades mm nativas (soportado por todos los navegadores)
    const pageCss = `
        @font-face {
            font-family: 'Adelia';
            src: url('fonts/Adelia.ttf') format('truetype'),
                 url('fonts/Adelia.otf') format('opentype');
            font-display: swap;
        }
        @page { 
            size: ${page.name}; 
            margin: ${marginMm}mm; 
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #fff; font-family: Arial, sans-serif; }
        
        .sheet { 
            width: ${usableWidthMm}mm; 
            height: ${usableHeightMm}mm; 
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
            overflow: hidden;
            position: relative;
            display: block;
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

    const htmlContent = `<!doctype html>
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
    window.addEventListener('afterprint', () => setTimeout(() => window.close(), 300));
<\/script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    console.log(`✅ Generadas ${totalLabels} etiquetas en ${pages.length} hoja(s)`);
    console.log(`📐 Configuración: ${columns} columnas × ${rows} filas = ${perSheet} etiquetas por hoja`);
}

function printLabel() { printLabels(); }
function createPDF() { printLabels(); }