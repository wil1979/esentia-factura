let productosFactura = [];
let clienteSeleccionado = null;

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

  // Inicializar Select2
  $('#productoSelect').select2({
    placeholder: "Busca un producto",
    allowClear: true,
    width: '100%'
  });
}

// Agregar producto al carrito
function agregarProducto() {
  const sel = document.getElementById("productoSelect");
  const [nombre, precio] = sel.value.split("|");
  const cantidad = parseInt(document.getElementById("cantidadSelect").value) || 1;

  if (!nombre) return alert("Por favor selecciona un producto válido");

  productosFactura.push({ nombre, precio: parseInt(precio), cantidad });
  actualizarVista();
  actualizarTotal();
}

// Actualizar carrito en tiempo real
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
  mensaje += `\n\n💳 Formas de pago:\n1. Efectivo contra entrega\n2. SINPE 72952454 Wilber Calderón M.\n3. BAC: CR59010200009453897656\n\n🌿 Encuentra más fragancias aquí:\nhttps://wil1979.github.io/esentia-factura/catalogo.html `;

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
  const descuento = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const total = subtotal - (descuento + (subtotal * descuentoPorcentaje / 100));

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

// Historial de facturas
function guardarEnHistorial(facturaData) {
  let historial = JSON.parse(localStorage.getItem("facturas")) || [];
  historial.unshift(facturaData);
  localStorage.setItem("facturas", JSON.stringify(historial));
}

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

function borrarHistorial() {
  if (confirm("¿Estás seguro de querer borrar todo el historial?")) {
    localStorage.removeItem("facturas");
    mostrarHistorial();
  }
}

// Conectar con API de Hacienda
document.getElementById("idCliente").addEventListener("blur", () => {
  const cedula = document.getElementById("idCliente").value.trim().replace(/\D/g, '');
  if (!cedula || !/^(\d{9}|\d{12})$/.test(cedula)) {
    alert("Cédula inválida. Debe tener 9 o 12 dígitos.");
    return;
  }

  fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`)
    .then(response => {
      if (!response.ok) throw new Error("Respuesta no válida");
      return response.json();
    })
    .then(data => {
      if (data && data.nombre) {
        document.getElementById("cliente").value = data.nombre;
      } else {
        alert("No se encontró información para esta identificación.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error al consultar la API de Hacienda. Intente más tarde.");
    });
});