// modules/stock-alerts.js
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';

export const StockAlertsManager = {
  async mostrarAlertas() {
    const inventario = Store.get('inventario') || {};
    let productos = Store.get('productos') || [];
    
    // Sincronizar stock real con el array local
    productos = productos.map(p => ({
      ...p,
      stock: inventario[Utils.normalizeText(p.nombre)] !== undefined ? inventario[Utils.normalizeText(p.nombre)] : (p.stock || 0)
    }));
    
    const productosBajos = productos.filter(p => p.stock <= 5);
    
    if (productosBajos.length === 0) {
      UI.toast('✅ Todo el inventario tiene stock saludable', 'success');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalStockAlert';
    
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" data-action="close-modal">✕</button>
        <h2>⚠️ Stock Crítico (${productosBajos.length})</h2>
        <div class="alert-list">
          ${productosBajos.map(p => {
            // ✅ PROTECCIÓN: Si el nombre es undefined, usa un texto por defecto
            const nombreSeguro = p.nombre || 'Producto sin nombre';
            const keySegura = Utils.normalizeText(nombreSeguro);
            
            return `
              <div class="alert-row">
                <span>${nombreSeguro}</span>
                <span class="stock-badge ${p.stock === 0 ? 'agotado' : 'bajo'}">${p.stock} u.</span>
                <button class="btn-sm btn-primary" data-action="reponer" data-key="${keySegura}" data-nombre="${nombreSeguro.replace(/"/g, '&quot;')}">📦 Reponer</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>`;
      
    document.body.appendChild(modal);
    
    // ✅ Eventos seguros sin depender de "onclick" en línea (evita errores de scope y comillas)
    modal.querySelector('[data-action="close-modal"]')?.addEventListener('click', () => modal.remove());
    modal.querySelectorAll('[data-action="reponer"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.reponerStock(btn.dataset.key, btn.dataset.nombre);
      });
    });
  },

  async reponerStock(key, nombre) {
    const cantidad = parseInt(prompt(`¿Cuántas unidades de "${nombre}" deseas agregar?`));
    if (!cantidad || cantidad <= 0) return;
    
    const inventario = Store.get('inventario') || {};
    inventario[key] = (inventario[key] || 0) + cantidad;
    
    Store.set('inventario', inventario);
    if (Store.persist) Store.persist('inventario');
    
    // Actualizar también el array de productos para que el catálogo lo refleje
    const productos = Store.get('productos') || [];
    const idx = productos.findIndex(p => Utils.normalizeText(p.nombre) === key);
    if (idx !== -1) {
      productos[idx].stock = inventario[key];
      Store.set('productos', productos);
    }
    
    Store.emit('inventory:updated');
    UI.toast(`✅ Stock actualizado: ${nombre} → ${inventario[key]} u.`, 'success');
    this.mostrarAlertas(); // Refrescar modal
  }
};

export default StockAlertsManager;