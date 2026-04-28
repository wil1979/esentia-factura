// modules/impresion.js
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const ImpresionManager = {
  facturasCache: [],

  // ✅ PANEL PRINCIPAL
  async mostrarPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalImpresion';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalImpresion','close')">✕</button>
        <h2>🖨️ Impresión y Reenvío de Facturas</h2>
        
        <div class="impresion-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="buscarFacturaImpresion" placeholder="Buscar por cliente, cédula o ID...">
          </div>
          <button class="btn-secondary" onclick="ImpresionManager.cargarFacturas()">🔄 Actualizar</button>
        </div>

        <div id="listaFacturasImpresion" class="facturas-lista-impresion">
          <div class="loading-state">🔄 Cargando facturas...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Event Listener para búsqueda
    document.getElementById('buscarFacturaImpresion').addEventListener('input', (e) => {
      this.filtrarFacturas(e.target.value);
    });

    await this.cargarFacturas();
  },

  // ✅ CARGAR FACTURAS
  async cargarFacturas() {
    const container = document.getElementById('listaFacturasImpresion');
    try {
      // Cargar desde facturas_rapidas
      const snap = await getDocs(collection(DB.db, "facturas_rapidas"));
      
      this.facturasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar por fecha reciente

      this.renderizarLista(this.facturasCache);
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="color:red; text-align:center;">❌ Error al cargar facturas</p>';
    }
  },

  // ✅ RENDERIZAR LISTA
  renderizarLista(facturas) {
    const container = document.getElementById('listaFacturasImpresion');
    
    if (facturas.length === 0) {
      container.innerHTML = '<p class="no-data">No se encontraron facturas</p>';
      return;
    }

    container.innerHTML = facturas.map(f => `
      <div class="factura-row-impresion">
        <div class="fr-info">
          <strong>${f.clienteNombre || 'Cliente'}</strong>
          <small>📅 ${new Date(f.fecha).toLocaleDateString()} | 🆔 ...${f.id.slice(-6).toUpperCase()}</small>
        </div>
        <div class="fr-total">
          ₡${(f.total || 0).toLocaleString()}
        </div>
        <div class="fr-actions">
          <button class="btn-print" onclick="ImpresionManager.imprimir('${f.id}')">🖨️ Imprimir</button>
          <button class="btn-wa" onclick="ImpresionManager.enviarWhatsApp('${f.id}')">📱 Reenviar</button>
        </div>
      </div>
    `).join('');
  },

  // ✅ FILTRAR
  filtrarFacturas(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderizarLista(this.facturasCache);
      return;
    }

    const filtradas = this.facturasCache.filter(f => 
      (f.clienteNombre && f.clienteNombre.toLowerCase().includes(q)) ||
      (f.clienteId && f.clienteId.includes(q)) ||
      f.id.includes(q)
    );
    this.renderizarLista(filtradas);
  },

  // ✅ IMPRIMIR
  imprimir(facturaId) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return UI.toast('Factura no encontrada', 'error');

    const ventana = window.open('', '_blank', 'width=800,height=600');
    
    // HTML Limpio para impresión
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura ${factura.id.slice(-6)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; color: #667eea; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f4f4f4; }
          .totals { text-align: right; }
          .total-final { font-size: 1.5em; font-weight: bold; margin-top: 10px; }
          .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #777; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌸 ESENTIA</h1>
          <p>Factura #${factura.id.slice(-6).toUpperCase()}</p>
          <p>${new Date(factura.fecha).toLocaleString()}</p>
        </div>

        <div class="info-grid">
          <div>
            <strong>Cliente:</strong> ${factura.clienteNombre}<br>
            <strong>Cédula:</strong> ${factura.clienteId}
          </div>
          <div style="text-align:right">
            <strong>Teléfono:</strong> ${factura.clienteTelefono || 'N/A'}<br>
            <strong>Método:</strong> ${factura.metodoPago || 'Contado'}
          </div>
        </div>

        <table>
          <thead>
            <tr><th>Producto</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            ${(factura.productos || []).map(p => `
              <tr>
                <td>${p.nombre} <small>(${p.variante})</small></td>
                <td>${p.cantidad}</td>
                <td>₡${p.precio.toLocaleString()}</td>
                <td>₡${p.subtotal.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <p>Subtotal: ₡${(factura.subtotal || 0).toLocaleString()}</p>
          ${factura.descuento > 0 ? `<p>Descuento: -₡${factura.descuento.toLocaleString()}</p>` : ''}
          <div class="total-final">TOTAL: ₡${(factura.total || 0).toLocaleString()}</div>
        </div>

        <div class="footer">
          <p>¡Gracias por su compra! 🌸</p>
          <p>Tel: 25525503 | WhatsApp: 72952454</p>
        </div>

        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; cursor: pointer; border-radius: 5px;">🖨️ IMPRIMIR</button>
      </body>
      </html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  },

  // ✅ REENVIAR WHATSAPP
  async enviarWhatsApp(facturaId) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return;

    const telefono = factura.clienteTelefono?.replace(/\D/g, '') || '';
    if (!telefono || telefono.length < 8) {
      return UI.toast('⚠️ El cliente no tiene teléfono registrado', 'warning');
    }
    
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;

    let mensaje = `🧾 *FACTURA ESENTIA*\n`;
    mensaje += `👤 ${factura.clienteNombre}\n`;
    mensaje += `📅 ${new Date(factura.fecha).toLocaleDateString()}\n\n`;
    mensaje += `*Detalle:*\n`;
    
    (factura.productos || []).forEach(p => {
      mensaje += `• ${p.nombre} x${p.cantidad} - ₡${p.subtotal.toLocaleString()}\n`;
    });

    mensaje += `\n💰 *TOTAL: ₡${(factura.total || 0).toLocaleString()}*\n`;
    mensaje += `💳 Método: ${factura.metodoPago?.toUpperCase() || 'CONTADO'}`;
    
    if (confirm('¿Deseas abrir WhatsApp para enviar esta factura?')) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    }
  }
};

export default ImpresionManager;