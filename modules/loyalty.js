// modules/loyalty.js
import { Store } from './core.js';

export default {
  CONFIG: {
    SELLOS_OBJETIVO: 6,
    PUNTOS_POR_MONTO: 4000
  },

  init() {
    this.renderCard();
  },

  // ✅ VERSIÓN BLINDADA: Evita el error "Cannot read properties of null"
  renderCard() {
    // 1. Buscar el contenedor
    const container = document.getElementById('loyaltyContainer');
    
    // 2. Si no existe, salir sin error
    if (!container) {
      console.warn('⚠️ #loyaltyContainer no encontrado en el HTML');
      return;
    }

    const cliente = Store.get('cliente');
    
    // 3. Si no hay cliente, ocultar y limpiar
    if (!cliente) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    // 4. Mostrar contenedor (aquí es donde ocurría el error antes)
    container.style.display = 'block';

    // 5. Calcular puntos y progreso
    const puntos = cliente.puntosLealtad || 0;
    const sellos = Math.floor(puntos / this.CONFIG.SELLOS_OBJETIVO);
    const progreso = Math.min(((puntos % this.CONFIG.SELLOS_OBJETIVO) / this.CONFIG.SELLOS_OBJETIVO) * 100, 100);

    // 6. Inyectar HTML
    container.innerHTML = `
      <div class="loyalty-card-mini" style="cursor:pointer;">
        <div class="loyalty-icon">🎁</div>
        <div class="loyalty-info">
          <strong>Tu Lealtad</strong>
          <small>${puntos} puntos acumulados</small>
        </div>
        <div class="loyalty-progress-bar" style="width:100%; height:6px; background:#eee; border-radius:3px; margin-top:5px;">
          <div class="loyalty-progress-fill" style="width: ${progreso}%; height:100%; background:var(--primary); border-radius:3px;"></div>
        </div>
      </div>
    `;
  },
  
  // Método para sumar puntos (usado por admin o tras compra)
  addStamp(clienteId) {
    console.log("Sumando puntos a:", clienteId);
    // Lógica de actualización...
  }
};