// modules/impresion.js
export const ImpresionManager = {
  imprimirFactura(factura) {
    const ventana = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Factura ${factura.id || 'N/A'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .cliente { margin-bottom: 20px; }
          .productos { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .productos th, .productos td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .productos th { background: #f5f5f5; }
          .totales { text-align: right; margin-top: 20px; font-size: 1.2em; }
          .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌸 ESENTIA</h1>
          <p>Factura #${factura.id?.slice(-6) || 'N/A'}</p>
          <p>${new Date(factura.fecha).toLocaleString()}</p>
        </div>
        <div class="cliente">
          <strong>Cliente:</strong> ${factura.clienteNombre}<br>
          <strong>Cédula:</strong> ${factura.clienteId}<br>
          <strong>Teléfono:</strong> ${factura.clienteTelefono || 'N/A'}
        </div>
        <table class="productos">
          <thead>
            <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            ${factura.productos.map(p => `
              <tr>
                <td>${p.nombre} (${p.variante})</td>
                <td>${p.cantidad}</td>
                <td>₡${p.precio.toLocaleString()}</td>
                <td>₡${p.subtotal.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="totales">
          <p><strong>Subtotal: ₡${factura.subtotal.toLocaleString()}</strong></p>
          ${factura.descuento > 0 ? `<p>Descuento: -₡${factura.descuento.toLocaleString()}</p>` : ''}
          <p style="font-size: 1.3em; color: #25d366;"><strong>TOTAL: ₡${factura.total.toLocaleString()}</strong></p>
          <p>Método: ${factura.metodoPago || 'Contado'}</p>
        </div>
        <div class="footer">
          <p>¡Gracias por su compra! 🌸</p>
          <p>Tel: 25525503 | WhatsApp: 72952454</p>
        </div>
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">🖨️ Imprimir</button>
      </body>
      </html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  },

  imprimirRecordatorio(cliente, deuda) {
    const ventana = window.open('', '_blank');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recordatorio de Pago</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 2px solid #e74c3c; }
          .alert { background: #ffebee; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px; }
          .cliente { margin: 20px 0; }
          .deuda { font-size: 2em; color: #e74c3c; text-align: center; margin: 20px 0; }
          .datos-pago { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="alert">
          <h2>⚠️ RECORDATORIO DE PAGO</h2>
        </div>
        <div class="cliente">
          <strong>Cliente:</strong> ${cliente.nombre}<br>
          <strong>Cédula:</strong> ${cliente.cedula}<br>
          <strong>Teléfono:</strong> ${cliente.telefono}
        </div>
        <div class="deuda">
          <strong>Monto Pendiente: ₡${deuda.toLocaleString()}</strong>
        </div>
        <div class="datos-pago">
          <h3>Datos de Pago:</h3>
          <p><strong>SINPE Móvil:</strong> 72952454</p>
          <p><strong>IBAN BN:</strong> CR76015114620010283743</p>
          <p><strong>Opción BN/BCR:</strong> SMS "PASE ${Math.round(deuda)} 72952454"</p>
        </div>
        <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">🖨️ Imprimir</button>
      </body>
      </html>
    `;
    ventana.document.write(html);
    ventana.document.close();
  }
};

export default ImpresionManager;