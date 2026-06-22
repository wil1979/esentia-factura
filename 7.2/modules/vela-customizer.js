// modules/vela-customizer.js
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';

export const VelaCustomizer = {
  config: null,
  currentProduct: null,
  selection: { 
    variante: 0, 
    aroma: null, 
    color: null, 
    colorPersonalizado: null,
    esColorPersonalizado: false,
    envase: null, 
    adicionales: [], 
    tarjeta: '',
    imagenTarjeta: null,
    imagenRealSeleccionada: null
  },
  
  PALETA_COLORES: [
    '#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493',
    '#87CEEB', '#4682B4', '#1E90FF', '#0000FF',
    '#98FB98', '#90EE90', '#32CD32', '#228B22',
    '#FFD700', '#FFA500', '#FF8C00', '#FF6347',
    '#DDA0DD', '#9370DB', '#8A2BE2', '#4B0082',
    '#F5DEB3', '#DEB887', '#D2691E', '#8B4513',
    '#FFFFFF', '#F5F5F5', '#D3D3D3', '#808080',
    '#000000'
  ],

  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxpcmb3hhEeEqg2EUFwXsD6PgWz44PZ7PoEoxhXl0w2app01x1b_pOihds6QFp8vFc-aA/exec',

  async init() {
    try {
      const res = await fetch('./data/config_velas.json');
      this.config = res.ok ? await res.json() : null;
      if (!this.config) console.warn('⚠️ Config de velas no encontrada');
    } catch (e) { console.error('Error cargando config velas:', e); }
  },

  // Helper seguro interno para buscar valores en la configuración
  _getConfig(id, field = 'precioExtra') {
    // Se define dentro del módulo para evitar scope errors
    return 0; 
  },

  abrir(producto) {
    this.currentProduct = producto;
    this.selection = {
      variante: 0,
      aroma: this.config?.aromas?.[0]?.id || null,
      color: this.config?.colores?.[0]?.id || null,
      colorPersonalizado: null,
      esColorPersonalizado: false,
      envase: this.config?.envases?.[0]?.id || null,
      adicionales: [],
      tarjeta: '',
      imagenTarjeta: null,
      imagenRealSeleccionada: null
    };

    const vars = producto.variantes || [{ nombre: 'Única', precio: producto.precio }];
    const basePrice = Math.min(...vars.map(v => v.precio));

    const imagenesReales = producto.imagenesReales || [];
    const galeriaHTML = imagenesReales.length > 0 ? `
      <div class="stock-gallery">
        ${imagenesReales.map((img, idx) => `
          <button class="stock-img-card" data-src="${img}" onclick="VelaCustomizer.seleccionarImagenReal('${img}', this)">
            <img src="${img}" alt="Inventario real #${idx+1}">
          </button>
        `).join('')}
      </div>
    ` : '<p class="no-stock-imgs">📷 Fotos de inventario disponibles próximamente.</p>';

    const modal = document.createElement('div');
    modal.className = 'modal show'; modal.id = 'modalVelaCustom';
    modal.innerHTML = `
      <div class="modal-content modal-grande vela-customizer">
        <button class="modal-close" onclick="UI.modal('modalVelaCustom','close')">✕</button>
        <h2>🕯️ ${producto.nombre}</h2>
        <p class="precio-ref">Desde ₡${basePrice.toLocaleString()}</p>

        <div class="customizer-steps">
          <fieldset class="step">
            <legend>📏 1. Tamaño</legend>
            <div class="option-list vertical" id="selTamano">
              ${vars.map((v, i) => `<button class="chip-opt ${i===0?'active':''}" data-idx="${i}">${v.nombre} - ₡${v.precio}</button>`).join('')}
            </div>
          </fieldset>

          <fieldset class="step">
            <legend>🌸 2. Aroma</legend>
            <div class="option-list grid-2-img" id="selAroma">
              ${this.config?.aromas?.map(a => `
                <button class="chip-opt-img ${a.id === this.selection.aroma ? 'active' : ''}" data-id="${a.id}">
                  <div class="opt-img-wrapper">${a.imagen ? `<img src="${a.imagen}" alt="${a.nombre}">` : '<div class="img-placeholder">🌸</div>'}</div>
                  <span>${a.nombre}</span><small>${a.precioExtra?'+₡'+a.precioExtra:''}</small>
                </button>
              `).join('') || '<p>Sin aromas configurados</p>'}
            </div>
          </fieldset>

          <fieldset class="step">
            <legend>🎨 3. Color</legend>
            <div class="color-selector" id="colorSelector">
              ${this.config?.colores?.map(c => `<button class="color-opt" data-id="${c.id}" data-type="preset" style="background:${c.colorHex}" title="${c.nombre}"></button>`).join('')}
              <button class="color-opt custom-color-btn" data-type="custom" title="Color personalizado" style="background: linear-gradient(135deg, #ff0000, #00ff00, #0000ff)">🎨</button>
            </div>
            <div id="colorPersonalizadoSection" class="color-custom-section" style="display:none;">
              <p class="color-note">⚠️ <strong>Nota:</strong> Los colores son referenciales. El tono final puede variar.</p>
              <div class="color-palette">
                <p style="font-size:0.85rem; margin-bottom:8px;"><strong>Tono de referencia:</strong></p>
                <div class="palette-grid">
                  ${this.PALETA_COLORES.map(c => `<button class="palette-color" style="background:${c}" data-color="${c}"></button>`).join('')}
                </div>
              </div>
              <div class="color-picker-wrapper">
                <label style="font-size:0.85rem; display:block; margin:10px 0 5px;">O elige exacto:</label>
                <input type="color" id="colorPickerExacto" value="#FFB6C1">
                <span id="colorHexDisplay">#FFB6C1</span>
              </div>
            </div>
          </fieldset>

          <fieldset class="step">
            <legend>📦 4. Selección de Inventario Real</legend>
            <p class="step-desc">Elige una unidad específica disponible:</p>
            ${galeriaHTML}
          </fieldset>

          <fieldset class="step">
            <legend>🏺 5. Envase</legend>
            <div class="option-list vertical" id="selEnvase">
              ${this.config?.envases?.map(e => `<button class="chip-opt" data-id="${e.id}">${e.nombre} ${e.precioExtra?'+₡'+e.precioExtra:''}</button>`).join('')}
            </div>
          </fieldset>

          <fieldset class="step">
            <legend>✨ 6. Adicionales</legend>
            <div class="addon-grid-img" id="selExtras">
              ${this.config?.adicionales?.map(ad => `
                <button class="addon-card-img" data-id="${ad.id}">
                  <div class="opt-img-wrapper"><img src="${ad.imagen || 'images/default.png'}" alt="${ad.nombre}"></div>
                  <span>${ad.nombre}</span><small>+₡${ad.precioExtra}</small>
                </button>
              `).join('') || ''}
            </div>
          </fieldset>

          <fieldset class="step">
            <legend>📝 7. Tarjeta Personalizada</legend>
            <textarea id="txtTarjeta" placeholder="Escribe tu mensaje..." maxlength="${this.config?.tarjeta?.maxCaracteres||60}"></textarea>
            <small class="counter">0/${this.config?.tarjeta?.maxCaracteres||60} (₡${this.config?.tarjeta?.precio||500})</small>
            <div class="imagen-tarjeta-section">
              <p style="font-size:0.85rem; margin:10px 0 5px;"><strong>¿Agregar foto a la tarjeta?</strong></p>
              <input type="file" id="fileImagenTarjeta" accept="image/*" style="display:none;">
              <button type="button" class="btn-secondary" id="btnSubirImagen">📷 Subir Imagen a Drive</button>
              <div id="imagenPreview" class="imagen-preview" style="display:none;">
                <img src="" alt="Preview">
                <button type="button" class="btn-sm btn-danger" id="btnEliminarImagen">🗑️</button>
              </div>
            </div>
          </fieldset>
        </div>

        <div class="customizer-footer">
          <div class="price-box"><span>Total:</span><strong id="precioFinal">₡0</strong></div>
          <button id="btnAddCustom" class="btn-primary btn-large">🛒 Agregar al Carrito</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    this.attachEvents(modal);
    this.updatePrice();
  },

  attachEvents(modal) {
    const on = (selector, callback) => {
      const el = modal.querySelector(selector);
      if (el) el.addEventListener('click', e => {
        const target = e.target.closest('[data-id], [data-idx], .color-opt, .palette-color, .addon-card-img, .chip-opt-img, .chip-opt');
        if (target) callback(target);
      });
    };

    on('#selTamano', t => {
      this.selection.variante = +t.dataset.idx;
      modal.querySelectorAll('#selTamano .chip-opt').forEach(b => b.classList.remove('active'));
      t.classList.add('active'); this.updatePrice();
    });
    
    on('#selAroma', t => {
      this.selection.aroma = t.dataset.id;
      modal.querySelectorAll('#selAroma .chip-opt-img').forEach(b => b.classList.remove('active'));
      t.classList.add('active'); this.updatePrice();
    });
    
    on('#colorSelector', t => {
      if (t.dataset.type === 'custom') {
        this.selection.esColorPersonalizado = true;
        this.selection.color = null;
        modal.querySelectorAll('#colorSelector .color-opt').forEach(b => b.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('colorPersonalizadoSection').style.display = 'block';
      } else {
        this.selection.esColorPersonalizado = false;
        this.selection.color = t.dataset.id;
        this.selection.colorPersonalizado = null;
        modal.querySelectorAll('#colorSelector .color-opt').forEach(b => b.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('colorPersonalizadoSection').style.display = 'none';
      }
      this.updatePrice();
    });

    modal.querySelectorAll('.palette-color')?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.selection.colorPersonalizado = btn.dataset.color;
        document.getElementById('colorPickerExacto').value = btn.dataset.color;
        document.getElementById('colorHexDisplay').textContent = btn.dataset.color;
        modal.querySelectorAll('.palette-color').forEach(b => b.style.border='none');
        btn.style.border = '3px solid var(--primary)';
      });
    });

    modal.querySelector('#colorPickerExacto')?.addEventListener('input', e => {
      this.selection.colorPersonalizado = e.target.value;
      document.getElementById('colorHexDisplay').textContent = e.target.value;
      modal.querySelectorAll('.palette-color').forEach(b => b.style.border='none');
    });

    on('#selEnvase', t => {
      this.selection.envase = t.dataset.id;
      modal.querySelectorAll('#selEnvase .chip-opt').forEach(b => b.classList.remove('active'));
      t.classList.add('active'); this.updatePrice();
    });
    
    on('#selExtras', t => {
      const id = t.dataset.id;
      if(this.selection.adicionales.includes(id)) {
        this.selection.adicionales = this.selection.adicionales.filter(x => x!==id);
        t.classList.remove('selected');
      } else {
        this.selection.adicionales.push(id);
        t.classList.add('selected');
      }
      this.updatePrice();
    });

    modal.querySelector('#txtTarjeta')?.addEventListener('input', e => {
      this.selection.tarjeta = e.target.value;
      modal.querySelector('.counter').textContent = `${e.target.value.length}/${this.config?.tarjeta?.maxCaracteres||60} (₡${this.config?.tarjeta?.precio||500})`;
      this.updatePrice();
    });

    const btnSubir = modal.querySelector('#btnSubirImagen');
    const fileInput = modal.querySelector('#fileImagenTarjeta');
    if (btnSubir && fileInput) {
      btnSubir.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', e => this.handleImageUpload(e, modal));
    }
    modal.querySelector('#btnEliminarImagen')?.addEventListener('click', () => this.eliminarImagen(modal));
    modal.querySelector('#btnAddCustom')?.addEventListener('click', () => this.addToCart());
  },

  seleccionarImagenReal(src, btnElement) {
    if (this.selection.imagenRealSeleccionada === src) {
      this.selection.imagenRealSeleccionada = null;
      btnElement?.classList.remove('selected-real');
    } else {
      this.selection.imagenRealSeleccionada = src;
      document.querySelectorAll('.stock-img-card').forEach(b => b.classList.remove('selected-real'));
      btnElement?.classList.add('selected-real');
    }
  },

  async handleImageUpload(event, modal) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return UI.toast('❌ Solo imágenes', 'warning');
    if (file.size > 2 * 1024 * 1024) return UI.toast('⚠️ Máx 2MB', 'warning');

    const btn = modal.querySelector('#btnSubirImagen');
    const originalText = btn?.textContent || '📷 Subir Imagen';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Subiendo...'; }

    try {
      const base64 = await this.fileToBase64(file);
      await fetch(this.SCRIPT_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileData: base64, metadata: { tempId: `temp_${Date.now()}` } })
      });
      await new Promise(r => setTimeout(r, 2000));

      this.selection.imagenTarjeta = {
        name: file.name, type: file.type, size: file.size,
        uploadedAt: new Date().toISOString(), status: 'uploaded',
        tempId: `temp_${Date.now()}`
      };

      const preview = document.getElementById('imagenPreview');
      const img = preview?.querySelector('img');
      if (img) { img.src = base64; img.alt = file.name; }
      if (preview) preview.style.display = 'flex';
      
      UI.toast('✅ Imagen subida a Drive', 'success');
    } catch (error) {
      console.error('Error subida:', error);
      UI.toast('❌ Error al subir', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      event.target.value = '';
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  },
eliminarImagen(modal) {
  // 1. Limpiar selección interna
  this.selection.imagenTarjeta = null;
  
  // 2. Ocultar preview (usando ?. para lectura, que SÍ es válido)
  document.getElementById('imagenPreview')?.style.setProperty('display', 'none');
  
  // 3. ✅ CORREGIDO: Validar antes de asignar (no usar ?. en asignación)
  if (modal) {
    const fileInput = modal.querySelector('#fileImagenTarjeta');
    if (fileInput) fileInput.value = '';
  }
  
  // 4. Feedback al usuario
  UI.toast('🗑️ Imagen eliminada', 'info');
},

  // ✅ FUNCIÓN DE PRECIO 100% SEGURA SIN HELPERS EXTERNOS
  updatePrice() {
    if(!this.currentProduct) return 0;
    const vars = this.currentProduct.variantes || [{nombre:'Única', precio:this.currentProduct.precio}];
    let base = vars[this.selection.variante]?.precio || this.currentProduct.precio;
    
    const aromaCfg = this.config?.aromas?.find(x=>x.id===this.selection.aroma) || {};
    const colorCfg = this.config?.colores?.find(x=>x.id===this.selection.color) || {};
    const envaseCfg = this.config?.envases?.find(x=>x.id===this.selection.envase) || {};

    let extra = (aromaCfg.precioExtra||0) + (colorCfg.precioExtra||0) + (envaseCfg.precioExtra||0);
    
    let adds = 0;
    this.selection.adicionales.forEach(id => {
      const item = this.config?.adicionales?.find(x => x.id === id);
      if (item) adds += (item.precioExtra || 0);
    });
    
    const card = this.selection.tarjeta.trim() ? (this.config?.tarjeta?.precio || 500) : 0;
    const total = base + extra + adds + card;
    
    const el = document.getElementById('precioFinal');
    if(el) el.textContent = `₡${total.toLocaleString()}`;
    return total;
  },

  async guardarPersonalizacion() {
    const cliente = Store.get('cliente');
    let colorDisplay = 'Natural';
    if (this.selection.esColorPersonalizado) {
      colorDisplay = `Personalizado (${this.selection.colorPersonalizado})`;
    } else if (this.selection.color) {
      const c = this.config?.colores?.find(x=>x.id===this.selection.color);
      colorDisplay = c?.nombre || 'Natural';
    }

    const aroma = this.config?.aromas?.find(x=>x.id===this.selection.aroma);
    const envase = this.config?.envases?.find(x=>x.id===this.selection.envase);
    const extrasNombres = this.selection.adicionales.map(id => {
      const item = this.config?.adicionales?.find(x=>x.id===id);
      return item ? item.nombre : null;
    }).filter(Boolean);

    const docData = {
      clienteId: cliente?.id || 'anonimo',
      clienteNombre: cliente?.nombre || 'Invitado',
      clienteTelefono: cliente?.telefono || '',
      productoId: this.currentProduct.id,
      productoNombre: this.currentProduct.nombre,
      seleccion: {
        tamaño: this.currentProduct.variantes[this.selection.variante]?.nombre || 'Única',
        aroma: aroma?.nombre || 'Estándar',
        color: colorDisplay,
        envase: envase?.nombre || 'Estándar',
        adicionales: extrasNombres,
        tarjeta: this.selection.tarjeta,
        tieneImagen: !!this.selection.imagenTarjeta,
        imagenMetadata: this.selection.imagenTarjeta ? { name: this.selection.imagenTarjeta.name, tempId: this.selection.imagenTarjeta.tempId } : null,
        imagenRealSeleccionada: this.selection.imagenRealSeleccionada
      },
      precioFinal: this.updatePrice(),
      fecha: new Date().toISOString(),
      estado: 'pendiente_carrito'
    };

    if (this.selection.imagenTarjeta?.data) docData.imagenBase64 = this.selection.imagenTarjeta.data;
    const ref = await addDoc(collection(DB.db, "personalizaciones_velas"), docData);
    return ref.id;
  },

  async addToCart() {
    const btn = document.getElementById('btnAddCustom');
    if (!btn) return;
    
    btn.disabled = true; btn.textContent = '⏳ Guardando...';

    try {
      const docId = await this.guardarPersonalizacion();
      const vars = this.currentProduct.variantes || [{nombre:'Única', precio:this.currentProduct.precio}];
      const variante = vars[this.selection.variante] || vars[0];

      let colorDisplay = 'Natural';
      if (this.selection.esColorPersonalizado) colorDisplay = `Personalizado ${this.selection.colorPersonalizado}`;
      else if (this.selection.color) {
        const c = this.config?.colores?.find(x=>x.id===this.selection.color);
        colorDisplay = c?.nombre || 'Natural';
      }

      const aroma = this.config?.aromas?.find(x=>x.id===this.selection.aroma);
      const envase = this.config?.envases?.find(x=>x.id===this.selection.envase);
      const extrasNombres = this.selection.adicionales.map(id => {
        const item = this.config?.adicionales?.find(x=>x.id===id);
        return item ? item.nombre : null;
      }).filter(Boolean);

      Store.addToCart({
        id: `custom_${this.currentProduct.id}_${docId}`,
        nombre: this.currentProduct.nombre,
        tipo: 'Velas',
        variante: variante.nombre,
        precio: this.updatePrice(),
        cantidad: 1,
        imagen: this.selection.imagenRealSeleccionada || this.currentProduct.imagen,
        personalizacionId: docId,
        personalizacion: {
          tamaño: this.currentProduct.variantes[this.selection.variante]?.nombre,
          aroma: aroma?.nombre || 'Estándar',
          color: colorDisplay,
          envase: envase?.nombre || 'Estándar',
          adicionales: extrasNombres,
          tarjeta: this.selection.tarjeta,
          tieneImagen: !!this.selection.imagenTarjeta
        }
      });

      UI.toast('✅ Vela personalizada agregada', 'success');
      UI.modal('modalVelaCustom', 'close');
    } catch(e) {
      console.error(e);
      UI.toast('❌ Error al guardar', 'error');
    } finally {
      btn.disabled = false; btn.textContent = '🛒 Agregar al Carrito';
    }
  }
};

export default VelaCustomizer;