// ============================================
        // CONFIGURACIÓN DE FIREBASE
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
        const DEFAULT_SIZE_MM = DEFAULT_SIZE_INCHES * INCHES_TO_MM; // 44.45 mm

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
            ['printPaperSize', 'printMargin', 'printGap', 'printCutBorder', 'printBorderColor', 'printBorderWidth', 'labelSizeInches', 'labelQuantity']
                .forEach(id => document.getElementById(id).addEventListener('change', updatePrintPreview));
        });

        // ============================================
        // CARGA DE CLIENTES
        // ============================================
        async function loadClients() {
            try {
                const snapshot = await db.collection('clientesBD').get();
                allClients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error al cargar clientes:', error);
                allClients = [
                    { id: '1', nombre: 'EMILY JIMENA CALDERON GUTIERREZ', telefono: '7295-2454' }
                ];
            }
        }

        function toggleNewClientForm() {
            const form = document.getElementById('newClientForm');
            const button = document.querySelector('.client-add-toggle');
            form.hidden = !form.hidden;
            button.setAttribute('aria-expanded', String(!form.hidden));
            if (!form.hidden) document.getElementById('newClientName').focus();
        }

        async function saveNewClient(event) {
            event.preventDefault();
            const nameInput = document.getElementById('newClientName');
            const cedulaInput = document.getElementById('newClientCedula');
            const phoneInput = document.getElementById('newClientPhone');
            const status = document.getElementById('newClientStatus');
            const saveButton = document.getElementById('saveClientButton');
            const nombre = nameInput.value.trim();
            const cedula = cedulaInput.value.trim();
            const telefono = phoneInput.value.trim();

            if (!nombre || !cedula || !telefono) {
                status.textContent = 'Complete nombre, cédula y teléfono.';
                status.className = 'client-form-status error';
                return;
            }

            if (allClients.some(client => String(client.cedula || '').trim() === cedula)) {
                status.textContent = 'Ya existe un cliente registrado con esa cédula.';
                status.className = 'client-form-status error';
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = 'Guardando…';
            status.textContent = '';
            try {
                const clientData = {
                    activo: true,
                    cedula: String(cedula),
                    creadoEn: new Date().toISOString(),
                    nombre: String(nombre),
                    telefono: String(telefono)
                };
                const docRef = await db.collection('clientesBD').add(clientData);
                const newClient = { id: docRef.id, ...clientData };
                allClients.push(newClient);
                selectClient(newClient);
                document.getElementById('newClientForm').reset();
                document.getElementById('newClientForm').hidden = true;
                document.querySelector('.client-add-toggle').setAttribute('aria-expanded', 'false');
                status.textContent = 'Cliente guardado y seleccionado.';
                status.className = 'client-form-status success';
            } catch (error) {
                console.error('Error al guardar cliente:', error);
                status.textContent = 'No se pudo guardar. Verifique su conexión y los permisos de Firebase.';
                status.className = 'client-form-status error';
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'Guardar cliente';
            }
        }

        async function searchClients(query) {
            const resultsDiv = document.getElementById('searchResults');
            
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }

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
            document.getElementById('searchResults').style.display = 'none';
            document.getElementById('clientSearch').value = '';
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-box')) {
                document.getElementById('searchResults').style.display = 'none';
            }
        });

        // ============================================
        // CONTROL DE TAMAÑO DE ETIQUETA
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
            
            // Calcular pulgadas aproximadas basadas en el tamaño visual
            const basePx = 400;
            const baseInches = DEFAULT_SIZE_INCHES;
            const inches = (px / basePx) * baseInches;
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
            const baseInches = DEFAULT_SIZE_INCHES;
            const basePx = 400;
            const px = (inches / baseInches) * basePx;
            
            const wrapper = document.getElementById('labelWrapper');
            wrapper.style.width = px + 'px';
            wrapper.style.height = px + 'px';
            
            document.getElementById('labelSizePx').value = Math.round(px);
            document.getElementById('labelSizePxValue').textContent = Math.round(px) + ' px';
        }

        // ============================================
        // ACTUALIZACIÓN DE TEXTOS
        // ============================================
        function updateTexts() {
            const mainText = document.getElementById('editMainText').value;
            const words = mainText.split(' ');
            
            if (words.length > 0) {
                document.getElementById('textMain').textContent = words[0];
            }
            
            if (words.length > 1) {
                document.getElementById('textSub').textContent = '♥ ' + words.slice(1).join(' ') + ' ♥';
            }

            document.getElementById('textMessage').textContent = document.getElementById('editMessage1').value;
            document.getElementById('textMessage2').textContent = document.getElementById('editMessage2').value;
            document.getElementById('textSinpe').textContent = document.getElementById('editSinpe').value;
            document.getElementById('textBrand').textContent = document.getElementById('editBrand').value;
        }

        function updateTextSizes() {
            document.getElementById('textMain').setAttribute('font-size', document.getElementById('sizeMain').value);
            document.getElementById('textSub').setAttribute('font-size', document.getElementById('sizeSub').value);
            document.getElementById('textMessage').setAttribute('font-size', document.getElementById('sizeMessage').value);
            document.getElementById('textMessage2').setAttribute('font-size', document.getElementById('sizeMessage').value);
            document.getElementById('textSinpe').setAttribute('font-size', document.getElementById('sizeSinpe').value);
            document.getElementById('textBrand').setAttribute('font-size', document.getElementById('sizeBrand').value);
            document.getElementById('textClient').setAttribute('font-size', document.getElementById('sizeClient').value);
        }

        // ============================================
        // CONTROL DEL BORDE CIRCULAR
        // ============================================
        function updateBorderText() {
            const text = document.getElementById('editBorderText').value;
            // Repetir el texto para llenar el círculo completo
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
            
            // Actualizar el path del círculo
            const center = 200;
            const path = document.getElementById('borderPath');
            path.setAttribute('d', `M ${center}, ${center} m -${radius}, 0 a ${radius},${radius} 0 1,1 ${radius*2},0 a ${radius},${radius} 0 1,1 -${radius*2},0`);
        }

        function updateBorderRotation() {
            const rotation = document.getElementById('borderRotation').value;
            document.getElementById('borderRotationValue').textContent = rotation + '°';
            
            const textElement = document.getElementById('borderText');
            // Aplicar rotación al texto completo
            textElement.setAttribute('transform', `rotate(${rotation}, 200, 200)`);
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
            const color = document.getElementById('borderColor').value;
            document.getElementById('borderText').style.fill = color;
        }

        // ============================================
        // COLORES
        // ============================================
        function updateColors() {
            const setFill = (id, color) => document.getElementById(id).style.fill = color;
            setFill('textMain', document.getElementById('colorMain').value);
            setFill('textSub', document.getElementById('colorMain').value);
            setFill('textMessage', document.getElementById('colorMessage').value);
            setFill('textMessage2', document.getElementById('colorMessage').value);
            setFill('textSinpe', document.getElementById('colorSinpe').value);
            setFill('textSinpeLabel', document.getElementById('colorSinpe').value);
            setFill('textBrand', document.getElementById('colorBrand').value);
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
        }

        // ============================================
        // UTILIDADES DE UI
        // ============================================
        function switchTab(tabName, button = document.querySelector(`.tab[onclick*=\"${tabName}\"]`)) {
            // Ocultar todos los tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Mostrar tab seleccionado
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
            const clientName = document.getElementById('selectedClient').value;
            const quantity = parseInt(document.getElementById('labelQuantity').value);
            const labelSize = parseFloat(document.getElementById('labelSizeInches').value);

            if (!clientName) {
                alert('Por favor seleccione un cliente');
                return;
            }

            const queueItem = {
                id: Date.now(),
                clientName: clientName,
                quantity: quantity,
                labelSize: labelSize,
                config: {
                    mainText: document.getElementById('editMainText').value,
                    message1: document.getElementById('editMessage1').value,
                    message2: document.getElementById('editMessage2').value,
                    sinpe: document.getElementById('editSinpe').value,
                    brand: document.getElementById('editBrand').value,
                    borderText: document.getElementById('editBorderText').value,
                    sizes: {
                        main: document.getElementById('sizeMain').value,
                        sub: document.getElementById('sizeSub').value,
                        message: document.getElementById('sizeMessage').value,
                        sinpe: document.getElementById('sizeSinpe').value,
                        brand: document.getElementById('sizeBrand').value,
                        client: document.getElementById('sizeClient').value,
                        border: document.getElementById('borderTextSize').value
                    },
                    colors: {
                        main: document.getElementById('colorMain').value,
                        message: document.getElementById('colorMessage').value,
                        sinpe: document.getElementById('colorSinpe').value,
                        brand: document.getElementById('colorBrand').value,
                        client: document.getElementById('colorClient').value,
                        border: document.getElementById('borderColor').value,
                        labelCircle: document.getElementById('labelCircleColor').value
                    },
                    border: {
                        radius: document.getElementById('borderRadius').value,
                        rotation: document.getElementById('borderRotation').value,
                        offset: document.getElementById('borderStartOffset').value,
                        spacing: document.getElementById('borderLetterSpacing').value
                    }
                }
            };

            printQueue.push(queueItem);
            alert(`✅ Agregado a la cola:\n\nCliente: ${clientName}\nCantidad: ${quantity}\nTamaño: ${labelSize}" (${(labelSize * INCHES_TO_MM).toFixed(1)} mm)\n\nLa cantidad se mantiene para imprimir o guardar como PDF.`);
        }

        // Inicializar textos
        updateTexts();
        updateBorderText();
    

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
        console.warn('No se pudieron cargar los ajustes de impresión guardados.', error);
    }
}

function updatePrintPreview() {
    const settings = getPrintSettings();
    document.getElementById('printMargin').value = settings.margin;
    document.getElementById('printGap').value = settings.gap;
    document.getElementById('printBorderWidth').value = settings.borderWidth;
    try { localStorage.setItem('ewePrintSettings', JSON.stringify(settings)); } catch (error) { /* almacenamiento opcional */ }

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
        : `Con este margen, tamaño y papel la etiqueta no cabe en la hoja ${page.name}.`;
}

// Imprime todas las etiquetas pedidas, distribuidas en hojas con ajustes editables.
function printLabels() {
    const quantityInput = document.getElementById('labelQuantity');
    const quantity = Math.floor(Number(quantityInput.value));
    const sizeInches = Number(document.getElementById('labelSizeInches').value);
    const paper = document.getElementById('printPaperSize').value;

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 1000) {
        alert('Indique una cantidad entre 1 y 1000 etiquetas.');
        quantityInput.focus();
        return;
    }
    if (!Number.isFinite(sizeInches) || sizeInches <= 0) {
        alert('Revise el tamaño de la etiqueta antes de imprimir.');
        return;
    }

    updatePrintPreview();

    const page = paper === 'a4'
        ? { name: 'A4', width: 8.2677, height: 11.6929 }
        : { name: 'Letter', width: 8.5, height: 11 };
    const settings = getPrintSettings();
    const margin = settings.margin;
    const gap = settings.gap;
    const usableWidth = page.width - margin * 2;
    const usableHeight = page.height - margin * 2;
    const columns = Math.floor((usableWidth + gap) / (sizeInches + gap));
    const rows = Math.floor((usableHeight + gap) / (sizeInches + gap));

    if (columns < 1 || rows < 1) {
        alert(`La etiqueta de ${sizeInches.toFixed(2)} pulgadas no cabe en una hoja ${page.name} con el margen seleccionado. Reduzca el margen o el tamaño de la etiqueta.`);
        return;
    }

    const perSheet = columns * rows;
    const svg = document.getElementById('labelSvg').cloneNode(true);
    svg.removeAttribute('id');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const pages = [];
    for (let start = 0; start < quantity; start += perSheet) {
        const count = Math.min(perSheet, quantity - start);
        const labels = Array.from({ length: count }, () =>
        `<div class="label${settings.cutBorder ? ' cut-border' : ''}"><div class="svg-box">${svg.outerHTML}</div></div>`
        ).join('');
        pages.push(`<section class="sheet">${labels}</section>`);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('El navegador bloqueó la ventana de impresión. Permita ventanas emergentes para este sitio y vuelva a intentarlo.');
        return;
    }

    const pageCss = `
        @page { size: ${page.name}; margin: ${margin}in; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { font-family: Arial, sans-serif; }
        .sheet { width: ${usableWidth}in; height: ${usableHeight}in; display: grid;
            grid-template-columns: repeat(${columns}, ${sizeInches}in);
            grid-auto-rows: ${sizeInches}in; gap: ${gap}in; justify-content: center;
            align-content: start; overflow: hidden; page-break-after: always; break-after: page; }
        .sheet:last-child { page-break-after: auto; break-after: auto; }
        .label, .svg-box { width: ${sizeInches}in; height: ${sizeInches}in; overflow: hidden; }
        .label { position: relative; }
        .label.cut-border::after { content: ""; position: absolute; inset: 2.5%; border: ${settings.borderWidth}mm solid ${settings.borderColor}; border-radius: 50%; pointer-events: none; }
        svg { display: block; width: 100%; height: 100%; }
        .label-circle { fill: white; stroke: #e8dfd5; stroke-width: 2; }
        .border-text-path { fill: #6b8f5e; font-family: Lora, serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
        .leaf-decoration { opacity: .7; }
        .label-text-main, .label-text-sub { font-family: 'Great Vibes', cursive; fill: #2d5016; text-anchor: middle; }
        .label-text-message { font-family: Lora, serif; fill: #444; text-anchor: middle; font-size: 10px; }
        .label-text-sinpe { font-family: 'Playfair Display', serif; fill: #1a1a1a; text-anchor: middle; font-weight: 700; }
        .label-text-brand { font-family: 'Playfair Display', serif; fill: #2d5016; text-anchor: middle; font-weight: 700; }
        .label-text-client { font-family: 'Playfair Display', serif; fill: #1a1a1a; text-anchor: middle; font-weight: 600; }
        .label-text-footer { font-family: 'Dancing Script', cursive; fill: #555; text-anchor: middle; }
        @media screen { body { padding: 18px; background: #f1f4ef; } .sheet { background: #fff; margin: 0 auto 18px; box-shadow: 0 2px 14px #0002; } }
    `;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Etiquetas para imprimir (${quantity})</title>
        <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
        <style>${pageCss}</style></head><body>${pages.join('')}
        <script>window.addEventListener('load', function(){ const go=()=>setTimeout(()=>window.print(),350); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(go); else go(); }); window.addEventListener('afterprint',()=>setTimeout(()=>window.close(),300));<\/script>
        </body></html>`);
    printWindow.document.close();
}

function printLabel() {
    printLabels();
}

function createPDF() {
    printLabels();
}
