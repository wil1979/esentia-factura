function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Datos del cliente y producto
  const cliente = document.getElementById("cliente").value.trim();
  const cantidad = parseInt(document.getElementById("cantidad").value);
  const { nombre, precio } = getPrecioYNombreProducto();
  const total = cantidad * precio;

  // Validación básica
  if (!cliente || cantidad <= 0) {
    alert("Por favor, complete todos los campos correctamente.");
    return;
  }

  // Insertar el logo
  const imgLogo = "image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQA..."; // Reemplaza esto con tu base64
  doc.addImage(imgLogo, 'PNG', 150, 10, 40, 20); // x, y, ancho, alto

  // Estilos visuales
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 204); // Azul oscuro
  doc.text("Esentia Fragancias", 20, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0); // Negro
  doc.text("RUC: 123456789", 20, 40);
  doc.text("Teléfono: +506 8407-9454", 20, 50);
  doc.text("Correo: info@esentia.com", 20, 60);
  doc.line(20, 65, 190, 65); // Separador

  // Información del cliente
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Cliente", 20, 75);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${cliente}`, 20, 85);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 95);

  // Detalles del producto
  doc.setFont("helvetica", "bold");
  doc.text("Detalles del Pedido", 20, 110);
  doc.setFont("helvetica", "normal");
  doc.text(`Producto: ${nombre}`, 20, 120);
  doc.text(`Cantidad: ${cantidad}`, 20, 130);
  doc.text(`Precio Unitario: ₡${precio.toLocaleString()}`, 20, 140);
  doc.text(`Total: ₡${total.toLocaleString()}`, 20, 150);

  // Métodos de pago
  doc.setFont("helvetica", "bold");
  doc.text("Métodos de Pago", 20, 165);
  doc.setFont("helvetica", "normal");
  doc.text("Transferencia bancaria: BAC San José -#Cliente: WILBER GONZALO cuenta IBAN: CR59010200009453897656", 20, 175);
  doc.text("Sinpe / Numero: 72952454 ", 20, 185);
  doc.text("Efectivo contra entrega (previa coordinación)", 20, 195);

  // Agradecimiento final
  doc.setFont("helvetica", "italic");
  doc.text("Gracias por su compra - Fragancias que enamoran", 20, 210);

  // Guardar documento
  doc.save(`Factura_${cliente.replace(/\s+/g, '_')}.pdf`);
}