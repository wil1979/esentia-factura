/**
 * ============================================
 * ESENTIA - UTILIDADES DE OPTIMIZACIÓN
 * ============================================
 * 
 * Este archivo contiene funciones helper para:
 * ✅ Debounce/Throttle de eventos
 * ✅ Event delegation
 * ✅ Lazy loading de imágenes
 * ✅ Manejo optimizado de eventos táctiles
 * ✅ Memoización de funciones
 * 
 * Uso: Importar estas funciones en esentia.js
 * ============================================
 */

/**
 * DEBOUNCE - Retrasa la ejecución de una función hasta que deje de llamarse
 * Ideal para: scroll, resize, búsqueda
 * 
 * @param {Function} func - Función a ejecutar
 * @param {Number} delay - Tiempo en ms
 * @returns {Function} Función debounced
 */
function debounce(func, delay = 150) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * THROTTLE - Limita la frecuencia de ejecución de una función
 * Ideal para: scroll performance, resize
 * 
 * @param {Function} func - Función a ejecutar
 * @param {Number} limit - Tiempo mínimo entre ejecuciones en ms
 * @returns {Function} Función throttled
 */
function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * EVENT DELEGATION - Centraliza listeners de eventos
 * Mejora: Menos listeners, mejor rendimiento
 * 
 * @param {String} selector - Selector CSS del elemento padre
 * @param {String} eventType - Tipo de evento (click, pointerdown, etc)
 * @param {String} delegateSelector - Selector CSS del elemento a escuchar
 * @param {Function} callback - Función a ejecutar
 */
function delegateEvent(selector, eventType, delegateSelector, callback) {
  const parent = document.querySelector(selector);
  if (!parent) return;

  parent.addEventListener(eventType, (e) => {
    const delegateElement = e.target.closest(delegateSelector);
    if (delegateElement) {
      callback.call(delegateElement, e);
    }
  }, { passive: true });
}

/**
 * LAZY LOADING DE IMÁGENES
 * Carga imágenes solo cuando están visibles
 * 
 * Uso en HTML:
 * <img data-src=\"imagen.jpg\" class=\"lazy\" alt=\"Descripción\">
 * 
 * En JS:
 * lazyLoadImages();
 */
function lazyLoadImages() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    document.querySelectorAll('img.lazy').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback para navegadores antiguos
    document.querySelectorAll('img.lazy').forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
    });
  }
}

/**
 * MEMOIZACIÓN - Cachea resultados de funciones costosas
 * 
 * @param {Function} func - Función a memoizar
 * @returns {Function} Función memoizada
 */
function memoize(func) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * OPTIMIZACIÓN DE SCROLL
 * Ejecuta función solo cuando el scroll termina
 */
function onScrollEnd(callback, delay = 150) {
  let scrollTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(callback, delay);
  }, { passive: true });
}

/**
 * DETECTAR DISPOSITIVO TÁCTIL
 * Retorna true si el dispositivo soporta touch
 */
function isTouchDevice() {
  return (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );
}

/**
 * MANEJO OPTIMIZADO DE CLICKS/TAPS
 * Reemplaza onclick con pointer events
 * 
 * Uso:
 * handlePointerEvent('.btn-agregar', () => {
 *   agregarAlCarrito();
 * });
 */
function handlePointerEvent(selector, callback) {
  document.addEventListener('pointerdown', (e) => {
    if (e.target.matches(selector)) {
      e.preventDefault();
      callback(e);
    }
  }, { passive: false });
}

/**
 * PRELOAD DE RECURSOS
 * Precarga recursos críticos
 */
function preloadResource(url, type = 'script') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = type;
  link.href = url;
  if (type === 'font') {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

/**
 * PERFORMANCE MONITORING
 * Mide el tiempo de ejecución de funciones
 */
function measurePerformance(name, func) {
  const start = performance.now();
  const result = func();
  const end = performance.now();
  console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * CLEANUP DE EVENT LISTENERS
 * Evita memory leaks
 */
class EventManager {
  constructor() {
    this.listeners = [];
  }

  on(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler });
  }

  off(element, event, handler) {
    element.removeEventListener(event, handler);
    this.listeners = this.listeners.filter(
      l => !(l.element === element && l.event === event && l.handler === handler)
    );
  }

  cleanup() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }
}

/**
 * OPTIMIZACIÓN DE FIREBASE
 * Lazy load de Firebase solo cuando sea necesario
 */
async function loadFirebaseOptimized() {
  if (window.firebaseLoaded) return;

  try {
    // Cargar Firebase solo cuando sea necesario
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    
    // ... resto de inicialización
    window.firebaseLoaded = true;
  } catch (error) {
    console.error('Error cargando Firebase:', error);
  }
}

/**
 * INTERSECTION OBSERVER PARA ANIMACIONES
 * Anima elementos cuando entran en viewport
 */
function observeElements(selector, className = 'visible') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add(className);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1
  });

  document.querySelectorAll(selector).forEach(el => {
    observer.observe(el);
  });
}

/**
 * REQUEST ANIMATION FRAME PARA SMOOTH ANIMATIONS
 * Mejor que setTimeout para animaciones
 */
function smoothScroll(target, duration = 300) {
  const start = window.scrollY;
  const distance = target - start;
  let startTime = null;

  function animation(currentTime) {
    if (startTime === null) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    window.scrollTo(0, start + distance * easeInOutQuad(progress));

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  requestAnimationFrame(animation);
}

/**
 * VALIDACIÓN DE FORMULARIOS OPTIMIZADA
 * Valida en tiempo real sin bloquear
 */
function validateFormOptimized(formSelector) {
  const form = document.querySelector(formSelector);
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea, select');

  inputs.forEach(input => {
    input.addEventListener('blur', debounce(() => {
      validateField(input);
    }, 300));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let isValid = true;

    inputs.forEach(input => {
      if (!validateField(input)) {
        isValid = false;
      }
    });

    if (isValid) {
      form.submit();
    }
  });
}

function validateField(field) {
  if (field.value.trim() === '') {
    field.classList.add('error');
    return false;
  }
  field.classList.remove('error');
  return true;
}

/**
 * CACHE STORAGE PARA OFFLINE
 * Cachea datos para acceso offline*/
 
class CacheManager {
  constructor(cacheName = 'esentia-cache-v1') {
    this.cacheName = cacheName;
  }

  async set(key, value) {
    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(JSON.stringify(value));
      await cache.put(key, response);
    } catch (error) {
      console.error('Error guardando en cache:', error);
    }
  }

  async get(key) {
    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(key);
      return response ? await response.json() : null;
    } catch (error) {
      console.error('Error leyendo cache:', error);
      return null;
    }
  }

  async clear() {
    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.error('Error limpiando cache:', error);
    }
  }
}

/**
 * INICIALIZACIÓN DE OPTIMIZACIONES
 * Ejecutar al cargar la página
 */
function initializeOptimizations() {
  console.log('🚀 Inicializando optimizaciones...');

  // Lazy loading de imágenes
  lazyLoadImages();

  // Observar elementos para animaciones
  observeElements('.producto-card', 'visible');

  // Debounce en resize
  window.addEventListener('resize', debounce(() => {
    console.log('Resize event debounced');
  }, 200), { passive: true });

  // Detectar dispositivo táctil
  if (isTouchDevice()) {
    document.body.classList.add('touch-device');
    console.log('📱 Dispositivo táctil detectado');
  }

  // Preload de recursos críticos
  preloadResource('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap', 'style');

  console.log('✅ Optimizaciones inicializadas');
}

/**
 * EXPORTAR PARA USO EN MÓDULOS
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    delegateEvent,
    lazyLoadImages,
    memoize,
    onScrollEnd,
    isTouchDevice,
    handlePointerEvent,
    preloadResource,
    measurePerformance,
    EventManager,
    loadFirebaseOptimized,
    observeElements,
    smoothScroll,
    validateFormOptimized,
    CacheManager,
    initializeOptimizations
  };
}

// Ejecutar optimizaciones al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOptimizations);
} else {
  initializeOptimizations();
}
