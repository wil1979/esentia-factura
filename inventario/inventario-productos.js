// ===============================
// 📦 Inicializar productos desde JSON
// ===============================

import {
  db,
  collection,
  doc,
  getDoc,
  setDoc
} from "./firebase.js";

const productosRef = collection(db, "productos");

// 🔗 Fuentes de verdad
const URL_ESENCIA =
  "https://wil1979.github.io/esentia-factura/productos_esentia.json";

const URL_LIMPIEZA =
  "https://wil1979.github.io/esentia-factura/productos_limpieza_completo.json";

// Cache local
let catalogoActual = [];
let productoSeleccionado = null;

// ===============================
// 🔄 Cargar catálogo
// ===============================
window.cargarCatalogo = async () => {
  const tipo = document.getElementById("catalogo").value;
  const url = tipo === "limpieza" ? URL_LIMPIEZA : URL_ESENCIA;

  const res = await fetch(url);
  catalogoActual = await res.json();

  const productoSelect = document.getElementById("productoSelect");
  const varianteSelect = document.getElementById("varianteSelect");

  productoSelect.innerHTML = "<option value=''>Seleccione</option>";
  varianteSelect.innerHTML = "";

  catalogoActual.forEach((p, index) => {
    const nombre = p.nombre || p.producto || p.titulo;
    productoSelect.innerHTML +=
      `<option value="${index}">${nombre}</option>`;
  });
};

// ===============================
// 🧪 Al seleccionar producto
// ===============================
window.seleccionarProducto = () => {
  const index = document.getElementById("productoSelect").value;
  const varianteSelect = document.getElementById("varianteSelect");

  varianteSelect.innerHTML = "";

  if (index === "") return;

  productoSeleccionado = catalogoActual[index];

  // Detectar variantes comunes
  let variantes = [];

  if (productoSeleccionado.variantes) {
    variantes = productoSeleccionado.variantes;
  } else if (productoSeleccionado.presentaciones) {
    variantes = productoSeleccionado.presentaciones;
  } else {
    variantes = ["General"];
  }

  variantes.forEach(v => {
    varianteSelect.innerHTML +=
      `<option value="${v}">${v}</option>`;
  });
};

// ===============================
// ➕ Inicializar producto en inventario
// ===============================
window.inicializarProducto = async () => {
  if (!productoSeleccionado) {
    alert("Seleccione un producto");
    return;
  }

  const variante =
    document.getElementById("varianteSelect").value || "General";

  const nombre =
    productoSeleccionado.nombre ||
    productoSeleccionado.producto ||
    productoSeleccionado.titulo;

  const id = `${nombre.trim()}__${variante.trim()}`;

  const ref = doc(productosRef, id);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    alert("Este producto ya está inicializado en inventario");
    return;
  }

  await setDoc(ref, {
    nombre,
    variante,
    stockActual: 0,
    costoPromedio: 0,
    activo: true,
    creadoDesde: "json",
    creadoEn: new Date()
  });

  alert("Producto inicializado correctamente");
};
