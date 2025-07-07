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

const categorias = [
  {
    nombre: "🍬 Aromas Dulces",
    productos: [
      //{ nombre: "Chocolate 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/chocolate.png" },
      //{ nombre: "Coco Cookies 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/cococooquies.png" },
      //{ nombre: "Fresa 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/fresa.png" },
      { nombre: "Piña Colada 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/pinacolada.jpg" },
      { nombre: "Melón Vainilla 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/melonvainilla.jpg" },
      //{ nombre: "Manzana Canela 30 ml", precio: 3500, imagen: "images/manzanacanela.png" },
    ]
  },
  {
    nombre: "🌸 Aromas Florales",
    productos: [
      { nombre: "Lavanda 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/lavanda.jpg" },
      { nombre: "Magnolia 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/magnolia.jpg" },
      // { nombre: "Rosa 50 ml", precio: 3500, imagen: "images/rosa.png" },
      // { nombre: "Violeta 50 ml", precio: 3500, imagen: "images/violeta.png" },
      // { nombre: "Bouquet Blanc 50 ml", precio: 3500, imagen: "images/bouquet.png" }
    ]
  },
  {
    nombre: "🍊 Frutales y Cítricos",
    productos: [
      // { nombre: "Limon 50 ml", precio: 3500, imagen: "images/limon.png" },
      // { nombre: "Melocotón 50 ml", precio: 3500, imagen: "images/melocoton.png" },
      // { nombre: "Naranja 50 ml", precio: 3500, imagen: "images/naranja.png" },
     // { nombre: "Frutos Rojos 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/frutosrojos.png" },
      // { nombre: "Citronela 50 ml", precio: 3500, imagen: "images/citronela.png" }
    ]
  },
  {
    nombre: "🌿 Naturales y Herbales",
    productos: [
      //{ nombre: "Eco Bambú 50 ml", precio: 3500, imagen: "images/bambu.png" },
      //{ nombre: "Sándalo 50 ml", precio: 3500, imagen: "images/sandalo.png" },
     // { nombre: "Pino 50 ml", precio: 3500, imagen: "images/pino.png" },
      { nombre: "Eucalipto 50 ml", precio: 3500, imagen: "images/eucalipto.jpg" }
    ]
  },
  {
    nombre: "🌊 Ambientales",
    productos: [
      // { nombre: "Océano 50 ml", precio: 3500, imagen: "images/oceano.png" },
      // { nombre: "Navidad 50 ml", precio: 3500, imagen: "images/navidad.png" },
      { nombre: "Antitabaco 50 ml", precio: 3500, imagen: "images/antitabaco.jpg" }
      ]
      
    
  },
  {
    nombre: "🌲 Amaderada",
    productos: [
      { nombre: "Menta 50 ml", precioOriginal: 5500, precioOferta: 3500, imagen: "images/menta.jpg" },
      // { nombre: "Navidad 50 ml", precio: 3500, imagen: "images/navidad.png" },
      // { nombre: "Antitabaco 50 ml", precio: 3500, imagen: "images/antitabaco.png" }
    ]
  },
  {
    nombre: "👶 Línea Especial",
    productos: [
      //{ nombre: "Baby 50 ml", precio: 3500, imagen: "images/baby.png" },
      // { nombre: "Blanc 50 ml", precio: 3500, imagen: "images/blanc.png" },
      // { nombre: "Bleu 50 ml", precio: 3500, imagen: "images/bleu.png" }
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
        <button onclick="agregarCarrito(\ '${producto.nombre}\', ${precioFinal})">Agregar al carrito</button>
      `;

      fila.appendChild(divProducto);
    });

    container.appendChild(fila);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderizarProductos();
});

function filtrarProductos() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const productos = document.querySelectorAll(".producto");

  productos.forEach(prod => {
    const nombre = prod.querySelector("h3").textContent.toLowerCase();
    prod.style.display = nombre.includes(texto) ? "block" : "none";
  });
}

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
    mensaje += `%0ACupón aplicado: ESENTIA10 (-10%)`;
    total *= 0.9;
  } else if (cuponActivo === "AMIGO15") {
    mensaje += `%0ACupón aplicado: AMIGO15 (-15%)`;
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
  modal.onclick = function (e) {
    if (e.target === modal) cerrarImagenGrande();
  };
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
    "Hola 👋, quiero recomendarte este catálogo de fragancias de Esentia. Si haces una compra, yo obtengo un 10% de descuento y tú obtienes un 10% en tu próxima compra. ¡Dale un vistazo! 👉 https://wil1979.github.io/esentia-factura/catalogo.html"
  );

  const url = `https://wa.me/506${numero}?text=${mensaje}`;
  window.open(url, "_blank");
}

function irAlCarrito() {
  const carritoSection = document.querySelector(".carrito");
  carritoSection.scrollIntoView({ behavior: "smooth" });
}

const botonFlotante = document.getElementById('botonCarrito');
  const recomendarSeccion = document.querySelector('.recomendar');

  window.addEventListener('scroll', () => {
    const seccionPosicion = recomendarSeccion.getBoundingClientRect().top;
    const ventanaAltura = window.innerHeight;

    if (seccionPosicion < ventanaAltura && seccionPosicion > 0) {
      botonFlotante.style.display = 'none'; // Oculta el botón
    } else {
      botonFlotante.style.display = 'block'; // Muestra el botón
    }
    
    document.addEventListener('DOMContentLoaded', function () {
    const popup = document.getElementById('popup');
    const popupClose = document.getElementById('popup-close');

    // Mostrar el pop-up después de 3 segundos al cargar la página
    setTimeout(() => {
      popup.classList.add('active');
    }, 3000);

    // Cerrar el pop-up al hacer clic en el botón
    popupClose.addEventListener('click', () => {
      popup.classList.remove('active');
    });
  });
  });
