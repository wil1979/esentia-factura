/**
 * firebase-init.js
 * Inicializa Firebase y calcula productos más vendidos
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
    authDomain: "esentiacreditos-8345f.firebaseapp.com",
    projectId: "esentiacreditos-8345f",
    storageBucket: "esentiacreditos-8345f.firebasestorage.app",
    messagingSenderId: "888658236080",
    appId: "1:888658236080:web:506e5e2085b5a452dba175"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const stockCollection = collection(db, "stock");
const facturasCollection = collection(db, "detalle");

// Variables globales
window.inventario = {};
window.productosMasVendidos = [];

// Cargar inventario desde Firestore
getDocs(stockCollection).then(snapshot => {
    snapshot.forEach(doc => {
        const data = doc.data();
        window.inventario[data.nombre] = data.cantidad;
    });
}).catch(err => console.error("Error cargando inventario:", err));

// Función auxiliar para normalizar texto
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

// Calcular productos más vendidos
async function calcularProductosMasVendidos() {
    try {
        const res = await fetch("https://wil1979.github.io/esentia-factura/productos_esentia.json");
        const dataCatalogo = await res.json();
        
        // Aplanar productos si es necesario
        const catalogoCompleto = typeof aplanarProductos === 'function' 
            ? aplanarProductos(dataCatalogo) 
            : (Array.isArray(dataCatalogo) ? dataCatalogo : []);
        
        // Mapas de búsqueda
        const mapaPorID = {};
        const mapaPorNombre = {};
        const mapaPorNombreNormalizado = {};
        
        catalogoCompleto.forEach(p => {
            const id = String(p.idProducto || p.id);
            const nombre = (p.nombre || '').trim();
            const nombreNormalizado = normalizarTexto(nombre);
            
            if (id) mapaPorID[id] = p;
            if (nombre) mapaPorNombre[nombre] = p;
            if (nombreNormalizado) mapaPorNombreNormalizado[nombreNormalizado] = p;
        });
        
        const snapshot = await getDocs(facturasCollection);
        const ventasPorProducto = {};
        
        snapshot.forEach(doc => {
            const factura = doc.data();
            
            if (!factura.productos || !Array.isArray(factura.productos) || factura.productos.length === 0) {
                return;
            }
            
            factura.productos.forEach((prodFactura, index) => {
                const cantidad = Number(prodFactura.cantidad) || 1;
                const precio = Number(prodFactura.precio) || 0;
                const nombre = (prodFactura.nombre || '').trim();
                
                let productoCatalogo = null;
                
                if (!productoCatalogo && prodFactura.idProducto) {
                    productoCatalogo = mapaPorID[String(prodFactura.idProducto)];
                }
                if (!productoCatalogo && prodFactura.id) {
                    productoCatalogo = mapaPorID[String(prodFactura.id)];
                }
                if (!productoCatalogo && nombre) {
                    productoCatalogo = mapaPorNombre[nombre];
                }
                if (!productoCatalogo && nombre) {
                    const nombreNorm = normalizarTexto(nombre);
                    productoCatalogo = mapaPorNombreNormalizado[nombreNorm];
                }
                
                if (!productoCatalogo) {
                    productoCatalogo = {
                        id: `desconocido_${Date.now()}_${index}`,
                        nombre: nombre || 'Producto Sin Nombre',
                        imagen: 'https://via.placeholder.com/140x140/1a1a1a/d4af37?text=Sin+Imagen',
                        precioOriginal: precio,
                        variante: prodFactura.variante || 'Única'
                    };
                }
                
                const idKey = String(productoCatalogo.id);
                
                if (!ventasPorProducto[idKey]) {
                    ventasPorProducto[idKey] = {
                        id: idKey,
                        nombre: productoCatalogo.nombre,
                        imagen: productoCatalogo.imagen || 'https://via.placeholder.com/140x140/1a1a1a/d4af37?text=Esentia',
                        precio: precio || productoCatalogo.precioOferta || productoCatalogo.precioOriginal || 0,
                        variante: prodFactura.variante || productoCatalogo.variantes?.[0]?.nombre || 'Única',
                        totalVendido: 0,
                        apariciones: 0
                    };
                }
                
                ventasPorProducto[idKey].totalVendido += cantidad;
                ventasPorProducto[idKey].apariciones += 1;
                
                if (precio > 0 && precio !== ventasPorProducto[idKey].precio) {
                    ventasPorProducto[idKey].precio = precio;
                }
            });
        });
        
        const productosOrdenados = Object.values(ventasPorProducto)
            .sort((a, b) => b.totalVendido - a.totalVendido)
            .slice(0, 3);
        
        window.productosMasVendidos = productosOrdenados;
        return productosOrdenados;
        
    } catch (error) {
        console.error("❌ Error en calcularProductosMasVendidos:", error);
        return [];
    }
}

// Renderizar banner de urgencia
async function renderizarBannerUrgencia() {
    const bannerContainer = document.getElementById('bannerUrgenciaContainer');
    if (!bannerContainer) return;
    
    // Skeleton de carga
    bannerContainer.innerHTML = `
        <div class="banner-urgencia">
            <div class="urgencia-header">
                <div class="live-indicator">
                    <span class="pulse-dot"></span>
                    Cargando productos destacados...
                </div>
            </div>
            <div class="producto-destacado">
                <div class="skeleton skeleton-image"></div>
                <div class="info-destacada" style="flex:1">
                    <div class="skeleton skeleton-text" style="width:60%"></div>
                    <div class="skeleton skeleton-text" style="width:80%"></div>
                    <div class="skeleton skeleton-text" style="width:40%"></div>
                </div>
            </div>
        </div>
    `;
    
    const masVendidos = await calcularProductosMasVendidos();
    
    if (!masVendidos || masVendidos.length === 0) {
        bannerContainer.innerHTML = '';
        return;
    }
    
    const [top1, top2, top3] = masVendidos;
    
    const getImagenSegura = (url) => {
        if (!url || url.trim() === '') return 'https://via.placeholder.com/140x140/1a1a1a/d4af37?text=Esentia';
        if (url.startsWith('./') || url.startsWith('../')) {
            return new URL(url, window.location.href).href;
        }
        return url;
    };
    
    const descuento = Math.floor(Math.random() * 10) + 15;
    const precioOriginal = top1.precio || 0;
    const precioOferta = Math.round(precioOriginal * (1 - descuento/100));
    
    let miniItemsHtml = '';
    [top2, top3].filter(Boolean).forEach((prod, index) => {
        const num = index + 2;
        miniItemsHtml += `
            <div class="mini-item" onclick="verProducto('${prod.id}')">
                <span class="num">${num}</span>
                <img src="${getImagenSegura(prod.imagen)}" 
                     alt="${prod.nombre}"
                     onerror="this.src='https://via.placeholder.com/50x50/1a1a1a/d4af37?text=IMG'">
                <div>
                    <span class="mini-nombre">${prod.nombre}</span>
                    <span class="mini-precio">₡${(prod.precio || 0).toLocaleString()}</span>
                </div>
                <span class="mini-flecha">→</span>
            </div>
        `;
    });
    
    bannerContainer.innerHTML = `
        <div class="banner-urgencia">
            <div class="urgencia-header">
                <div class="live-indicator">
                    <span class="pulse-dot"></span>
                    EN VIVO: ${Math.floor(Math.random() * 15) + 8} personas viendo esto
                </div>
                <h3>🔥 Los Más Vendidos Hoy</h3>
            </div>
            
            <div class="producto-destacado" onclick="verProducto('${top1.id}')">
                <div class="imagen-wrapper">
                    <img src="${getImagenSegura(top1.imagen)}" 
                         alt="${top1.nombre}"
                         onerror="this.src='https://via.placeholder.com/140x140/1a1a1a/d4af37?text=Esentia'">
                    <div class="sold-tag">VENDIDO ${top1.totalVendido} VECES</div>
                </div>
                
                <div class="info-destacada">
                    <div class="tags">
                        <span class="tag-bestseller">#1 MÁS VENDIDO</span>
                        <span class="tag-limited">🔥 Solo quedan ${Math.floor(Math.random() * 5) + 2}</span>
                    </div>
                    
                    <h4>${top1.nombre}</h4>
                    <p>${top1.variante || 'Presentación estándar'}</p>
                    
                    <div class="contador-urgencia">
                        <span>⏰ Oferta termina en:</span>
                        <div class="tiempo" id="contador">
                            <span id="horas">04</span>:
                            <span id="minutos">32</span>:
                            <span id="segundos">15</span>
                        </div>
                    </div>
                    
                    <button class="btn-comprar-ahora" onclick="event.stopPropagation(); verProducto('${top1.id}')">Comprar Ahora →</button>
                </div>
            </div>
            
            ${miniItemsHtml ? `<div class="mini-lista">${miniItemsHtml}</div>` : ''}
        </div>
    `;
    
    iniciarContador();
    
    // Actualizar viewers
    setInterval(() => {
        const viewers = Math.floor(Math.random() * 20) + 5;
        const indicator = document.querySelector('.live-indicator');
        if (indicator) {
            indicator.innerHTML = `<span class="pulse-dot"></span> EN VIVO: ${viewers} personas viendo esto`;
        }
    }, 8000);
}

// Contador regresivo
function iniciarContador() {
    let horas = 4, minutos = 32, segundos = 15;
    
    const interval = setInterval(() => {
        segundos--;
        if (segundos < 0) {
            segundos = 59;
            minutos--;
            if (minutos < 0) {
                minutos = 59;
                horas--;
                if (horas < 0) horas = 23;
            }
        }
        
        const h = document.getElementById('horas');
        const m = document.getElementById('minutos');
        const s = document.getElementById('segundos');
        
        if (h) h.textContent = String(horas).padStart(2, '0');
        if (m) m.textContent = String(minutos).padStart(2, '0');
        if (s) s.textContent = String(segundos).padStart(2, '0');
    }, 1000);
    
    return interval;
}

// Exponer funciones globalmente
window.renderizarBannerUrgencia = renderizarBannerUrgencia;
window.verProducto = function(id) {
    window.location.href = `producto.html?id=${id}`;
};

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.renderizarBannerUrgencia) {
            window.renderizarBannerUrgencia();
        }
    });
} else {
    if (window.renderizarBannerUrgencia) {
        window.renderizarBannerUrgencia();
    }
}