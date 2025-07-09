let carrito = [];
let cuponActivo = false;
let productoSeleccionado = null;

function abrirModalSeleccionAroma(nombre, precio) {
  productoPendiente = { nombre, precio };
  const modal = document.getElementById("modalSeleccionAroma");
  modal.style.display = "block";
  cargarOpcionesAromas();
}

function cerrarModalSeleccionAroma() {
  document.getElementById("modalSeleccionAroma").style.display = "none";
  productoPendiente = null;
}

function cargarOpcionesAromas() {
  const lista = document.getElementById("listaAromas");
  lista.innerHTML = "";

  categorias.forEach(categoria => {
    categoria.productos.forEach(producto => {
      if (!producto.nombre.startsWith("Difusor")) {
        const div = document.createElement("div");
        div.className = "opcion-aroma";
        div.innerHTML = `
          <span>${producto.nombre}</span>
          <button onclick="seleccionarAroma('${producto.nombre}')">Elegir</button>
        `;
        lista.appendChild(div);
      }
    });
  });
}
function seleccionarAroma(aromaNombre) {
  if (!productoPendiente) return;
  const nombreCompleto = `${productoPendiente.nombre} - ${aromaNombre}`;
  agregarCarrito(nombreCompleto, productoPendiente.precio);
  cerrarModalSeleccionAroma();
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

const categorias = [
  {

    nombre: "🌬️ Difusores",
  productos: [
    {
      nombre: "Difusor Pequeño",
      precio: 5500,
      imagen: "images/3b4bad00-d563-4421-bf68-b0b8a1edead9.jpeg", // Asegúrate de tener esta imagen o usa una placeholder
      info: "Difusor con luz ambiental ajustable. Ideal para aromaterapia nocturna."
    }
  ]
},
  {
    nombre: "🍬 Aromas Dulces",
    productos: [
      {
        nombre: "Chocolate",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/chocolate.png",
        info: "AROMATERAPIA: Aumenta serotonina 40% y reduce ansiedad emocional. Efecto antidepresivo natural.",
        beneficios: "Antidepresivo natural, mejora el estado de ánimo y combate la tristeza.",
        usoRecomendado: "Dormitorios y espacios de terapia."
      },
      {
        nombre: "Coco Cookies",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/cococookies.png",
        info: "AROMATERAPIA: Combina relajación (ondas theta +18%) y control de apetito emocional. Reduce antojos dulces 35%.",
        beneficios: "Relaja la mente y reduce el deseo de comer dulces por estrés emocional.",
        usoRecomendado: "Perfecto para cocinas y áreas de trabajo."
      },
      {
        nombre: "Fresa",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/fresa.png",
        info: "AROMATERAPIA: Estimula producción de endorfinas. Antídoto contra apatía estacional.",
        beneficios: "Mejora el estado anímico y combate la depresión ligera o estacional.",
        usoRecomendado: "Clínicas de salud mental y ambientes familiares."
      },
      {
        nombre: "Piña Colada",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/pinacolada.png",
        info: "AROMATERAPIA: Potencia socialización (aumenta conversación 45%). Crea ambiente vacacional.",
        beneficios: "Estimula la interacción social y crea un clima distendido.",
        usoRecomendado: "Perfecto para fiestas y reuniones sociales."
      },
      {
        nombre: "Melón Vainilla",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/melonvainilla.png",
        info: "AROMATERAPIA: Combinación relajante (ondas alfa cerebrales). Disminuye antojos dulces 30%.",
        beneficios: "Calma la ansiedad y reduce el consumo compulsivo de azúcar.",
        usoRecomendado: "Ideal para comedores y cocinas."
      }
    ]
  },
  {
    nombre: "🌸 Aromas Florales",
    productos: [
      {
        nombre: "Lavanda",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/lavanda.png",
        info: "AROMATERAPIA: Reduce el cortisol 31%, mejora calidad del sueño en 45%. Ideal para insomnio y ansiedad.",
        beneficios: "Relajante natural, ideal para personas con estrés o problemas para conciliar el sueño.",
        usoRecomendado: "Uso nocturno en dormitorios."
      },
      {
        nombre: "Magnolia",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/magnolia.png",
        info: "AROMATERAPIA: Reduce estrés emocional en 35%. Equilibra estados de ánimo.",
        beneficios: "Equilibra emociones y reduce la irritabilidad.",
        usoRecomendado: "Perfecto para meditación y salas de yoga."
      },
      {
        nombre: "Rosa",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/rosa.png",
        info: "AROMATERAPIA: Regula desequilibrios hormonales. Alivia síntomas premenstruales en 52%.",
        beneficios: "Ayuda en el bienestar femenino y equilibrio hormonal.",
        usoRecomendado: "Espacios femeninos y zonas de autocuidado."
      },
      {
        nombre: "Violeta",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/violeta.png",
        info: "AROMATERAPIA: Estimula intuición y sueños lúcidos. Aumenta fase REM 40%.",
        beneficios: "Potencia la creatividad, la intuición y la claridad onírica.",
        usoRecomendado: "Estudios de psicología y onirología."
      }
    ]
  },
  {
    nombre: "🍊 Frutales y Cítricos",
    productos: [
      {
        nombre: "Limón",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/limon.png",
        info: "AROMATERAPIA: Aumenta alerta mental 50%. Purifica ambientes eliminando patógenos.",
        beneficios: "Refrescante, purificante y antibacteriano natural.",
        usoRecomendado: "Excelente para cocinas y hospitales."
      },
      {
        nombre: "Naranja",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/naranja.png",
        info: "AROMATERAPIA: Aumenta producción de serotonina 60%. Antidepresivo natural.",
        beneficios: "Combate la depresión leve y mejora el estado de ánimo matutino.",
        usoRecomendado: "Uso matutino en salas de estar."
      },
      {
        nombre: "Citronela",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/citronela.png",
        info: "AROMATERAPIA: Repelente de insectos natural (eficacia 92%). Elimina virus transmitidos por mosquitos.",
        beneficios: "Protección natural contra insectos y ambientes limpios.",
        usoRecomendado: "Exteriores tropicales y zonas verdes."
      }
    ]
  },
  {
    nombre: "🌿 Naturales y Herbales",
    productos: [
      {
        nombre: "Eucalipto",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/eucalipto.png",
        info: "AROMATERAPIA: Descongestiona vías respiratorias en 90% durante primeros 15 minutos. Elimina 85% de patógenos aéreos.",
        beneficios: "Mejora la respiración, descongestiona nariz y pulmones.",
        usoRecomendado: "Para asmáticos y espacios húmedos."
      },
      {
        nombre: "Sándalo",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/sandalo.png",
        info: "AROMATERAPIA: Ancestralmente usado en rituales. Profundiza conexión espiritual.",
        beneficios: "Facilita la meditación y potencia la introspección.",
        usoRecomendado: "Templos y espacios sagrados."
      },
      {
        nombre: "Pino",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/pino.png",
        info: "AROMATERAPIA: Purificador aéreo (elimina 86% de alérgenos). Descongestiona vías respiratorias.",
        beneficios: "Alivio natural para asmáticos y personas con alergias.",
        usoRecomendado: "Áreas con mascotas o polvo."
      }
    ]
  },
  {
    nombre: "🌊 Ambientales",
    productos: [
      {
        nombre: "Océano",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/oceano.png",
        info: "AROMATERAPIA: Induce estados meditativos profundos. Mejora capacidad pulmonar 22%.",
        beneficios: "Promueve la calma y mejora la respiración consciente.",
        usoRecomendado: "Prácticas de respiración y yoga."
      },
      {
        nombre: "Navidad",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/navidad.png",
        info: "AROMATERAPIA: Estimula memorias afectivas. Reduce nostalgia en adultos mayores.",
        beneficios: "Evoca emociones positivas y recuerdos felices.",
        usoRecomendado: "Residencias y épocas festivas."
      }
    ]
  },
  {
    nombre: "👶 Línea Especial",
    productos: [
      {
        nombre: "Baby",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/baby.png",
        info: "AROMATERAPIA: Calma cólicos del lactante. Regula ritmos circadianos infantiles.",
        beneficios: "Regula el sueño y la tranquilidad en bebés.",
        usoRecomendado: "Nurserías y cuartos de bebé."
      },
      {
        nombre: "Blanc",
        precioOriginal: 5500,
        precioOferta: 3500,
        imagen: "images/blanc.png",
        info: "AROMATERAPIA: Efecto hidratante cutáneo inmediato. Mejora textura de la piel.",
        beneficios: "Hidratación natural y frescura ambiental.",
        usoRecomendado: "Baños y espacios de belleza."
      }
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

      let botonHTML = "";
if (producto.nombre.startsWith("Difusor")) {
  botonHTML = `<button onclick="abrirModalSeleccionAroma('${producto.nombre}', ${producto.precio})">Agregar al carrito</button>`;
} else {
  botonHTML = `<button onclick="agregarCarrito(\`${producto.nombre}\`, ${precioFinal})">Agregar al carrito</button>`;
}

divProducto.innerHTML = `
  <img src="${producto.imagen}" alt="${producto.nombre}" onclick="mostrarInfoProducto('${producto.nombre}', ${precioFinal}, '${producto.imagen}', \`${producto.info}\`)">
  <h3>${producto.nombre}</h3>
  ${precioHTML}
  ${botonHTML}
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
  const lista = document.getElementById("listaCarritoModal");
  lista.innerHTML = "";
  let total = 0;

  carrito.forEach((item, i) => {
    const descuento = calcularDescuentoPorCantidad(item) * item.cantidad;
    const subtotal = (item.precio * item.cantidad) - descuento;
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

  // Aplicar cupón si está activo
  if (cuponActivo === "ESENTIA10") {
    total *= 0.9;
  } else if (cuponActivo === "AMIGO15") {
    total *= 0.85;
  }

  document.getElementById("totalModal").textContent = `Total: ₡${Math.round(total).toLocaleString()}`;
  document.getElementById("contadorCarrito").textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
}

// Abrir modal del carrito
function abrirModalCarrito() {
  renderCarrito(); // Actualiza visualización
  document.getElementById("modalCarrito").style.display = "block";
}

// Cerrar modal del carrito
function cerrarModalCarrito() {
  document.getElementById("modalCarrito").style.display = "none";
}

// Opcional: permitir cerrar con tecla ESC
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    cerrarModalCarrito();
  }
});

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
  const url = `https://wa.me/50672952454?text=${mensaje}`;
  window.open(url, "_blank");
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
