let carrito = [];
let cuponActivo = false;
let productoSeleccionado = null;
let productoPendiente = null;
let productos = [];

fetch("productos_esentia.json")
  .then(response => response.json())
  .then(data => {
    productos = data;
    mostrarProductos(productos); // Renderiza los productos en la página
  })
  .catch(error => {
    console.error("Error al cargar los productos:", error);
  });


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
      nombre: "Ambientador Auto + Aroma a escoger",
      precio: 1500,
      imagen: "images/IMG_2057.jpeg",
      info: "AROMATERAPIA: Estimula creatividad y concentración. Recomendado para viajes largos.",
      beneficios: "Mejora el estado de ánimo durante trayectos largos",
      usoRecomendado: "Ideal para automóviles y transporte personal.",
      calificacion: 4.5, // ⭐ Agregado
      esNuevo: true ,// 👈 Esto marca el producto como nuevo
      disponible: true ,// ✅ Mostrará u ocultará el producto,
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
        usoRecomendado: "Dormitorios y espacios de terapia.",
        calificacion: 5, // ⭐ Agregado
        esNuevo: true ,// 👈 Esto marca el producto como nuevo
        disponible: true ,// ✅ Mostrará u ocultará el producto,
       fechaLanzamiento: "2025-10-07" ,// 👈 Fecha de lanzamiento
       variantes: [
          { nombre: "Difusor Pequeño", precio: 6500 },
          { nombre: "Difusor Pequeño + Aroma a escoger", precio: 7000 },         
       ]
      }
    ]
  },
  {
    nombre: "Aromas Disponibles",
    productos: [
      {
        nombre: "Chocolate",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/chocolate.png",
        info: "AROMATERAPIA: Aumenta serotonina 40% y reduce ansiedad emocional. Efecto antidepresivo natural.",
        beneficios: "Antidepresivo natural, mejora el estado de ánimo y combate la tristeza.",
        usoRecomendado: "Dormitorios y espacios de terapia.",
        calificacion: 3.5, // ⭐ Agregado
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Chocolate 5ml", precio: 1500 },
          { nombre: "Chocolate 30ml", precio: 3000 },
          { nombre: "Chocolate 50ml", precio: 6500 }
        ]
      },
      {
        nombre: " CocoCookies",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/cococookies.png",
        info: "AROMATERAPIA: Combina relajación (ondas theta +18%) y control de apetito emocional. Reduce antojos dulces 35%.",
        beneficios: "Relaja la mente y reduce el deseo de comer dulces por estrés emocional.",
        usoRecomendado: "Perfecto para cocinas y áreas de trabajo.",
        calificacion: 2.5, // ⭐ Agregado
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "CocoCookies 5ml", precio: 1500 },
          { nombre: "CocoCookies 30ml", precio: 3000 },
          { nombre: "CocoCookies 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Fresa",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/fresa.png",
        calificacion: 4.5, // ⭐ Agregado
        info: "AROMATERAPIA: Estimula producción de endorfinas. Antídoto contra apatía estacional.",
        beneficios: "Mejora el estado anímico y combate la depresión ligera o estacional.",
        usoRecomendado: "Clínicas de salud mental y ambientes familiares.",
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Fresa 5ml", precio: 1500 },
          { nombre: "Fresa 30ml", precio: 3000 },
          { nombre: "Fresa 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Piña Colada",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/pinacolada.png",
        info: "AROMATERAPIA: Potencia socialización (aumenta conversación 45%). Crea ambiente vacacional.",
        beneficios: "Estimula la interacción social y crea un clima distendido.",
        calificacion: 4.5, // ⭐ Agregado
        usoRecomendado: "Perfecto para fiestas y reuniones sociales.",
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Piña Colada 5ml", precio: 1500 },
          { nombre: "Piña Colada 30ml", precio: 3000 },
          { nombre: "Piña Colada 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Melón Vainilla",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/melonvainilla.png",
        info: "AROMATERAPIA: Combinación relajante (ondas alfa cerebrales). Disminuye antojos dulces 30%.",
        beneficios: "Calma la ansiedad y reduce el consumo compulsivo de azúcar.",
        usoRecomendado: "Ideal para comedores y cocinas.",
        calificacion: 5, // ⭐ Agregado
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Melón Vainilla 5ml", precio: 1500 },
          { nombre: "Melón Vainilla 30ml", precio: 3000 },
          { nombre: "Melón Vainilla 50ml", precio: 6500 }
        ]
      },
   
  {
    
        nombre: "Lavanda",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/lavanda.png",
        info: "AROMATERAPIA: Reduce el cortisol 31%, mejora calidad del sueño en 45%. Ideal para insomnio y ansiedad.",
        beneficios: "Relajante natural, ideal para personas con estrés o problemas para conciliar el sueño.",
        usoRecomendado: "Uso nocturno en dormitorios.",
        calificacion: 5, // ⭐ Agregado
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Lavanda 5ml", precio: 1500 },
          { nombre: "Lavanda 30ml", precio: 3000 },
          { nombre: "Lavanda 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Magnolia",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/magnolia.png",
        info: "AROMATERAPIA: Reduce estrés emocional en 35%. Equilibra estados de ánimo.",
        beneficios: "Equilibra emociones y reduce la irritabilidad.",
        usoRecomendado: "Perfecto para meditación y salas de yoga.",
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        calificacion: 4.5, // ⭐ Agregado
        variantes: [
          { nombre: "Magnolia 5ml", precio: 1500 },
          { nombre: "Magnolia 30ml", precio: 3000 },
          { nombre: "Magnolia 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Rosa",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/rosa.png",
        info: "AROMATERAPIA: Regula desequilibrios hormonales. Alivia síntomas premenstruales en 52%.",
        beneficios: "Ayuda en el bienestar femenino y equilibrio hormonal.",
        usoRecomendado: "Espacios femeninos y zonas de autocuidado.",
        calificacion: 2.5, // ⭐ Agregado
         disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Rosa 5ml", precio: 1500 },
          { nombre: "Rosa 30ml", precio: 3000 },
          { nombre: "Rosa 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Violeta",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/violeta.png",
        info: "AROMATERAPIA: Estimula intuición y sueños lúcidos. Aumenta fase REM 40%.",
        beneficios: "Potencia la creatividad, la intuición y la claridad onírica.",
        usoRecomendado: "Estudios de psicología y onirología.",
        calificacion: 0, // ⭐ Agregado
         disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Violeta 5ml", precio: 1500 },
          { nombre: "Violeta 30ml", precio: 3000 },
          { nombre: "Violeta 50ml", precio: 6500 }
        ]
      },
  
  {
   
        nombre: "Limón",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/limon.png",
        info: "AROMATERAPIA: Aumenta alerta mental 50%. Purifica ambientes eliminando patógenos.",
        beneficios: "Refrescante, purificante y antibacteriano natural.",
        usoRecomendado: "Excelente para cocinas y hospitales.",
         disponible: true ,// ✅ Mostrará u ocultará el producto,
         calificacion: 0, // ⭐ Agregado
        variantes: [
          { nombre: "Limón 5ml", precio: 1500 },
          { nombre: "Limón 30ml", precio: 3000 },
          { nombre: "Limón 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Naranja",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/naranja.png",
        info: "AROMATERAPIA: Aumenta producción de serotonina 60%. Antidepresivo natural.",
        beneficios: "Combate la depresión leve y mejora el estado de ánimo matutino.",
        usoRecomendado: "Uso matutino en salas de estar.",
         disponible: true ,// ✅ Mostrará u ocultará el producto,
         calificacion: 4.5, // ⭐ Agregado
        variantes: [
          { nombre: "Naranja 5ml", precio: 1500 },
          { nombre: "Naranja 30ml", precio: 3000 },
          { nombre: "Naranja 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Citronela",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/citronela.png",
        info: "AROMATERAPIA: Repelente de insectos natural (eficacia 92%). Elimina virus transmitidos por mosquitos.",
        beneficios: "Protección natural contra insectos y ambientes limpios.",
        usoRecomendado: "Exteriores tropicales y zonas verdes.",
        calificacion: 5, // ⭐ Agregado
         disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "Citronela 5ml", precio: 1500 },
          { nombre: "Citronela 30ml", precio: 3000 },
          { nombre: "Citronela 50ml", precio: 6500 }
        ]
      },
  
  
      {
        nombre: "Eucalipto",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/eucalipto.png",
        info: "AROMATERAPIA: Descongestiona vías respiratorias en 90% durante primeros 15 minutos. Elimina 85% de patógenos aéreos.",
        beneficios: "Mejora la respiración, descongestiona nariz y pulmones.",
        usoRecomendado: "Para asmáticos y espacios húmedos.",
         disponible: true ,// ✅ Mostrará u ocultará el producto,
         calificacion: 5, // ⭐ Agregado
        variantes: [
          { nombre: "Eucalipto 5ml", precio: 1500 },
          { nombre: "Eucalipto 30ml", precio: 3000 },
          { nombre: "Eucalipto 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Sándalo",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/sandalo.png",
        info: "AROMATERAPIA: Ancestralmente usado en rituales. Profundiza conexión espiritual.",
        beneficios: "Facilita la meditación y potencia la introspección.",
        usoRecomendado: "Templos y espacios sagrados.",
         disponible: false ,// ✅ Mostrará u ocultará el producto,
         calificacion: 2.5, // ⭐ Agregado
        variantes: [
          { nombre: "Sándalo 5ml", precio: 1500 },
          { nombre: "Sándalo 30ml", precio: 3000 },
          { nombre: "Sándalo 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Pino",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/pino.png",
        info: "AROMATERAPIA: Purificador aéreo (elimina 86% de alérgenos). Descongestiona vías respiratorias.",
        beneficios: "Alivio natural para asmáticos y personas con alergias.",
        usoRecomendado: "Áreas con mascotas o polvo.",
         disponible: true ,// ✅ Mostrará u ocultará el producto,
         calificacion: 3, // ⭐ Agregado
        variantes: [
          { nombre: "Pino 5ml", precio: 1500 },
          { nombre: "Pino 30ml", precio: 3000 },
          { nombre: "Pino 50ml", precio: 6500 }
        ]
      },
 
  {
    
        nombre: "Océano",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/oceano.png",
        info: "AROMATERAPIA: Induce estados meditativos profundos. Mejora capacidad pulmonar 22%.",
        beneficios: "Promueve la calma y mejora la respiración consciente.",
        usoRecomendado: "Prácticas de respiración y yoga.",
         disponible: false ,// ✅ Mostrará u ocultará el producto,
         calificacion: 0, // ⭐ Agregado
        variantes: [
          { nombre: "Océano 5ml", precio: 1500 },
          { nombre: "Océano 30ml", precio: 3000 },
          { nombre: "Océano 50ml", precio: 6500 }
        ]
      },
      {
        nombre: "Navidad",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/navidad.png",
        info: "AROMATERAPIA: Estimula memorias afectivas. Reduce nostalgia en adultos mayores.",
        beneficios: "Evoca emociones positivas y recuerdos felices.",
        usoRecomendado: "Residencias y épocas festivas.",
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        calificacion: 0, // ⭐ Agregado
        variantes: [
          { nombre: "Navidad 5ml", precio: 1500 },
          { nombre: "Navidad 30ml", precio: 3000 },
          { nombre: "Navidad 50ml", precio: 6500 }
        ]
      },
  
  
      {
        nombre: "Baby",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/baby.png",
        info: "AROMATERAPIA: Calma cólicos del lactante. Regula ritmos circadianos infantiles.",
        beneficios: "Regula el sueño y la tranquilidad en bebés.",
        usoRecomendado: "Nurserías y cuartos de bebé.",
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        calificacion: 0, // ⭐ Agregado
        variantes: [
          { nombre: "Baby 5ml", precio: 1500 },
          { nombre: "Baby 30ml", precio: 3000 },
          { nombre: "Baby 50ml", precio: 6500 }
        ]
      },
      {
    nombre: "Ariel",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/ariel.png",
    info: "AROMATERAPIA: Aroma fresco y limpio, ideal para espacios de descanso.",
    beneficios: "Sensación de limpieza y frescura duradera.",
    usoRecomendado: "Ropa de cama, habitaciones y baños.",
    disponible: false ,// ✅ Mostrará u ocultará el producto,
    calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Ariel 5ml", precio: 1500 },
      { nombre: "Ariel 30ml", precio: 3000 },
      { nombre: "Ariel 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Canela",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/canela.png",
    info: "AROMATERAPIA: Estimulante y cálida, perfecta para activar los sentidos.",
    beneficios: "Estimulante natural, energizante.",
    usoRecomendado: "Salas de estar y cocinas.",
    disponible: false ,// ✅ Mostrará u ocultará el producto,
    calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Canela 5ml", precio: 1500 },
      { nombre: "Canela 30ml", precio: 3000 },
      { nombre: "Canela 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Cherry",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/cherry.png",
    info: "AROMATERAPIA: Dulce y vibrante, evoca alegría y dinamismo.",
    beneficios: "Aumenta la vitalidad y mejora el ánimo.",
    usoRecomendado: "Salas de estar y oficinas juveniles.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 4.5, // ⭐ Agregado
    variantes: [
      { nombre: "Cherry 5ml", precio: 1500 },
      { nombre: "Cherry 30ml", precio: 3000 },
      { nombre: "Cherry 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Chicle",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/chicle.png",
    info: "AROMATERAPIA: Dulce y divertido, evoca juventud y alegría.",
    beneficios: "Eleva el ánimo, ideal para ambientes alegres.",
    usoRecomendado: "Espacios juveniles o comercios.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 5, // ⭐ Agregado
    variantes: [
      { nombre: "Chicle 5ml", precio: 1500 },
      { nombre: "Chicle 30ml", precio: 3000 },
      { nombre: "Chicle 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Ciprés",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/cipres.png",
    info: "AROMATERAPIA: Aroma fresco y amaderado, ideal para la concentración.",
    beneficios: "Equilibra emociones y mejora la claridad mental.",
    usoRecomendado: "Estudios y espacios de trabajo.",
    disponible: false ,// ✅ Mostrará u ocultará el producto,
    calificacion: 3, // ⭐ Agregado
    variantes: [
      { nombre: "Ciprés 5ml", precio: 1500 },
      { nombre: "Ciprés 30ml", precio: 3000 },
      { nombre: "Ciprés 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Fantasía navideña",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/navidad.png",
    info: "AROMATERAPIA: Notas cálidas y festivas, crea un ambiente acogedor.",
    beneficios: "Despierta la nostalgia y calidez del hogar.",
    usoRecomendado: "Temporada navideña y reuniones familiares.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 3, // ⭐ Agregado
    variantes: [
      { nombre: "Navidad 5ml", precio: 1500 },
      { nombre: "Navidad 30ml", precio: 3000 },
      { nombre: "Navidad 50ml", precio: 6500 }
    ]
  },
   {
    nombre: "Cocomenta",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/cocomenta.png",
    info: "AROMATERAPIA: Creación de una atmósfera revitalizante y refrescante, que puede ayudar a la claridad mental y la resistencia.",
    beneficios: "La menta, en particular, es conocida por sus propiedades para mejorar el estado de ánimo, aliviar el estrés y la fatiga, y promover la concentración. La combinación de ambos aromas puede crear una experiencia aromática única y beneficiosa.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 5, // ⭐ Agregado
     esNuevo: true ,// 👈 Esto marca el producto como nuevo
     fechaLanzamiento: "2025-26-07", // 👈 Fecha de lanzamiento
    usoRecomendado: "Dormitorios y oficinas.",
    variantes: [
      { nombre: "Cocomenta 5ml", precio: 1500 },
      { nombre: "Cocomenta 30ml", precio: 3000 },
      { nombre: "Cocomenta 50ml", precio: 6500 }
    ]
  },
   {
        nombre: " CocoVainilla",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/cocovainilla.png",
        info: "AROMATERAPIA: ofrece beneficios como la relajación, reducción del estrés, mejora del estado de ánimo, y puede favorecer el sueño. La vainilla tiene propiedades calmantes y sedantes, mientras que el coco aporta una sensación tropical y relajante.",
        beneficios: "Relaja la mente y reduce el estrés emocional.",
        usoRecomendado: "Perfecto para cocinas, dormitorios y áreas de trabajo.",
        calificacion: 5, // ⭐ Agregado
        esNuevo: true ,// 👈 Esto marca el producto como nuevo
        fechaLanzamiento: "2025-26-07", // 👈 Fecha de lanzamiento
        disponible: true ,// ✅ Mostrará u ocultará el producto,
        variantes: [
          { nombre: "CocoVainilla 5ml", precio: 1500 },
          { nombre: "CocoVainilla 30ml", precio: 3000 },
          { nombre: "CocoVainilla 50ml", precio: 6500 }
        ]
      },
  {
    nombre: "Frutal",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/frutal.png",
    info: "AROMATERAPIA: Mezcla alegre de frutas tropicales.",
    beneficios: "Energizante, ideal para animar el día.",
    usoRecomendado: "Cocinas, salas y oficinas.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 4, // ⭐ Agregado
    variantes: [
      { nombre: "Frutal 5ml", precio: 1500 },
      { nombre: "Frutal 30ml", precio: 3000 },
      { nombre: "Frutal 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Herbal",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/herbal.png",
    info: "AROMATERAPIA: Tonificante y equilibrado, ideal para la relajación.",
    beneficios: "Reduce el estrés y equilibra emociones.",
    usoRecomendado: "Salas de meditación y estudios.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 3, // ⭐ Agregado
    variantes: [
      { nombre: "Herbal 5ml", precio: 1500 },
      { nombre: "Herbal 30ml", precio: 3000 },
      { nombre: "Herbal 50ml", precio: 6500 }
    ]
  },
  
  {
    nombre: "Manzana",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/manzana.png",
    info: "AROMATERAPIA: Dulce y suave, crea un ambiente familiar.",
    beneficios: "Confort emocional y armonía.",
    usoRecomendado: "Salas, dormitorios y espacios compartidos.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 4, // ⭐ Agregado
    variantes: [
      { nombre: "Manzana 5ml", precio: 1500 },
      { nombre: "Manzana 30ml", precio: 3000 },
      { nombre: "Manzana 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Manzana Canela",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/manzanacanela.png",
    info: "AROMATERAPIA: Mezcla cálida y acogedora, ideal para el hogar.",
    beneficios: "Evoca calidez, armoniza ambientes.",
    usoRecomendado: "Comedores y salas familiares.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 3, // ⭐ Agregado
    variantes: [
      { nombre: "Manzana Canela 5ml", precio: 1500 },
      { nombre: "Manzana Canela 30ml", precio: 3000 },
      { nombre: "Manzana Canela 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Manzana verde",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/manzanaverde.png",
    info: "AROMATERAPIA: Refrescante y afrutado, ideal para ambientes limpios.",
    beneficios: "Activa los sentidos, revitalizante.",
    usoRecomendado: "Baños y cocinas.",
    disponible: true ,// ✅ Mostrará u ocultará el producto,
    calificacion: 4.5, // ⭐ Agregado
    variantes: [
      { nombre: "Manzana verde 5ml", precio: 1500 },
      { nombre: "Manzana verde 30ml", precio: 3000 },
      { nombre: "Manzana verde 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Maracuya",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/maracuya.png",
    info: "AROMATERAPIA: Tropical y relajante, ayuda a liberar tensiones.",
    beneficios: "Relaja, refresca y aporta alegría.",
    usoRecomendado: "Dormitorios y jardines interiores.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Maracuya 5ml", precio: 1500 },
      { nombre: "Maracuya 30ml", precio: 3000 },
      { nombre: "Maracuya 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Melocotón",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/melocoton.png",
    info: "AROMATERAPIA: Dulce y suave, brinda calidez y armonía.",
    beneficios: "Relajante y acogedor.",
    usoRecomendado: "Dormitorios y zonas de descanso.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Melocotón 5ml", precio: 1500 },
      { nombre: "Melocotón 30ml", precio: 3000 },
      { nombre: "Melocotón 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Menta",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/menta.png",
    info: "AROMATERAPIA: Refrescante y estimulante, mejora la concentración.",
    beneficios: "Revitalizante y purificante.",
    usoRecomendado: "Estudios y áreas de trabajo.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 4.5, // ⭐ Agregado
    variantes: [
      { nombre: "Menta 5ml", precio: 1500 },
      { nombre: "Menta 30ml", precio: 3000 },
      { nombre: "Menta 50ml", precio: 6500 }
    ]
  },
  
  {
    nombre: "Pepino",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/pepino.png",
    info: "AROMATERAPIA: Refrescante y ligero, ideal para relajación.",
    beneficios: "Reduce el estrés y refresca el ambiente.",
    usoRecomendado: "Baños y espacios de spa.",
     disponible: false ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Pepino 5ml", precio: 1500 },
      { nombre: "Pepino 30ml", precio: 3000 },
      { nombre: "Pepino 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Vainilla",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/vainilla.png",
    info: "AROMATERAPIA: Dulce y reconfortante, ideal para descansar.",
    beneficios: "Relaja, reconforta y reduce ansiedad.",
    usoRecomendado: "Dormitorios y espacios íntimos.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 3, // ⭐ Agregado
    variantes: [
      { nombre: "Vainilla 5ml", precio: 1500 },
      { nombre: "Vainilla 30ml", precio: 3000 },
      { nombre: "Vainilla 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Primaveral",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/primaveral.png",
    info: "AROMATERAPIA: Fresco y floral, ideal para renovar el ambiente.",
    beneficios: "Inspirador, crea sensaciones de alegría.",
     disponible: false ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    usoRecomendado: "Salas y entradas.",
    variantes: [
      { nombre: "Primaveral 5ml", precio: 1500 },
      { nombre: "Primaveral 30ml", precio: 3000 },
      { nombre: "Primaveral 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Violeta",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/violeta.png",
    info: "AROMATERAPIA: Floral y relajante, ideal para la noche.",
    beneficios: "Promueve el sueño y la tranquilidad.",
    usoRecomendado: "Dormitorios y salas de descanso.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Violeta 5ml", precio: 1500 },
      { nombre: "Violeta 30ml", precio: 3000 },
      { nombre: "Violeta 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Sábila",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/sabila.png",
    info: "AROMATERAPIA: Refrescante y purificante, muy natural.",
    beneficios: "Limpia, suaviza y calma.",
    usoRecomendado: "Cocinas y baños.",
     disponible: false ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Sábila 5ml", precio: 1500 },
      { nombre: "Sábila 30ml", precio: 3000 },
      { nombre: "Sábila 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Sandía",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/sandia.png",
    info: "AROMATERAPIA: Dulce y jugoso, ideal para verano.",
    beneficios: "Refrescante y revitalizante.",
    usoRecomendado: "Ambientes abiertos y reuniones sociales.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 5, // ⭐ Agregado
    variantes: [
      { nombre: "Sandía 5ml", precio: 1500 },
      { nombre: "Sandía 30ml", precio: 3000 },
      { nombre: "Sandía 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "ChocoMenta",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/chocomenta.png",
    info: "AROMATERAPIA: Delicado y floral, como una brisa suave.",
    beneficios: "Relaja y brinda serenidad.",
    usoRecomendado: "Dormitorios y salas acogedoras.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 4, // ⭐ Agregado
    variantes: [
      { nombre: "Suave abril 5ml", precio: 1500 },
      { nombre: "Suave abril 30ml", precio: 3000 },
      { nombre: "Suave abril 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Kiwi",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/kiwi.png",
    info: "AROMATERAPIA: Frutal y refrescante, aporta vitalidad.",
    beneficios: "Refuerza el ánimo y energiza el ambiente.",
    usoRecomendado: "Cocinas y espacios abiertos.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 5, // ⭐ Agregado
    variantes: [
      { nombre: "Kiwi 5ml", precio: 1500 },
      { nombre: "Kiwi 30ml", precio: 3000 },
      { nombre: "Kiwi 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Floral",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/floral.png",
    info: "AROMATERAPIA: Combinación de flores que aporta frescura y alegría.",
    beneficios: "Relajante, crea ambientes armoniosos.",
    usoRecomendado: "Dormitorios y salas de estar.",
     disponible: false ,// ✅ Mostrará u ocultará el producto,
     calificacion: 0, // ⭐ Agregado
    variantes: [
      { nombre: "Floral 5ml", precio: 1500 },
      { nombre: "Floral 30ml", precio: 3000 },
      { nombre: "Floral 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Coco",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/coco.png",
    info: "AROMATERAPIA: Aroma tropical, dulce y relajante.",
    beneficios: "Evoca vacaciones y reduce el estrés.",
    usoRecomendado: "Dormitorios y terrazas.",
     disponible: true ,// ✅ Mostrará u ocultará el producto,
     calificacion: 4, // ⭐ Agregado
    variantes: [
      { nombre: "Coco 5ml", precio: 1500 },
      { nombre: "Coco 30ml", precio: 3000 },
      { nombre: "Coco 50ml", precio: 6500 }
    ]
  },
  {
    nombre: "Bambú",
    precioOriginal: 7000,
    precioOferta: 6500,
    imagen: "etiqueta/banbu.png",
    info: "AROMATERAPIA: Refrescante y natural, ayuda a purificar el ambiente.",
    beneficios: "Relaja y armoniza los espacios.",
    usoRecomendado: "Oficinas y salas de espera.",
     disponible: false ,// ✅ Mostrará u ocultará el producto,
     calificacion: 3.5, // ⭐ Agregado
    variantes: [
      { nombre: "Bambú 5ml", precio: 1500 },
      { nombre: "Bambú 30ml", precio: 3000 },
      { nombre: "Bambú 50ml", precio: 6500 }
    ]
  },
      {
        nombre: "Blanc",
        precioOriginal: 7000,
        precioOferta: 6500,
        imagen: "etiqueta/blanc.png",
        info: "AROMATERAPIA: Efecto hidratante cutáneo inmediato. Mejora textura de la piel.",
        beneficios: "Hidratación natural y frescura ambiental.",
        usoRecomendado: "Baños y espacios de belleza.",
         disponible: false ,// ✅ Mostrará u ocultará el producto,
         calificacion: 0, // ⭐ Agregado
        variantes: [
          { nombre: "Blanc 5ml", precio: 1500 },
          { nombre: "Blanc 30ml", precio: 3000 },
          { nombre: "Blanc 50ml", precio: 6500 }
        ]
      }
      
    ]
  }
];


  function filtrarProductos() {
    const input = document.getElementById('buscador').value.toLowerCase();
    const productos = document.querySelectorAll('#productos-hogar .producto');

    productos.forEach(producto => {
      const nombre = producto.innerText.toLowerCase();
      producto.style.display = nombre.includes(input) ? 'block' : 'none';
    });
  }

function renderizarProductos() {
  const container = document.getElementById("productos-hogar");
  if (!container) return;

  container.innerHTML = "";

  categorias.forEach(categoria => {
    const titulo = document.createElement("h3");
    titulo.textContent = categoria.nombre;
    titulo.style.marginTop = "2rem";
    container.appendChild(titulo);

    const fila = document.createElement("div");
    fila.className = "productos";
    fila.style.display = "flex";
    fila.style.flexWrap = "wrap";
    fila.style.gap = "1.5rem";

    categoria.productos.forEach(producto => {
      if (!producto.disponible) return;

      const divProducto = document.createElement("div");
      divProducto.className = producto.precioOferta ? "producto oferta" : "producto";
      const precioFinal = producto.precioOferta || producto.precio;

      let badgeHTML = "";
      if (producto.fechaLanzamiento && esProductoNuevo(producto.fechaLanzamiento)) {
        badgeHTML = `<span class="nuevo-badge">🌟 Nuevo</span>`;
      }

      let estrellasHTML = '';
      if (producto.calificacion) {
        const estrellasLlenas = Math.floor(producto.calificacion);
        const mediaEstrella = producto.calificacion % 1 >= 0.5;
        for (let i = 0; i < estrellasLlenas; i++) estrellasHTML += '⭐';
        if (mediaEstrella) estrellasHTML += '✨';
        while (estrellasHTML.length < 5) estrellasHTML += '☆';
      }

      let botonHTML = "";
      if (producto.nombre.startsWith("Difusor") || producto.nombre.startsWith("Ambientador")) {
        botonHTML = `<button onclick="abrirModalSeleccionAroma('${producto.nombre}', ${precioFinal})">Agregar al carrito</button>`;
      } else {
        botonHTML = `<button onclick="mostrarInfoProducto('${producto.nombre}', ${precioFinal}, '${producto.imagen}', \`${producto.info}\`, \`${producto.beneficios || ''}\`, \`${producto.usoRecomendado || ''}\`)">Ver detalles</button>`;
      }

      const precioHTML = producto.precioOferta
        ? `<p><span class="precio-original">₡${producto.precioOriginal}</span> ₡${producto.precioOferta}</p>`
        : `<p>₡${producto.precio}</p>`;

      divProducto.innerHTML = `
        <div style="position:relative;">
          <img src="${producto.imagen}" alt="${producto.nombre}" onclick="mostrarInfoProducto('${producto.nombre}', ${precioFinal}, '${producto.imagen}', \`${producto.info}\`, \`${producto.beneficios || ''}\`, \`${producto.usoRecomendado || ''}\`)">
          ${badgeHTML}
        </div>
        <h3>${producto.nombre}</h3>
        <div class="estrellas">${estrellasHTML}</div>
        ${precioHTML}
        ${botonHTML}
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
  document.getElementById("modalProductoUso").innerHTML = `
    <strong>🧠 Beneficios:</strong> ${beneficios}<br>
    <strong>🏠 Uso recomendado:</strong> ${usoRecomendado}`;

  document.getElementById("modalProductoPrecio").textContent = `₡${precio.toLocaleString()}`;

  const selectorContainer = document.getElementById("selectorVariante");
  selectorContainer.innerHTML = "";

  let productoActual = null;
  for (let categoria of categorias) {
    productoActual = categoria.productos.find(p => p.nombre === nombre);
    if (productoActual) break;
  }

  const calificacionContainer = document.getElementById("modalProductoCalificacion");
  if (productoActual && productoActual.calificacion) {
    const estrellasLlenas = Math.floor(productoActual.calificacion);
    const mediaEstrella = productoActual.calificacion % 1 >= 0.5;
    let estrellasHTML = "";
    for (let i = 0; i < estrellasLlenas; i++) estrellasHTML += "⭐";
    if (mediaEstrella) estrellasHTML += "✨";
    while (estrellasHTML.length < 5) estrellasHTML += "☆";
    calificacionContainer.innerHTML = `<div class="estrellas">${estrellasHTML} <span style="font-size:0.9rem; color:#555;">(${productoActual.calificacion.toFixed(1)})</span></div>`;
  } else {
    calificacionContainer.innerHTML = "";
  }

  if (productoActual && productoActual.variantes && productoActual.variantes.length > 0) {
    const select = document.createElement("select");
    select.id = "varianteSeleccionada";
    select.style.width = "100%";
    select.style.marginTop = "1rem";
    select.style.padding = "10px";
    select.style.borderRadius = "6px";
    select.style.border = "1px solid #ccc";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Selecciona una presentación --";
    select.appendChild(defaultOption);

    productoActual.variantes.forEach(variante => {
      const option = document.createElement("option");
      option.value = JSON.stringify(variante);
      option.textContent = `${variante.nombre} – ₡${variante.precio.toLocaleString()}`;
      select.appendChild(option);
    });

    selectorContainer.appendChild(select);
    document.getElementById("botonAgregarDesdeModal").disabled = false;
  } else {
    selectorContainer.innerHTML = `<p>Precio: ₡${precio.toLocaleString()}</p>`;
    document.getElementById("botonAgregarDesdeModal").disabled = false;
  }

  productoSeleccionado = { nombre, precio, imagen, info, beneficios, usoRecomendado };
  const modal = document.getElementById("modalProducto");
  modal.style.display = "block";
  modal.classList.remove("fade-out");
  modal.classList.add("fade-in");

  setTimeout(() => {
    modal.classList.remove("fade-in");
  }, 300);
}

function agregarDesdeModal() {
  const selector = document.getElementById("varianteSeleccionada");

  if (!productoSeleccionado) return;

  // Si hay variantes y no se seleccionó ninguna
  if (selector && selector.value === "") {
    mostrarToast("⚠️ Por favor, selecciona una presentación", "#e53935");
    return; // No permitir agregar al carrito
  }

  // Si hay variante seleccionada
  if (selector && selector.value) {
    const variante = JSON.parse(selector.value);
    agregarCarrito(variante.nombre, variante.precio);
  } else {
    // Si no hay selector, usar datos base
    const nombreFinal = productoSeleccionado.nombre;
    const precioFinal = productoSeleccionado.precio;
    agregarCarrito(nombreFinal, precioFinal);
  }

  cerrarModalProducto(); // ✅ Ahora sí se cierra al finalizar
}


function abrirModalSeleccionAroma(nombre, precio) {
  productoPendiente = { nombre, precio };
  const modal = document.getElementById("modalSeleccionAroma");

  if (!modal) {
    console.error("No se encontró el modal de selección de aroma");
    return;
  }

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
  const precioFinal = productoPendiente.precio;

  // Agregar al carrito
  agregarCarrito(nombreCompleto, precioFinal);

  // Cerrar el modal
  cerrarModalSeleccionAroma();

  // Mostrar mensaje de confirmación
  mostrarToast(`✅ "${nombreCompleto}" agregado al carrito`);
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

function cerrarModalProducto() {
  const modal = document.getElementById("modalProducto");

  // Aplica clase de desvanecimiento
  modal.classList.add("fade-out");

  // Espera a que termine la animación para ocultar el modal y limpiar
  setTimeout(() => {
    modal.style.display = "none";
    modal.classList.remove("fade-out");
    productoSeleccionado = null;
  }, 300); // ⏱️ Debe coincidir con la duración del @keyframes (0.3s)
}



function cerrarModalCarrito() {
  document.getElementById("modalCarrito").style.display = "none";
}

function recomendarAmigo() {
  const input = document.getElementById("numeroAmigo");
  const numero = input.value.trim();

  if (!numero.match(/^\d{8,12}$/)) {
    mostrarToast("⚠️ Número inválido. Use 8-12 dígitos sin símbolos.", "#e53935");
    return;
  }

  const mensaje = encodeURIComponent(
    "Hola 👋, quiero recomendarte este catálogo de fragancias de Esentia. ¡Dale un vistazo! 👉 https://wil1979.github.io/esentia-factura/catalogo.html"
  );

  window.open(`https://wa.me/506${numero}?text=${mensaje}`, "_blank");

  input.value = "";
  mostrarToast("✅ ¡Mensaje preparado en WhatsApp!");
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


function mostrarToast(mensaje, color = "#4caf50") {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.style.backgroundColor = color;
  toast.style.display = "block";
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.transition = "opacity 0.5s";
    toast.style.opacity = "0";
    setTimeout(() => {
      toast.style.display = "none";
      toast.style.transition = "";
    }, 500);
  }, 3000);
}

function mostrarModalVariante(nombre, imagen, info, beneficios, usoRecomendado, variantes) {
  document.getElementById("modalProductoNombre").textContent = nombre;
  document.getElementById("modalProductoImagen").src = imagen;
  document.getElementById("modalProductoInfo").textContent = info;
  document.getElementById("modalProductoUso").innerHTML = `
    <strong>🧠 Beneficios:</strong> ${beneficios}<br>
    <strong>🏠 Uso recomendado:</strong> ${usoRecomendado}
  `;

  const selector = document.getElementById("selectorVariante");
  selector.innerHTML = ""; // Limpiar anterior

  if (variantes && variantes.length > 0) {
    const select = document.createElement("select");
    select.id = "varianteSeleccionada";
    select.style.width = "100%";
    select.style.marginTop = "1rem";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Selecciona una presentación --";
    select.appendChild(defaultOption);

    variantes.forEach(variante => {
      const option = document.createElement("option");
      option.value = JSON.stringify(variante);
      option.textContent = `${variante.nombre} – ₡${variante.precio.toLocaleString()}`;
      select.appendChild(option);
    });

    selector.appendChild(select);
    document.getElementById("botonAgregarDesdeModal").disabled = false;
  } else {
    selector.innerHTML = "<p>No hay presentaciones disponibles.</p>";
    document.getElementById("botonAgregarDesdeModal").disabled = true;
  }

  productoSeleccionado = { nombre, imagen, info, beneficios, usoRecomendado, variantes };
  const modal = document.getElementById("modalProducto");
modal.style.display = "block";
modal.classList.remove("fade-out"); // por si se cerró antes
modal.classList.add("fade-in");

setTimeout(() => {
  modal.classList.remove("fade-in");
}, 300); // limpiar clase después de la animación

}
