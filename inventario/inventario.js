// ===============================
// 📦 Inventario - Entradas
// ===============================
//Variables de control
let movimientoActualId = null;

import {
  db,
  collection,
  addDoc
} from "./firebase.js";

// 🌐 Catálogos
const URL_ESENCIA =
  "https://wil1979.github.io/esentia-factura/productos_esentia.json";

const URL_LIMPIEZA =
  "https://wil1979.github.io/esentia-factura/productos_limpieza_completo.json";

let productos = [];

// ===============================
// 📥 Cargar productos desde JSON
// ===============================
async function cargarProductos() {
  const [resEsencia, resLimpieza] = await Promise.all([
    fetch(URL_ESENCIA),
    fetch(URL_LIMPIEZA)
  ]);

  const esencia = await resEsencia.json();
  const limpieza = await resLimpieza.json();

  productos = [...esencia, ...limpieza];
  renderProductos();
}

// ===============================
// 🧱 Render en select
// ===============================
function renderProductos() {
  const select = document.getElementById("productoSelect");
  select.innerHTML = `<option value="">Seleccione producto</option>`;

  productos.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.codigo || p.nombre;
    opt.textContent = `${p.nombre}`;
    select.appendChild(opt);
  });
  calcularStockProducto(select.value);
}

// ===============================
// ➕ Registrar entrada
// ===============================
async function registrarEntrada() {
  const productoId = document.getElementById("productoSelect").value;
  const cantidad = Number(document.getElementById("cantidad").value);
  const referencia = document.getElementById("referencia").value;

  if (!productoId || cantidad <= 0) {
    alert("Producto y cantidad válidos");
    return;
  }

  await addDoc(collection(db, "inventario_movimientos"), {
    productoId,
    tipo: "entrada",
    cantidad,
    origen: "ajuste", // proveedor | ajuste
    referencia: referencia || "",
    fecha: new Date().toISOString()
  });

  alert("✅ Entrada registrada");
  document.getElementById("cantidad").value = "";
  document.getElementById("referencia").value = "";

 
 
}


// ===============================
// 📊 Calcular stock actual
// ===============================
import {
  getDocs
} from "./firebase.js";

async function calcularStock() {
  const snap = await getDocs(
    collection(db, "inventario_movimientos")
  );

  const stock = {};

  snap.forEach((doc) => {
    const mov = doc.data();
    const id = mov.productoId;

    if (!stock[id]) stock[id] = 0;

    if (mov.tipo === "entrada") {
      stock[id] += mov.cantidad;
    }

    if (mov.tipo === "salida") {
      stock[id] -= mov.cantidad;
    }
  });

  renderStock(stock);
}

function renderStock(stock) {
  const tbody = document.getElementById("stockBody");
  tbody.innerHTML = "";

  Object.entries(stock).forEach(([productoId, cantidad]) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${productoId}</td>
      <td>${cantidad}</td>
      
    `;

    tbody.appendChild(tr);
  });
}

async function calcularStockProducto(productoId) {
  const q = query(
    collection(db, "inventario_movimientos"),
    where("productoId", "==", productoId)
  );

  const snap = await getDocs(q);

  let stock = 0;

  snap.forEach((doc) => {
    const m = doc.data();
    if (m.tipo === "entrada") stock += m.cantidad;
    if (m.tipo === "salida") stock -= m.cantidad;
  });

  document.getElementById("stockActual").textContent = stock;
}


function cargarSelectorKardex() {
  const select = document.getElementById("kardexProducto");
    //select.innerHTML = `<option value="">Seleccione producto</option>`;

  productos.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.codigo || p.nombre;
    opt.textContent = p.nombre;
    select.appendChild(opt);
  });
}

import {
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";



async function cargarKardex(productoId) {
  const q = query(
    collection(db, "inventario_movimientos"),
    where("productoId", "==", productoId),
    orderBy("fecha", "asc")
  );

  const snap = await getDocs(q);

  let saldo = 0;

 snap.forEach((docSnap) => {
  const m = docSnap.data();

  let entrada = "";
  let salida = "";

  if (m.tipo === "entrada") {
    saldo += m.cantidad;
    entrada = m.cantidad;
  }

  if (m.tipo === "salida") {
    saldo -= m.cantidad;
    salida = m.cantidad;
  }
  const tbody = document.getElementById("kardexBody");
  tbody.innerHTML = "";


    const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${new Date(m.fecha).toLocaleDateString()}</td>
    <td class="entrada">${entrada}</td>
    <td class="salida">${salida}</td>
    <td>${saldo}</td>
    <td>${m.origen}</td>
    <td>${m.referencia || "-"}</td>
    <td>
      <button class="btnEdit" data-id="${docSnap.id}">✏️</button>
      <button class="btnDelete" data-id="${docSnap.id}">🗑️</button>
    </td>
  `;
  tbody.appendChild(tr);

  document.querySelectorAll(".btnEdit").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tr = btn.closest("tr");
    const cantidad =
      tr.querySelector(".entrada")?.textContent ||
      tr.querySelector(".salida")?.textContent;

    const referencia = tr.children[5].textContent;

    movimientoActualId = btn.dataset.id;
    document.getElementById("editCantidad").value = cantidad;
    document.getElementById("editReferencia").value = referencia;

    document.getElementById("modalMovimiento")
      .classList.remove("hidden");
  });
});
});
}

function abrirModalMovimiento(id, cantidad, referencia) {
  movimientoActualId = id;
  document.getElementById("editCantidad").value = cantidad;
  document.getElementById("editReferencia").value = referencia;
  document.getElementById("modalMovimiento").classList.remove("hidden");
}

function cerrarModal() {
  document.getElementById("modalMovimiento").classList.add("hidden");
  movimientoActualId = null;
}

async function guardarCambioMovimiento() {
  if (!movimientoActualId) return;

  await updateDoc(
    doc(db, "inventario_movimientos", movimientoActualId),
    {
      cantidad: Number(document.getElementById("editCantidad").value),
      referencia: document.getElementById("editReferencia").value
    }
  );

  cerrarModal();
  actualizarVistaProducto(
    document.getElementById("productoSelect").value
  );
}
async function eliminarMovimiento() {
  if (!movimientoActualId) return;
  if (!confirm("¿Eliminar este movimiento?")) return;

  await deleteDoc(
    doc(db, "inventario_movimientos", movimientoActualId)
  );

  cerrarModal();
  actualizarVistaProducto(
    document.getElementById("productoSelect").value
  );
}



// ===============================
// 🚀 Init
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  

  setTimeout(() => {
    cargarSelectorKardex();
    calcularStock();
  }, 500);

  document
  .getElementById("productoSelect")
  .addEventListener("change", async (e) => {
    const productoId = e.target.value;
    if (!productoId) return;

    await calcularStockProducto(productoId);
    await cargarKardex(productoId);
  });

  
  document
    .getElementById("btnRegistrarEntrada")
    .addEventListener("click", async () => {
      await registrarEntrada();
      calcularStock(); // refresca stock
    });

    document.querySelectorAll(".btnEdit").forEach(btn => {
  btn.onclick = () => {
    const row = btn.closest("tr").children;
    abrirModalMovimiento(
      btn.dataset.id,
      row[1].textContent || row[2].textContent,
      row[5].textContent
    );
  };
 });
  

  document.getElementById("btnGuardarCambio")
  .addEventListener("click", async () => {
    if (!movimientoActualId) return;

    await updateDoc(
      doc(db, "inventario_movimientos", movimientoActualId),
      {
        cantidad: Number(
          document.getElementById("editCantidad").value
        ),
        referencia:
          document.getElementById("editReferencia").value
      }
    );

    cerrarModal();
    actualizarVistaProducto(
      document.getElementById("productoSelect").value
    );
  });
  document.getElementById("btnEliminarMovimiento")
  .addEventListener("click", async () => {
    if (!movimientoActualId) return;
    if (!confirm("¿Eliminar este movimiento?")) return;

    await deleteDoc(
      doc(db, "inventario_movimientos", movimientoActualId)
    );

    cerrarModal();
    actualizarVistaProducto(
      document.getElementById("productoSelect").value
    );
  });
  document.getElementById("btnCancelarModal")
  .addEventListener("click", cerrarModal);

function cerrarModal() {
  document.getElementById("modalMovimiento")
    .classList.add("hidden");
  movimientoActualId = null;
}


  
});
