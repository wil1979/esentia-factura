let carrito = [];
let cuponActivo = false;
let productoSeleccionado = null;

// Cargar modo oscuro guardado
window.addEventListener("DOMContentLoaded", () => {
  const modoGuardado = localStorage.getItem("modo");
  if (modoGuardado === "oscuro") {
    document.body.classList.add("modo-oscuro");
    document.getElementById("modoOscuroBtn")?.remove(); // Evitar botón duplicado
  }
  renderizarProductos();
});

const categoriasLimpieza = [
  {
    nombre: "🧼 Línea Hogar",
    productos: [
      {
        nombre: "Limpiavidrios",
        precio: 2500,
        imagen: "images/limpieza/limpiavidrios.jpg",
        info: "Fórmula sin manchas, ideal para ventanas y superficies lisas.",
        beneficios: "Deja superficies brillantes sin residuos",
        usoRecomendado: "Hogares, oficinas y áreas comerciales."
      },
      {
        nombre: "Desinfectante Multiusos",
        precio: 3000,
        imagen: "images/limpieza/desinfectante.png",
        info: "Elimina virus y bacterias comunes. Eficacia 99.9%.",
        beneficios: "Protección familiar contra gérmenes",
        usoRecomendado: "Baños, cocinas y zonas de alto contacto."
      }
    ]
  }
];

function renderizarProductos() {
  const container = document.getElementById("productos-limpieza");
  container.innerHTML = "";

  categoriasLimpieza.forEach(categoria => {
    const titulo = document.createElement("h3");
    titulo.textContent = categoria.nombre;
    titulo.style.marginTop = "2rem";
    container.appendChild(titulo);

    const fila = document.createElement("div");
    fila.className = "productos";

    categoria.productos.forEach(producto => {
      const divProducto = document.createElement("div");
      divProducto.className = "producto";

      const precioHTML = `<p>₡${producto.precio}</p>`;

      divProducto.innerHTML = `
        <img src="${producto.imagen}" alt="${producto.nombre}" onclick="mostrarInfoProducto('${producto.nombre}', ${producto.precio}, '${producto.imagen}', \`${producto.info}\`, \`${producto.beneficios || ''}\`, \`${producto.usoRecomendado || ''}\`)">
        <h3>${producto.nombre}</h3>
        ${precioHTML}
        <button onclick="agregarCarrito(\`${producto.nombre}\`, ${producto.precio})">Agregar al carrito</button>
      `;
      fila.appendChild(divProducto);
    });

    container.appendChild(fila);
  });
}

function mostrarInfoProducto(nombre, precio, imagen, info, beneficios, usoRecomendado) {
  document.getElementById("modalProductoNombre").textContent = nombre;
  document.getElementById("modalProductoImagen").src = imagen;
  document.getElementById("modalProductoInfo").textContent = info;
  document.getElementById("modalProductoUso").innerHTML = `<strong>🧠 Beneficios:</strong> ${beneficios}<br><strong>🏠 Uso recomendado:</strong> ${usoRecomendado}`;
  document.getElementById("modalProductoPrecio").textContent = `₡${precio.toLocaleString()}`;
  productoSeleccionado = { nombre, precio };
  document.getElementById("modalProducto").style.display = "block";
}

function cerrarModalProducto() {
  document.getElementById("modalProducto").style.display = "none";
  productoSeleccionado = null;
}

function agregarDesdeModal() {
  if (!productoSeleccionado) return;
  agregarCarrito(productoSeleccionado.nombre, productoSeleccionado.precio);
  cerrarModalProducto();
}

function agregarCarrito(nombre, precio) {
  const itemExistente = carrito.find(item => item.nombre === nombre);
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carrito.push({ nombre, precio, cantidad: 1 });
  }

  const boton = document.getElementById("botonCarrito");
  boton.classList.add("animado");
  setTimeout(() => boton.classList.remove("animado"), 300);

  renderCarrito();
}

function renderCarrito() {
  const lista = document.getElementById("listaCarritoModal");
  lista.innerHTML = "";
  let total = 0;

  carrito.forEach((item, i) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const li = document.createElement("li");
    const texto = document.createElement("span");
    texto.textContent = `${item.nombre} x${item.cantidad} - ₡${subtotal.toLocaleString()}`;

    const boton = document.createElement("button");
    boton.textContent = "❌";
    boton.onclick = () => {
      carrito.splice(i, 1);
      renderCarrito();
    };

    li.appendChild(texto);
    li.appendChild(boton);
    lista.appendChild(li);
  });

  if (cuponActivo === "ESENTIA10") {
    total *= 0.9;
  } else if (cuponActivo === "AMIGO15") {
    total *= 0.85;
  }

  document.getElementById("totalModal").textContent = `Total: ₡${Math.round(total).toLocaleString()}`;
  document.getElementById("contadorCarrito").textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
}

function finalizarPedido() {
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  let mensaje = "Hola Wilber 👋%0AQuiero hacer el siguiente pedido:%0A%0A";
  let total = 0;

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `🧴 ${item.nombre} x${item.cantidad} - ₡${subtotal.toLocaleString()}%0A`;
    total += subtotal;
  });

  if (cuponActivo === "ESENTIA10") {
    mensaje += `%0ACupón aplicado: ESENTIA10 (-10%)`;
    total *= 0.9;
  } else if (cuponActivo === "AMIGO15") {
    mensaje += `%0ACupón aplicado: AMIGO15 (-15%)`;
    total *= 0.85;
  }

  mensaje += `%0A%0A💰 Total: ₡${Math.round(total).toLocaleString()}%0A%0A¡Gracias por tu compra! 🌿`;
  window.open(`https://wa.me/50672952454?text=${mensaje}`, "_blank");
}

function abrirModalCarrito() {
  renderCarrito();
  document.getElementById("modalCarrito").style.display = "block";
}

function cerrarModalCarrito() {
  document.getElementById("modalCarrito").style.display = "none";
}

function filtrarProductos() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const productos = document.querySelectorAll(".producto");
  productos.forEach(prod => {
    const nombre = prod.querySelector("h3").textContent.toLowerCase();
    prod.style.display = nombre.includes(texto) ? "block" : "none";
  });
}

function aplicarCupon() {
  const cupon = document.getElementById("cupon").value.trim().toUpperCase();
  if (cupon === "ESENTIA10") {
    cuponActivo = "ESENTIA10";
    alert("Cupón aplicado correctamente: 10% de descuento");
  } else if (cupon === "AMIGO15") {
    cuponActivo = "AMIGO15";
    alert("Cupón aplicado correctamente: 15% de descuento");
  } else {
    cuponActivo = false;
    alert("Cupón inválido");
  }
  renderCarrito();
}

function vaciarCarrito() {
  if (confirm("¿Estás seguro de querer vaciar el carrito?")) {
    carrito = [];
    renderCarrito();
  }
}