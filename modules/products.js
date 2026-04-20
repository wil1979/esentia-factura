// modules/products.js
import { Store, Utils } from './core.js';
import { DB } from './firebase.js';

const ProductManager = {

  // ✅ AROMAS DISPONIBLES PARA DIFUSORES
  AROMAS_DIFUSORES: [
    "Pera", "Manzana Verde", "Coco", "Vainilla", "Lavanda", 
    "Melon&Vainilla", "Kiwi", "Carro Nuevo", "Manzana&Canela", "Limón", "Menta", "Fresa"
  ],
  // ✅ CLAVES NORMALIZADAS (sin espacios, acentos ni caracteres especiales)
  PROMO_ESPECIAL: {
    "freshkiwienergiafrutal": 35,
    "strawberryjoy": 35,
    "nightcaress": 45,
    "crystalembrace": 45,
    "puremagnolia": 35,
    "melonvanilladelight": 35,
    "freshbreatheeucalipto": 35,
    "freshmint": 35,   
  },

  async load() {
    Store.set('ui.loading', true);
    try {
      const response = await fetch("https://wil1979.github.io/esentia-factura/productos_esentia.json");
      const data = await response.json();
      const productos = [];

      Object.entries(data).forEach(([tipo, items]) => {
        items.forEach(item => {
          const producto = {
            ...item,
            tipo,
            id: item.id || Utils.normalizeText(item.nombre),
            precio: item.precioOferta || item.precio || 3000,
            precioOriginal: item.precioOriginal,
            variantes: item.variantes || [{ nombre: '30ml', precio: 3000 }]
          };

          // ✅ Aplicar descuento si coincide
          const key = Utils.normalizeText(producto.nombre);
          const promoPorcentaje = this.PROMO_ESPECIAL[key] || this.PROMO_ESPECIAL[String(producto.id)] || 0;
          
          if (promoPorcentaje > 0) {
            producto.descuentoPromo = promoPorcentaje;
            // Calcular precio con descuento para cada variante
            producto.variantes = producto.variantes.map(v => ({
              ...v,
              precioBase: v.precio,
              precioDescuento: Math.round(v.precio * (1 - promoPorcentaje / 100))
            }));
          }

          productos.push(producto);
        });
      });
      
      Store.set('productos', productos);
      this.subscribeInventory();
    } catch (error) {
      console.error("Error cargando productos:", error);
      Store.emit('error', 'No se pudo cargar el catálogo');
    } finally {
      Store.set('ui.loading', false);
    }
  },

  subscribeInventory() {
    DB.subscribeStock((snapshot) => {
      const inventario = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const key = Utils.normalizeText(data.nombre);
        inventario[key] = data.cantidad ?? data.stock ?? 0;
      });
      Store.set('inventario', inventario);
      Store.emit('inventory:updated', inventario);
    });
  },

  getStock(productName) {
    const key = Utils.normalizeText(productName);
    return Store.get('inventario')[key] ?? 0;
  },

  isAvailable(product) {
    return this.getStock(product.nombre) > 0 && product.disponible !== false;
  },

  search(query, options = {}) {
    const productos = Store.get('productos');
    if (!query.trim()) return productos;
    const term = Utils.normalizeText(query);
    const results = [];
    productos.forEach(p => {
      let score = 0;
      const nameNorm = Utils.normalizeText(p.nombre);
      if (nameNorm.includes(term)) score += 10;
      if (p.tipo?.toLowerCase().includes(term)) score += 5;
      if (Utils.normalizeText(p.info || '').includes(term)) score += 3;
      if (Utils.normalizeText(p.beneficios || '').includes(term)) score += 8;
      if (score === 0 && options.fuzzy) {
        const dist = Utils.levenshtein(term.slice(0, 10), nameNorm.slice(0, 10));
        if (dist <= 3) score = 5 - dist;
      }
      if (score > 0) results.push({ product: p, score });
    });
    return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 50).map(r => r.product);
  },

  filter(criteria) {
    let results = Store.get('productos').filter(p => this.isAvailable(p));
    if (criteria.tipo) results = results.filter(p => p.tipo === criteria.tipo);
    if (criteria.precioMin) results = results.filter(p => p.precio >= criteria.precioMin);
    if (criteria.precioMax) results = results.filter(p => p.precio <= criteria.precioMax);
    if (criteria.orden === 'precio-asc') results.sort((a, b) => a.precio - b.precio);
    else if (criteria.orden === 'precio-desc') results.sort((a, b) => b.precio - a.precio);
    return results;
  },

  normalize(nombre) { return Utils?.normalizeText?.(nombre) || nombre?.toLowerCase().trim().replace(/\s+/g, '-') || ''; },
  getProduct(id) { const productos = Store.get('productos') || []; const strId = String(id); return productos.find(p => String(p.id) === strId) || productos.find(p => Utils.normalizeText?.(p.nombre) === strId) || null; },
  getByType(tipo) { const productos = Store.get('productos') || []; return productos.filter(p => p.tipo === tipo && this.isAvailable(p)); },
  checkStock(nombre, cantidadRequerida = 1) { return this.getStock(nombre) >= cantidadRequerida; }
};
export default ProductManager;