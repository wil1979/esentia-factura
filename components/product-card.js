// components/product-card.js
import { Store, Utils } from '../modules/core.js';
import ProductManager from '../modules/products.js';

export const ProductCard = {
  render(product, options = {}) {
    const stock = ProductManager.getStock(product.nombre);
    const isLowStock = stock > 0 && stock <= 5;
    const badges = [];

    if (product.esNuevo) badges.push('<span class="badge badge-nuevo">Nuevo</span>');

    // Lógica de badges de precio
    if (product.descuentoPromo > 0) {
      badges.push(`<span class="badge badge-oferta">-${product.descuentoPromo}% PROMO</span>`);
    } else if (product.precioOriginal) {
      badges.push('<span class="badge badge-oferta">Oferta</span>');
    }
    badges.push(`<span class="badge badge-tipo">${product.tipo}</span>`);

    // ==========================================
    // 📦 LÓGICA DE VARIANTES Y PRECIOS
    // ==========================================
    let variantesVisibles = product.variantes || [];

    // 1. Si hay descuento, ocultar variantes que NO sean 30ml
    if (product.descuentoPromo > 0) {
      const filtradas = variantesVisibles.filter(v => v.nombre.includes('30'));
      if (filtradas.length > 0) variantesVisibles = filtradas;
    }

    // 2. Determinar variante activa por defecto (Prioridad a 30ml)
    const defaultIdx = variantesVisibles.findIndex(v => v.nombre.includes('30'));
    const activeIdx = defaultIdx !== -1 ? defaultIdx : 0;
    
    // Mapear al índice real en el array original para referencia futura
    const activeVariant = variantesVisibles[activeIdx];
    const activeOrigIndex = product.variantes.indexOf(activeVariant);

    // 3. Calcular precio inicial basado en la variante activa
    let precioBase = activeVariant?.precio || product.precio;
    let precioFinal = precioBase;

    if (product.descuentoPromo > 0) {
      precioFinal = activeVariant?.precioDescuento || Math.round(precioBase * (1 - product.descuentoPromo / 100));
    }

    // HTML del precio
    let priceHtml = '';
    if (product.descuentoPromo > 0) {
      priceHtml = `
        <span class="precio-original">₡${precioBase.toLocaleString()}</span>
        <span class="precio-oferta">₡${precioFinal.toLocaleString()}</span>
        <small style="display:block;color:#27ae60;font-size:0.8rem;margin-top:2px;">Con ${product.descuentoPromo}% OFF</small>
      `;
    } else if (product.precioOriginal) {
      priceHtml = `
        <span class="precio-original">₡${product.precioOriginal.toLocaleString()}</span>
        <span class="precio-oferta">₡${product.precio.toLocaleString()}</span>
      `;
    } else {
      priceHtml = `<span class="precio-normal">₡${precioFinal.toLocaleString()}</span>`;
    }

    const stockHtml = isLowStock 
      ? `<div class="stock-label stock-bajo">⚠️ Últimas ${stock} unidades</div>` 
      : '';

    // ==========================================
    // 🎨 RENDERIZAR BOTONES DE VARIANTES
    // ==========================================
    const variantsHtml = variantesVisibles.map(v => {
      const origIdx = product.variantes.indexOf(v);
      const isActive = origIdx === activeOrigIndex ? 'active' : '';
      
      // Precio a mostrar en el botón
      const precioMostrar = product.descuentoPromo > 0
        ? (v.precioDescuento || Math.round(v.precio * (1 - product.descuentoPromo / 100)))
        : v.precio;
      
      const tieneDescuento = product.descuentoPromo > 0 && v.precioDescuento;

      return `
        <button class="btn-variante ${isActive}" 
                data-variant="${origIdx}" 
                data-price="${precioMostrar}" 
                data-price-original="${v.precio}" 
                data-variant-name="${v.nombre}">
          ${v.nombre} <br> 
          <small>₡${precioMostrar.toLocaleString()}</small>
          ${tieneDescuento ? `<small style="color:#e74c3c;text-decoration:line-through;font-size:0.65rem;">₡${v.precio.toLocaleString()}</small>` : ''}
        </button>
      `;
    }).join('');

    return `
      <div class="producto-card ${product.descuentoPromo > 0 || product.precioOriginal ? 'oferta' : ''}" data-id="${product.id}">
        <div class="producto-imagen-container">
          <div class="badges-container">${badges.join('')}</div>
          <img src="${product.imagen}" alt="${product.nombre}" loading="lazy">
        </div>
        <div class="producto-info">
          <h3 class="producto-nombre">${product.nombre}</h3>
          ${product.calificacion ? `<div class="producto-calificacion">${'★'.repeat(Math.floor(product.calificacion))}</div>` : ''}
          
          <div class="producto-precio-container">
            ${priceHtml}
          </div>
          
          ${stockHtml}
          
          <div class="variantes-container">
            ${variantsHtml}
          </div>

          <div class="producto-acciones">
            <button class="btn-detalle" data-action="detail" title="Ver detalles">👁️</button>
            <button class="btn-externo" data-action="external" title="Ver en catálogo">🔗</button>
            <button class="btn-agregar" data-action="add" title="Agregar al carrito">🛒</button>
          </div>
        </div>
      </div>
    `;
  },

  renderGrid(productos, container) {
    if (productos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No hay productos disponibles</h3>
          <p>Intenta con otros filtros de búsqueda</p>
        </div>
      `;
      return;
    }

    const porTipo = {};
    productos.forEach(p => {
      if (!porTipo[p.tipo]) porTipo[p.tipo] = [];
      porTipo[p.tipo].push(p);
    });

    container.innerHTML = Object.entries(porTipo).map(([tipo, items]) => `
      <div class="seccion-tipo">
        <h2 class="titulo-tipo">
          ${this.getIconoTipo(tipo)} ${tipo}
          <span class="contador-productos">${items.length}</span>
        </h2>
        <div class="productos-grid">
          ${items.map(p => this.render(p)).join('')}
        </div>
      </div>
    `).join('');

    this.attachEvents(container);
  },

  attachEvents(container) {
    container.addEventListener('click', (e) => {
      // ==========================================
      // 🎯 EVENTO: SELECCIÓN DE VARIANTE
      // ==========================================
      const variantBtn = e.target.closest('.btn-variante');
      if (variantBtn) {
        const card = variantBtn.closest('.producto-card');
        const parent = variantBtn.closest('.variantes-container');
        
        // 1. Cambiar clase visual activa
        parent.querySelectorAll('.btn-variante').forEach(b => b.classList.remove('active'));
        variantBtn.classList.add('active');

        // 2. Actualizar precio visible en la tarjeta
        const precioContainer = card.querySelector('.producto-precio-container');
        const nuevoPrecio = parseInt(variantBtn.dataset.price);
        const precioOriginal = variantBtn.dataset.priceOriginal;
        const esOferta = card.classList.contains('oferta');

        if (precioContainer) {
          if (esOferta && precioOriginal) {
            precioContainer.innerHTML = `
              <span class="precio-original">₡${parseInt(precioOriginal).toLocaleString()}</span>
              <span class="precio-oferta">₡${nuevoPrecio.toLocaleString()}</span>
            `;
          } else {
            precioContainer.innerHTML = `<span class="precio-normal">₡${nuevoPrecio.toLocaleString()}</span>`;
          }
        }

        // 3. ACTIVAR ANIMACIÓN RADAR EN BOTÓN DE CARRITO 🛒
        const cartBtn = card.querySelector('.btn-agregar');
        if (cartBtn) {
          cartBtn.classList.remove('radar-pulse');
          void cartBtn.offsetWidth; // Forzar reflow para reiniciar la animación CSS
          cartBtn.classList.add('radar-pulse');
        }
        return;
      }

      // ==========================================
      // 🛒 EVENTO: AGREGAR AL CARRITO
      // ==========================================
      const btn = e.target.closest('button[data-action]');
      const card = e.target.closest('.producto-card');
      if (!btn || !card) return;

      const action = btn.dataset.action;
      const productId = card.dataset.id;

      if (action === 'add') {
        const product = ProductManager.getProduct(productId);
        if (!product) return;

        // Obtener datos de la variante ACTIVA
        const activeVariant = card.querySelector('.btn-variante.active');
        const variantIndex = activeVariant ? parseInt(activeVariant.dataset.variant) : 0;
        const variantData = product.variantes[variantIndex]; // Datos reales del objeto
        
        // Usar precio del dataset (ya calculado con descuento si aplica)
        const precioFinal = parseInt(activeVariant?.dataset.price) || product.precio;
        const precioBase = parseInt(activeVariant?.dataset.priceOriginal) || product.precio;

        Store.emit('cart:add', {
          product,
          variant: {
            nombre: variantData?.nombre || '30ml',
            precio: precioFinal,
            precioOriginal: precioBase
          }
        });
      } 
      else if (action === 'detail') {
        Store.emit('product:detail', productId);
      } 
      else if (action === 'external') {
        window.open(`https://wil1979.github.io/esentia-factura/producto.html?id=${productId}`, '_blank');
      }
    });
  },

  getIconoTipo(tipo) {
    const iconos = {
      'Aromaterapia': '🌿',
      'Difusores': '💨',
      'Velas': '🕯️',
      'Aceites': '💧',
      'Perfumes': '🌸',
      'Ambientadores': '🏠',
      'Regalos': '🎁',
      'Limpieza': '🧼'
    };
    return iconos[tipo] || '✨';
  }
};