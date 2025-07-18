let productos = [];

fetch('productos_limpieza_completo.json')
  .then(res => res.json())
  .then(data => {
    productos = data;
    renderProductos();
  });

function renderProductos() {
  const contenedor = document.getElementById('productos');
  contenedor.innerHTML = '';
  productos.forEach((producto, index) => {
    if (!producto.disponible) return;
    const div = document.createElement('div');
    div.className = 'producto';
    div.innerHTML = `
      <img src="${producto.imagen || 'images/default.png'}" alt="${producto.nombre}">
      <h3>${producto.nombre}</h3>
      <p><strong>Categoría:</strong> ${producto.categoria}</p>
      <p><strong>Precio público:</strong> ₡${producto.precioPublico}</p>
      <p><strong>Precio compra:</strong> ₡${producto.precioCompra}</p>
      ${renderAromas(producto.aromas, index)}
    `;
    contenedor.appendChild(div);
  });
}

function renderAromas(aromas, index) {
  if (!aromas || aromas.length === 0) {
    return `
      <div class="aroma-linea">
        <label>Cantidad</label>
        <input type="number" min="0" value="0" data-index="${index}" data-aroma="">
      </div>
    `;
  }
  return aromas.map(aroma => `
    <div class="aroma-linea">
      <label>${aroma}</label>
      <input type="number" min="0" value="0" data-index="${index}" data-aroma="${aroma}">
    </div>
  `).join('');
}


document.getElementById('generarPedido').addEventListener('click', () => {
  const inputs = document.querySelectorAll('input[type="number"]');
  const pedido = {};

  inputs.forEach(input => {
    const cantidad = parseInt(input.value);
    if (cantidad > 0) {
      const idx = input.dataset.index;
      const aroma = input.dataset.aroma;
      const nombre = productos[idx].nombre;
      if (!pedido[nombre]) pedido[nombre] = {};
      pedido[nombre][aroma] = cantidad;
    }
  });

  let resumen = '--- Pedido Esentia ---\n';
  for (const prod in pedido) {
    resumen += `\n${prod}\n`;
    for (const aroma in pedido[prod]) {
      resumen += ` - ${aroma}: ${pedido[prod][aroma]} unidad(es)\n`;
    }
  }
  document.getElementById('resumenPedido').value = resumen;
});

document.getElementById('descargarPDF').addEventListener('click', () => {
  const resumen = document.getElementById('resumenPedido').value;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(resumen, 10, 10);
  doc.save('pedido-esentia.pdf');
});

document.getElementById('enviarWhatsapp').addEventListener('click', () => {
  const numero = prompt("Ingrese número de WhatsApp (sin espacios, ej. 50688889999):");
  const resumen = document.getElementById('resumenPedido').value;
  const mensaje = encodeURIComponent(resumen);
  const url = `https://wa.me/${numero}?text=${mensaje}`;
  window.open(url, '_blank');
});
