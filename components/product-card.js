// components/product-card.js
import { Store, Utils } from '../modules/core.js';
import ProductManager from '../modules/products.js';

export const ProductCard = {
  render(product, options = {}) {
    const stock = ProductManager.getStock(product.nombre);
    const isLowStock = stock > 0 && stock <= 5;
    const badges = [];

    if (product.esNuevo) badges.push('<span class="badge badge-nuevo">NUEVO</span>');
    if (product.descuentoPromo > 0) {
      badges.push(`<span class="badge badge-oferta">-${product.descuentoPromo}%</span>`);
    } else if (product.precioOriginal) {
      badges.push('<span class="badge badge-oferta">Oferta</span>');
    }
    badges.push(`<span class="badge badge-tipo">${product.tipo}</span>`);

    // Lógica de variantes
    let variantesVisibles = product.variantes || [];
    // Si hay descuento, priorizamos 30ml (o la primera disponible)
    if (product.descuentoPromo > 0) {
      const filtradas = variantesVisibles.filter(v => v.nombre.includes('30'));
      if (filtradas.length > 0) variantesVisibles = filtradas;
    }

    const activeIdx = 0;
    const activeVariant = variantesVisibles[activeIdx];
    let precioBase = activeVariant?.precio || product.precio;
    let precioFinal = product.descuentoPromo > 0 
      ? (activeVariant?.precioDescuento || Math.round(precioBase * (1 - product.descuentoPromo / 100)))
      : precioBase;

    let priceHtml = '';
    if (product.descuentoPromo > 0) {
      priceHtml = `<span class="precio-original">₡${precioBase.toLocaleString()}</span><span class="precio-oferta">₡${precioFinal.toLocaleString()}</span>`;
    } else if (product.precioOriginal) {
      priceHtml = `<span class="precio-original">₡${product.precioOriginal.toLocaleString()}</span><span class="precio-oferta">₡${product.precio.toLocaleString()}</span>`;
    } else {
      priceHtml = `<span class="precio-normal">₡${precioFinal.toLocaleString()}</span>`;
    }

    const stockHtml = isLowStock ? `<div class="stock-label stock-bajo">⚠️ Últimas ${stock}</div>` : '';

    const variantsHtml = variantesVisibles.map(v => {
      const precioBtn = product.descuentoPromo > 0 
        ? (v.precioDescuento || Math.round(v.precio * (1 - product.descuentoPromo / 100)))
        : v.precio;
      return `
        <button class="btn-variante" 
                data-variant="${product.variantes.indexOf(v)}" 
                data-price="${precioBtn}" 
                data-original="${v.precio}">
          ${v.nombre}<br><small>₡${precioBtn.toLocaleString()}</small>
        </button>
      `;
    }).join('');

    return `
      <div class="producto-card ${product.descuentoPromo > 0 ? 'oferta' : ''}" data-id="${product.id}">
        <div class="producto-imagen-container">
          <div class="badges-container">${badges.join('')}</div>
          <img src="${product.imagen}" alt="${product.nombre}" loading="lazy">
        </div>
        <div class="producto-info">
          <h3 class="producto-nombre">${product.nombre}</h3>
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

  renderGrid(productos, container) {
    if (productos.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>Sin productos</h3></div>';
      return;
    }
    // Render simple (sin agrupar por tipo para evitar errores de HTML en móvil)
    let html = '<div class="productos-grid">';
    productos.forEach(p => html += this.render(p));
    html += '</div>';
    container.innerHTML = html;
    this.attachEvents(container);
  },

  attachEvents(container) {
    container.addEventListener('click', (e) => {
      const variantBtn = e.target.closest('.btn-variante');
      if (variantBtn) {
        const parent = variantBtn.closest('.variantes-container');
        parent.querySelectorAll('.btn-variante').forEach(b => b.classList.remove('active'));
        variantBtn.classList.add('active');
        // Actualizar precio visual
        const card = variantBtn.closest('.producto-card');
        const precioDisplay = card.querySelector('.precio-oferta') || card.querySelector('.precio-normal');
        if(precioDisplay) precioDisplay.textContent = `₡${parseInt(variantBtn.dataset.price).toLocaleString()}`;
        return;
      }

      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const card = btn.closest('.producto-card');
      const productId = card.dataset.id;
      const action = btn.dataset.action;

      if (action === 'add') {
        const product = ProductManager.getProduct(productId);
        const activeVariant = card.querySelector('.btn-variante.active');
        const variantIndex = activeVariant ? parseInt(activeVariant.dataset.variant) : 0;
        const variantData = product.variantes[variantIndex];
        const precio = parseInt(activeVariant?.dataset.price) || product.precio;

        Store.emit('cart:add', {
          product,
          variant: { nombre: variantData?.nombre || '30ml', precio, original: variantData?.precio }
        });
      } else if (action === 'detail') {
        Store.emit('product:detail', productId);
      } else if (action === 'external') {
        window.open(`https://wil1979.github.io/esentia-factura/producto.html?id=${productId}`, '_blank');
      }
    });
  }
};