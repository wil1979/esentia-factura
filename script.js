function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = document.getElementById("cliente").value;
  const producto = document.getElementById("producto").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const precio = parseFloat(document.getElementById("precio").value);
  const total = cantidad * precio;

  doc.setFontSize(16);
  doc.text("Factura - Esentia", 20, 20);
  doc.setFontSize(12);
  doc.text(`Cliente: ${cliente}`, 20, 30);
  doc.text(`Producto: ${producto}`, 20, 40);
  doc.text(`Cantidad: ${cantidad}`, 20, 50);
  doc.text(`Precio Unitario: ₡${precio.toFixed(2)}`, 20, 60);
  doc.text(`Total a pagar: ₡${total.toFixed(2)}`, 20, 70);
  doc.text("Gracias por su compra - Fragancias que enamoran", 20, 90);

  doc.save(`Factura_${cliente}.pdf`);
}

function enviarWhatsApp() {
  const cliente = document.getElementById("cliente").value;
  const producto = document.getElementById("producto").value;
  const cantidad = document.getElementById("cantidad").value;
  const precio = document.getElementById("precio").value;
  const total = cantidad * precio;

  const mensaje = `Hola Wilber, soy ${cliente}. Quiero confirmar mi pedido:\n` +
                  `🧴 Producto: ${producto}\n` +
                  `📦 Cantidad: ${cantidad}\n` +
                  `💰 Total: ₡${total.toFixed(2)}\n\n` +
                  `Gracias, quedo atento(a) a la factura.`;

  const url = `https://wa.me/50684079454?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}
