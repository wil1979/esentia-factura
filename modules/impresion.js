// modules/impresion.js
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const ImpresionManager = {
  facturasCache: [],

  // ✅ URL BASE PARA VISUALIZACIÓN ONLINE (ajustar según tu dominio)
  BASE_URL: "https://wil1979.github.io/esentia-factura",

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

    document.getElementById('buscarFacturaImpresion').addEventListener('input', (e) => {
      this.filtrarFacturas(e.target.value);
    });

    await this.cargarFacturas();
  },

  async cargarFacturas() {
    const container = document.getElementById('listaFacturasImpresion');
    try {
      const snap = await getDocs(collection(DB.db, "facturas_rapidas"));
      
      this.facturasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      this.renderizarLista(this.facturasCache);
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p style="color:red; text-align:center;">❌ Error al cargar facturas</p>';
    }
  },

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
        <div class="fr-total">₡${(f.total || 0).toLocaleString()}</div>
        <div class="fr-actions">
          <button class="btn-print" onclick="ImpresionManager.imprimir('${f.id}')">🖨️ Imprimir</button>
          <button class="btn-qr" onclick="ImpresionManager.verQR('${f.id}')">📱 QR Online</button>
          <button class="btn-wa" onclick="ImpresionManager.enviarWhatsApp('${f.id}')">📱 Reenviar</button>
        </div>
      </div>
    `).join('');
  },

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

  // ✅ NUEVO: Mostrar QR grande para escanear desde pantalla
  verQR(facturaId) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return UI.toast('Factura no encontrada', 'error');

    const facturaURL = `${this.BASE_URL}/ver-factura.html?id=${facturaId}`;
    const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(facturaURL)}`;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalQROnline';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <button class="modal-close" onclick="UI.modal('modalQROnline','close')">✕</button>
        <h2>📱 Factura Online</h2>
        <p>Escanea este código para ver la factura en tu celular:</p>
        <img src="${qrURL}" alt="QR Factura" style="width: 300px; height: 300px; margin: 20px 0; border: 2px solid #eee; border-radius: 8px;">
        <p style="font-size: 0.9rem; color: #666;">O visita:<br><a href="${facturaURL}" target="_blank" style="word-break: break-all;">${facturaURL}</a></p>
        <button class="btn-primary" onclick="window.open('${facturaURL}', '_blank')" style="margin-top: 15px;">🌐 Abrir en Navegador</button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  // ✅ IMPRIMIR CON QR INTEGRADO
  imprimir(facturaId) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return UI.toast('Factura no encontrada', 'error');

    const ventana = window.open('', '_blank', 'width=400,height=800');
    
    // URL para el QR en el ticket impreso
    const facturaURL = `${this.BASE_URL}/ver-factura.html?id=${facturaId}`;
    const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(facturaURL)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket ${factura.id.slice(-6)}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            background: white;
            color: #000;
          }
          .center { text-align: center; }
          .line { border-bottom: 1px dashed #000; margin: 8px 0; }
          
          .header h1 { margin: 0; font-size: 16px; font-weight: bold; }
          .header h2 { margin: 2px 0; font-size: 12px; font-weight: normal; }
          .header p { margin: 2px 0; font-size: 11px; }
          
          .info p { margin: 3px 0; font-size: 11px; }
          
          .prod { margin-bottom: 6px; }
          .prod-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
          .prod-detail { font-size: 10px; display: flex; justify-content: space-between; }
          
          .totals { margin-top: 8px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; }
          .grand-total { font-size: 14px; font-weight: bold; margin-top: 4px; }
          
          .qr-section { 
            margin-top: 10px; 
            text-align: center; 
            border: 1px solid #ccc; 
            padding: 8px; 
            border-radius: 4px;
          }
          .qr-section p { margin: 4px 0; font-size: 10px; }
          .qr-section img { width: 120px; height: 120px; margin: 5px auto; display: block; }
          
          .footer { margin-top: 10px; text-align: center; font-size: 10px; }
          
          @media print {
            @page { size: auto; margin: 0mm; }
            body { width: 80mm; margin: 0; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <h1>🌸 ESENTIA</h1>
          <h2>Comprobante de Venta</h2>
          <p>Fecha: ${new Date(factura.fecha).toLocaleString()}</p>
        </div>
        
        <div class="line"></div>
        
        <div class="info">
          <p><strong>Cliente:</strong> ${factura.clienteNombre}</p>
          <p><strong>Cédula:</strong> ${factura.clienteId}</p>
          <p><strong>Método:</strong> ${factura.metodoPago || 'Contado'}</p>
        </div>
        
        <div class="line"></div>
        
        <div class="productos">
          ${factura.productos.map(p => `
            <div class="prod">
              <div class="prod-header">
                <span>${p.nombre}</span>
                <span>₡${p.subtotal.toLocaleString()}</span>
              </div>
              <div class="prod-detail">
                <span>x${p.cantidad} ${p.variante}</span>
                <span>@ ₡${p.precio.toLocaleString()}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="line"></div>
        
        <div class="totals">
          <div class="total-row"><span>Subtotal:</span><span>₡${(factura.subtotal || 0).toLocaleString()}</span></div>
          ${factura.descuento > 0 ? `<div class="total-row"><span>Descuento:</span><span>-₡${factura.descuento.toLocaleString()}</span></div>` : ''}
          <div class="total-row grand-total"><span>TOTAL:</span><span>₡${(factura.total || 0).toLocaleString()}</span></div>
        </div>
        
        <div class="line"></div>
        
        <!-- ✅ SECCIÓN QR ONLINE -->
        <div class="qr-section">
          <p><strong>📱 Factura Online</strong></p>
          <img src="${qrURL}" alt="QR Factura">
          <p>Escanea para ver en tu celular</p>
          <p style="font-size: 9px; word-break: break-all;">${facturaURL}</p>
        </div>
        
        <div class="line"></div>
        
        <div class="footer">
          <p>¡Gracias por su compra! 🌸</p>
          <p>📞 64551490 | 📱 72952454</p>
        </div>

        <div class="no-print" style="margin-top: 15px; text-align: center;">
          <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; cursor: pointer; background: #333; color: white; border: none; border-radius: 4px;">🖨️ IMPRIMIR</button>
        </div>
      </body>
      </html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  },

  async enviarWhatsApp(facturaId) {
    const factura = this.facturasCache.find(f => f.id === facturaId);
    if (!factura) return;

    const telefono = factura.clienteTelefono?.replace(/\D/g, '') || '';
    if (!telefono || telefono.length < 8) {
      return UI.toast('⚠️ El cliente no tiene teléfono registrado', 'warning');
    }
    
    const cleanPhone = telefono.length === 8 ? '506' + telefono : telefono;
    const facturaURL = `${this.BASE_URL}/ver-factura.html?id=${factura.id}`;

    let mensaje = `🧾 *FACTURA ESENTIA*\n`;
    mensaje += `👤 ${factura.clienteNombre}\n`;
    mensaje += `📅 ${new Date(factura.fecha).toLocaleDateString()}\n\n`;
    mensaje += `*Detalle:*\n`;
    
    (factura.productos || []).forEach(p => {
      mensaje += `• ${p.nombre} x${p.cantidad} - ₡${p.subtotal.toLocaleString()}\n`;
    });

    mensaje += `\n💰 *TOTAL: ₡${(factura.total || 0).toLocaleString()}*\n`;
    mensaje += `💳 Método: ${factura.metodoPago?.toUpperCase() || 'CONTADO'}\n`;
    mensaje += `\n🌐 Ver factura online:\n${facturaURL}\n`;
    mensaje += `\n¡Gracias! 🌸`;
    
    if (confirm('¿Deseas abrir WhatsApp para enviar esta factura?')) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
    }
  }
};

export default ImpresionManager;