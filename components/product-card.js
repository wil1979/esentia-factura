// components/product-card.js
import { Store, Utils } from '../modules/core.js';
import ProductManager from '../modules/products.js';

export const ProductCard = {
  render(product) {
    const stock = ProductManager.getStock(product.nombre);
    const isLowStock = stock > 0 && stock <= 5;
    const badges = [];
    
    if (product.esNuevo) badges.push('<span class="badge badge-nuevo">NUEVO</span>');
    if (product.descuentoPromo > 0) {
      badges.push(`<span class="badge badge-oferta">-${product.descuentoPromo}% PROMO</span>`);
    } else if (product.precioOriginal) {
      badges.push('<span class="badge badge-oferta">Oferta</span>');
    }
    badges.push(`<span class="badge badge-tipo">${product.tipo}</span>`);

    let variantesVisibles = product.variantes || [];
    if (product.descuentoPromo > 0) {
      const solo30 = variantesVisibles.filter(v => v.nombre?.includes('30'));
      if (solo30.length > 0) variantesVisibles = solo30;
    }

    const idx30 = variantesVisibles.findIndex(v => v.nombre?.includes('30'));
    const activeIdx = idx30 !== -1 ? idx30 : 0;
    const activeVariant = variantesVisibles[activeIdx];

    const precioBaseProducto = Number(product.precio) || 0;
    const precioBaseVariante = activeVariant ? Number(activeVariant.precio) : precioBaseProducto;
    const precioBase = precioBaseVariante || precioBaseProducto;
    
    let precioFinal = precioBase;
    if (product.descuentoPromo > 0 && product.descuentoPromo < 100) {
      precioFinal = activeVariant?.precioDescuento 
        ? Number(activeVariant.precioDescuento)
        : Math.round(precioBase * (1 - product.descuentoPromo / 100));
    }

    let priceHtml = '';
    if (product.descuentoPromo > 0) {
      priceHtml = `<span class="precio-original">₡${precioBase.toLocaleString()}</span> <span class="precio-oferta">₡${precioFinal.toLocaleString()}</span>`;
    } else if (product.precioOriginal) {
      priceHtml = `<span class="precio-original">₡${Number(product.precioOriginal).toLocaleString()}</span> <span class="precio-oferta">₡${precioFinal.toLocaleString()}</span>`;
    } else {
      priceHtml = `<span class="precio-normal">₡${precioFinal.toLocaleString()}</span>`;
    }

    const stockHtml = isLowStock ? `<div class="stock-label stock-bajo">⚠️ Últimas ${stock}</div>` : '';

    const variantsHtml = variantesVisibles.map((v, i) => {
      const isActive = i === activeIdx ? 'active' : '';
      const realIdx = product.variantes?.findIndex(v2 => v2.nombre === v.nombre && v2.precio === v.precio) ?? i; 
      
      const vPrecioBase = Number(v.precio) || precioBaseProducto;
      const vPrecioBtn = product.descuentoPromo > 0 && product.descuentoPromo < 100
        ? (Number(v.precioDescuento) || Math.round(vPrecioBase * (1 - product.descuentoPromo / 100)))
        : vPrecioBase;
      
      const vPrecioOriginal = Number(v.precio) || vPrecioBase;
      const vImagen = v.imagenVariante || product.imagen || 'images/default.png';
      const vNombre = v.nombre || 'Única';

      return `
        <button class="btn-variante ${isActive}" 
               data-variant="${realIdx}" 
               data-price="${vPrecioBtn}" 
               data-price-original="${vPrecioOriginal}"
               data-img="${vImagen}"
               data-variant-name="${vNombre}">
          ${vNombre}<br><small>₡${vPrecioBtn.toLocaleString()}</small>
        </button>
      `;
    }).join('');

    const imagenPrincipal = activeVariant?.imagenVariante || product.imagen || 'images/default.png';
    const imagenAlt = `${product.nombre || 'Producto'} - ${activeVariant?.nombre || 'Presentación'}`;

    return `
      <div class="producto-card ${product.descuentoPromo > 0 ? 'oferta' : ''}" data-id="${product.id}" data-nombre="${product.nombre || ''}">
        <div class="producto-imagen-container">
          <div class="badges-container">${badges.join('')}</div>
          <img src="${imagenPrincipal}" alt="${imagenAlt}" class="producto-img-variante" loading="lazy">
          <div class="variant-indicator">${activeVariant?.nombre || ''}</div>
        </div>
        <div class="producto-info">
          <h3 class="producto-nombre">${product.nombre || 'Producto sin nombre'}</h3>
          ${product.calificacion ? `<div class="producto-calificacion">${'★'.repeat(Math.floor(product.calificacion))}</div>` : ''}
          <div class="producto-precio-container">${priceHtml}</div>
          ${stockHtml}
          <div class="variantes-container">${variantsHtml}</div>
          <div class="producto-acciones">
            <button class="btn-detalle" data-action="detail">👁️</button>
            <button class="btn-externo" data-action="external">🔗</button>
            <button class="btn-agregar" data-action="add">🛒</button>
          </div>
        </div>
      </div>
    `;
  },

  mostrarSelectorAroma(product, variant, precioFinal, precioBase) {
    document.getElementById('modalSelectorAroma')?.remove();
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalSelectorAroma';
    
    const aromas = ProductManager.AROMAS_DIFUSORES || [];
    const iconos = {
      "Pera":"🍐","Manzana Verde":"🍏","Coco":"🥥","Vainilla":"🍦","Lavanda":"💜",
      "Melon & Vainilla":"🍈","Kiwi":"🥝","Carro Nuevo":"🚗","Manzana & Canela":"🍎",
      "Limón":"🍋","Menta":"🌿","Fresa":"🍓"
    };

    modal.innerHTML = `
      <div class="modal-content aroma-modal">
        <button class="modal-close" id="btnCerrarAroma">✕</button>
        <h3>🌸 Selecciona el Aroma</h3>
        <p class="subtitle">${product.nombre} — ${variant.nombre}</p>
        <div class="aromas-grid">
          ${aromas.map(a => `
            <button class="btn-aroma" data-aroma="${a}">
              <span class="aroma-icon">${iconos[a] || '✨'}</span>
              <span>${a}</span>
            </button>
          `).join('')}
        </div>
        <div class="custom-aroma-box">
          <label>🖊️ ¿No encuentras el aroma?</label>
          <div class="custom-input-row">
            <input type="text" id="customAromaInput" placeholder="Ej: Durazno..." autocomplete="off">
            <button id="btnConfirmCustomAroma" class="btn-primary">✅ Usar</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    const cerrarModal = () => {
      document.removeEventListener('keydown', handleEscape);
      modal.removeEventListener('click', handleOverlayClick);
      modal.remove();
    };
    const handleOverlayClick = (e) => { if (e.target === modal) cerrarModal(); };
    modal.addEventListener('click', handleOverlayClick);
    const handleEscape = (e) => { if (e.key === 'Escape') cerrarModal(); };
    document.addEventListener('keydown', handleEscape);

    modal.querySelectorAll('.btn-aroma').forEach(btn => {
      btn.addEventListener('click', () => {
        this._agregarConAroma(product, variant, precioFinal, precioBase, btn.dataset.aroma);
        cerrarModal();
      });
    });

    document.getElementById('btnConfirmCustomAroma')?.addEventListener('click', () => {
      const custom = document.getElementById('customAromaInput')?.value.trim();
      if (!custom) { if(window.UI) UI.toast('Escribe un aroma válido', 'warning'); return; }
      this._agregarConAroma(product, variant, precioFinal, precioBase, custom.toUpperCase());
      cerrarModal();
    });

    setTimeout(() => document.getElementById('customAromaInput')?.focus(), 100);
  },

  _agregarConAroma(product, variant, precioFinal, precioBase, aroma) {
    Store.emit('cart:add', {
      product,
      variant: { nombre: variant.nombre, precio: precioFinal, precioOriginal: precioBase, aroma }
    });
  },

  renderGrid(productos, container) {
    if (!container) return;
    if (productos.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><h3>Sin productos</h3></div>`;
      return;
    }
    
    const porTipo = {};
    productos.forEach(p => {
      if (!porTipo[p.tipo]) porTipo[p.tipo] = [];
      porTipo[p.tipo].push(p);
    });
    
    container.innerHTML = Object.entries(porTipo).map(([tipo, items]) => `
      <div class="seccion-tipo">
        <h2 class="titulo-tipo">${this.getIconoTipo(tipo)} ${tipo} <span class="contador-productos">${items.length}</span></h2>
        <div class="productos-grid">${items.map(p => this.render(p)).join('')}</div>
      </div>
    `).join('');

    this.attachEvents(container);
  },

  attachEvents(container) {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const variantBtn = e.target.closest('.btn-variante');
      if (variantBtn) {
        const parent = variantBtn.closest('.variantes-container');
        parent.querySelectorAll('.btn-variante').forEach(b => b.classList.remove('active'));
        variantBtn.classList.add('active');
        
        const card = variantBtn.closest('.producto-card');
        const precioDisplay = card.querySelector('.precio-oferta') || card.querySelector('.precio-normal');
        const nuevoPrecio = Number(variantBtn.dataset.price) || 0;
        if (precioDisplay) precioDisplay.textContent = `₡${nuevoPrecio.toLocaleString()}`;
        
        const cartBtn = card.querySelector('.btn-agregar');
        if (cartBtn) {
          cartBtn.classList.remove('radar-pulse');
          void cartBtn.offsetWidth;
          cartBtn.classList.add('radar-pulse');
        }
        return;
      }

      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const card = btn.closest('.producto-card');
      if (!card) return;
      
      const action = btn.dataset.action;
      const productId = card.dataset.id;

      if (action === 'add') {
        const product = ProductManager.getProduct(productId);
        if (!product) { if(window.UI) UI.toast('Producto no encontrado', 'warning'); return; }

        const activeVariantBtn = card.querySelector('.btn-variante.active');
        const variantIndex = activeVariantBtn ? parseInt(activeVariantBtn.dataset.variant) : 0;
        const variantData = product.variantes?.[variantIndex];
        const precioFinal = Number(activeVariantBtn?.dataset.price) || Number(product.precio) || 0;
        const precioBase = Number(activeVariantBtn?.dataset.priceOriginal) || Number(product.precio) || 0;

        if (product.tipo === 'Velas' && window.VelaCustomizer) {
          window.VelaCustomizer.abrir(product);
          return;
        }

        if (product.tipo === 'Difusores' || product.tipo === 'Difusor') {
          this.mostrarSelectorAroma(product, variantData, precioFinal, precioBase);
          return;
        }

        Store.emit('cart:add', {
          product,
          variant: { nombre: variantData?.nombre || '30ml', precio: precioFinal, original: precioBase }
        });

      } else if (action === 'detail') {
        Store.emit('product:detail', productId);
      } else if (action === 'external') {
        window.open(`https://wil1979.github.io/esentia-factura/producto.html?id=${productId}`, '_blank');
      }
    });
  },

  getIconoTipo(tipo) {
    const iconos = {
      'Aromaterapia': '🌿', 'Difusores': '💨', 'Difusor': '💨', 'Velas': '🕯️',
      'Aceites': '💧', 'Perfumes': '🌸', 'Ambientadores': '🏠', 'Regalos': '🎁', 'Limpieza': '🧼'
    };
    return iconos[tipo] || '✨';
  }
};

export default ProductCard;