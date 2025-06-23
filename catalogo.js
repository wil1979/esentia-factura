let carrito = [];

function agregarCarrito(nombre, precio) {
  carrito.push({ nombre, precio });
  renderCarrito();
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
}

function renderCarrito() {
  const lista = document.getElementById("listaCarrito");
  lista.innerHTML = "";

  let total = 0;
  carrito.forEach((item, i) => {
    total += item.precio;

    // Crear elemento li con estructura flexible
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.marginBottom = "8px";

    const texto = document.createElement("span");
    texto.textContent = `${item.nombre} - ₡${item.precio.toLocaleString()}`;

    const boton = document.createElement("button");
    boton.textContent = "❌";
    boton.onclick = () => eliminarDelCarrito(i);
    boton.style.fontSize = "12px";
    boton.style.padding = "2px 6px";
    boton.style.marginLeft = "10px";
    boton.style.cursor = "pointer";
    boton.style.backgroundColor = "#f44336";
    boton.style.color = "#fff";
    boton.style.border = "none";
    boton.style.borderRadius = "4px";

    li.appendChild(texto);
    li.appendChild(boton);
    lista.appendChild(li);
  });

  document.getElementById("total").textContent = `Total: ₡${total.toLocaleString()}`;
}


function finalizarPedido() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  let mensaje = "Hola Wilber, quiero hacer el siguiente pedido:%0A";
  let total = 0;
  carrito.forEach(item => {
    mensaje += `🧴 ${item.nombre} - ₡${item.precio.toLocaleString()}%0A`;
    total += item.precio;
  });
  mensaje += `%0A💰 Total: ₡${total.toLocaleString()}`;

  const url = `https://wa.me/50684079454?text=${mensaje}`;
  window.open(url, "_blank");
}

function mostrarImagenGrande(src) {
  const modal = document.getElementById("modalImagen");
  const imagen = document.getElementById("imagenAmpliada");
  imagen.src = src;
  modal.style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modalImagen").style.display = "none";
}

