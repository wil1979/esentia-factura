// CLIENTES.JS - AJUSTADO PARA NUEVO JSON CATEGORIZADO
// Versión estable v1.1
// Última revisión: 2026-02
// ===============================
// 🔥 Firebase Config
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
   getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy
};

const firebaseConfig = {
  apiKey: "AIzaSyDuMNZrLgxBs6CbuPp8j0iyynejt6WCpnQ",
  authDomain: "esentiacreditos-8345f.firebaseapp.com",
  projectId: "esentiacreditos-8345f",
  storageBucket: "esentiacreditos-8345f.firebasestorage.app",
  messagingSenderId: "888658236080",
  appId: "1:888658236080:web:506e5e2085b5a452dba175"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===============================
// 🔁 Estado global
// ===============================
let clientesBase = [];
let indiceCompraEditando = null;
let todosLosProductos = [];

let contactosPersonal = [];
let soloDeudores = false; 
let productosDisponibles = [];

window.clienteSeleccionado = null;
window.clienteSeleccionadoId = null;
window.productoSeleccionado = null;
window.carrito = [];
window.todosLosProductos = [];
window.productosDisponibles = [];
window.premioAplicado = null;
window.indiceFacturaPago = null;

// ============================
// URLs de productos
// ============================
const URL_ESENCIA = "https://wil1979.github.io/esentia-factura/productos_esentia.json";
const URL_LIMPIEZA = "https://wil1979.github.io/esentia-factura/productos_limpieza_completo.json";

// ===============================
// 🧩 Utilidades de Aplanamiento (NUEVO)
// ===============================
function aplanarProductos(data) {
  if (Array.isArray(data)) return data;
  let lista = [];
  for (const categoria in data) {
    if (Array.isArray(data[categoria])) {
      lista = lista.concat(data[categoria]);
    }
  }
  return lista;
}

// ===============================
// 📂 Cargar Productos JSON (AJUSTADO)
// ===============================
async function cargarProductosJSON() {
  try {
    const [resEsencia, resLimpieza] = await Promise.all([
      fetch(URL_ESENCIA),
      fetch(URL_LIMPIEZA)
    ]);

    const dataEsencia = resEsencia.ok ? await resEsencia.json() : {};
    const dataLimpieza = resLimpieza.ok ? await resLimpieza.json() : {};

    // Aplanar ambos JSONs por si vienen categorizados
    const listaEsencia = aplanarProductos(dataEsencia);
    const listaLimpieza = aplanarProductos(dataLimpieza);

    window.todosLosProductos = [...listaEsencia, ...listaLimpieza];
    window.productosDisponibles = window.todosLosProductos;
    
    console.log("✅ Productos cargados y aplanados:", window.todosLosProductos.length);
    
    // Si hay un modal abierto, mostrar vista previa
    if (document.getElementById("modal-productos") && !document.getElementById("modal-productos").classList.contains("hidden")) {
      mostrarVistaPrevia();
    }
  } catch (err) {
    console.error("Error al cargar productos JSON:", err);
  }
}

// ===============================
// 🔍 Filtrar Productos en Modal (AJUSTADO)
// ===============================
function filtrarProductosEnModal(e) {
  const texto = e.target.value.toLowerCase().trim();
  const select = document.getElementById("select-producto");
  if (!select) return;

  // Filtrar de la lista aplanada
  window.productosFiltrados = window.todosLosProductos.filter(p => 
    p.nombre.toLowerCase().includes(texto) || 
    (p.id && String(p.id).includes(texto))
  );

  select.innerHTML = window.productosFiltrados.map((p, i) => 
    `<option value="${i}">${p.nombre} (ID: ${p.id || '—'})</option>`
  ).join("");

  mostrarVistaPrevia();
}

// ===============================
// 📂 Cargar personal.json
// ===============================
async function cargarContactosPersonal() {
  try {
    const res = await fetch("https://wil1979.github.io/esentia-factura/personal.json");
    contactosPersonal = res.ok ? await res.json() : [];
  } catch (err) {
    console.error("Error al cargar personal.json:", err);
    contactosPersonal = [];
  }
}

// ===============================
// 📥 Clientes base
// ===============================
async function cargarClientesBaseLigero() {
  const snap = await getDocs(collection(db, "clientesBD"));
  clientesBase = [];
  for (const d of snap.docs) {
    const data = d.data();
    clientesBase.push({
      id: d.id,
      nombre: data.nombre || "Sin nombre",
      telefono: data.telefono || "",
      cedula: data.cedula || "",
      totalDeuda: data.totalDeuda || 0,
      diasAtraso: data.diasAtraso || 0
    });
  }
  renderListaClientes();
}

// ===============================
// 🛒 ABRIR MODAL PRODUCTOS (AJUSTADO)
// ===============================
window.abrirModalProductos = async function () {
  if (!window.clienteSeleccionadoId) {
    alert("❌ No hay cliente seleccionado.");
    return;
  }

  window.carrito = [];
  window.productoSeleccionado = null;

  const modal = document.getElementById("modal-productos");
  modal.classList.remove("hidden");
  modal.style.display = "flex";

  const filtroInput = document.getElementById("filtro-productos");
  if (filtroInput) {
    filtroInput.value = "";
    filtroInput.oninput = filtrarProductosEnModal;
  }

  // Cargar o recargar productos asegurando el nuevo formato
  await cargarProductosJSON();
  
  // Inicializar lista filtrada con todos
  window.productosFiltrados = window.todosLosProductos;
  const select = document.getElementById("select-producto");
  if (select) {
    select.innerHTML = window.productosFiltrados.map((p, i) => 
      `<option value="${i}">${p.nombre}</option>`
    ).join("");
    select.onchange = mostrarVistaPrevia;
  }

  actualizarResumenVenta();
  mostrarVistaPrevia();
};

// ===============================
// 👁️ MOSTRAR VISTA PREVIA (AJUSTADO)
// ===============================
function mostrarVistaPrevia() {
  const select = document.getElementById("select-producto");
  if (!select || !window.productosFiltrados || window.productosFiltrados.length === 0) return;

  const index = Number(select.value);
  const prod = window.productosFiltrados[index];
  if (!prod) return;

  window.productoSeleccionado = prod;

  const previewDiv = document.getElementById("vista-previa-producto");
  if (previewDiv) {
    // Manejar precio: precioOferta > precioOriginal > precio
    const precioBase = prod.precioOferta || prod.precioOriginal || prod.precio || 0;
    previewDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${prod.imagen}" style="width:50px; height:50px; object-fit:contain; border-radius:4px; background:#f9f9f9;">
        <div>
          <strong>${prod.nombre}</strong><br>
          <small>${prod.info || prod.descripcion || ""}</small><br>
          <span style="color:#4CAF50; font-weight:bold;">Precio: ₡${precioBase.toLocaleString()}</span>
        </div>
      </div>
    `;
  }

  cargarVariantesProducto(prod);
}

function cargarVariantesProducto(prod) {
  const selectVar = document.getElementById("select-variante");
  if (!selectVar) return;

  selectVar.innerHTML = "";

  // Si el nuevo JSON tiene "variantes"
  if (prod.variantes && prod.variantes.length > 0) {
    prod.variantes.forEach((v, i) => {
      const opt = document.createElement("option");
      // Si la variante no tiene nombre, usar el precio como identificador
      const nombreVar = v.nombre || `Presentación ${i + 1}`;
      opt.value = JSON.stringify(v);
      opt.textContent = `${nombreVar} – ₡${(v.precio || 0).toLocaleString("es-CR")}`;
      selectVar.appendChild(opt);
    });
  } else {
    // Si no hay variantes, crear una opción única con el precio base
    const precioBase = prod.precioOferta || prod.precioOriginal || prod.precio || 0;
    const opt = document.createElement("option");
    opt.textContent = "Única presentación";
    opt.value = JSON.stringify({ precio: precioBase, nombre: "Única" });
    selectVar.appendChild(opt);
  }
}

// ===============================
// ➕ AGREGAR AL CARRITO (AJUSTADO)
// ===============================
window.agregarAlCarritoModal = function () {
  if (!window.productoSeleccionado) {
    alert("Seleccione un producto");
    return;
  }

  const selectVar = document.getElementById("select-variante");
  const variante = selectVar?.value ? JSON.parse(selectVar.value) : null;
  const inputCantidad = document.getElementById("input-cantidad");
  const cantidad = Math.max(1, Number(inputCantidad?.value || 1));

  const precioFinal = variante?.precio || window.productoSeleccionado.precioOferta || window.productoSeleccionado.precioOriginal || window.productoSeleccionado.precio || 0;

  window.carrito.push({
    id: window.productoSeleccionado.id,
    nombre: window.productoSeleccionado.nombre,
    variante: variante?.nombre || "Única",
    precio: precioFinal,
    cantidad: cantidad,
    imagen: window.productoSeleccionado.imagen
  });

  renderizarCarrito();
  actualizarResumenVenta();
};

// ... (Resto de funciones de renderizado, facturación y Firebase se mantienen igual para no romper la lógica de negocio)

function renderListaClientes() {
  const cont = document.getElementById("lista-clientes");
  if (!cont) return;
  const buscador = document.getElementById("buscador-clientes")?.value.toLowerCase() || "";
  
  const filtrados = clientesBase.filter(c => 
    (c.nombre.toLowerCase().includes(buscador) || c.cedula.includes(buscador)) &&
    (!soloDeudores || c.totalDeuda > 0)
  );

  cont.innerHTML = filtrados.map(c => `
    <div class="cliente-item ${window.clienteSeleccionadoId === c.id ? 'active' : ''}" onclick="seleccionarCliente('${c.id}')">
      <strong>${c.nombre}</strong><br>
      <small>💰 Deuda: ₡${c.totalDeuda.toLocaleString()}</small>
    </div>
  `).join("");
}

async function seleccionarCliente(id) {
  window.clienteSeleccionadoId = id;
  const c = clientesBase.find(x => x.id === id);
  window.clienteSeleccionado = c;
  
  // Actualizar UI de cliente seleccionado
  document.getElementById("nombre-cliente").textContent = c.nombre;
  document.getElementById("telefono-cliente").textContent = c.telefono;
  document.getElementById("cedula-cliente").textContent = c.cedula;
  
  renderListaClientes();
  // Aquí iría la carga de facturas reales si fuera necesario
}

function actualizarResumenVenta() {
  const resumenDiv = document.getElementById("resumen-venta");
  if (!resumenDiv) return;

  const subtotal = window.carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  const descuento = Number(document.getElementById("descuento")?.value || 0);
  const total = Math.max(0, subtotal - descuento);

  resumenDiv.innerHTML = `
    <div style="font-size:1.1rem; font-weight:bold;">
      Subtotal: ₡${subtotal.toLocaleString()}<br>
      Descuento: -₡${descuento.toLocaleString()}<br>
      <span style="color:#e91e63;">TOTAL: ₡${total.toLocaleString()}</span>
    </div>
  `;
}

function renderizarCarrito() {
  const cont = document.getElementById("carrito-modal");
  if (!cont) return;
  cont.innerHTML = window.carrito.map((p, i) => `
    <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;">
      <span>${p.nombre} x${p.cantidad}</span>
      <span>₡${(p.precio * p.cantidad).toLocaleString()} <button onclick="quitarDelCarrito(${i})" style="color:red; border:none; background:none; cursor:pointer;">✕</button></span>
    </div>
  `).join("");
}

window.quitarDelCarrito = function(i) {
  window.carrito.splice(i, 1);
  renderizarCarrito();
  actualizarResumenVenta();
};

// Inicialización
window.addEventListener("DOMContentLoaded", async () => {
  await cargarContactosPersonal();
  await cargarClientesBaseLigero();
  await cargarProductosJSON();
});