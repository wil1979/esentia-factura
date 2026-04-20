// modules/loyalty.js
import { Store } from './core.js';
import { DB } from './firebase.js';

const LoyaltyManager = {
  CONFIG: {
    SELLOS_OBJETIVO: 6,
    PREMIO_DEFAULT: 'Esencia de 30ml gratis'
  },

  // modules/loyalty.js (Reemplaza SOLO estos métodos)

async init() {
  const cliente = Store.get('cliente');
  if (!cliente?.id) {
    this.data = { sellos: 0, objetivo: this.CONFIG?.SELLOS_OBJETIVO || 6, premiosPendientes: 0 };
    this.renderCard();
    return;
  }
  await this.loadLoyaltyData(cliente.id);
  this.renderCard();
},

async loadLoyaltyData(clienteId) {
  try {
    // ✅ Inicialización segura por defecto
    this.data = {
      sellos: 0,
      objetivo: this.CONFIG?.SELLOS_OBJETIVO || 6,
      premiosPendientes: 0,
      premiosReclamados: 0,
      totalGastado: 0,
      historial: []
    };

    const snap = await DB.getInvoices(clienteId);
    if (!snap.exists()) {
      Store.set('loyalty', this.data);
      return;
    }

    const facturas = snap.data();
    // ✅ CORRECCIÓN CRÍTICA: Validar estrictamente que sea array
    const compras = Array.isArray(facturas.compras) ? facturas.compras : [];

    const MONTO_POR_SELLO = 4000;
    // ✅ Sumar totales de forma segura (evita NaN si total es undefined)
    const totalGastado = compras.reduce((acc, c) => acc + (Number(c.total) || 0), 0);

    const sellosTotales = Math.floor(totalGastado / MONTO_POR_SELLO);
    const premiosReclamados = facturas.lealtad?.premiosReclamados || 0;

    this.data = {
      sellos: sellosTotales % this.data.objetivo,
      objetivo: this.data.objetivo,
      premiosPendientes: Math.max(0, Math.floor(sellosTotales / this.data.objetivo) - premiosReclamados),
      premiosReclamados,
      totalGastado,
      historial: compras.slice(-5) // Últimas 5 compras para historial
    };

    Store.set('loyalty', this.data);
  } catch (error) {
    console.error('Error cargando lealtad:', error);
    // Fallback final para que la UI nunca se rompa
    this.data = { sellos: 0, objetivo: 6, premiosPendientes: 0 };
    Store.set('loyalty', this.data);
  }
},

renderCard() {
  const container = document.getElementById('loyaltyCard');
  if (!container) return;

  // ✅ Destructuring seguro con fallback
  const { sellos = 0, objetivo = 6, premiosPendientes = 0, totalGastado = 0 } = this.data || {};
  const progreso = Math.min((sellos / objetivo) * 100, 100);

  container.innerHTML = `
    <div class="loyalty-card">
      <div class="loyalty-header">
        <h3>🎁 Programa de Lealtad</h3>
        ${premiosPendientes > 0 ? `<span class="badge-premio">🏆 ${premiosPendientes} premio(s) pendiente(s)</span>` : ''}
      </div>
      <div class="loyalty-progress">
        <div class="progress-bar" style="width: ${progreso}%"></div>
        <span class="progress-text">${sellos} / ${objetivo} sellos</span>
      </div>
      <p class="loyalty-info">Total gastado: <strong>₡${Number(totalGastado).toLocaleString()}</strong></p>
      <p class="loyalty-tip">1 sello por cada ₡4,000 en compras</p>
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