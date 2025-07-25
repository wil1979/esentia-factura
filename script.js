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
   // 🔧 Cargar productos en el select
  cargarProductosDesdeCatalogo
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

  // Agregar logo al PDF
  const imgData = "images/logo.png"; // Asegúrate de tener el logo
  doc.addImage(imgData, "PNG", 15, 10, 40, 20);

  // Encabezado
  doc.setFontSize(16);
  doc.text("🧾 Factura - Esentia", 60, 20);
  doc.setFontSize(12);
  doc.text(`N°: ${factura}`, 15, 35);
  doc.text(`Fecha: ${fecha}`, 15, 45);
  doc.text(`Cliente: ${cliente}`, 15, 55);

 // Productos
  let y = 70;
  productosFactura.forEach(p => {
    doc.text(`• ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}`, 15, y);
    y += 10;
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
let productosFactura = [];

// Cargar productos desde el catálogo
function cargarProductosDesdeCatalogo() {
  const sel = document.getElementById("productoSelect");
  if (!sel) return;

  sel.innerHTML = '<option value="">-- Selecciona un producto --</option>';

  categorias.forEach(categoria => {
    const grupo = document.createElement("optgroup");
    grupo.label = categoria.nombre;

    categoria.productos.forEach(producto => {
      const precioFinal = producto.precioOferta || producto.precio;
      const option = document.createElement("option");
      option.value = `${producto.nombre}|${precioFinal}`;
      option.textContent = `${producto.nombre} – ₡${precioFinal.toLocaleString()}`;
      grupo.appendChild(option);
    });

    sel.appendChild(grupo);
  });
}

// Agregar producto al carrito de factura
function agregarProducto() {
  const sel = document.getElementById("productoSelect");
  const [nombre, precio] = sel.value.split("|");
  const cantidad = parseInt(document.getElementById("cantidadSelect").value) || 1;

  if (!nombre) return alert("Por favor selecciona un producto válido");

  productosFactura.push({ nombre, precio: parseInt(precio), cantidad });
  actualizarVista();
  actualizarTotal();
}

// Actualizar la lista de productos en la factura
function actualizarVista() {
  const ul = document.getElementById("listaProductos");
  ul.innerHTML = "";
  productosFactura.forEach((p, i) => {
    ul.innerHTML += `
      <li>
        ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}
        <button onclick="productosFactura.splice(${i},1); actualizarVista(); actualizarTotal();">🗑️</button>
      </li>`;
  });
}

// Calcular totales
function actualizarTotal() {
  let subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoFijo = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuento = descuentoFijo + (subtotal * descuentoPorcentaje / 100);
  const total = subtotal - descuento;

  document.getElementById("totalDisplay").textContent = `✅ Total a pagar: ₡${total.toLocaleString()}`;
}

// Enviar por WhatsApp
function enviarFacturaPorWhatsApp() {
  const numero = document.getElementById("numeroWhatsApp").value.trim();
  if (!/^[678]\d{7}$/.test(numero)) {
    alert("Ingrese un número válido de 8 dígitos que empiece con 6, 7 u 8.");
    return;
  }

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;

  let mensaje = `🧾 Factura Esentia\n`;
  mensaje += `N°: ${factura}\nFecha: ${fecha}\nCliente: ${cliente}\n\n`;

  productosFactura.forEach(p => {
    mensaje += `- ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}\n`;
  });

  const subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuento = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const total = subtotal - (descuento + (subtotal * descuentoPorcentaje / 100));

  mensaje += `\n💰 Subtotal: ₡${subtotal.toLocaleString()}`;
  mensaje += `\n🔖 Descuento: ₡${descuento.toLocaleString()} (${descuentoPorcentaje}% si aplica)`;
  mensaje += `\n✅ Total a pagar: ₡${total.toLocaleString()}`;
  mensaje += `\n\n💳 Formas de pago:\n1. Efectivo contra entrega\n2. SINPE 72952454 Wilber Calderón M.\n3. BAC: CR59010200009453897656\n\n🌿 Encuentra tus fragancias aquí:\nhttps://wil1979.github.io/esentia-factura/catalogo.html `;

  const url = `https://wa.me/506 ${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

// Generar PDF
function generarFacturaPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = document.getElementById("cliente").value;
  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;

  let subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoFijo = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuento = descuentoFijo + (subtotal * descuentoPorcentaje / 100);
  const total = subtotal - descuento;

  // Logo
  try {
    doc.addImage("images/logo.png", "PNG", 15, 10, 40, 20);
  } catch {}

  doc.setFontSize(16);
  doc.text("🧾 Factura - Esentia", 60, 20);

  doc.setFontSize(12);
  doc.text(`N°: ${factura}`, 15, 40);
  doc.text(`Fecha: ${fecha}`, 15, 50);
  doc.text(`Cliente: ${cliente}`, 15, 60);

  let y = 70;
  productosFactura.forEach(p => {
    doc.text(`• ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}`, 15, y);
    y += 10;
  });

  y += 10;
  doc.text(`Subtotal: ₡${subtotal.toLocaleString()}`, 15, y);
  y += 10;
  doc.text(`Descuento: ₡${descuento.toLocaleString()}`, 15, y);
  y += 10;
  doc.text(`Total: ₡${total.toLocaleString()}`, 15, y);

  doc.save(`factura-${factura}.pdf`);
}

// Guardar historial
function guardarEnHistorial(facturaData) {
  let historial = JSON.parse(localStorage.getItem("facturas")) || [];
  historial.unshift(facturaData);
  localStorage.setItem("facturas", JSON.stringify(historial));
}

// Mostrar historial
function mostrarHistorial() {
  const historial = JSON.parse(localStorage.getItem("facturas")) || [];
  const contenedor = document.getElementById("historial");
  contenedor.innerHTML = "";

  if (historial.length === 0) {
    contenedor.innerHTML = "<p>No hay facturas guardadas.</p>";
    return;
  }

  historial.slice(0, 5).forEach(f => {
    contenedor.innerHTML += `
      <div style="margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
        <strong>Factura:</strong> ${f.factura}<br>
        <strong>Cliente:</strong> ${f.cliente}<br>
        <strong>Total:</strong> ₡${f.total.toLocaleString()}<br>
        <small>${f.fecha}</small>
      </div>`;
  });
}

// Borrar historial
function borrarHistorial() {
  if (confirm("¿Estás seguro de querer borrar todo el historial?")) {
    localStorage.removeItem("facturas");
    mostrarHistorial();
  }
}
  const pdfUrl = doc.output("bloburl");
  window.open(pdfUrl, "_blank");

  // Guardar PDF
  doc.save(`factura-${factura}.pdf`);
}

function guardarFacturaEnHistorial(facturaData) {
  let historial = JSON.parse(localStorage.getItem("facturas")) || [];
  historial.push(facturaData);
  localStorage.setItem("facturas", JSON.stringify(historial));
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
🧾 *Factura Esentia Agradecemos su preferencia.*  
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