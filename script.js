function getProductosSeleccionados() {
  const checks = document.querySelectorAll('input[type="checkbox"]:checked');
  const productos = [];

  checks.forEach(chk => {
    productos.push({
      nombre: chk.dataset.nombre,
      precio: parseInt(chk.dataset.precio),
      img: chk.dataset.img
    });
  });

  return productos;
}

function actualizarTotal() {
  const productos = getProductosSeleccionados();
  let subtotal = 0;

  productos.forEach(p => subtotal += p.precio);

  const descuento = subtotal * 0.0;
  const total = subtotal - descuento;

  document.getElementById("totalDisplay").textContent = `Total a pagar: ₡${total.toLocaleString()}`;
}

window.onload = () => {
  const ahora = new Date();
  const consecutivo = ahora.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const fecha = ahora.toLocaleDateString('es-CR');

  document.getElementById("factura").value = consecutivo;
  document.getElementById("fecha").value = fecha;

  document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener("change", actualizarTotal);
  });

  actualizarTotal();
};

function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const productos = getProductosSeleccionados();

  let subtotal = 0;
  productos.forEach(p => subtotal += p.precio);

  const descuento = subtotal * 0.0;
  const total = subtotal - descuento;

  // Cargar el logo como imagen base64 o desde URL
  const logoSrc = "images/logo.png"; // Ruta local relativa

  const imgProps = doc.getImageProperties(logoSrc);
  const pdfWidth = doc.internal.pageSize.getWidth();
  const imgWidth = 50; // Ancho del logo en mm
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  // Añadir logo
  doc.addImage(logoSrc, "PNG", 20, 10, imgWidth, imgHeight);

  // Datos de la factura
  doc.setFontSize(16);
  doc.text("🧾 Factura - Esentia", 20, 20 + imgHeight); // Ajuste debajo del logo
  doc.setFontSize(12);
  doc.text(`N°: ${factura}`, 20, 30 + imgHeight);
  doc.text(`Fecha: ${fecha}`, 20, 37 + imgHeight);
  doc.text(`Cliente: ${cliente}`, 20, 45 + imgHeight);

  let y = 55 + imgHeight;
  productos.forEach(p => {
    doc.text(`- ${p.nombre} - ₡${p.precio.toLocaleString()}`, 20, y);
    y += 7;
  });

  doc.text(`Subtotal: ₡${subtotal.toLocaleString()}`, 20, y + 5);
  doc.text(`Descuento: ₡${descuento.toLocaleString()}`, 20, y + 12);
  doc.setTextColor(0, 102, 204);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL A PAGAR: ₡${total.toLocaleString()}`, 20, y + 20);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  doc.text("Formas de pago:", 20, y + 30);
  doc.text("1. Efectivo contra entrega", 20, y + 37);
  doc.text("2. SINPE 72952454 - Wilber Calderón M.", 20, y + 44);
  doc.text("2. Transfereñncia BAC : CR59010200009453897656 - Wilber Calderón M.", 20, y + 44);

  // Guardar en historial CR59010200009453897656
  guardarFacturaEnHistorial({
    factura,
    fecha,
    cliente,
    productos,
    subtotal,
    descuento,
    total
  });

  // Mostrar PDF
  const pdfUrl = doc.output("bloburl");
  window.open(pdfUrl, "_blank");
}

function guardarFacturaEnHistorial(facturaData) {
  let historial = JSON.parse(localStorage.getItem("facturas")) || [];
  historial.push(facturaData);
  localStorage.setItem("facturas", JSON.stringify(historial));
}

function mostrarHistorial() {
  const historial = JSON.parse(localStorage.getItem("facturas")) || [];
  const contenedor = document.getElementById("historial");

  if (historial.length === 0) {
    contenedor.innerHTML = "<p>No hay facturas guardadas.</p>";
    return;
  }

  contenedor.innerHTML = "<ul style='list-style-type: none; padding-left: 0;'>";

  historial.forEach((factura, index) => {
    contenedor.innerHTML += `
      <li style="margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
        <strong>Factura N°:</strong> ${factura.factura}<br>
        <strong>Cliente:</strong> ${factura.cliente}<br>
        <strong>Total:</strong> ₡${factura.total.toLocaleString()}<br>
        <small>${factura.fecha}</small>
      </li>`;
  });

  contenedor.innerHTML += "</ul>";
}

function enviarFacturaPorWhatsApp() {
  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;
  const productos = getProductosSeleccionados();

  let subtotal = 0;
  productos.forEach(p => subtotal += p.precio);

  const descuento = subtotal * 0.0;
  const total = subtotal - descuento;

  let mensajeProductos = "";
  productos.forEach(p => {
    mensajeProductos += `- ${p.nombre} - ₡${p.precio.toLocaleString()}\n`;
  });

  const mensaje = `
🧾 *Factura Esentia*  
N°: ${factura}  
📅 Fecha: ${fecha}  
👤 Cliente: ${cliente}  

📦 Productos:  
${mensajeProductos}

💰 Subtotal: ₡${subtotal.toLocaleString()}  
🔖 Descuento: ₡${descuento.toLocaleString()}  
✅ Total a pagar: ₡${total.toLocaleString()}  

💳 Formas de pago:
1. Efectivo contra entrega  
2. SINPE 72952454 - Wilber Calderón M.
3.Transfereñncia BAC : CR59010200009453897656 - Wilber Calderón M
`;

  const url = `https://wa.me/506 ${numero}?text=${mensaje}`;
  window.open(url, '_blank');
}

function enviarCatalogo() {
  const numero = document.getElementById("telCliente").value.trim();
  if (!numero || numero.length < 8) {
    alert("Ingrese un número válido");
    return;
  }

  const catalogoTexto = `
🌿 *Catálogo Esentia* 🌿

Aromatizantes para el Hogar:
- Chocolate 30 ml - ₡3500
- Coco Cookies 30 ml - ₡3500
- Durazno 30 ml - ₡3500
- ...

Aromatizantes para Auto:
- 

Ver más detalles aquí:  https://wil1979.github.io/esentia-factura/catalogo.html 
  `;

  const mensaje = encodeURIComponent(catalogoTexto);
  const url = `https://wa.me/506 ${numero}?text=${mensaje}`;
  window.open(url, '_blank');
}