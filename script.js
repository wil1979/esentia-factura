function getPrecioYNombreProducto() {
  const productoSelect = document.getElementById("producto").value;
  let nombre = "";
  let precio = 0;

  if (productoSelect === "aceite") {
    nombre = "Aromatizante en Aceite con atomizador 30 ml";
    precio = 3500;
  } else if (productoSelect === "auto") {
    nombre = "Aromatizante Ambiental para Auto 50 ml";
    precio = 2500;
  }

  return { nombre, precio };
}

function actualizarTotal() {
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;
  document.getElementById("totalDisplay").textContent = `Total a pagar: ₡${total.toLocaleString()}`;
}

document.getElementById("producto").addEventListener("change", actualizarTotal);
document.getElementById("cantidad").addEventListener("input", actualizarTotal);
window.onload = actualizarTotal;

function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;

  doc.setFontSize(16);
  doc.text("Factura - Esentia", 20, 20);
  doc.setFontSize(12);
  doc.text(`Cliente: ${cliente}`, 20, 30);
  doc.text(`Producto: ${nombre}`, 20, 40);
  doc.text(`Cantidad: ${cantidad}`, 20, 50);
  doc.text(`Precio Unitario: ₡${precio.toFixed(2)}`, 20, 60);
  doc.text(`Total a pagar: ₡${total.toFixed(2)}`, 20, 70);
  doc.text("Gracias por su compra - Fragancias que enamoran", 20, 90);

  doc.save(`Factura_${cliente}.pdf`);
}

function enviarWhatsApp() {
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;

  const mensaje = `Hola Wilber, soy ${cliente}. Quiero confirmar mi pedido:\n` +
                  `🧴 Producto: ${nombre}\n` +
                  `📦 Cantidad: ${cantidad}\n` +
                  `💰 Total: ₡${total.toLocaleString()}\n\n` +
                  `Gracias, quedo atento(a) a la factura.`;

  const url = `https://wa.me/50684079454?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}
