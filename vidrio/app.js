// ======================================
// ESENTIA PROMO STUDIO V4
// CLEAN MAIN APP
// ======================================

// ======================================
// IMPORTS - desde ./modules/
// ======================================

import {
  canvas,
  setCanvasSize
} from "./modules/canvas-engine.js";

import {
  loadProducts
} from "./modules/product-loader.js";

import {
  setBackgroundColor,
  setBackgroundImage
} from "./modules/background-engine.js";

import {
  applyOverlay
} from "./modules/overlays.js";

import {
  exportPNG
} from "./modules/exporter.js";

import {
  applyAIStyle
} from "./modules/ai-engine.js";

import {
  createProductScene
} from "./modules/templates.js";

import {
  initUI
} from "./modules/ui-bindings.js";

import {
  initDynamicPanel
} from "./modules/dynamic-panel.js";

import {
  getObject
} from "./modules/object-manager.js";

// ======================================
// ELEMENTOS
// ======================================

const catalogSelect = document.getElementById("catalogSelect");
const productSelect = document.getElementById("productSelect");
const canvasSize = document.getElementById("canvasSize");
const bgColor = document.getElementById("bgColor");
const bgUpload = document.getElementById("bgUpload");
const overlaySelect = document.getElementById("overlaySelect");
const downloadBtn = document.getElementById("downloadBtn");
const productSearch = document.getElementById("productSearch");

// ======================================
// DATA
// ======================================

let products = [];
let currentProduct = null;

// ======================================
// INITIALIZE PRODUCTS
// ======================================

async function initializeProducts(){
  try{
    products = await loadProducts(catalogSelect.value);
    renderProductOptions();
  }
  catch(error){
    console.error("ERROR LOADING PRODUCTS", error);
  }
}

// ======================================
// RENDER OPTIONS
// ======================================

function renderProductOptions(){
  if(!productSelect) return;
  productSelect.innerHTML = "";
  products.forEach((product, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = product.nombre || "Producto";
    productSelect.appendChild(option);
  });
  loadSelectedProduct();
}

// ======================================
// LOAD PRODUCT
// ======================================

function loadSelectedProduct(){
  const product = products[productSelect.value];
  if(!product) return;
  currentProduct = product;
  createProductScene(product);

  // Actualizar campos manuales con datos del producto
  const manualPrice = document.getElementById("manualPrice");
  if(manualPrice){
    manualPrice.value = `₡${product.precio || product.precioPublico || ""}`;
  }

  const manualDescription = document.getElementById("manualDescription");
  if(manualDescription){
    manualDescription.value = product.descripcion || product.info || "";
  }

  // Aplicar AI style automáticamente
  applyAIStyle(product);
}

// ======================================
// EVENTS
// ======================================

if(canvasSize){
  canvasSize.addEventListener("change", () => {
    setCanvasSize(canvasSize.value);
    loadSelectedProduct();
  });
}

if(catalogSelect){
  catalogSelect.addEventListener("change", initializeProducts);
}

if(productSelect){
  productSelect.addEventListener("change", loadSelectedProduct);
}

if(productSearch){
  productSearch.addEventListener("input", () => {
    const term = productSearch.value.toLowerCase();
    productSelect.innerHTML = "";
    products
      .filter(product => {
        return (product.nombre?.toLowerCase().includes(term));
      })
      .forEach((product, index) => {
        const option = document.createElement("option");
        option.value = products.indexOf(product);
        option.textContent = product.nombre;
        productSelect.appendChild(option);
      });
  });
}

if(bgColor){
  bgColor.addEventListener("input", () => {
    setBackgroundColor(bgColor.value);
  });
}

if(bgUpload){
  bgUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(event){
      setBackgroundImage(event.target.result);
    };
    reader.readAsDataURL(file);
  });
}

if(overlaySelect){
  overlaySelect.addEventListener("change", () => {
    applyOverlay(overlaySelect.value);
  });
}

if(downloadBtn){
  downloadBtn.addEventListener("click", exportPNG);
}

// ======================================
// INIT
// ======================================

function init(){
  console.log("ESENTIA PROMO STUDIO V4 INIT");
  setCanvasSize("story");
  initializeProducts();
  initUI();
  initDynamicPanel();
}

// ======================================
// START
// ======================================

init();
