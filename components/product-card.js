// components/product-card.js
import { Store, Utils } from '../modules/core.js';
import ProductManager from '../modules/products.js';

export const ProductCard = {
  render(product, options = {}) {
    const stock = ProductManager.getStock(product.nombre);
    const isLowStock = stock > 0 && stock <= 5;
    const badges = [];

    if (product.esNuevo) badges.push('<span class="badge badge-nuevo">Nuevo</span>');

    // Badge de promoción
    if (product.descuentoPromo > 0) {
      badges.push(`<span class="badge badge-oferta">-${product.descuentoPromo}% PROMO</span>`);
    } else if (product.precioOriginal) {
      badges.push('<span class="badge badge-oferta">Oferta</span>');
    }

    badges.push(`<span class="badge badge-tipo">${product.tipo}</span>`);

    // ✅ Lógica de precios y variantes
    // Si hay descuento, priorizamos mostrar solo la variante de 30ml si existe
    const tieneDescuento = product.descuentoPromo > 0;
    let variantesAMostrar = product.variantes || [];

    if (tieneDescuento) {
      // Filtramos para mostrar solo 30ml si hay descuento
      variantesAMostrar = variantesAMostrar.filter(v => v.nombre.includes('30'));
      // Si no hay 30ml, mostramos todas (fallback)
      if (variantesAMostrar.length === 0) variantesAMostrar = product.variantes;
    }

    const primeraVariante = variantesAMostrar[0];
    const precioBase = primeraVariante?.precio || product.precio;
    
    // Calcular precio con descuento si aplica
    const precioFinal = tieneDescuento && primeraVariante
      ? (primeraVariante.precioDescuento || Math.round(precioBase * (1 - product.descuentoPromo / 100)))
      : precioBase;

    let priceHtml = '';
    if (tieneDescuento) {
      priceHtml = `
        <span class="precio-original">₡${precioBase.toLocaleString()}</span>
        <span class="precio-oferta">₡${precioFinal.toLocaleString()}</span>
        <small style="display:block;color:#27ae60;font-size:0.8rem;margin-top:2px;">
          Con ${product.descuentoPromo}% OFF
        </small>
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

    // Renderizar botones de variantes
    const variantsHtml = variantesAMostrar.map((v, i) => {
      const isActive = i === 0 ? 'active' : '';
      const precioVariante = tieneDescuento 
        ? (v.precioDescuento || Math.round(v.precio * (1 - product.descuentoPromo / 100)))
        : v.precio;
      
      // Guardamos el índice real en el array original para referencia
      const originalIndex = product.variantes.indexOf(v);

      return `
        <button class="btn-variante ${isActive}" 
                data-variant="${originalIndex}" 
                data-price="${precioVariante}"
                data-variant-name="${v.nombre}">
          ${v.nombre} <br> 
          <small>₡${precioVariante.toLocaleString()}</small>
        </button>
      `;
    }).join('');

    return `
      <div class="producto-card ${tieneDescuento || product.precioOriginal ? 'oferta' : ''}" data-id="${product.id}">
        <div class="producto-imagen-container">
          <div class="badges-container">${badges.join('')}</div>
          <img src="${product.imagen}" alt="${product.nombre}" loading="lazy">
        </div>
        <div class="producto-info">
          <h3 class="producto-nombre">${product.nombre}</h3>
          ${product.calificacion ? `<div class="producto-calificacion">${'★'.repeat(Math.floor(product.calificacion))}</div>` : ''}
          <div class="producto-precio-container">${priceHtml}</div>
          ${stockHtml}
          <div class="variantes-container">${variantsHtml}</div>
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
        </div>`;
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
      // 1. Selección de variantes
      const variantBtn = e.target.closest('.btn-variante');
      if (variantBtn) {
        const parent = variantBtn.closest('.variantes-container');
        parent.querySelectorAll('.btn-variante').forEach(b => b.classList.remove('active'));
        variantBtn.classList.add('active');
        
        // Actualizar precio visible en la tarjeta
        const card = variantBtn.closest('.producto-card');
        const precioContainer = card.querySelector('.producto-precio-container');
        const nuevoPrecio = parseInt(variantBtn.dataset.price);
        
        // Actualización visual inmediata
        if (precioContainer) {
             const precioEl = precioContainer.querySelector('.precio-oferta') || precioContainer.querySelector('.precio-normal');
             if(precioEl) precioEl.textContent = `₡${nuevoPrecio.toLocaleString()}`;
        }
        return;
      }

      // 2. Botones de acción
      const btn = e.target.closest('button[data-action]');
      const card = e.target.closest('.producto-card');
      if (!btn || !card) return;

      const action = btn.dataset.action;
      const productId = card.dataset.id;

      if (action === 'add') {
        const product = ProductManager.getProduct(productId);
        if (!product) return;

        const activeVariant = card.querySelector('.btn-variante.active');
        
        // Recuperar datos de la variante
        const variantIndex = activeVariant ? parseInt(activeVariant.dataset.variant) : 0;
        const variantData = product.variantes[variantIndex]; // Usamos el índice real
        
        // Calculamos el precio final basado en la variante seleccionada
        let precioFinal = variantData ? variantData.precio : product.precio;
        if (product.descuentoPromo > 0) {
            precioFinal = Math.round(precioFinal * (1 - product.descuentoPromo / 100));
        }

        Store.emit('cart:add', {
          product,
          variant: {
            nombre: variantData ? variantData.nombre : '30ml',
            precio: precioFinal,
            precioOriginal: variantData ? variantData.precio : product.precio
          }
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