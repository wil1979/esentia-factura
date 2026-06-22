/**
 * carrito-utils.js
 * ============================================
 * Utilidades compartidas para sincronización de carrito
 * entre producto.html y catalogo.html
 * 
 * Uso: Cargar este archivo PRIMERO en ambas páginas
 * <script src="carrito-utils.js"></script>
 * ============================================
 */

'use strict';

/**
 * Estructura estándar de item del carrito
 * Todos los items deben seguir esta estructura
 */
const ESTRUCTURA_ITEM_CARRITO = {
    id: '',                    // ID único (producto_id o producto_id_variante)
    idProducto: '',            // ID del producto
    nombre: '',                // Nombre del producto
    variante: null,            // Nombre de la variante (si aplica)
    precio: 0,                 // Precio unitario
    cantidad: 1,               // Cantidad
    imagen: '',                // URL de imagen
    fecha: '',                 // ISO timestamp
    origen: 'catalogo'         // 'catalogo' o 'producto'
};

/**
 * OBTENER CARRITO
 * Obtiene el carrito del localStorage con validación
 * 
 * @returns {Array} Array de items del carrito
 */
function obtenerCarrito() {
    try {
        const carritoJSON = localStorage.getItem("carrito");
        if (!carritoJSON) return [];
        
        const carrito = JSON.parse(carritoJSON);
        return Array.isArray(carrito) ? carrito : [];
    } catch (error) {
        console.error("❌ Error al obtener carrito:", error);
        return [];
    }
}

/**
 * GUARDAR CARRITO
 * Guarda el carrito en localStorage y dispara evento
 * 
 * @param {Array} carrito - Array de items
 */
function guardarCarrito(carrito) {
    try {
        localStorage.setItem("carrito", JSON.stringify(carrito));
        
        // Disparar evento personalizado para sincronización
        window.dispatchEvent(new CustomEvent('carritoActualizado', { 
            detail: { carrito, timestamp: Date.now() } 
        }));
        
        console.log("✅ Carrito guardado:", carrito.length, "items");
    } catch (error) {
        console.error("❌ Error al guardar carrito:", error);
    }
}

/**
 * AGREGAR AL CARRITO
 * Agrega o actualiza un item en el carrito
 * 
 * @param {Object} item - Item a agregar (debe tener id, nombre, precio)
 * @returns {Boolean} true si se agregó exitosamente
 */
function agregarAlCarrito(item) {
    // Validar estructura mínima
    if (!item.id || !item.nombre || item.precio === undefined) {
        console.error("❌ Item inválido:", item);
        return false;
    }

    const carrito = obtenerCarrito();
    const existente = carrito.find(i => i.id === item.id);

    if (existente) {
        // Actualizar cantidad (incrementar)
        const cantidadAnterior = existente.cantidad;
        existente.cantidad += item.cantidad || 1;
        console.log(`📦 Producto actualizado: ${item.nombre} (${cantidadAnterior} → ${existente.cantidad})`);
    } else {
        // Agregar nuevo item
        const nuevoItem = {
            ...ESTRUCTURA_ITEM_CARRITO,
            ...item,
            fecha: new Date().toISOString()
        };
        carrito.push(nuevoItem);
        console.log(`✅ Producto agregado: ${item.nombre}`);
    }

    guardarCarrito(carrito);
    return true;
}

/**
 * REMOVER DEL CARRITO
 * Remueve un item del carrito
 * 
 * @param {String} itemId - ID del item a remover
 * @returns {Boolean} true si se removió exitosamente
 */
function removerDelCarrito(itemId) {
    const carrito = obtenerCarrito();
    const index = carrito.findIndex(i => i.id === itemId);
    
    if (index === -1) {
        console.warn("⚠️ Item no encontrado:", itemId);
        return false;
    }
    
    const item = carrito[index];
    carrito.splice(index, 1);
    console.log(`🗑️ Producto removido: ${item.nombre}`);
    
    guardarCarrito(carrito);
    return true;
}

/**
 * ACTUALIZAR CANTIDAD
 * Actualiza la cantidad de un item específico
 * 
 * @param {String} itemId - ID del item
 * @param {Number} nuevaCantidad - Nueva cantidad
 * @returns {Boolean} true si se actualizó exitosamente
 */
function actualizarCantidad(itemId, nuevaCantidad) {
    if (nuevaCantidad < 1) {
        return removerDelCarrito(itemId);
    }
    
    const carrito = obtenerCarrito();
    const item = carrito.find(i => i.id === itemId);
    
    if (!item) {
        console.warn("⚠️ Item no encontrado:", itemId);
        return false;
    }
    
    item.cantidad = nuevaCantidad;
    console.log(`📝 Cantidad actualizada: ${item.nombre} → ${nuevaCantidad}`);
    
    guardarCarrito(carrito);
    return true;
}

/**
 * OBTENER CANTIDAD TOTAL
 * Retorna la cantidad total de items en el carrito
 * 
 * @returns {Number} Cantidad total
 */
function obtenerCantidadCarrito() {
    const carrito = obtenerCarrito();
    return carrito.reduce((total, item) => total + item.cantidad, 0);
}

/**
 * OBTENER TOTAL DEL CARRITO
 * Retorna el total en colones
 * 
 * @returns {Number} Total del carrito
 */
function obtenerTotalCarrito() {
    const carrito = obtenerCarrito();
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

/**
 * OBTENER SUBTOTAL
 * Retorna el subtotal sin impuestos
 * 
 * @returns {Number} Subtotal
 */
function obtenerSubtotalCarrito() {
    return obtenerTotalCarrito();
}

/**
 * LIMPIAR CARRITO
 * Vacía completamente el carrito
 */
function limpiarCarrito() {
    localStorage.removeItem("carrito");
    console.log("🧹 Carrito limpiado");
    
    window.dispatchEvent(new CustomEvent('carritoActualizado', { 
        detail: { carrito: [], timestamp: Date.now() } 
    }));
}

/**
 * EXISTE ITEM EN CARRITO
 * Verifica si un item ya está en el carrito
 * 
 * @param {String} itemId - ID del item
 * @returns {Boolean} true si existe
 */
function existeEnCarrito(itemId) {
    const carrito = obtenerCarrito();
    return carrito.some(i => i.id === itemId);
}

/**
 * OBTENER ITEM DEL CARRITO
 * Obtiene un item específico del carrito
 * 
 * @param {String} itemId - ID del item
 * @returns {Object|null} El item o null si no existe
 */
function obtenerItemCarrito(itemId) {
    const carrito = obtenerCarrito();
    return carrito.find(i => i.id === itemId) || null;
}

/**
 * ESCUCHAR CAMBIOS EN EL CARRITO
 * Ejecuta callback cuando el carrito cambia (en la misma pestaña o desde otra)
 * 
 * @param {Function} callback - Función a ejecutar (recibe array de items)
 */
function escucharCambiosCarrito(callback) {
    if (typeof callback !== 'function') {
        console.error("❌ Callback debe ser una función");
        return;
    }

    // Escuchar evento personalizado (cambios en la misma pestaña)
    window.addEventListener('carritoActualizado', (event) => {
        callback(event.detail.carrito);
    });

    // Escuchar cambios desde otras pestañas (Storage API)
    window.addEventListener('storage', (event) => {
        if (event.key === 'carrito') {
            try {
                const carrito = event.newValue ? JSON.parse(event.newValue) : [];
                console.log("🔄 Carrito sincronizado desde otra pestaña");
                callback(carrito);
            } catch (error) {
                console.error("❌ Error sincronizando carrito:", error);
            }
        }
    });
}

/**
 * EXPORTAR CARRITO COMO JSON
 * Retorna el carrito en formato JSON
 * 
 * @returns {String} JSON del carrito
 */
function exportarCarritoJSON() {
    const carrito = obtenerCarrito();
    return JSON.stringify(carrito, null, 2);
}

/**
 * IMPORTAR CARRITO DESDE JSON
 * Importa un carrito desde JSON (útil para sincronización)
 * 
 * @param {String} json - JSON del carrito
 * @returns {Boolean} true si se importó exitosamente
 */
function importarCarritoJSON(json) {
    try {
        const carrito = JSON.parse(json);
        if (!Array.isArray(carrito)) {
            console.error("❌ JSON no es un array válido");
            return false;
        }
        
        guardarCarrito(carrito);
        console.log("✅ Carrito importado:", carrito.length, "items");
        return true;
    } catch (error) {
        console.error("❌ Error importando carrito:", error);
        return false;
    }
}

/**
 * VALIDAR CARRITO
 * Valida que todos los items tengan la estructura correcta
 * 
 * @returns {Boolean} true si el carrito es válido
 */
function validarCarrito() {
    const carrito = obtenerCarrito();
    
    for (const item of carrito) {
        if (!item.id || !item.nombre || item.precio === undefined || !item.cantidad) {
            console.error("❌ Item inválido:", item);
            return false;
        }
    }
    
    console.log("✅ Carrito válido");
    return true;
}

/**
 * OBTENER ESTADÍSTICAS DEL CARRITO
 * Retorna estadísticas útiles del carrito
 * 
 * @returns {Object} Objeto con estadísticas
 */
function obtenerEstadisticasCarrito() {
    const carrito = obtenerCarrito();
    
    return {
        cantidad: obtenerCantidadCarrito(),
        total: obtenerTotalCarrito(),
        items: carrito.length,
        promedioPorItem: carrito.length > 0 ? obtenerTotalCarrito() / carrito.length : 0,
        productoMasCaro: carrito.length > 0 ? Math.max(...carrito.map(i => i.precio)) : 0,
        productoMasBarato: carrito.length > 0 ? Math.min(...carrito.map(i => i.precio)) : 0
    };
}

/**
 * INICIALIZAR CARRITO
 * Ejecuta validaciones iniciales y sincronización
 */
function inicializarCarrito() {
    console.log("🚀 Inicializando carrito...");
    
    // Validar carrito existente
    if (!validarCarrito()) {
        console.warn("⚠️ Carrito inválido, limpiando...");
        limpiarCarrito();
    }
    
    // Mostrar estadísticas
    const stats = obtenerEstadisticasCarrito();
    console.log("📊 Estadísticas del carrito:", stats);
    
    console.log("✅ Carrito inicializado");
}

/**
 * DEPURACIÓN: Mostrar carrito en consola
 */
function debugCarrito() {
    const carrito = obtenerCarrito();
    console.table(carrito);
    console.log("Estadísticas:", obtenerEstadisticasCarrito());
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

// Inicializar carrito cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCarrito);
} else {
    inicializarCarrito();
}

// Hacer funciones disponibles globalmente
window.carritoUtils = {
    obtenerCarrito,
    guardarCarrito,
    agregarAlCarrito,
    removerDelCarrito,
    actualizarCantidad,
    obtenerCantidadCarrito,
    obtenerTotalCarrito,
    obtenerSubtotalCarrito,
    limpiarCarrito,
    existeEnCarrito,
    obtenerItemCarrito,
    escucharCambiosCarrito,
    exportarCarritoJSON,
    importarCarritoJSON,
    validarCarrito,
    obtenerEstadisticasCarrito,
    inicializarCarrito,
    debugCarrito
};

console.log("✅ Carrito Utils cargado");
