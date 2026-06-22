// =======================================
// ESENTIA PROMO STUDIO V2
// =======================================

const URLS = {

  ESENCIAS:
  "https://wil1979.github.io/esentia-factura/data/productos_esentia.json",

  LIMPIEZA:
  "https://wil1979.github.io/esentia-factura/data/productos_limpieza_completo.json",

  VELAS:
  "https://wil1979.github.io/esentia-factura/data/catalogo-velas.json"

};

// =======================================
// ELEMENTOS
// =======================================

const catalogSelect =
document.getElementById("catalogSelect");

const productSelect =
document.getElementById("productSelect");

const templateSelect =
document.getElementById("templateSelect");

const sizeSelect =
document.getElementById("sizeSelect");

const showPrice =
document.getElementById("showPrice");

const autoStyle =
document.getElementById("autoStyle");

const promoCard =
document.getElementById("promoCard");

const productName =
document.getElementById("productName");

const productDescription =
document.getElementById("productDescription");

const productPrice =
document.getElementById("productPrice");

const productImage =
document.getElementById("productImage");

// =======================================
// DATA
// =======================================

let products = [];

// =======================================
// CARGAR PRODUCTOS
// =======================================

async function loadCatalog(){

  const catalog =
  catalogSelect.value;

  const response =
  await fetch(URLS[catalog]);

  const data =
  await response.json();

  products = [];

  // ESENCIAS
  if(catalog === "ESENCIAS"){

    Object.entries(data).forEach(([tipo, items]) => {

      items.forEach(item => {

        products.push({
          ...item,
          tipo
        });

      });

    });

  }

  // LIMPIEZA
  else{

    products =
    Array.isArray(data)
    ? data
    : [data];

  }

  renderProducts();

}

// =======================================
// RENDER PRODUCTOS
// =======================================

function renderProducts(){

  productSelect.innerHTML = "";

  products.forEach((product, index) => {

    const option =
    document.createElement("option");

    option.value = index;

    option.textContent =
    product.nombre || "Producto";

    productSelect.appendChild(option);

  });

  updatePreview();

}

// =======================================
// PREVIEW
// =======================================

function updatePreview(){

  const product =
  products[productSelect.value];

  if(!product) return;

  // NOMBRE

  productName.textContent =
  product.nombre || "Producto";

  // DESCRIPCION

  productDescription.textContent =

  product.info ||

  product.descripcion ||

  "Experiencia aromática premium.";

  // PRECIO

  const price =
  product.precio ||
  product.precioPublico ||
  0;

  productPrice.textContent =
  `₡${price}`;

  // IMAGEN

  productImage.src =
  product.imagen ||
  "https://pngimg.com/d/strawberry_PNG2593.png";

  // MOSTRAR PRECIO

  productPrice.style.display =

  showPrice.checked
  ? "inline-block"
  : "none";

  // TEMPLATE

  promoCard.classList.remove(
    "fresh",
    "luxury",
    "candy",
    "nature"
  );

  // IA AUTOMATICA

  if(autoStyle.checked){

    const name =
    (product.nombre || "").toLowerCase();

    if(name.includes("menta"))
      promoCard.classList.add("fresh");

    else if(name.includes("vainilla"))
      promoCard.classList.add("luxury");

    else if(name.includes("fresa"))
      promoCard.classList.add("candy");

    else
      promoCard.classList.add("nature");

  }

  else{

    promoCard.classList.add(
      templateSelect.value
    );

  }

}

// =======================================
// SIZE
// =======================================

function updateSize(){

  promoCard.classList.remove(
    "story",
    "post",
    "portrait"
  );

  promoCard.classList.add(
    sizeSelect.value
  );

}

// =======================================
// EXPORT PNG
// =======================================

document
.getElementById("downloadBtn")
.addEventListener("click", () => {

  html2canvas(promoCard, {

    scale:3,
    useCORS:true

  }).then(canvas => {

    const link =
    document.createElement("a");

    link.download =
    "esentia-promo.png";

    link.href =
    canvas.toDataURL();

    link.click();

  });

});

// =======================================
// EVENTS
// =======================================

catalogSelect.addEventListener(
  "change",
  loadCatalog
);

productSelect.addEventListener(
  "change",
  updatePreview
);

templateSelect.addEventListener(
  "change",
  updatePreview
);

showPrice.addEventListener(
  "change",
  updatePreview
);

autoStyle.addEventListener(
  "change",
  updatePreview
);

sizeSelect.addEventListener(
  "change",
  updateSize
);

// =======================================
// INIT
// =======================================

loadCatalog();
updateSize();