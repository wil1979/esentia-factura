let carrito = [];

function agregarCarrito(nombre, precio) {
  carrito.push({ nombre, precio });
  renderCarrito();
}

function renderCarrito() {
  const lista = document.getElementById("listaCarrito");
  lista.innerHTML = "";

  let total = 0;
  carrito.forEach((item, i) => {
    total += item.precio;
    const li = document.createElement("li");
    li.textContent = `${item.nombre} - ₡${item.precio.toLocaleString()}`;
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
