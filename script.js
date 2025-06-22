function agregarAFilaTabla(reg) {
  const tabla = document.getElementById("tablaHistorial").querySelector("tbody");
  const fila = document.createElement("tr");
  fila.innerHTML = `
    <td>${reg.factura}</td>
    <td>${reg.fecha}</td>
    <td>${reg.cliente}</td>
    <td>${reg.producto}</td>
    <td>${reg.cantidad}</td>
    <td>₡${reg.precio.toLocaleString()}</td>
    <td><strong style="color:#0074cc;">₡${reg.total.toLocaleString()}</strong></td>
  `;
  tabla.appendChild(fila);
}
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
window.onload = () => {
  document.getElementById("fecha").valueAsDate = new Date();
  actualizarTotal();
};

function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;

  const logo = new Image();
  logo.src = "logo.jpg"; // Logo debe estar en el mismo directorio

  logo.onload = function () {
    doc.addImage(logo, "JPEG", 150, 10, 40, 20); // Ajusta tamaño y posición

    doc.setFontSize(14);
    doc.text("Factura - Esentia", 20, 20);
    doc.setFontSize(10);
    doc.text(`Factura N°: ${factura}`, 20, 28);
    doc.text(`Fecha: ${fecha}`, 20, 35);
    doc.text(`Cliente: ${cliente}`, 20, 45);
    doc.text(`Producto: ${nombre}`, 20, 55);
    doc.text(`Cantidad: ${cantidad}`, 20, 65);
    doc.text(`Precio Unitario: ₡${precio.toFixed(2)}`, 20, 75);

    doc.setTextColor(0, 102, 204); // azul
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL A PAGAR: ₡${total.toLocaleString()}`, 20, 85);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Gracias por su compra - Fragancias que enamoran", 20, 100);

    doc.save(`Factura_${factura}.pdf`);
  };
}

function enviarWhatsApp() {
  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;

  const mensaje = `Hola Wilber, soy ${cliente}. Quiero confirmar mi pedido:\n` +
                  `🧾 Factura N°: ${factura}\n📅 Fecha: ${fecha}\n` +
                  `🧴 Producto: ${nombre}\n📦 Cantidad: ${cantidad}\n` +
                  `💰 Total: ₡${total.toLocaleString()}\n\nGracias.`;

  const url = `https://wa.me/50684079454?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

function guardarRegistro() {
  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;

  if (!window.registros) window.registros = [];

  const nuevoRegistro = {
  factura, fecha, cliente, producto: nombre,
  cantidad, precio, total
};
window.registros.push(nuevoRegistro);
agregarAFilaTabla(nuevoRegistro);


  let csv = "Factura,Fecha,Cliente,Producto,Cantidad,Precio,Total\n";
  window.registros.forEach(r => {
    csv += `${r.factura},${r.fecha},${r.cliente},${r.producto},${r.cantidad},${r.precio},${r.total}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "registros_factura.csv";
  a.click();
  URL.revokeObjectURL(url);
}
