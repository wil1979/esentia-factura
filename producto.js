/**
 * producto.js
 * Lógica principal para la página de producto de Esentia
 */

'use strict';

// === CONFIGURACIÓN ===
const CATALOGO_URL = "https://wil1979.github.io/esentia-factura/productos_esentia.json";

// === FUNCIONES AUXILIARES ===

// Aplanar productos del JSON categorizado
function aplanarProductos(data) {
    if (Array.isArray(data)) return data;
    let flatList = [];
    for (const categoria in data) {
        if (Array.isArray(data[categoria])) {
            flatList = flatList.concat(data[categoria]);
        }
    }
    return flatList;
}

// Obtener URL de imagen segura con fallback
function obtenerImagenSegura(producto) {
    if (producto?.imagen && producto.imagen.trim() !== '') {
        const url = producto.imagen.trim();
        if (url.startsWith('./') || url.startsWith('../')) {
            return new URL(url, window.location.href).href;
        }
        try {
            new URL(url);
            return url;
        } catch {}
    }
    return 'https://via.placeholder.com/220x220/1a1a1a/d4af37?text=Esentia';
}

// Verificar stock de variante
function verificarStock(nombreVariante) {
    if (!window.inventario) return true;
    const stock = window.inventario[nombreVariante];
    return stock === undefined || stock > 0;
}

// Mostrar toast notification
function showToast(mensaje, tipo = 'success') {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.className = `toast ${tipo} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// === RENDERIZADO DEL PRODUCTO ===

function renderProducto(p) {
    const precioBase = p.precioOferta ?? p.precioOriginal ?? 0;
    let varianteSeleccionada = null;
    let precioActual = precioBase;

    // Calificar estrellas
    let estrellas = "";
    if (p.calificacion) {
        const llenas = Math.floor(p.calificacion);
        const media = p.calificacion % 1 >= 0.5;
        estrellas = "⭐".repeat(llenas) + (media ? "✨" : "");
    }

    // === VARIANTES SELECCIONABLES ===
    let variantesHtml = "";
    if (p.variantes && p.variantes.length > 0) {
        const primeraDisponible = p.variantes.find(v => verificarStock(v.nombre));
        varianteSeleccionada = primeraDisponible || p.variantes[0];
        precioActual = varianteSeleccionada.precio || precioBase;

        variantesHtml = `
            <div class="variantes-container">
                <div class="variantes-title">✨ Elige tu presentación</div>
                <div class="variantes-grid">
                    ${p.variantes.map((v, index) => {
                        const tieneStock = verificarStock(v.nombre);
                        const isSelected = v.id === varianteSeleccionada?.id || 
                                         (index === 0 && !varianteSeleccionada);
                        const variantId = v.id ?? index;
                        const variantName = encodeURIComponent(v.nombre || 'Presentación');
                        const variantPrice = v.precio ?? precioBase;
                        
                        return `
                            <label class="variante-card ${isSelected ? 'selected' : ''} ${!tieneStock ? 'sin-stock' : ''}" 
                                   data-variante-id="${variantId}" 
                                   data-variante-nombre="${variantName}" 
                                   data-variante-precio="${variantPrice}"
                                   onclick="${tieneStock ? `seleccionarVariante(this, '${p.id || 'sin-id'}')` : 'return false'}">
                                <input type="radio" name="variante-${p.id || 'sin-id'}" 
                                       class="variante-input" 
                                       value="${variantId}" 
                                       ${isSelected ? 'checked' : ''} 
                                       ${!tieneStock ? 'disabled' : ''}>
                                <div class="variante-nombre">${v.nombre || 'Presentación'}</div>
                                <div class="variante-precio">₡${(v.precio ?? precioBase).toLocaleString()}</div>
                                ${!tieneStock ? '<div class="variante-stock">Agotado</div>' : ''}
                            </label>
                        `;
                    }).join("")}
                </div>
            </div>
            
            <div class="precio-dinamico">
                <span class="precio-actual" id="precio-actual">₡${precioActual.toLocaleString()}</span>
                <span class="precio-variante" id="variante-actual">• ${varianteSeleccionada?.nombre || 'Presentación'}</span>
            </div>
        `;
    }

    // Precio base (solo si no hay variantes)
    const precioBaseHtml = !p.variantes?.length ? `
        ${p.precioOferta
            ? `<div class="precio-oferta">₡${p.precioOferta.toLocaleString()}</div>
               <div class="precio-original">₡${p.precioOriginal.toLocaleString()}</div>`
            : `<div class="precio-oferta">₡${(p.precioOriginal || 0).toLocaleString()}</div>`
        }
    ` : '';

    document.getElementById("contenedorProducto").innerHTML = `
        <img src="${obtenerImagenSegura(p)}" class="imagen-producto" onclick="abrirLightbox('${p.imagen || ''}')">

        <h1>${p.nombre}</h1>
        <div class="estrellas">${estrellas}</div>
        ${precioBaseHtml}
        <p class="descripcion">${p.info || ''}</p>

        <div class="seccion">
            <div class="titulo-seccion">💎 Beneficios</div>
            <div>${p.beneficios || 'No especificado'}</div>
        </div>

        <div class="seccion">
            <div class="titulo-seccion">🎯 Uso recomendado</div>
            <div>${p.usoRecomendado || 'No especificado'}</div>
        </div>

        ${variantesHtml}

        <button class="btn-wsp" id="btn-agregar" onclick="agregarAlCarritoConVariante('${p.id || 'sin-id'}')">
            🛒 Agregar al carrito
        </button>

        <div class="qr-contenedor">
            <p>Compartir este producto:</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=d4af37&qzone=3&data=${encodeURIComponent(window.location.href)}" alt="QR del producto">
            
            <div class="banner-facebook-elegante">
                <h3>Síguenos en Facebook</h3>
                <p>Forma parte de la experiencia Esentia y descubre aromas que transforman tu espacio ✨</p>
                <a href="https://www.facebook.com/profile.php?id=61579078480913"
                   target="_blank"
                   class="btn-facebook-elegante">
                   Seguir Esentia
                </a>
            </div>
        </div>
        
        <div id="bannerUrgenciaContainer"></div>
    `;
    
    // Renderizar banner de urgencia si está disponible
    if (typeof window.renderizarBannerUrgencia === 'function') {
        window.renderizarBannerUrgencia();
    }
}

// === SELECCIÓN DE VARIANTE ===

function seleccionarVariante(elemento, productId) {
    // Remover selección previa del mismo producto
    document.querySelectorAll(`.variante-card[data-variante-id]`).forEach(card => {
        if (card.getAttribute('onclick')?.includes(productId)) {
            card.classList.remove('selected');
        }
    });
    
    // Marcar nueva selección
    elemento.classList.add('selected');
    const radio = elemento.querySelector('.variante-input');
    if (radio) radio.checked = true;
    
    // Actualizar precio mostrado
    const precio = parseFloat(elemento.dataset.variantePrecio);
    const nombre = decodeURIComponent(elemento.dataset.varianteNombre);
    
    const precioEl = document.getElementById('precio-actual');
    const varianteEl = document.getElementById('variante-actual');
    
    if (precioEl) precioEl.textContent = `₡${precio.toLocaleString()}`;
    if (varianteEl) varianteEl.textContent = `• ${nombre}`;
    
    // Efecto visual de feedback
    elemento.style.transform = 'scale(1.03)';
    setTimeout(() => { elemento.style.transform = ''; }, 150);
}

// === AGREGAR AL CARRITO ===

function agregarAlCarritoConVariante(productId) {
    const btn = document.getElementById('btn-agregar');
    if (!btn) return;
    
    // Feedback visual inmediato
    btn.disabled = true;
    btn.innerHTML = '⏳ Agregando...';
    
    fetch(CATALOGO_URL)
        .then(r => {
            if (!r.ok) throw new Error('Error al cargar catálogo');
            return r.json();
        })
        .then(data => {
            const lista = aplanarProductos(data);
            const producto = lista.find(p => String(p.id) === String(productId));
            
            if (!producto) {
                showToast("⚠️ Producto no encontrado", "error");
                btn.disabled = false;
                btn.innerHTML = '🛒 Agregar al carrito';
                return;
            }

            // Obtener variante seleccionada
            let varianteNombre = producto.nombre;
            let variantePrecio = producto.precioOferta ?? producto.precioOriginal;
            let varianteId = producto.id;
            
            if (producto.variantes?.length > 0) {
                const cardSeleccionada = document.querySelector(`.variante-card.selected[data-variante-id]`);
                if (cardSeleccionada) {
                    varianteNombre = decodeURIComponent(cardSeleccionada.dataset.varianteNombre);
                    variantePrecio = parseFloat(cardSeleccionada.dataset.variantePrecio);
                    varianteId = `${producto.id}_${cardSeleccionada.dataset.varianteId}`;
                }
            }

            // Agregar al carrito
            let carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
            const idCarrito = String(varianteId);
            
            let existente = carrito.find(i => String(i.id) === idCarrito);
            
            if (existente) {
                existente.cantidad += 1;
            } else {
                carrito.push({
                    id: idCarrito,
                    idProducto: producto.id,
                    nombre: producto.nombre,
                    variante: varianteNombre !== producto.nombre ? varianteNombre : null,
                    precio: variantePrecio,
                    cantidad: 1,
                    imagen: producto.imagen,
                    fecha: new Date().toISOString()
                });
            }

            localStorage.setItem("carrito", JSON.stringify(carrito));
            
            // Feedback exitoso
            showToast("✅ ¡Agregado al carrito!", "success");
            
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '🛒 Agregar al carrito';
                // Redirigir opcional
                // window.location.href = "catalogo.html?added=1";
            }, 1500);
        })
        .catch(err => {
            console.error("Error al agregar:", err);
            showToast("❌ Error al agregar al carrito", "error");
            btn.disabled = false;
            btn.innerHTML = '🛒 Agregar al carrito';
        });
}

// Compatibilidad con función antigua
function agregarAlCarrito(nombreProductoCodificado) {
    const nombre = decodeURIComponent(nombreProductoCodificado);
    fetch(CATALOGO_URL)
        .then(r => r.json())
        .then(data => {
            const lista = aplanarProductos(data);
            const prod = lista.find(p => p.nombre === nombre);
            if (prod?.id) {
                agregarAlCarritoConVariante(prod.id);
            } else {
                showToast("Producto no encontrado", "error");
            }
        });
}

// === LIGHTBOX ===

function abrirLightbox(src) {
    if (!src) return;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (lightbox && img) {
        img.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function cerrarLightbox(event) {
    if (event && event.target !== event.currentTarget) return;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (lightbox && img) {
        lightbox.classList.remove('active');
        img.src = '';
        document.body.style.overflow = '';
    }
}

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarLightbox({ target: document.getElementById('lightbox'), currentTarget: document.getElementById('lightbox') });
});

// === INICIALIZACIÓN ===

(function init() {
    const params = new URLSearchParams(window.location.search);
    const productId = (params.get("id") || "").trim();

    if (!productId) {
        document.getElementById("contenedorProducto").innerHTML = 
            "<h2>⚠️ Producto no especificado</h2><p>Por favor selecciona un producto del catálogo.</p>";
        return;
    }

    fetch(CATALOGO_URL)
        .then(r => {
            if (!r.ok) throw new Error('Error de red');
            return r.json();
        })
        .then(data => {
            const lista = aplanarProductos(data);
            const producto = lista.find(p => String(p.id) === String(productId));

            if (producto) {
                renderProducto(producto);
            } else {
                document.getElementById("contenedorProducto").innerHTML =
                    "<h2>❌ Producto no encontrado</h2><p>Lo sentimos, no pudimos encontrar el aroma solicitado.</p><br><a href='catalogo.html' class='btn-facebook-elegante'>← Volver al catálogo</a>";
            }
        })
        .catch(err => {
            console.error("Error cargando producto:", err);
            document.getElementById("contenedorProducto").innerHTML =
                "<h2>⚠️ Error de conexión</h2><p>No fue posible cargar la información. Verifica tu internet.</p><br><button onclick='location.reload()' class='btn-facebook-elegante'>🔄 Reintentar</button>";
        });
})();