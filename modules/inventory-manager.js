// modules/inventory-manager.js
import { InventoryService } from './inventory-service.js';
import { Store, Utils } from './core.js';
import { UI } from '../components/ui.js';

export const InventoryManager = {
  productos: [],
  // ✅ Usamos Map en lugar de Set de nodos DOM para evitar referencias obsoletas al filtrar
  modificados: new Map(), 

  async mostrarPanel() {
    // ✅ 1. LIMPIEZA PREVENTIVA: Borrar el modal de inventario si ya existe
    const existingModal = document.getElementById('modalInventario');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalInventario';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" data-action="close-modal">✕</button>
        <h2>📦 Gestión de Inventario</h2>
        
        <div class="inventory-toolbar">
          <input type="text" id="invBuscar" placeholder="🔍 Buscar producto...">
          <select id="invFiltroTipo">
            <option value="">Todos los tipos</option>
          </select>
          <button id="btnGuardarInv" class="btn-save-inv" disabled>💾 Guardar Cambios</button>
          <button id="btnRecargarInv" class="btn-secondary">🔄 Recargar</button>
        </div>

        <div class="inventory-wrapper">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Stock Actual</th>
                <th>Nuevo Stock</th>
                <th>Justificación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="invTablaBody">
              <tr><td colspan="6" class="loading-state">🔄 Sincronizando inventario...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Evento para cerrar modal de forma segura
    modal.querySelector('[data-action="close-modal"]')?.addEventListener('click', () => {
      modal.remove();
    });

    await this.cargarProductos();
    this.attachEvents();

    // ✅ Escucha cambios en tiempo real desde Firebase
    Store.on('inventory:updated', () => {
      if (document.getElementById('modalInventario')) {
        this.cargarProductos();
      }
    });
  },

  async cargarProductos() {
    this.productos = Store.get('productos') || [];
    const inventario = Store.get('inventario') || {};
    this.modificados.clear();

    // 🔗 FUSIÓN CRÍTICA: Inyectar stock real de Firebase en el array de productos
    this.productos.forEach(p => {
      const key = Utils.normalizeText(p.nombre);
      p.stock = inventario[key] !== undefined ? inventario[key] : (p.stock || 0);
    });

    if (this.productos.length === 0) {
      const tbody = document.getElementById('invTablaBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="no-data">No hay productos cargados</td></tr>';
      return;
    }

    // Llenar filtro de tipos
    const tipos = [...new Set(this.productos.map(p => p.tipo).filter(Boolean))].sort();
    const selTipo = document.getElementById('invFiltroTipo');
    if (selTipo) {
      selTipo.innerHTML = '<option value="">Todos los tipos</option>';
      tipos.forEach(t => selTipo.innerHTML += `<option value="${t}">${t}</option>`);
    }

    this.renderTabla(this.productos);
    this.actualizarBotonGuardar();
  },

   renderTabla(lista) {
    const tbody = document.getElementById('invTablaBody');
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">Sin coincidencias</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(p => {
      // ✅ Protección: Fallbacks para datos faltantes
      const idSeguro = p.id || Utils.normalizeText(p.nombre) || Math.random().toString(36).substr(2, 9);
      const nombreSeguro = p.nombre || 'Producto sin nombre';
      const stockActual = Number(p.stock) || 0;
      const badgeClass = stockActual === 0 ? 'zero' : stockActual < 5 ? 'low' : 'ok';
      
      const mod = this.modificados.get(idSeguro);
      const nuevoStock = mod ? mod.nuevoStock : stockActual;
      const justificacion = mod ? mod.justificacion : '';
      const isModified = mod !== undefined;

      return `
        <tr class="inventory-row ${isModified ? 'modified' : ''}" data-id="${idSeguro}" data-nombre="${nombreSeguro}" data-stock="${stockActual}">
          <td><strong>${nombreSeguro}</strong></td>
          <td>${p.tipo || 'General'}</td>
          <td><span class="stock-badge ${badgeClass}">${stockActual}</span></td>
          <td>
            <input type="number" 
                   class="inv-input" 
                   value="${nuevoStock}" 
                   min="0" 
                   data-original="${stockActual}"
                   data-id="${idSeguro}">
          </td>
          <td>
            <input type="text" 
                   class="inv-justificacion" 
                   placeholder="Ej: Merma, regalo..." 
                   value="${justificacion}"
                   data-id="${idSeguro}">
          </td>
          <td class="estado-celda">${isModified ? '⚠️ Pendiente' : '-'}</td>
        </tr>
      `;
    }).join('');
  },

  attachEvents() {
    document.getElementById('invBuscar')?.addEventListener('input', () => this.filtrar());
    document.getElementById('invFiltroTipo')?.addEventListener('change', () => this.filtrar());
    document.getElementById('btnGuardarInv')?.addEventListener('click', () => this.guardarCambios());
    document.getElementById('btnRecargarInv')?.addEventListener('click', () => this.cargarProductos());

    // ✅ Delegación de eventos: Maneja los inputs dinámicos sin depender del scope global
    const tbody = document.getElementById('invTablaBody');
    tbody?.addEventListener('input', (e) => {
      if (e.target.classList.contains('inv-input') || e.target.classList.contains('inv-justificacion')) {
        this.marcarModificado(e.target);
      }
    });
  },

  marcarModificado(input) {
    const row = input.closest('tr');
    const id = input.dataset.id;
    const original = Number(row.dataset.stock);
    
    const inputStock = row.querySelector('.inv-input');
    const inputJustif = row.querySelector('.inv-justificacion');
    
    const nuevo = Number(inputStock.value);
    const justificacion = inputJustif.value.trim();

    if (nuevo !== original || justificacion !== '') {
      row.classList.add('modified');
      row.querySelector('.estado-celda').textContent = '⚠️ Pendiente';
      this.modificados.set(id, { nuevoStock: nuevo, justificacion: justificacion });
    } else {
      row.classList.remove('modified');
      row.querySelector('.estado-celda').textContent = '-';
      this.modificados.delete(id);
    }

    this.actualizarBotonGuardar();
  },

  actualizarBotonGuardar() {
    const btn = document.getElementById('btnGuardarInv');
    if (btn) {
      btn.disabled = this.modificados.size === 0;
    }
  },

  filtrar() {
    const busca = document.getElementById('invBuscar')?.value.toLowerCase().trim() || '';
    const tipo = document.getElementById('invFiltroTipo')?.value || '';

    const filtrados = this.productos.filter(p => {
      // ✅ Protección: Si no hay nombre, se trata como cadena vacía
      const nombreProducto = p.nombre ? String(p.nombre).toLowerCase() : '';
      const coincideTexto = !busca || nombreProducto.includes(busca);
      const coincideTipo = !tipo || p.tipo === tipo;
      return coincideTexto && coincideTipo;
    });

    this.renderTabla(filtrados);
  },

    async guardarCambios() {
    if (this.modificados.size === 0) return;

    const btn = document.getElementById('btnGuardarInv');
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';

    try {
      const cambios = Array.from(this.modificados.entries()).map(([id, data]) => {
        // ✅ Búsqueda segura del producto
        const prod = this.productos.find(p => (p.id && p.id === id) || Utils.normalizeText(p.nombre) === id);
        return {
          id: prod?.id || id,
          nombre: prod?.nombre || 'Producto desconocido',
          cantidad: data.nuevoStock,
          justificacion: data.justificacion || 'Ajuste de inventario'
        };
      });

      const resultados = await InventoryService.saveMultipleObj(cambios);
      
      resultados.forEach(res => {
        if (res.success) {
          const prod = this.productos.find(p => (p.id && p.id === res.id) || Utils.normalizeText(p.nombre) === Utils.normalizeText(res.nombre));
          if (prod) prod.stock = res.cantidad;
        }
      });

      Store.set('productos', this.productos);
      Store.set('inventario', resultados.reduce((acc, r) => {
        if (r.success) {
          const prod = this.productos.find(p => (p.id && p.id === r.id) || Utils.normalizeText(p.nombre) === Utils.normalizeText(r.nombre));
          if (prod) acc[Utils.normalizeText(prod.nombre)] = r.cantidad;
        }
        return acc;
      }, { ...Store.get('inventario') }));
      
      Store.emit('inventory:updated');
      UI.toast(`✅ ${resultados.filter(r => r.success).length} productos actualizados`, 'success');
      this.cargarProductos();
    } catch (e) {
      console.error('Error al guardar inventario:', e);
      UI.toast('❌ Error al guardar inventario', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar Cambios';
    }
  }
  };

export default InventoryManager;