let productosFactura = [];

const productosDisponibles = [
  { nombre: "Aromatizante Melon & Vainilla", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Chocolate", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Coco", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Coco Cookies", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Pina Colada", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Fresa", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Melocotón", categoria: "🍬 Aromas Dulces", precio: 3000 },
  { nombre: "Aromatizante Manzana Canela", categoria: "🍬 Aromas Dulces", precio: 3000 },

  { nombre: "Aromatizante Lavanda", categoria: "🌸 Aromas Florales", precio: 3000 },
  { nombre: "Aromatizante Magnolia", categoria: "🌸 Aromas Florales", precio: 3000 },
  { nombre: "Aromatizante Rosa", categoria: "🌸 Aromas Florales", precio: 3000 },
  { nombre: "Aromatizante Violeta", categoria: "🌸 Aromas Florales", precio: 3000 },

  { nombre: "Aromatizante Frutos Rojos", categoria: "🍊 Aromas Cítricos y Frutales", precio: 3000 },
  { nombre: "Aromatizante Naranja", categoria: "🍊 Aromas Cítricos y Frutales", precio: 3000 },
  { nombre: "Aromatizante Citronela", categoria: "🍊 Aromas Cítricos y Frutales", precio: 3000 },

  { nombre: "Aromatizante Eco Bambú", categoria: "🌿 Naturales y Herbales", precio: 3000 },
  { nombre: "Aromatizante Pino", categoria: "🌿 Naturales y Herbales", precio: 3000 },
  { nombre: "Aromatizante Sándalo", categoria: "🌿 Naturales y Herbales", precio: 3000 },

  { nombre: "Aromatizante Océano", categoria: "🌊 Frescos y Ambientales", precio: 3000 },
  { nombre: "Aromatizante Navidad", categoria: "🌊 Frescos y Ambientales", precio: 3000 },
  { nombre: "Aromatizante Antitabaco", categoria: "🌊 Frescos y Ambientales", precio: 3000 },

  { nombre: "Aromatizante Baby", categoria: "👶 Línea Especial", precio: 3000 },
  { nombre: "Aromatizante Blanc", categoria: "👶 Línea Especial", precio: 3000 },
  { nombre: "Aromatizante Bleu", categoria: "👶 Línea Especial", precio: 3000 }
];

window.onload = () => {
  const ahora = new Date();
  const consecutivo = ahora.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const fecha = ahora.toLocaleDateString('es-CR');

  document.getElementById("factura").value = consecutivo;
  document.getElementById("fecha").value = fecha;
  actualizarTotal();
};

function agregarProducto() {
  const sel = document.getElementById("productoSelect");
  const [nombre, precio] = sel.value.split("|");
  const cantidad = parseInt(document.getElementById("cantidadSelect").value) || 1;
  if (!nombre) return alert("Selecciona un producto válido");

  productosFactura.push({ nombre, precio: parseInt(precio), cantidad });
  actualizarVistaProductos();
  actualizarTotal();
}

function actualizarVistaProductos() {
  const ul = document.getElementById("listaProductos");
  ul.innerHTML = "";
  productosFactura.forEach((p, i) => {
    ul.innerHTML += `<li>${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}
      <button onclick="productosFactura.splice(${i},1); actualizarVistaProductos(); actualizarTotal();">🗑️</button></li>`;
  });
}

function actualizarTotal() {
  let subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoFijo = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuento = descuentoFijo + (subtotal * descuentoPorcentaje / 100);
  const total = subtotal - descuento;

  document.getElementById("totalDisplay").textContent = `Total a pagar: ₡${total.toLocaleString()}`;
}

function generarFactura() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;

  let subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoFijo = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuento = descuentoFijo + (subtotal * descuentoPorcentaje / 100);
  const total = subtotal - descuento;

  doc.setFontSize(16);
  doc.text("🧾 Factura - Esentia", 20, 20);
  doc.setFontSize(12);
  doc.text(`N°: ${factura}`, 20, 30);
  doc.text(`Fecha: ${fecha}`, 20, 37);
  doc.text(`Cliente: ${cliente}`, 20, 45);

  let y = 55;
  productosFactura.forEach(p => {
    doc.text(`- ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}`, 20, y);
    y += 7;
  });

  doc.text(`Subtotal: ₡${subtotal.toLocaleString()}`, 20, y + 5);
  doc.text(`Descuento: ₡${descuento.toLocaleString()}`, 20, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 102, 204);
  doc.text(`TOTAL A PAGAR: ₡${total.toLocaleString()}`, 20, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  doc.text("Formas de pago:", 20, y + 30);
  doc.text("1. Efectivo contra entrega", 20, y + 37);
  doc.text("2. SINPE 72952454 - Wilber Calderón M.", 20, y + 44);
  doc.text("3. BAC: CR59010200009453897656 - Wilber Calderón M.", 20, y + 51)
  // Agregar enlace y mensaje
  doc.setTextColor(0, 102, 204);
  doc.text("Encuentra tus fragancias favoritas aquí:", 20, y + 65);
  doc.text("https://wil1979.github.io/esentia-factura/catalogo.html", 20, y + 72);

  guardarFacturaEnHistorial({
    factura, fecha, cliente,
    productos: productosFactura,
    subtotal, descuento, total
  });

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

  historial.forEach(f => {
    contenedor.innerHTML += `
      <li style="margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
        <strong>Factura N°:</strong> ${f.factura}<br>
        <strong>Cliente:</strong> ${f.cliente}<br>
        <strong>Total:</strong> ₡${f.total.toLocaleString()}<br>
        <small>${f.fecha}</small>
      </li>`;
  });

  contenedor.innerHTML += "</ul>";
}

function borrarHistorial() {
  localStorage.removeItem("facturas");
  mostrarHistorial();
}

function enviarFacturaPorWhatsApp() {
  const numero = document.getElementById("numeroWhatsApp").value.trim();

  if (!/^[678]\d{7}$/.test(numero)) {
    alert("Ingrese un número válido de 8 dígitos que empiece con 6, 7 u 8.");
    return;
  }

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;

  let subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoFijo = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuento = descuentoFijo + (subtotal * descuentoPorcentaje / 100);
  const total = subtotal - descuento;

  let mensajeProductos = "";
  productosFactura.forEach(p => {
    mensajeProductos += `- ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}\n`;
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
2. SINPE 72952454  Wilber Calderon M
3. Transferencia BAC: CR59010200009453897656  Wilber Calderon M
🌿 Encuentra tus fragancias favoritas aquí:  
https://wil1979.github.io/esentia-factura/catalogo.html
`;

  const mensajeCodificado = encodeURIComponent(mensaje);
  const url = `https://wa.me/506${numero}?text=${mensajeCodificado}`;
  window.open(url, '_blank');
}

function enviarCatalogo() {
  const numero = document.getElementById("telCliente").value.trim();

  if (!/^[678]\d{7}$/.test(numero)) {
    alert("Ingrese un número válido (8 dígitos que empiece con 6, 7 u 8)");
    return;
  }

  const catalogoTexto = `
🌿 *Catálogo Esentia*  
Consulta por tu aroma favorito👇🏻

https://wil1979.github.io/esentia-factura/catalogo.html
  `;

  const mensaje = encodeURIComponent(catalogoTexto);
  const url = `https://wa.me/506${numero}?text=${mensaje}`;
  window.open(url, '_blank');
}


  $(document).ready(function() {
    $('#productoSelect').select2({
      placeholder: 'Busca un producto',
      allowClear: true
    });
  });


// API Hacienda
document.getElementById("idCliente").addEventListener("blur", () => {
  const cedula = document.getElementById("idCliente").value.trim();
  if (!cedula) return;

  fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`)
    .then(response => response.json())
    .then(data => {
      if (data.nombre) {
        document.getElementById("cliente").value = data.nombre;
      } else {
        alert("No se encontró información para este ID.");
      }
    })
    .catch(() => alert("Error al consultar la API de Hacienda"));
});

function filtrarProductos() {
  const texto = document.getElementById("buscarNombre").value.toLowerCase();
  const categoria = document.getElementById("buscarCategoria").value;
  const precioMin = parseFloat(document.getElementById("precioMin").value) || 0;
  const precioMax = parseFloat(document.getElementById("precioMax").value) || Infinity;

  const resultados = productosDisponibles.filter(p =>
    p.nombre.toLowerCase().includes(texto) &&
    (categoria === "" || p.categoria === categoria) &&
    p.precio >= precioMin &&
    p.precio <= precioMax
  );

  mostrarResultados(resultados);
}

function mostrarResultados(productos) {
  const div = document.getElementById("resultadosFiltro");
  if (productos.length === 0) {
    div.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  div.innerHTML = productos.map((p, i) => `
    <div style="margin-bottom: 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.3rem;">
      <strong>${p.nombre}</strong> – ${p.categoria} – ₡${p.precio.toLocaleString()}
      <br/>
      Cantidad: <input type="number" id="cant${i}" value="1" min="1" style="width: 60px;" />
      <button onclick="agregarDesdeBusqueda('${p.nombre}', ${p.precio}, 'cant${i}')">Agregar</button>
    </div>
  `).join("");
}

function agregarDesdeBusqueda(nombre, precio, inputId) {
  const cantidad = parseInt(document.getElementById(inputId).value) || 1;
  productosFactura.push({ nombre, precio, cantidad });
  actualizarVistaProductos();
  actualizarTotal();
  alert(`✅ ${nombre} x${cantidad} agregado`);
}