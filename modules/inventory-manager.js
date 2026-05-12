// modules/inventory-manager.js
import { InventoryService } from './inventory-service.js';
import { Store, Utils } from './core.js'; // ✅ Utils es crucial para normalizar claves
import { UI } from '../components/ui.js';

export const InventoryManager = {
  productos: [],
  modificados: new Set(),

  async mostrarPanel() {

    // ✅ 1. LIMPIEZA PREVENTIVA (Esto soluciona el problema)
  const existingModal = document.getElementById('modalFacturacionRapida');
  if (existingModal) {
    existingModal.remove(); // Borra el modal viejo por completo
  }
  
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalInventario';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalInventario','close')">✕</button>
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
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="invTablaBody">
              <tr><td colspan="5" class="loading-state">🔄 Sincronizando inventario...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
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
      // Si existe en inventario de Firebase, úsalo. Si no, respeta el local o 0
      p.stock = inventario[key] !== undefined ? inventario[key] : (p.stock || 0);
    });

    if (this.productos.length === 0) {
      document.getElementById('invTablaBody').innerHTML = '<tr><td colspan="5" class="no-data">No hay productos cargados</td></tr>';
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
  },

  renderTabla(lista) {
    const tbody = document.getElementById('invTablaBody');
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">Sin coincidencias</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(p => {
      const stockActual = Number(p.stock) || 0;
      const badgeClass = stockActual === 0 ? 'zero' : stockActual < 5 ? 'low' : 'ok';
      const badgeText = stockActual === 0 ? 'Agotado' : stockActual < 5 ? 'Bajo' : 'Normal';

      return `
        <tr class="inventory-row" data-id="${p.id}" data-nombre="${p.nombre}" data-stock="${stockActual}">
          <td><strong>${p.nombre}</strong></td>
          <td>${p.tipo || 'General'}</td>
          <td><span class="stock-badge ${badgeClass}">${stockActual}</span></td>
          <td>
            <input type="number" 
                   class="inv-input" 
                   value="${stockActual}" 
                   min="0" 
                   data-original="${stockActual}"
                   onchange="InventoryManager.marcarModificado(this)">
          </td>
          <td id="estado-${p.id}">-</td>
        </tr>
      `;
    }).join('');
  },

  marcarModificado(input) {
    const row = input.closest('tr');
    const original = Number(input.dataset.original);
    const nuevo = Number(input.value);
    
    if (nuevo !== original) {
      row.classList.add('modified');
      document.getElementById('estado-' + row.dataset.id).textContent = '⚠️ Pendiente';
      this.modificados.add(row);
    } else {
      row.classList.remove('modified');
      document.getElementById('estado-' + row.dataset.id).textContent = '-';
      this.modificados.delete(row);
    }

    document.getElementById('btnGuardarInv').disabled = this.modificados.size === 0;
  },

  attachEvents() {
    document.getElementById('invBuscar')?.addEventListener('input', () => this.filtrar());
    document.getElementById('invFiltroTipo')?.addEventListener('change', () => this.filtrar());
    document.getElementById('btnGuardarInv')?.addEventListener('click', () => this.guardarCambios());
    document.getElementById('btnRecargarInv')?.addEventListener('click', () => this.cargarProductos());
  },

  filtrar() {
    const busca = document.getElementById('invBuscar')?.value.toLowerCase().trim() || '';
    const tipo = document.getElementById('invFiltroTipo')?.value || '';

    const filtrados = this.productos.filter(p => {
      const coincideTexto = !busca || p.nombre.toLowerCase().includes(busca);
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
      const cambios = Array.from(this.modificados).map(row => ({
        nombre: row.dataset.nombre,
        cantidad: Number(row.querySelector('.inv-input').value)
      }));

      const resultados = await InventoryService.saveMultipleObj(cambios);
      
      // Actualizar Store local para mantener coherencia visual
      resultados.forEach(res => {
        if (res.success) {
          const prod = this.productos.find(p => p.nombre === res.nombre);
          if (prod) prod.stock = res.cantidad;
        }
      });

      Store.set('productos', this.productos);
      Store.set('inventario', resultados.reduce((acc, r) => {
        if (r.success) acc[Utils.normalizeText(r.nombre)] = r.cantidad;
        return acc;
      }, { ...Store.get('inventario') }));
      
      Store.emit('inventory:updated');
      UI.toast(`✅ ${resultados.filter(r=>r.success).length} productos actualizados`, 'success');
      this.cargarProductos();
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al guardar inventario', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '💾 Guardar Cambios';
    }
  }
};

export default InventoryManager;