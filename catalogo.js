// JS mejorado para catálogo con promociones
let carrito = [];
let cuponActivo = false;

function agregarCarrito(nombre, precio) {
  const itemExistente = carrito.find(item => item.nombre === nombre);
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carrito.push({ nombre, precio, cantidad: 1 });
  }
  renderCarrito();
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
}

function aplicarCupon() {
  const cupon = document.getElementById("cupon").value.trim();
  if (cupon.toUpperCase() === "ESENTIA10") {
    cuponActivo = true;
    alert("Cupón aplicado correctamente: 10% de descuento");
  } else {
    alert("Cupón inválido");
  }
  renderCarrito();
}

function calcularDescuentoPorCantidad(item) {
  if (item.cantidad >= 3) return 1000;
  if (item.cantidad === 2) return 500;
  return 0;
}

function renderCarrito() {
  const lista = document.getElementById("listaCarrito");
  lista.innerHTML = "";

  let total = 0;
  carrito.forEach((item, i) => {
    const descuento = calcularDescuentoPorCantidad(item) * item.cantidad;
    const subtotal = (item.precio * item.cantidad) - descuento;
    total += subtotal;

    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    const texto = document.createElement("span");
    texto.textContent = `${item.nombre} x${item.cantidad} - ₡${subtotal.toLocaleString()}`;

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

  if (cuponActivo) {
    total *= 0.9;
  }

  document.getElementById("total").textContent = `Total: ₡${Math.round(total).toLocaleString()}`;
}

function finalizarPedido() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  let mensaje = "Hola Wilber, quiero hacer el siguiente pedido:%0A";
  let total = 0;
  carrito.forEach(item => {
    const descuento = calcularDescuentoPorCantidad(item) * item.cantidad;
    const subtotal = (item.precio * item.cantidad) - descuento;
    mensaje += `🧴 ${item.nombre} x${item.cantidad} - ₡${subtotal.toLocaleString()}%0A`;
    total += subtotal;
  });

  if (cuponActivo) {
    mensaje += `%0ACupón aplicado: ESENTIA10 (-10%%)`;
    total *= 0.9;
  }

  mensaje += `%0A💰 Total: ₡${Math.round(total).toLocaleString()}`;

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