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

  // ✅ FILTRAR VARIANTES: Si tiene descuento, SOLO mostrar 30ml
  const tieneDescuento = product.descuentoPromo > 0;
  const variantesAMostrar = tieneDescuento 
    ? product.variantes.filter(v => v.nombre.includes('30ml') || v.nombre.includes('30 ml'))
    : product.variantes;

  // Si no hay 30ml, usar la primera variante disponible
  const variantePrincipal = variantesAMostrar[0] || product.variantes[0];
  
  // Calcular precios
  const precioBase = variantePrincipal?.precio || product.precio;
  const precioConDescuento = tieneDescuento && variantePrincipal?.precioDescuento
    ? variantePrincipal.precioDescuento
    : (tieneDescuento ? Math.round(precioBase * (1 - product.descuentoPromo / 100)) : precioBase);

  // HTML de precios
  let priceHtml = '';
  if (tieneDescuento) {
    priceHtml = `
      <span class="precio-original">₡${precioBase.toLocaleString()}</span>
      <span class="precio-oferta">₡${precioConDescuento.toLocaleString()}</span>
      <small style="display:block;color:#27ae60;font-size:0.8rem;margin-top:2px;">
        Con ${product.descuentoPromo}% OFF - Solo 30ml
      </small>
    `;
  } else if (product.precioOriginal) {
    priceHtml = `
      <span class="precio-original">₡${product.precioOriginal.toLocaleString()}</span>
      <span class="precio-oferta">₡${product.precio.toLocaleString()}</span>
    `;
  } else {
    priceHtml = `<span class="precio-normal">₡${precioBase.toLocaleString()}</span>`;
  }

  const stockHtml = isLowStock 
    ? `<div class="stock-label stock-bajo">⚠️ Últimas ${stock} unidades</div>` 
    : '';

  // ✅ Renderizar botones de variantes (solo 30ml si hay descuento)
  const variantsHtml = variantesAMostrar.map((v, i) => {
    const isActive = i === 0 ? 'active' : '';
    const precioMostrar = tieneDescuento && v.precioDescuento ? v.precioDescuento : v.precio;
    const precioOriginal = tieneDescuento ? v.precio : null;
    
    // ✅ IMPORTANTE: Guardar índice REAL en el array original
    const indiceReal = product.variantes.indexOf(v);
    
    return `
      <button class="btn-variante ${isActive}" 
              data-variant="${i}" 
              data-variant-name="${v.nombre}"
              data-price="${precioMostrar}"
              data-price-original="${precioOriginal || v.precio}"
              data-variant-index="${indiceReal}">
        ${v.nombre} <br> 
        <small>₡${precioMostrar.toLocaleString()}</small>
        ${precioOriginal ? `<small style="color:#e74c3c;text-decoration:line-through;font-size:0.65rem;">₡${precioOriginal.toLocaleString()}</small>` : ''}
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
        <div class="producto-precio-container" data-precio-base="${precioBase}" data-precio-actual="${precioConDescuento}">
          ${priceHtml}
        </div>
        ${stockHtml}
        <div class="variantes-container" data-product-id="${product.id}">
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
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><h3>No hay productos disponibles</h3><p>Intenta con otros filtros de búsqueda</p></div>`;
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
    // Selección de variantes - Actualizar precio visible
    const variantBtn = e.target.closest('.btn-variante');
    if (variantBtn) {
      const parent = variantBtn.closest('.variantes-container');
      const productId = parent.dataset.productId;
      
      // Remover active de todos
      parent.querySelectorAll('.btn-variante').forEach(b => b.classList.remove('active'));
      variantBtn.classList.add('active');
      
      // Actualizar precio mostrado en la tarjeta
      const precioContainer = parent.parentElement.querySelector('.producto-precio-container');
      const nuevoPrecio = parseInt(variantBtn.dataset.price);
      const precioOriginal = variantBtn.dataset.priceOriginal;
      const esOferta = variantBtn.closest('.producto-card').classList.contains('oferta');
      
      if (esOferta && precioOriginal) {
        precioContainer.innerHTML = `
          <span class="precio-original">₡${parseInt(precioOriginal).toLocaleString()}</span>
          <span class="precio-oferta">₡${nuevoPrecio.toLocaleString()}</span>
        `;
      } else {
        precioContainer.innerHTML = `<span class="precio-normal">₡${nuevoPrecio.toLocaleString()}</span>`;
      }
      
      return;
    }
    
    // Botones de acción
    const btn = e.target.closest('button[data-action]');
    const card = e.target.closest('.producto-card');
    if (!btn || !card) return;

    const action = btn.dataset.action;
    const productId = card.dataset.id;

    if (action === 'add') {
      const product = ProductManager.getProduct(productId);
      if (!product) return;
      
      const activeVariant = card.querySelector('.btn-variante.active');
      
      // ✅ Obtener índice REAL de la variante en el array original
      const variantIndex = activeVariant ? parseInt(activeVariant.dataset.variantIndex) : 0;
      const variantName = activeVariant ? activeVariant.dataset.variantName : '30ml';
      const variantPrice = activeVariant ? parseInt(activeVariant.dataset.price) : product.precio;
      const variantOriginal = activeVariant ? parseInt(activeVariant.dataset.priceOriginal) : product.precio;
      
      // ✅ Usar la variante del array original (no la filtrada)
      const variantData = product.variantes[variantIndex] || { 
        nombre: variantName, 
        precio: variantPrice 
      };
      
      // ✅ Enviar datos completos al carrito
      Store.emit('cart:add', { 
        product, 
        variant: {
          nombre: variantData.nombre,
          precio: variantPrice,           // ✅ Precio YA con descuento aplicado
          precioOriginal: variantOriginal, // ✅ Precio sin descuento
          descuentoPromo: product.descuentoPromo || 0
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