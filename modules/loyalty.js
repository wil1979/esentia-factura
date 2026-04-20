// modules/loyalty.js
import { Store } from './core.js';
import { DB } from './firebase.js';

const LoyaltyManager = {
  CONFIG: {
    SELLOS_OBJETIVO: 6,
    PREMIO_DEFAULT: 'Esencia de 30ml gratis'
  },

  async init() {
    const cliente = Store.get('cliente');
    if (!cliente) return;

    // Cargar datos de lealtad desde Firebase
    await this.loadLoyaltyData(cliente.id);
    
    // Renderizar tarjeta
    this.renderCard();
  },

    async loadLoyaltyData(clienteId) {
    try {
      const snap = await DB.getInvoices(clienteId);
      if (!snap.exists()) {
        this.data = { sellos: 0, objetivo: this.CONFIG.SELLOS_OBJETIVO, premiosPendientes: 0, historial: [] };
        return;
      }
      const facturas = snap.data();
      
      // ✅ CORRECCIÓN: Validar estrictamente que 'compras' sea un array antes de filtrar
      const compras = Array.isArray(facturas.compras) ? facturas.compras : [];
      
      const sellos = compras.filter(c => c.estado !== 'cancelado').length;
      const premiosGanados = Math.floor(sellos / this.CONFIG.SELLOS_OBJETIVO);
      const sellosActuales = sellos % this.CONFIG.SELLOS_OBJETIVO;
      const premiosReclamados = facturas.lealtad?.premiosReclamados || 0;
      
      this.data = {
        sellos: sellosActuales,
        objetivo: this.CONFIG.SELLOS_OBJETIVO,
        premiosPendientes: premiosGanados - premiosReclamados,
        premiosReclamados: premiosReclamados,
        totalCompras: compras.length,
        historial: compras.slice(-10)
      };
      Store.set('loyalty', this.data);
    } catch (error) {
      console.error('Error cargando lealtad:', error);
    }
  },

  renderCard() {
    const container = document.getElementById('loyaltyContainer');
    if (!container) return;

    const { sellos, objetivo, premiosPendientes } = this.data;
    const progreso = (sellos / objetivo) * 100;

    container.innerHTML = `
      <div class="tarjeta-lealtad" id="tarjetaLealtad">
        <div class="tarjeta-header">
          <h3>💳 Mi Lealtad</h3>
          <button onclick="LoyaltyManager.toggleCard()">×</button>
        </div>
        
        <div class="cliente-info">
          <p>Cliente: <strong>${Store.get('cliente').nombre}</strong></p>
          <p>Sellos: <strong>${sellos}</strong> / <strong>${objetivo}</strong></p>
        </div>

        <div class="sellos-grid">
          ${Array(objetivo).fill(0).map((_, i) => `
            <div class="sello ${i < sellos ? 'activo' : ''}">
              ${i < sellos ? '★' : '☆'}
            </div>
          `).join('')}
        </div>

        <div class="progreso-bar">
          <div class="progreso-fill" style="width: ${progreso}%"></div>
        </div>

        ${premiosPendientes > 0 ? `
          <div class="premio-notificacion">
            🎉 ¡Tienes ${premiosPendientes} premio${premiosPendientes > 1 ? 's' : ''} por reclamar!
            <button onclick="LoyaltyManager.reclamarPremio()" class="btn-reclamar">
              Reclamar ahora
            </button>
          </div>
        ` : `
          <p class="progreso-texto">
            ${sellos === objetivo ? '¡Completado! Reclama tu premio' : 
              `Faltan ${objetivo - sellos} sello${objetivo - sellos !== 1 ? 's' : ''} para tu regalo`}
          </p>
        `}
      </div>

      <!-- Miniatura flotante cuando está cerrada -->
      <div class="caja-regalo-flotante" id="cajaRegalo" 
           onclick="LoyaltyManager.toggleCard()" 
           style="display: none;">
        🎁
        ${premiosPendientes > 0 ? `<span class="badge-premio">${premiosPendientes}</span>` : ''}
      </div>
    `;

    // Restaurar estado de visualización
    const isOpen = localStorage.getItem('loyaltyCardOpen') !== 'false';
    document.getElementById('tarjetaLealtad').style.display = isOpen ? 'block' : 'none';
    document.getElementById('cajaRegalo').style.display = isOpen ? 'none' : 'flex';
  },

  toggleCard() {
    const card = document.getElementById('tarjetaLealtad');
    const mini = document.getElementById('cajaRegalo');
    const isOpen = card.style.display !== 'none';
    
    card.style.display = isOpen ? 'none' : 'block';
    mini.style.display = isOpen ? 'flex' : 'none';
    
    localStorage.setItem('loyaltyCardOpen', !isOpen);
  },

  async reclamarPremio() {
    if (this.data.premiosPendientes <= 0) return;

    const clienteId = Store.get('cliente').id;
    
    try {
      // Actualizar en Firebase
      await DB.updateInvoice(clienteId, {
        'lealtad.premiosReclamados': this.data.premiosReclamados + 1,
        'lealtad.ultimoReclamo': new Date().toISOString()
      });

      // Generar mensaje de WhatsApp
      const mensaje = `Hola! 👋\n\nSoy ${Store.get('cliente').nombre}\n\nQuiero reclamar mi premio de lealtad: ${this.CONFIG.PREMIO_DEFAULT}\n\n¡Gracias! 🎁`;
      
      window.open(`https://wa.me/50672952454?text=${encodeURIComponent(mensaje)}`, '_blank');
      
      // Actualizar UI
      this.data.premiosPendientes--;
      this.renderCard();
      
      Store.emit('toast', { message: '¡Premio reclamado!', type: 'success' });
      
    } catch (error) {
      console.error('Error reclamando premio:', error);
      Store.emit('toast', { message: 'Error al reclamar', type: 'error' });
    }
  },

  // Llamar después de cada compra completada
  async addStamp(clienteId) {
    try {
      const snap = await DB.getInvoices(clienteId);
      const data = snap.data() || {};
      const compras = data.compras || [];
      
      // Verificar si ya tiene sello de la última compra
      const ultimaCompra = compras[compras.length - 1];
      if (ultimaCompra?.selloAplicado) return;

      // Marcar con sello
      await DB.updateInvoice(clienteId, {
        [`compras.${compras.length - 1}.selloAplicado`]: true
      });

      // Recargar datos
      await this.loadLoyaltyData(clienteId);
      this.renderCard();

      // Notificar si completó
      if (this.data.sellos === 0 && this.data.premiosPendientes > 0) {
        Store.emit('toast', { 
          message: '🎉 ¡Completaste tu tarjeta! Reclama tu premio', 
          type: 'success',
          duration: 5000 
        });
      }

    } catch (error) {
      console.error('Error agregando sello:', error);
    }
  },
    // ✅ NUEVO: Agregar sellos basados en monto de compra
    async addStampByAmount(clienteId, montoCompra) {
    const MONTO_POR_SELLO = 4000;
    const sellosGanados = Math.floor(montoCompra / MONTO_POR_SELLO);
    if (sellosGanados <= 0) return { ganados: 0, mensaje: null };

    try {
      const snap = await DB.getInvoices(clienteId);
      if (!snap.exists()) return { ganados: 0, mensaje: null };

      const data = snap.data();
      // ✅ CORRECCIÓN: Fallback seguro a 0 si el campo o el objeto no existen
      const lealtad = data.lealtad || {};
      const reclamos = lealtad.premiosReclamados ?? 0;

      await DB.updateInvoice(clienteId, {
        'lealtad.premiosReclamados': reclamos
      });

      await this.loadLoyaltyData(clienteId);
      if (typeof this.renderCard === 'function') this.renderCard();

      const mensaje = sellosGanados >= this.CONFIG.SELLOS_OBJETIVO
        ? `🎉 ¡Ganaste ${sellosGanados} sellos! Reclama tu premio`
        : `★ +${sellosGanados} sello${sellosGanados > 1 ? 's' : ''} por tu compra`;

      return { ganados: sellosGanados, mensaje };
    } catch (error) {
      console.error('Error aplicando sellos:', error);
      return { ganados: 0, mensaje: null };
    }
  }
};

export default LoyaltyManager;