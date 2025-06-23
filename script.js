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
  let subtotal = cantidad * precio;
  let descuento = 0;
  if (cantidad >= 2) {
    descuento = 500;
  }
  const total = subtotal - descuento;
  document.getElementById("totalDisplay").textContent = `Total a pagar: ₡${total.toLocaleString()}`;
}

window.onload = () => {
  const ahora = new Date();
  const consecutivo = ahora.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const fecha = ahora.toLocaleDateString('es-CR');
  document.getElementById("factura").value = consecutivo;
  document.getElementById("fecha").value = fecha;
  actualizarTotal();
  document.getElementById("producto").addEventListener("change", actualizarTotal);
  document.getElementById("cantidad").addEventListener("input", actualizarTotal);
};

function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  let subtotal = cantidad * precio;
  let descuento = 0;
  if (cantidad >= 2) {
    descuento = 500;
  }
  const total = subtotal - descuento;

  doc.setFontSize(16);
  doc.text("Factura - Esentia", 20, 20);
  doc.setFontSize(12);
  doc.text(`Factura N°: ${factura}`, 20, 30);
  doc.text(`Fecha: ${fecha}`, 20, 37);
  doc.text(`Cliente: ${cliente}`, 20, 45);
  doc.text(`Producto: ${nombre}`, 20, 55);
  doc.text(`Cantidad: ${cantidad}`, 20, 65);
  doc.text(`Precio Unitario: ₡${precio.toFixed(2)}`, 20, 75);
  doc.text(`Subtotal: ₡${subtotal.toLocaleString()}`, 20, 82);
  if (descuento > 0) doc.text(`Descuento aplicado: -₡${descuento.toLocaleString()}`, 20, 89);
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL A PAGAR: ₡${total.toLocaleString()}`, 20, 96);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text("Formas de pago:", 20, 105);
  doc.text("1. Efectivo contra entrega", 20, 112);
  doc.text("2. SINPE 72952454 - Wilber Calderón M.", 20, 119);
  doc.text("Gracias por su compra - Fragancias que enamoran", 20, 130);

  doc.save(`Factura_${factura}.pdf`);
}

function enviarWhatsApp() {
  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  let subtotal = cantidad * precio;
  let descuento = 0;
  if (cantidad >= 2) {
    descuento = 500;
  }
  const total = subtotal - descuento;

  const mensaje = `Hola Wilber, soy ${cliente}. Quiero confirmar mi pedido:\n` +
                  `🧾 Factura N°: ${factura}\n📅 Fecha: ${fecha}\n` +
                  `🧴 Producto: ${nombre}\n📦 Cantidad: ${cantidad}\n` +
                  `💰 Subtotal: ₡${subtotal.toLocaleString()}\n` +
                  `🔖 Descuento: ₡${descuento.toLocaleString()}\n` +
                  `💰 Total: ₡${total.toLocaleString()}\n\n` +
                  `💳 Formas de pago:\n1. Efectivo contra entrega\n2. SINPE 72952454 - Wilber Calderón M.`;

  const url = `https://wa.me/50684079454?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

function enviarCatalogo() {
  const numero = document.getElementById("telCliente").value.trim();
  if (!numero || numero.length < 8) {
    alert("Ingrese un número válido");
    return;
  }

  const mensaje = "Hola, te comparto el catálogo de Esentia 🌿:\nhttps://wil1979.github.io/esentia-factura/catalogo.html";
  const url = `https://wa.me/506${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}
