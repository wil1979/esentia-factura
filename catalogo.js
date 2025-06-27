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
  const boton = document.getElementById("botonCarrito");
boton.classList.add("animado");
setTimeout(() => boton.classList.remove("animado"), 300);

renderCarrito();
}

// Definición de productos para la categoría Hogar
const productosHogar = [
  {
    nombre: "Chocolate 30 ml",
    precioOriginal: 4000,
    precioOferta: 3500,
    imagen: "images/chocolate.jpg"
  },
  {
    nombre: "Coco Cookies 30 ml",
    precio: 3500,
    imagen: "images/cococookies.jpg"
  },
  {
    nombre: "Durazno 30 ml",
    precio: 3500,
    imagen: "images/durazno.jpg"
  },
  {
    nombre: "Manzana Canela 30 ml",
    precio: 3500,
    imagen: "images/manzanacanela.jpg"
  },
  {
    nombre: "Melón Vainilla 30 ml",
    precio: 3500,
    imagen: "images/melonvainilla.jpg"
  },
  {
    nombre: "Piña Colada 30 ml",
    precio: 3500,
    imagen: "images/pinacolada.jpg"
  },
  {
    nombre: "Fresa 30 ml",
    precio: 3500,
    imagen: "images/fresa.jpg"
  }
];

const categorias = [
  {
    nombre: "🍬 Aromas Dulces",
    productos: [
      { nombre: "Chocolate 30 ml", precioOriginal: 4000, precioOferta: 3500, imagen: "images/chocolate.jpg" },
      { nombre: "Coco Cookies 30 ml", precio: 3500, imagen: "images/cococookies.jpg" },
      { nombre: "Fresa 30 ml", precio: 3500, imagen: "images/fresa.jpg" },
      { nombre: "Piña Colada 30 ml", precio: 3500, imagen: "images/pinacolada.jpg" },
      { nombre: "Melón Vainilla 30 ml", precio: 3500, imagen: "images/melonvainilla.jpg" },
      { nombre: "Manzana Canela 30 ml", precio: 3500, imagen: "images/manzanacanela.jpg" },
    ]
  },
  {
    nombre: "🌸 Aromas Florales",
    productos: [
      { nombre: "Lavanda 30 ml", precio: 3500, imagen: "images/lavanda.jpg" },
      { nombre: "Magnolia 30 ml", precio: 3500, imagen: "images/magnolia.jpg" },
      { nombre: "Rosa 30 ml", precio: 3500, imagen: "images/rosa.jpg" },
      { nombre: "Violeta 30 ml", precio: 3500, imagen: "images/violeta.jpg" },
      { nombre: "Bouquet Blanc 30 ml", precio: 3500, imagen: "images/bouquet.jpg" }
    ]
  },
  {
    nombre: "🍊 Frutales y Cítricos",
    productos: [
      { nombre: "Manzana 30 ml", precio: 3500, imagen: "images/manzana.jpg" },
      { nombre: "Melocotón 30 ml", precio: 3500, imagen: "images/melocoton.jpg" },
      { nombre: "Naranja 30 ml", precio: 3500, imagen: "images/naranja.jpg" },
      { nombre: "Frutos Rojos 30 ml", precio: 3500, imagen: "images/frutosrojos.jpg" },
      { nombre: "Citronela 30 ml", precio: 3500, imagen: "images/citronela.jpg" }
    ]
  },
  {
    nombre: "🌿 Naturales y Herbales",
    productos: [
      { nombre: "Eco Bambú 30 ml", precio: 3500, imagen: "images/bambu.jpg" },
      { nombre: "Sándalo 30 ml", precio: 3500, imagen: "images/sandalo.jpg" },
      { nombre: "Pino 30 ml", precio: 3500, imagen: "images/pino.jpg" }
    ]
  },
  {
    nombre: "🌊 Ambientales",
    productos: [
      { nombre: "Océano 30 ml", precio: 3500, imagen: "images/oceano.jpg" },
      { nombre: "Navidad 30 ml", precio: 3500, imagen: "images/navidad.jpg" },
      { nombre: "Antitabaco 30 ml", precio: 3500, imagen: "images/antitabaco.jpg" }
    ]
  },
  {
    nombre: "👶 Línea Especial",
    productos: [
      { nombre: "Baby 30 ml", precio: 3500, imagen: "images/baby.jpg" },
      { nombre: "Blanc 30 ml", precio: 3500, imagen: "images/blanc.jpg" },
      { nombre: "Bleu 30 ml", precio: 3500, imagen: "images/bleu.jpg" }
    ]
  }
];

function renderizarProductos() {
  const container = document.getElementById("productos-hogar");
  container.innerHTML = "";

  categorias.forEach(categoria => {
    const titulo = document.createElement("h3");
    titulo.textContent = categoria.nombre;
    titulo.style.marginTop = "2rem";
    container.appendChild(titulo);

    const fila = document.createElement("div");
    fila.className = "productos";

    categoria.productos.forEach(producto => {
      const divProducto = document.createElement("div");
      divProducto.className = producto.precioOferta ? "producto oferta" : "producto";

      const precioHTML = producto.precioOferta
        ? `<p><span class="precio-original">₡${producto.precioOriginal}</span> ₡${producto.precioOferta}</p>`
        : `<p>₡${producto.precio}</p>`;

      const precioFinal = producto.precioOferta || producto.precio;

      divProducto.innerHTML = `
        <img src="${producto.imagen}" alt="${producto.nombre}" onclick="mostrarImagenGrande(this.src)">
        <h3>${producto.nombre}</h3>
        ${precioHTML}
        <button onclick="agregarCarrito('${producto.nombre}', ${precioFinal})">Agregar al carrito</button>
      `;

      fila.appendChild(divProducto);
    });

    container.appendChild(fila);
  });
}

// Llamar a la función cuando cargue la página
window.addEventListener("DOMContentLoaded", () => {
  renderizarProductos();
});

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
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

// Si "descuentosActivos" es false, no se aplican descuentos por cantidad
let descuentosActivos = false;

function calcularDescuentoPorCantidad(item) {
  if (!descuentosActivos) return 0;
  if (item.cantidad >= 5) {
    return item.precio * 0.10;
  }
  if (item.cantidad >= 2 && item.cantidad < 4) {
    return item.precio * 0.05;
  }
  return 0;
}

// Puedes activar/desactivar descuentos desde la factura llamando:
// descuentosActivos = false; // para desactivar
// descuentosActivos = true;  // para activar

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

 if (cuponActivo === "ESENTIA10") {
  total *= 0.9;
} else if (cuponActivo === "AMIGO15") {
  total *= 0.85;
}

  document.getElementById("total").textContent = `Total: ₡${Math.round(total).toLocaleString()}`;
  document.getElementById("contadorCarrito").textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
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

  if (cuponActivo === "ESENTIA10") {
  mensaje += `%0ACupón aplicado: ESENTIA10 (-10%%)`;
  total *= 0.9;
} else if (cuponActivo === "AMIGO15") {
  mensaje += `%0ACupón aplicado: AMIGO15 (-15%%)`;
  total *= 0.85;
}

  mensaje += `%0A💰 Total: ₡${Math.round(total).toLocaleString()}`;

  const url = `https://wa.me/50684079454?text=${mensaje}`;
  window.open(url, "_blank");
}

function mostrarImagenGrande(src) {
    var modal = document.getElementById('modalImagen');
    var img = document.getElementById('imgGrande');
    img.src = src;
    modal.style.display = 'flex';
    // Para cerrar al tocar fuera de la imagen
    modal.onclick = function(e){
        if (e.target === modal) cerrarImagenGrande();
    }
}
function cerrarImagenGrande() {
    var modal = document.getElementById('modalImagen');
    modal.style.display = 'none';
    document.getElementById('imgGrande').src = "";
}

function cerrarModal() {
  document.getElementById("modalImagen").style.display = "none";
}

function recomendarAmigo() {
  const numero = document.getElementById("numeroAmigo").value.trim();
  if (!numero.match(/^\d{8,12}$/)) {
    alert("Ingrese un número válido sin símbolos ni espacios.");
    return;
  }

  const mensaje = encodeURIComponent(
    "Hola 👋, quiero recomendarte este catálogo de fragancias de Esentia. Si haces una compra, yo obtengo un 10% de descuento y Tu obtienes un 10 % en tu proxima compra. ¡Dale un vistazo! 👉 https://wil1979.github.io/esentia-factura/catalogo.html"
  );

  const url = `https://wa.me/506${numero}?text=${mensaje}`;
  window.open(url, "_blank");
}

function irAlCarrito() {
  const carritoSection = document.querySelector(".carrito");
  carritoSection.scrollIntoView({ behavior: "smooth" });
}
