let carrito = [];
let cuponActivo = false;
let productoSeleccionado = null;
let productoPendiente = null;

// Modo oscuro
function toggleModoOscuro() {
  document.body.classList.toggle("modo-oscuro");
  const btn = document.getElementById("modoOscuroBtn");
  if (document.body.classList.contains("modo-oscuro")) {
    btn.textContent = "☀️ Modo Claro";
    localStorage.setItem("modo", "oscuro");
  } else {
    btn.textContent = "🌙 Modo Oscuro";
    localStorage.setItem("modo", "claro");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const modoGuardado = localStorage.getItem("modo") || "claro";
  if (modoGuardado === "oscuro") {
    document.body.classList.add("modo-oscuro");
    document.getElementById("modoOscuroBtn").textContent = "☀️ Modo Claro";
  }
  renderizarProductos();
});

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
    
        nombre: "🚗 Ambientadores para Auto",
  productos: [
    {
      nombre: "Ambientador Auto",
      precio: 1500,
      imagen: "images/IMG_2057.jpeg",
      info: "AROMATERAPIA: Estimula creatividad y concentración. Recomendado para viajes largos.",
      beneficios: "Mejora el estado de ánimo durante trayectos largos",
      usoRecomendado: "Ideal para automóviles y transporte personal.",
      esNuevo: true ,// 👈 Esto marca el producto como nuevo
       fechaLanzamiento: "2025-10-07" // 👈 Fecha de lanzamiento
      }
    ]
  },
  {
    nombre: "🌬️ Difusores",
    productos: [
      {
        nombre: "Difusor Pequeño + Aroma a escoger",
        precio: 5500,
        imagen: "images/difusor.jpg",
        info: "Difusor de aceite esencial de 200ml, Humidificador de aire, Mini Humidificador con luz colorida para el hogar y el coche.",
        beneficios: "Humidifica el ambiente, mejora la calidad del aire y proporciona un aroma agradable.",
        usoRecomendado: "Dormitorios y espacios de terapia."
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
      if (producto.nombre.startsWith("Difusor") || producto.nombre.startsWith("Ambientador")) {
  botonHTML = `<button onclick="abrirModalSeleccionAroma('${producto.nombre}', ${producto.precio})">Agregar al carrito</button>`;
} else {
  botonHTML = `<button onclick="mostrarInfoProducto('${producto.nombre}', ${precioFinal}, '${producto.imagen}', \`${producto.info}\`, \`${producto.beneficios || ''}\`, \`${producto.usoRecomendado || ''}\`)">Ver detalles</button>`;
}

 /*     let badgeHTML = "";
if (producto.esNuevo) {
  badgeHTML = `<span class="nuevo-badge">🌟 NEW</span>`;
}
  */

let badgeHTML = "";
if (producto.fechaLanzamiento && esProductoNuevo(producto.fechaLanzamiento)) {
  badgeHTML = `<span class="nuevo-badge">🌟 Nuevo</span>`;
}

divProducto.innerHTML = `
  <div style="position:relative;">
    <img src="${producto.imagen}" alt="${producto.nombre}" onclick="mostrarInfoProducto(...)">
    ${badgeHTML}
  </div>
  <h3>${producto.nombre}</h3>
  ${precioHTML}
  ${botonHTML}
`;
      fila.appendChild(divProducto);
    });

    container.appendChild(fila);
  });
}

function cargarProductosFactura() {
  const sel = document.getElementById("productoSelect");
  if (!sel) return;

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

function filtrarProductos() {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const productos = document.querySelectorAll(".producto");
  productos.forEach(prod => {
    const nombre = prod.querySelector("h3").textContent.toLowerCase();
    prod.style.display = nombre.includes(texto) ? "block" : "none";
  });
}

function mostrarInfoProducto(nombre, precio, imagen, info, beneficios, usoRecomendado) {
  document.getElementById("modalProductoNombre").textContent = nombre;
  document.getElementById("modalProductoImagen").src = imagen;
  document.getElementById("modalProductoInfo").textContent = info;
  document.getElementById("modalProductoUso").innerHTML = 
    `<strong>🧠 Beneficios:</strong> ${beneficios}<br><strong>🏠 Uso recomendado:</strong> ${usoRecomendado}`;
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
        div.innerHTML = `<span>${producto.nombre}</span><button onclick="seleccionarAroma('${producto.nombre}')">Elegir</button>`;
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

  // Aplicar cupón
  if (cuponActivo === "ESENTIA10") {
    total *= 0.9;
  } else if (cuponActivo === "AMIGO15") {
    total *= 0.85;
  }

  document.getElementById("totalModal").textContent = `Total: ₡${Math.round(total).toLocaleString()}`;
  document.getElementById("contadorCarrito").textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function cargarCarrito() {
  const data = localStorage.getItem("carrito");
  if (data) {
    carrito = JSON.parse(data);
    renderCarrito();
  }
}

function vaciarCarrito() {
  if (confirm("¿Estás seguro de querer vaciar el carrito?")) {
    carrito = [];
    renderCarrito();
  }
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

  mensaje += `%0A%0A💰 Total: ₡${Math.round(total).toLocaleString()}*%0A%0A¡Gracias por tu compra! 🌿`;
  window.open(` https://wa.me/50672952454?text=${mensaje}`, "_blank");
}

function abrirModalCarrito() {
  renderCarrito();
  document.getElementById("modalCarrito").style.display = "block";
}

function cerrarModalCarrito() {
  document.getElementById("modalCarrito").style.display = "none";
}

function recomendarAmigo() {
  const numero = document.getElementById("numeroAmigo").value.trim();
  if (!numero.match(/^\d{8,12}$/)) {
    alert("Ingrese un número válido sin símbolos ni espacios.");
    return;
  }
  const mensaje = encodeURIComponent("Hola 👋, quiero recomendarte este catálogo de fragancias de Esentia. Si haces una compra, yo obtengo un 10% de descuento y tú obtienes un 10% en tu próxima compra. ¡Dale un vistazo! 👉  https://wil1979.github.io/esentia-factura/catalogo.html  ");
  window.open(`https://wa.me/506 ${numero}?text=${mensaje}`, "_blank");
}

function irAlCarrito() {
  const carritoSection = document.querySelector(".carrito");
  carritoSection?.scrollIntoView({ behavior: "smooth" });
}

function mostrarImagenGrande(src) {
  document.getElementById("modalImagen").style.display = "flex";
  document.getElementById("imgGrande").src = src;
}

function cerrarImagenGrande() {
  document.getElementById("modalImagen").style.display = "none";
  document.getElementById("imgGrande").src = "";
}

// Cargar carrito desde localStorage
window.addEventListener("DOMContentLoaded", () => {
  cargarCarrito();
  renderizarProductos();
  cargarProductosFactura();
});

function esProductoNuevo(fechaLanzamiento, dias = 30) {
  const hoy = new Date();
  const lanzamiento = new Date(fechaLanzamiento);
  const diferenciaMs = hoy - lanzamiento;
  const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  return diferenciaDias <= dias;
}
function cargarProductosFactura() {
  const sel = document.getElementById("productoSelect");
  if (!sel) return;

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