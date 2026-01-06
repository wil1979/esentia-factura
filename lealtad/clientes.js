// CLIENTES.JS
// Versión estable v1.0
// Última revisión: 2026-01
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
  query,          // 👈 FALTA
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
let soloDeudores = false; // ← true = al iniciar, solo muestra deudores
let productosDisponibles = [];
// ===============================
// 🌍 ESTADO GLOBAL (ÚNICA FUENTE DE VERDAD)
// ===============================
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
// 🧩 Utilidades
// ===============================
function formatearColones(n) {
  return `₡${Math.round(n).toLocaleString("es-CR")}`;
}
function colones(v) {
  return "₡" + Number(v || 0).toLocaleString("es-CR");
}

// ===============================
// 📂 Cargar personal.json desde URL remota
// ===============================
async function cargarContactosPersonal() {
  try {
    const res = await fetch("https://wil1979.github.io/esentia-factura/personal.json");
    contactosPersonal = res.ok ? await res.json() : [];
    console.log("✅ personal.json cargado:", contactosPersonal.length, "contactos");
  } catch (err) {
    console.error("Error al cargar personal.json:", err);
    contactosPersonal = [];
  }
}

// ===============================
// 🔍 Filtrar contactos (solo nombre y cédula)
// ===============================
function filtrarContactos(query) {
  const cont = document.getElementById("resultados-personal");
  if (!cont) return;

  query = query.trim();
  cont.style.display = "none";
  cont.innerHTML = "";

  if (query.length < 2) return;

  const q = query.toLowerCase();
  const coincidencias = contactosPersonal.filter(p =>
    (p.nombre && p.nombre.toLowerCase().includes(q)) ||
    (p.cedula && String(p.cedula).includes(query))
  ).slice(0, 8);

  if (coincidencias.length === 0) {
    cont.innerHTML = '<div style="padding:6px; color:#999; font-size:0.9rem;">Sin resultados</div>';
  } else {
    coincidencias.forEach(p => {
      const div = document.createElement("div");
      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.style.borderBottom = "1px solid #eee";
      div.style.backgroundColor = "#f9f9f9";
      div.innerHTML = `
        <strong>${p.nombre}</strong><br>
        🆔 ${p.cedula || "—"}
        ${p.puesto ? `<br><small>${p.puesto}</small>` : ""}
      `;
      div.onclick = () => {
        document.getElementById("modal-nombre").value = p.nombre || "";
        document.getElementById("modal-telefono").value = "";
        document.getElementById("modal-cedula").value = p.cedula || "";
        cont.style.display = "none";
        document.getElementById("buscador-personal").value = "";
      };
      cont.appendChild(div);
    });
  }

  cont.style.display = "block";
}

// ===============================
// ✅ Consultar nombre en API de Hacienda (solo cédulas físicas de 9 dígitos)
// ===============================
async function consultarNombreHacienda() {
  const cedulaInput = document.getElementById("modal-cedula");
  const nombreInput = document.getElementById("modal-nombre");
  const mensaje = document.getElementById("nombre-desde-api");

  if (!cedulaInput || !nombreInput || !mensaje) return;

  const cedula = cedulaInput.value.trim().replace(/\D/g, "");
  mensaje.textContent = "";
  mensaje.style.color = "#4CAF50";

  if (cedula.length !== 9) {
    if (cedula.length > 0) {
      mensaje.textContent = "ℹ️ Solo cédulas físicas (9 dígitos) se consultan en Hacienda";
      mensaje.style.color = "#ff9800";
    }
    return;
  }

  try {
    mensaje.textContent = "Buscando en Hacienda...";
    const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`);
    if (!res.ok) throw new Error("No encontrado");
    const data = await res.json();
    const nombre = data.nombre || data.nombre_completo;
    if (nombre) {
      nombreInput.value = nombre;
      mensaje.textContent = `✅ ${nombre}`;
    } else {
      mensaje.textContent = "⚠️ Cédula válida, pero no encontrada en Hacienda";
      mensaje.style.color = "#d32f2f";
    }
  } catch (err) {
    console.warn("Error al consultar Hacienda:", err);
    mensaje.textContent = "⚠️ No se pudo contactar a Hacienda";
    mensaje.style.color = "#d32f2f";
  }
}

// ===============================
// 📥 Clientes base (clientesBD)

async function cargarClientesBaseLigero() {
  const snap = await getDocs(collection(db, "clientesBD"));
  clientesBase = [];
  for (const d of snap.docs) {
    const data = d.data();
    // Calculamos deuda estimada solo si está almacenada previamente
    // (opcional: podrías omitir totalDeuda aquí y calcularla al seleccionar cliente)
    clientesBase.push({
      id: d.id,
      nombre: data.nombre || "Sin nombre",
      telefono: data.telefono || "",
      cedula: data.cedula || "",
      totalDeuda: data.totalDeuda || 0, // si la guardas en clientesBD
      diasAtraso: data.diasAtraso || 0
    });
  }
  renderListaClientes();
 // renderResumenGeneralLigero(); // versión simplificada
}

// ===========📦 Registrar salidas desde factura====================

async function registrarSalidasInventarioDesdeFactura(productos, clienteId) {
  const fecha = new Date().toISOString();

  for (const p of productos) {
    await addDoc(
      collection(db, "inventario_movimientos"),
      {
        productoId: p.codigo || p.nombre,
        tipo: "salida",
        cantidad: p.cantidad,
        origen: "venta",
        referencia: `CLI-${clienteId}`,
        fecha
      }
    );
  }
}

function renderResumenGeneralLigero() {
  const cont = document.getElementById("resumen-general");
  if (!cont) return;
  const totalClientes = clientesBase.length;
  const deudores = clientesBase.filter(c => (c.totalDeuda || 0) > 0).length;
  cont.innerHTML = `
    <h3>📊 Clientes Cargados</h3>
    <div>👥 Total: <strong>${totalClientes}</strong></div>
    <div>💰 Deudores: <strong>${deudores}</strong></div>
    <p><em>Resumen rápido (sin facturas)</em></p>
    
  `;
}

async function cargarResumenCompleto() {
  alert("Cargando resumen completo... esto puede tardar.");
  await cargarClientesBase(); // la versión original que carga facturas
}
 //===============================
async function cargarClientesBase() {
  const snap = await getDocs(collection(db, "clientesBD"));
  clientesBase = [];

  for (const d of snap.docs) {
    const cliente = { id: d.id, ...d.data() };

    // 🔑 Cargar movimientos reales
    const refMov = doc(db, "facturas", cliente.id);
    const snapMov = await getDoc(refMov);

    const compras = snapMov.exists() ? snapMov.data().compras || [] : [];
    const abonos = snapMov.exists() ? snapMov.data().abonos || [] : [];

    // Guardar en cliente (ESTO FALTABA)
    cliente.compras = compras;
    cliente.abonos = abonos;

    // Calcular deuda
    cliente.totalDeuda = compras.reduce((acc, c) => {
      const monto = Number(c.total ?? (c.monto - (c.descuento || 0)));
      const pagado = Number(c.pagado || 0);
      const saldo = Math.max(0, monto - pagado);
      return acc + saldo;
    }, 0);

    cliente.diasAtraso = 0;

cliente.compras.forEach(c => {
  const total = (c.total ?? (c.monto - (c.descuento || 0)));
  const pagado = c.pagado || 0;
  const saldo = total - pagado;

  if (saldo > 0 && c.fecha) {
    const dias = calcularDiasAtraso(c.fecha);
    cliente.diasAtraso = Math.max(cliente.diasAtraso, dias);
  }
});


    clientesBase.push(cliente);
  }

  renderListaClientes();
  renderResumenGeneral(); // 👈 ahora sí tiene datos
}


function calcularResumenGeneral() {
  let totalVendido = 0;
  let totalPagado = 0;
  let totalPendiente = 0;
  let totalFacturas = 0;

  clientesBase.forEach(cliente => {
    const compras = cliente.compras || [];
    compras.forEach(c => {
      const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
      const pagado = Number(c.pagado || 0);
      const saldo = Math.max(0, total - pagado);

      totalVendido += total;
      totalPagado += pagado;
      totalPendiente += saldo;
      totalFacturas += 1;
    });
  });

  return {
    totalVendido,
    totalPagado,
    totalPendiente,
    totalFacturas
  };
}

function renderResumenGeneral(datos) {
  const resumen = document.getElementById("resumen-general");
  if (!resumen) return;

  // 🔓 mostrar solo cuando se llama explícitamente
  resumen.classList.remove("hidden");
  resumen.style.display = "block";

  if (!datos || datos.totalVentas === 0) {
    resumen.innerHTML = `
      <strong>📊 Resumen General</strong><br>
      No hay ventas registradas.
    `;
    return;
  }

  resumen.innerHTML = `
    <strong>📊 Resumen General</strong><br><br>

    🧾 Total ventas: <b>${datos.totalVentas}</b><br>
    💰 Total facturado: <b>₡${datos.totalMonto.toLocaleString()}</b><br>
    ⏳ Total pendiente: <b>₡${datos.totalPendiente.toLocaleString()}</b><br><br>

    <strong>💳 Pagos por método</strong><br>
    ${Object.entries(datos.pagosPorMetodo)
      .map(
        ([metodo, info]) =>
          `• ${metodo}: ${info.cantidad} pagos — ₡${info.total.toLocaleString()}`
      )
      .join("<br>")}
  `;
}

function renderResumenPagos(resumen) {
  const cont = document.getElementById("resumen-pagos");
  if (!cont) return;

  cont.innerHTML = "";

  Object.entries(resumen).forEach(([metodo, data]) => {
    if (data.cantidad === 0) return;

    cont.innerHTML += `
      <div class="linea-resumen-pago">
        <strong>${metodo.toUpperCase()}</strong>:
        ${data.cantidad} pagos —
        <span>Total ₡${data.total.toLocaleString("es-CR")}</span>
      </div>
    `;
  });
}
//RESUMENES********************************************************************************
function calcularResumenPagosPorMetodo(pagos = []) {
  const resumen = {
    efectivo: { total: 0, cantidad: 0 },
    sinpe: { total: 0, cantidad: 0 },
    tarjeta: { total: 0, cantidad: 0 }
  };

  pagos.forEach(p => {
    const metodo = (p.metodo || "").toLowerCase();
    const monto = Number(p.monto || 0);

    if (resumen[metodo]) {
      resumen[metodo].total += monto;
      resumen[metodo].cantidad += 1;
    }
  });

  return resumen;
}

function calcularResumenPagosPorMetodoGlobal() {
  const resumen = {
    Efectivo: 0,
    SINPE: 0,
    Transferencia: 0,
    Tarjeta: 0,
    Pendiente: 0
  };

  clientesBase.forEach(cliente => {

    // 1️⃣ Pagos desde COMPRAS
    const compras = cliente.compras || [];
    compras.forEach(c => {
      const metodo = c.metodoPago || "Pendiente";
      const pagado = Number(c.pagado || 0);

      if (pagado > 0) {
        if (!resumen[metodo]) resumen[metodo] = 0;
        resumen[metodo] += pagado;
      }
    });

    // 2️⃣ Pagos desde ABONOS
    const abonos = cliente.abonos || [];
    abonos.forEach(a => {
      const metodo = a.metodo || "Pendiente";
      const monto = Number(a.monto || 0);

      if (monto > 0) {
        if (!resumen[metodo]) resumen[metodo] = 0;
        resumen[metodo] += monto;
      }
    });

  });

  return resumen;
  renderResumenPagos(resumen);
}

//********************************************************************************* */

function calcularSaldoCliente(cliente) {
  const compras = cliente.compras || [];
  let saldoTotal = 0;
  compras.forEach((c) => {
    const monto = Number(c.monto ?? c.totalBruto ?? c.total ?? 0);
    const descuento = Number(c.descuento || 0);
    const pagado = Number(c.pagado || 0);
    const totalCompra = Math.max(0, monto - descuento);
    const saldo = Math.max(0, totalCompra - pagado);
    saldoTotal += saldo;
  });
  return saldoTotal;
}

function obtenerClientesConAtraso(minDias = 0) {
  const hoy = new Date();
  const resultado = [];

  clientesBase.forEach(cliente => {
    const compras = cliente.compras || [];

    compras.forEach(c => {
      const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
      const pagado = Number(c.pagado || 0);
      const saldo = total - pagado;

      if (saldo > 0 && c.fecha) {
        const dias = Math.floor(
          (hoy - new Date(c.fecha)) / (1000 * 60 * 60 * 24)
        );

        if (dias >= minDias) {
          resultado.push({
            cliente,
            compra: c,
            dias
          });
        }
      }
    });
  });

  return resultado;
}

function ocultarClientesEnMovil() {
  if (window.innerWidth <= 768) {
    document.getElementById("panel-clientes").style.display = "none";
  }
}

function mostrarClientes() {
  document.getElementById("panel-clientes").style.display = "block";
}



function renderListaClientes() {
  const cont = document.getElementById("lista-clientes");
  if (!cont) return;

  const filtro = document
    .getElementById("buscador-clientes")
    ?.value.toLowerCase() || "";

  cont.innerHTML = "";

  clientesBase.forEach((c) => {
    if (
      filtro &&
      !String(c.nombre || "").toLowerCase().includes(filtro) &&
      !String(c.telefono || "").includes(filtro)
    ) return;

    if (soloDeudores && (!c.totalDeuda || c.totalDeuda <= 0)) return;

    // (Opcional) badge de atraso si lo tenés calculado en c.diasAtraso
    const atraso =
      c.totalDeuda > 0 && Number(c.diasAtraso || 0) > 0
        ? `<small style="color:#c62828">⏱ ${c.diasAtraso} días</small>`
        : "";

    const div = document.createElement("div");
    div.className = "cliente-item";
    div.innerHTML = `
      <strong>${c.nombre || "Sin nombre"}</strong><br>
      Tel: ${c.telefono || "-"}<br>
      ${atraso}
    `;
    div.onclick = () => seleccionarCliente(c.id);
    cont.appendChild(div);
  });

  if (!cont.innerHTML) cont.innerHTML = `<div class="vacio">No hay clientes</div>`;
  
// Escuchar cambios en el checkbox
document.getElementById("filtro-deudores")?.addEventListener("change", (e) => {
  soloDeudores = e.target.checked;
  renderListaClientes();
});
  
}

async function registrarSalidasInventario(facturaId, productos) {
  const fecha = new Date().toISOString();

  for (const p of productos) {
    await addDoc(
      collection(db, "inventario_movimientos"),
      {
        productoId: p.codigo || p.nombre,
        tipo: "salida",
        cantidad: p.cantidad,
        origen: "venta",
        referencia: `FACT-${facturaId}`,
        fecha
      }
    );
  }
}

async function obtenerStockActual(productoId) {
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

  return stock;
}

// ===============================
// 📂 Movimientos del cliente
// ===============================
async function cargarClienteMovimientos(id) {
const ref = doc(db, "facturas", id);
const snap = await getDoc(ref);


if (!snap.exists()) {
await setDoc(ref, { compras: [], abonos: [], lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 } });
return { compras: [], abonos: [], lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 } };
}
return snap.data();
}

// ===============================
// 👤 SELECCIONAR CLIENTE
// ===============================
window.seleccionarCliente = async function (id) {
  if (!id) return alert("ID de cliente inválido");
  const base = clientesBase.find(c => c.id === id);
  if (!base) return alert("Cliente no encontrado");

  window.clienteSeleccionadoId = id;

  // 🔥 Cargamos las facturas SOLO al seleccionar
  const ref = doc(db, "facturas", id);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : { compras: [], abonos: [], lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 } };

  // Recalcular deuda y días de atraso solo para este cliente
  const compras = data.compras || [];
  let totalDeuda = 0;
  let diasAtrasoMax = 0;

  compras.forEach(c => {
    const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
    const pagado = Number(c.pagado || 0);
    const saldo = Math.max(0, total - pagado);
    totalDeuda += saldo;
    if (saldo > 0 && c.fecha) {
      const dias = calcularDiasAtraso(c.fecha);
      diasAtrasoMax = Math.max(diasAtrasoMax, dias);
    }
  });

  window.clienteSeleccionado = {
    ...base,
    compras,
    abonos: data.abonos || [],
    lealtad: data.lealtad,
    totalDeuda, // recalculado
    diasAtraso: diasAtrasoMax
  };

  renderInfoCliente();
  renderHistorialCompras();
  ocultarClientesEnMovil();
 // renderResumenPagosPorMetodo(); // solo para este cliente
};
function renderInfoCliente() {
  const cont = document.getElementById("info-basica");
  if (!clienteSeleccionado || !cont) return;

  cont.innerHTML = `
    <h2>${clienteSeleccionado.nombre}</h2>
    <p>📞 <a href="https://wa.me/506${clienteSeleccionado.telefono}" target="_blank">${clienteSeleccionado.telefono}</a></p>
    ${clienteSeleccionado.cedula ? `<p>🆔 ${clienteSeleccionado.cedula}</p>` : ""}
    
    <div class="acciones-cliente">
     

      <button class="btn primary" onclick="abrirModalProductos()">🛒 Agregar productos</button>
      <button class="btn whatsapp suave" onclick="enviarWhatsAppCliente('suave')">🟢 WhatsApp Suave</button>

      <div class="dropdown">
      <button class="btn secondary">⚙️ Más acciones ▾</button>
      <div class="dropdown-menu">

      <button class="item" onclick="enviarWhatsAppCliente('firme')">🔴 WhatsApp Fuerte</button>
      <button class="item" onclick="enviarRecordatoriosAtraso()" style="margin-bottom:10px">🔔 Enviar recordatorios</button>
      <button class="item" onclick="abrirModalEditarCliente()">✏️ Editar datos</button>
      <button class="item" onclick="eliminarCliente()">🗑️ Eliminar cliente</button>
      <button class="item"onclick="mostrarClientes()" class="btn-volver"> 👈 Clientes</button>
    </div>
  `;
}

// Filtrar productos en el modal por nombre
// Array global filtrado
window.productosFiltrados = [];

function filtrarProductosEnModal() {
  const input = document.getElementById("filtro-productos");
  const select = document.getElementById("select-producto");
  if (!input || !select) return;

  const query = input.value.toLowerCase().trim();
  window.productosFiltrados = window.todosLosProductos.filter(p =>
    p.nombre.toLowerCase().includes(query)
  );

  // Limpiar select
  select.innerHTML = "";
  window.productosFiltrados.forEach((p, i) => {
    const opt = document.createElement("option");
    opt.value = i; // ← índice dentro de productosFiltrados
    opt.textContent = p.nombre;
    select.appendChild(opt);
  });

  // Si hay al menos uno, seleccionar el primero y mostrar vista previa
  if (window.productosFiltrados.length > 0) {
    select.value = 0;
    mostrarVistaPrevia(); // esta función ahora usará productosFiltrados
  } else {
    // Limpiar vista previa si no hay resultados
    document.getElementById("vista-previa-producto").innerHTML = "<em>No hay productos</em>";
    document.getElementById("select-variante").innerHTML = '<option>Sin variantes</option>';
    window.productoSeleccionado = null;
  }
}
// ===============================
// 🧾 Compras
// ===============================
function renderComprasCliente() {
  const cont = document.getElementById("lista-compras");
  if (!cont || !clienteSeleccionado) return;
  cont.innerHTML = "";

  const compras = clienteSeleccionado.compras || [];
  if (!compras.length) {
    cont.innerHTML = `<div class="vacio">Sin compras registradas</div>`;
    return;
  }

  compras.forEach((c, i) => {
    const monto = Number(c.monto || 0);
    const descuento = Number(c.descuento || 0);
    const pagado = Number(c.pagado || 0);
   const total = Number(c.total ?? Math.max(0, monto - descuento));
   const saldo = Number(c.saldo ?? total)
   const estado = saldo > 0 ? "🟠 Pendiente" : "🟢 Cancelada";

    const div = document.createElement("div");
    div.className = "compra-item";
    div.innerHTML = `
      <strong>${formatearFecha(c.fecha)}</strong><br>
      Total: ${formatearColones(total)} | Pagado: ${formatearColones(pagado)} | Saldo: ${formatearColones(saldo)}<br>
      <button onclick="verProductosCompra(${i})">📦 Productos</button>
      ${saldo > 0 ? `<button onclick="abrirModalPago(${i})">💸 Pagar</button>` : ""}
      <button onclick="editarCompra(${i})">✏️ Editar</button>
      <button onclick="eliminarCompra(${i})">🗑️</button>
    `;
    cont.appendChild(div);
  });
}

function renderCarrito() {
  const cont = document.getElementById("lista-carrito");
  if (!cont) return;
  cont.innerHTML = "";

  let total = 0;
  carrito.forEach((p, i) => {
    const subtotal = p.precio * p.cantidad;
    total += subtotal;
    cont.innerHTML += `
      <div>
        ${p.cantidad} × ${p.nombre} — ${formatearColones(p.precio)} = ${formatearColones(subtotal)}
        <button onclick="quitarDelCarrito(${i})">❌</button>
      </div>
    `;
  });

  document.getElementById("total-carrito").textContent = formatearColones(total);
}

function quitarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
}

async function guardarCompraDesdeCarrito() {
  if (!clienteSeleccionadoId || !carrito.length) return;

  const fecha = new Date().toISOString();
  const monto = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const productos = carrito.map(p => ({ ...p }));

  const ref = doc(db, "facturas", clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : { compras: [], abonos: [], lealtad: {} };

  data.compras.push({ fecha, monto, productos, pagado: 0, descuento: 0 });
  await setDoc(ref, data);

  carrito = [];
  seleccionarCliente(clienteSeleccionadoId);
}

function renderHistorialAbonos() {
  const cont = document.getElementById("historial-abonos");
  if (!cont) return;

  cont.innerHTML = "";

  (clienteSeleccionado.abonos || []).forEach((a, i) => {
    cont.innerHTML += `
      <div class="abono-item">
        💰 ₡${a.monto.toLocaleString("es-CR")}
        📅 ${new Date(a.fecha).toLocaleDateString("es-CR")}
        💳 ${a.metodo || "-"}
        <button onclick="revertirPago(${i})">↩ Revertir</button>
      </div>
    `;
  });
}


// ===============================
// 🧾 Historial con detalle de productos
// ===============================
function renderHistorialCompras() {

  // Mostrar panel de historial
  document.getElementById("panel-historial")?.classList.remove("hidden");

  const cont = document.getElementById("historial-compras");
  if (!cont || !window.clienteSeleccionado) return;

  cont.innerHTML = "";

  const compras = window.clienteSeleccionado.compras || [];
  if (!compras.length) {
    cont.innerHTML = `<div class="vacio">Este cliente no tiene compras.</div>`;
    return;
  }

  compras.forEach((c, index) => {

    const monto = Number(c.monto || 0);
    const descuento = Number(c.descuento || 0);
    const pagado = Number(c.pagado || 0);
    const total = Number(c.total ?? Math.max(0, monto - descuento));
    const saldo = Number(c.saldo ?? Math.max(0, total - pagado));
    const diasAtraso = calcularDiasAtraso(c);

let badgeAtraso = "";
if (c.saldo > 0) {
  if (diasAtraso <= 7) badgeAtraso = "🟠 " + diasAtraso + " días";
  else badgeAtraso = "🔴 " + diasAtraso + " días";
} else {
  badgeAtraso = "🟢 Al día";
}

    const fecha = c.fecha
      ? new Date(c.fecha).toLocaleDateString("es-CR")
      : "Sin fecha";

    const productos = c.productos || [];

    const div = document.createElement("div");
    div.className = "compra-card";

    div.innerHTML = `
      <strong>Compra ${index + 1}</strong><br>
      📅 ${fecha}<br>
      💰 Total: ${formatearColones(total)}<br>
      💳 Pagado: ${formatearColones(pagado)}<br>
      💸 Saldo: ${formatearColones(saldo)}<br>
      🧾 Método: ${c.metodoPago || "—"}

      <div class="acciones">
        <button onclick="toggleDetalleProductos(${index})">
          📦 Productos (${productos.length})
        </button>

        <button onclick="abrirEditarCompra(${index})">
          ✏️ Modificar
        </button>

        <button onclick="eliminarCompra(${index})">
          🗑 Eliminar
        </button>

        ${
          saldo > 0
            ? `<button onclick="abrirModalPagoFactura(${index})">💳 Pagar</button>`
            : ""
        }

       ${
  (clienteSeleccionado.abonos?.length > 0)
  ? `<button onclick="alert('Revertir pagos se hace desde Historial de Abonos')">↩ Revertir</button>`
  : ""
}
      </div>

      <div id="detalle-prod-${index}" class="detalle-productos hidden">
        ${renderProductosHTML(productos)}
      </div>
     `;

     cont.appendChild(div);
  });
}


 window.abrirModalPagoFactura = function (index) {
  const c = window.clienteSeleccionado.compras[index];
  if (!c || c.saldo <= 0) return;

  window.indiceFacturaPago = index;

  document.getElementById("info-factura-pago").innerHTML = `
    <strong>Fecha:</strong> ${new Date(c.fecha).toLocaleDateString()}<br>
    <strong>Saldo actual:</strong> ₡${c.saldo.toLocaleString()}
  `;

  document.getElementById("abono-monto").value = c.saldo;
  document.getElementById("abono-metodo").value = "Efectivo";
  document.getElementById("abono-nota").value = "";

  document.getElementById("modal-pagar-factura").classList.remove("hidden");
};

window.cerrarModalPagoFactura = function () {
  document.getElementById("modal-pagar-factura").classList.add("hidden");
};

window.guardarPagoFactura = async function () {
  const monto = Number(document.getElementById("abono-monto").value);
  const metodo = document.getElementById("abono-metodo").value;
  const nota = document.getElementById("abono-nota").value || "";

  if (!monto || monto <= 0) {
    alert("Monto inválido");
    return;
  }

  let restante = monto;
  const compras = window.clienteSeleccionado.compras;

  // FIFO: ordenar por fecha
  compras.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  compras.forEach(c => {
    if (restante <= 0) return;
    if (c.saldo <= 0) return;

    const aplicar = Math.min(c.saldo, restante);
    c.pagado += aplicar;
    c.saldo -= aplicar;

    // Si ya se pagó algo, el método deja de ser Pendiente
    c.metodoPago = metodo;

    restante -= aplicar;
  });

  // Registrar abono
  const abono = {
    fecha: new Date().toISOString(),
    monto,
    metodo,
    nota
  };

  const ref = doc(db, "facturas", window.clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : { compras: [], abonos: [] };

  data.compras = compras;
  data.abonos = [...(data.abonos || []), abono];

  await setDoc(ref, data, { merge: true });

  // Actualizar estado local
  window.clienteSeleccionado.compras = compras;
  window.clienteSeleccionado.abonos =
    [...(window.clienteSeleccionado.abonos || []), abono];

  cerrarModalPagoFactura();
  renderHistorialCompras();

  alert("✅ Pago registrado correctamente");
};

window.enviarRecordatoriosAtraso = async function () {
  // ⚠️ Esta función solo funciona si ya se cargaron las facturas (clientesBase con compras)
  // Por eso debes usarla SOLO después de cargarClientesBase(), no con la versión ligera

  const atrasados = obtenerClientesConAtraso(0);
  if (!atrasados.length) {
    alert("🎉 No hay clientes con atraso.");
    return;
  }

  atrasados.forEach(({ cliente, dias }) => {
    let modo = "suave";
    if (dias >= 7) modo = "firme";
    // else if (dias >= 0) modo = "firme"; // ❌ Esto sobra y fuerza "firme" siempre
    // ✅ Solo "firme" si ≥7, de lo contrario "suave"

    enviarWhatsAppA(cliente, modo);
  });

  alert(`🔔 Recordatorios enviados a ${atrasados.length} clientes`);
};


function renderProductosHTML(productos) {
  if (!productos.length) return "<em>Sin productos</em>";
  return `
    <ul>
      ${productos.map(p => {
        const precio = Number(p.precio ?? p.precio ?? p.precioOriginal ?? 0);
        const cantidad = Number(p.cantidad || 0);
        const subtotal = precio * cantidad;
        return `
          <li>
            ${cantidad} × ${p.nombre}
            — ₡${precio.toLocaleString("es-CR")}
            = ₡${subtotal.toLocaleString("es-CR")}
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

window.toggleDetalleProductos = function (index) {
  const div = document.getElementById(`detalle-prod-${index}`);
  if (div) div.classList.toggle("hidden");
};



// ========================================================
// 📲 WHATSAPP PRO
// ========================================================
window.enviarWhatsAppCliente = async function (modo = "suave") {
  if (!clienteSeleccionado) {
    alert("❌ Selecciona un cliente primero.");
    return;
  }
  const { nombre, telefono, compras = [], lealtad = {} } = clienteSeleccionado;
  const limpio = (telefono || "").toString().replace(/\D/g, "");
  if (limpio.length !== 8) {
    alert("⚠️ El teléfono debe tener 8 dígitos.");
    return;
  }
  const pendientes = compras
    .map(c => {
      const subtotal = Number(c.monto || c.totalBruto || 0);
      const descuento = Number(c.descuento || 0);
      const pagado = Number(c.pagado || 0);
      const total = Math.max(0, subtotal - descuento);
      const saldo = Number(c.saldo ?? Math.max(0, total - pagado));
      return { ...c, subtotal, total, saldo };
    })
    .filter(f => f.saldo > 0);
  if (pendientes.length === 0) {
    alert("🎉 No tiene saldos pendientes.");
    return;
  }
  const totalGeneral = pendientes.reduce((sum, f) => sum + f.saldo, 0);
  let sugerido = 0;
  if (totalGeneral <= 5000) sugerido = totalGeneral;
  else if (totalGeneral <= 10000) sugerido = Math.ceil(totalGeneral / 2 / 1000) * 1000;
  else sugerido = 5000;
  const textoModo = {
    suave: `Hola ${nombre} 🌿
Te compartimos tu estado de cuenta actualizado en *Esentia*. Gracias por tu preferencia 💜
`,
    firme: `Hola ${nombre} 👋
Te envío tu estado de cuenta actualizado. Te agradezco confirmar tu fecha de pago para mantener tu cuenta al día 💜
`
  };
  let mensaje = textoModo[modo];
  mensaje += `🧾 *Estado de Cuenta - Esentia*
`;
  mensaje += `📅 ${new Date().toLocaleDateString("es-CR")}
`;
  mensaje += `──────────────────────
`;
  pendientes.forEach((f, index) => {
    const fecha = f.fecha ? new Date(f.fecha).toLocaleDateString("es-CR") : "Sin fecha";
    const productosTxt = (f.productos || [])
      .map(p => `  ▸ ${p.cantidad}× ${p.nombre}${p.presentacion ? " (" + p.presentacion + ")" : ""}`)
      .join("\n") || "  ▸ Sin productos";
    mensaje += `*Factura ${index + 1}*
`;
    mensaje += `📆 ${fecha}
`;
    mensaje += `${productosTxt}
`;
    mensaje += `Subtotal: ₡${f.subtotal.toLocaleString()}
`;
    if (f.descuento > 0) mensaje += `Descuento: -₡${f.descuento.toLocaleString()}
`;
    mensaje += `Pagado: ₡${(f.pagado || 0).toLocaleString()}
`;
    mensaje += `*Saldo pendiente: ₡${f.saldo.toLocaleString()}*
`;
    mensaje += `──────────────────────
`;
  });
  mensaje += `
💜 *TOTAL PENDIENTE: ₡${totalGeneral.toLocaleString()}*
`;
  if ((lealtad.sellos || 0) >= (lealtad.objetivo || 6)) {
    mensaje += `🎁 *Tienes un premio por reclamar.*
`;
  }
  mensaje += `💡 *Sugerencia de abono*: ₡${sugerido.toLocaleString()}
`;
  mensaje += `💳 *Formas de pago*
`;
  mensaje += `1️⃣ Efectivo contra entrega
`;
  mensaje += `2️⃣ SINPE Móvil: *7295-2454* (Wilber Calderón)
`;
  mensaje += `3️⃣ Cuenta BAC: *CR59010200009453897656*
`;
  mensaje += modo === "suave"
    ? `🌸 Gracias por confiar en *Esentia*, siempre un gusto atenderte 💜`
    : `✨ Agradecemos tu pronta gestión. Estamos para servirte 💜`;
  window.open(`https://wa.me/506${limpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  try {
    const clienteDoc = doc(db, "facturas", clienteSeleccionadoId);
    await updateDoc(clienteDoc, { ultimoRecordatorio: new Date().toISOString() });
    await cargarClientesBase();
renderResumenPagosPorMetodo();
    renderResumenGeneral();
  } catch (e) {
    console.error("Error guardando recordatorio:", e);
  }
};

// Nueva función: envía WhatsApp a un cliente específico
window.enviarWhatsAppA = function(cliente, modo = "suave") {
  if (!cliente) return;

  const { nombre, telefono, compras = [], lealtad = {} } = cliente;
  const limpio = (telefono || "").toString().replace(/\D/g, "");
  if (limpio.length !== 8) {
    console.warn("Teléfono inválido para cliente:", nombre);
    return;
  }

  const pendientes = compras
    .map(c => {
      const subtotal = Number(c.monto || c.totalBruto || 0);
      const descuento = Number(c.descuento || 0);
      const pagado = Number(c.pagado || 0);
      const total = Math.max(0, subtotal - descuento);
      const saldo = Math.max(0, total - pagado);
      return { ...c, subtotal, total, saldo };
    })
    .filter(f => f.saldo > 0);

  if (pendientes.length === 0) return;

  const totalGeneral = pendientes.reduce((sum, f) => sum + f.saldo, 0);
  let sugerido = 0;
  if (totalGeneral <= 5000) sugerido = totalGeneral;
  else if (totalGeneral <= 10000) sugerido = Math.ceil(totalGeneral / 2 / 1000) * 1000;
  else sugerido = 5000;

  const textoModo = {
    suave: `Hola ${nombre} 🌿\nTe compartimos tu estado de cuenta actualizado en *Esentia*. Gracias por tu preferencia 💜\n`,
    firme: `Hola ${nombre} 👋\nTe envío tu estado de cuenta actualizado. Te agradezco confirmar tu fecha de pago para mantener tu cuenta al día 💜\n`
  };

  let mensaje = textoModo[modo];
  mensaje += `🧾 *Estado de Cuenta - Esentia*\n`;
  mensaje += `📅 ${new Date().toLocaleDateString("es-CR")}\n`;
  mensaje += `──────────────────────\n`;

  pendientes.forEach((f, index) => {
    const fecha = f.fecha ? new Date(f.fecha).toLocaleDateString("es-CR") : "Sin fecha";
    const productosTxt = (f.productos || [])
      .map(p => `  ▸ ${p.cantidad}× ${p.nombre}${p.presentacion ? " (" + p.presentacion + ")" : ""}`)
      .join("\n") || "  ▸ Sin productos";
    mensaje += `*Factura ${index + 1}*\n`;
    mensaje += `📆 ${fecha}\n`;
    mensaje += `${productosTxt}\n`;
    mensaje += `Subtotal: ₡${f.subtotal.toLocaleString()}\n`;
    if (f.descuento > 0) mensaje += `Descuento: -₡${f.descuento.toLocaleString()}\n`;
    mensaje += `Pagado: ₡${(f.pagado || 0).toLocaleString()}\n`;
    mensaje += `*Saldo pendiente: ₡${f.saldo.toLocaleString()}*\n`;
    mensaje += `──────────────────────\n`;
  });

  mensaje += `\n💜 *TOTAL PENDIENTE: ₡${totalGeneral.toLocaleString()}*\n`;
  if ((lealtad.sellos || 0) >= (lealtad.objetivo || 6)) {
    mensaje += `🎁 *Tienes un premio por reclamar.*\n`;
  }
  mensaje += `💡 *Sugerencia de abono*: ₡${sugerido.toLocaleString()}\n`;
  mensaje += `💳 *Formas de pago*\n`;
  mensaje += `1️⃣ Efectivo contra entrega\n`;
  mensaje += `2️⃣ SINPE Móvil: *7295-2454* (Wilber Calderón)\n`;
  mensaje += `3️⃣ Cuenta BAC: *CR59010200009453897656*\n`;
  mensaje += modo === "suave"
    ? `🌸 Gracias por confiar en *Esentia*, siempre un gusto atenderte 💜`
    : `✨ Agradecemos tu pronta gestión. Estamos para servirte 💜`;

  window.open(`https://wa.me/506${limpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
};

// ===============================
// 🗑 Eliminar compra
// ===============================
window.eliminarCompra = async function (index) {
  if (!confirm("¿Eliminar esta compra?")) return;

  const compras = window.clienteSeleccionado.compras;
  if (!compras || !compras[index]) return;

  /* ❌ No permitir eliminar si tiene pagos
  if (Number(compras[index].pagado) > 0) {
    alert("No se puede eliminar una compra con pagos registrados.");
    return;
  }
*/
  // Eliminar del estado local
  compras.splice(index, 1);

  // Persistir en Firestore
  const ref = doc(db, "facturas", window.clienteSeleccionadoId);
  await setDoc(ref, { compras }, { merge: true });

  // 🔑 ACTUALIZAR UI
  window.clienteSeleccionado.compras = compras;
  renderHistorialCompras();

  const estado =
  c.saldo > 0
    ? "🟠 Pendiente"
    : "🟢 Cancelada";

  // Recalcular deuda en la lista
await cargarClientesBase();
//renderResumenPagosPorMetodo();
renderResumenGeneral();
limpieza
  alert("🗑 Compra eliminada correctamente");
  await revertirInventarioPorFactura(compraEliminada);
// luego sí la quitas del array compras y guardás
};

async function revertirInventarioPorFactura(compra) {
  for (const p of compra.productos) {
    await addDoc(collection(db, "kardex"), {
      productoId: p.id,
      nombre: p.nombre,
      tipo: "entrada", // 👈 REVERSO
      cantidad: p.cantidad,
      fecha: new Date().toISOString(),
      referencia: "Reverso por eliminación de factura",
      origen: "facturas"
    });
  }
}

// ===============================
// 💰 Registrar pago rápido
// ===============================
window.marcarAbono = async function (index) {
  if (!clienteSeleccionadoId) return;
  const montoAbono = Number(prompt("Monto a abonar (solo número, sin ¢):", "0"));
  if (!montoAbono || montoAbono <= 0) return;
  try {
    const clienteRef = doc(db, "facturas", clienteSeleccionadoId);
    const snap = await getDoc(clienteRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const compras = data.compras || [];
    const compra = compras[index];
    if (!compra) return;
    compra.pagado = (Number(compra.pagado) || 0) + montoAbono;
    await updateDoc(clienteRef, { compras });
    alert("💰 Pago registrado.");
    await cargarClientesBase();
renderResumenPagosPorMetodo();
    renderResumenGeneral();
    await seleccionarCliente(clienteSeleccionadoId);
  } catch (e) {
    console.error("Error al registrar pago:", e);
    alert("Error al registrar pago.");
  }
};

// ===============================
// 📦 Marcar inventario actualizado
// ===============================
window.marcarInventario = async function (index) {
  if (!clienteSeleccionadoId) return;
  try {
    const clienteRef = doc(db, "facturas", clienteSeleccionadoId);
    const snap = await getDoc(clienteRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const compras = data.compras || [];
    const compra = compras[index];
    if (!compra) return;
    compra.inventarioActualizado = true;
    await updateDoc(clienteRef, { compras });
    alert("📦 Compra marcada como inventario actualizado.");
    await seleccionarCliente(clienteSeleccionadoId);
  } catch (e) {
    console.error("Error al marcar inventario:", e);
    alert("Error al marcar inventario.");
  }
};


// ===============================
// 📌 Abrir / Cerrar modal nuevo cliente
// ===============================
function abrirModalNuevoCliente() {
  const modal = document.getElementById("modal-nuevo-cliente");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.style.display = "flex";

  // Limpiar campos
  document.getElementById("modal-nombre").value = "";
  document.getElementById("modal-telefono").value = "";
  document.getElementById("modal-cedula").value = "";
  document.getElementById("nombre-desde-api").textContent = "";
  document.getElementById("buscador-personal").value = "";
  document.getElementById("resultados-personal").style.display = "none";

  // Listeners
  const buscador = document.getElementById("buscador-personal");
  if (buscador) {
    buscador.oninput = (e) => filtrarContactos(e.target.value);
  }
  const cedulaInput = document.getElementById("modal-cedula");
  if (cedulaInput) {
    cedulaInput.onblur = consultarNombreHacienda;
  }
}

function cerrarModalNuevoCliente() {
  document.getElementById("modal-nuevo-cliente").classList.add("hidden");
  document.getElementById("modal-nuevo-cliente").style.display = "none";
}

// ===============================
// ➕ Guardar Cliente
// ===============================
async function guardarNuevoCliente() {

  const inputNombre = document.getElementById("modal-nombre");
   inputNombre.addEventListener("input", () => {
   inputNombre.value = inputNombre.value.toUpperCase();
  });

  const nombre = document.getElementById("modal-nombre").value.trim().toUpperCase();
  const tel = document.getElementById("modal-telefono").value.trim();
  const cedula = document.getElementById("modal-cedula").value.trim();

  if (!nombre || !tel) {
    alert("Nombre y teléfono son obligatorios");
    return;
  }
  if (tel.length !== 8 || !/^\d{8}$/.test(tel)) {
    alert("El teléfono debe tener exactamente 8 dígitos numéricos.");
    return;
  }

  try {
    const ref = await addDoc(collection(db, "clientesBD"), {
      nombre,
      telefono: tel,
      cedula: cedula || null,
      activo: true
    });

    await setDoc(doc(db, "facturas", ref.id), {
      compras: [],
      abonos: [],
      lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 }
    });

    alert("✅ Cliente registrado.");
    cerrarModalNuevoCliente();
    cargarClientesBase();
  } catch (e) {
    console.error("Error al guardar cliente:", e);
    alert("❌ No se pudo guardar el cliente.");
  }
}

// ===============================================
// ✏️ EDITAR CLIENTE - Normalizar nombre
function normalizarNombre(nombre = "") {
  return nombre
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

window.normalizarClientes = async function () {
  if (!confirm(
    "⚠️ NORMALIZAR CLIENTES\n\n" +
    "• Convertirá todos los nombres a MAYÚSCULAS\n" +
    "• No afecta saldos ni historial\n" +
    "• Esta acción es segura\n\n" +
    "¿Deseas continuar?"
  )) {
    return;
  }

  try {
    const snap = await getDocs(collection(db, "clientesBD"));

    let total = 0;
    let actualizados = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data.nombre) continue;

      const nombreNormalizado = normalizarNombre(data.nombre);

      if (data.nombre !== nombreNormalizado) {
        // 🔑 actualizar cliente
        await updateDoc(doc(db, "clientesBD", docSnap.id), {
          nombre: nombreNormalizado
        });

        // 🔑 actualizar facturas (si existen)
        try {
          await updateDoc(doc(db, "facturas", docSnap.id), {
            nombre: nombreNormalizado
          });
        } catch (_) {
          // si no existe factura, no pasa nada
        }

        actualizados++;
      }

      total++;
    }

    alert(
      `✅ Normalización completa\n\n` +
      `Clientes revisados: ${total}\n` +
      `Clientes actualizados: ${actualizados}`
    );

    // refrescar UI
    if (typeof cargarClientesBaseLigero === "function") {
      await cargarClientesBaseLigero();
    }

  } catch (err) {
    console.error("❌ Error normalizando clientes:", err);
    alert("❌ Ocurrió un error durante la normalización.");
  }
};






// ===============================================
// ✏️ EDITAR CLIENTE
// ===============================================
window.abrirModalEditarCliente = function () {
  if (!clienteSeleccionado) {
    alert("Selecciona un cliente.");
    return;
  }

  document.getElementById("edit-nombre").value =
    (clienteSeleccionado.nombre || "").toUpperCase();

  document.getElementById("edit-cedula").value =
    clienteSeleccionado.cedula || "";

  document.getElementById("edit-telefono").value =
    clienteSeleccionado.telefono || "";

  document
    .getElementById("modal-editar-cliente")
    .classList.remove("hidden");
};

 window.cerrarModalEditar = function () {
  document.getElementById("modal-editar-cliente").classList.add("hidden");
 };

window.guardarEdicionCliente = async function () {
  const nombreInput = document.getElementById("edit-nombre");
  const cedulaInput = document.getElementById("edit-cedula");
  const telefonoInput = document.getElementById("edit-telefono");

  if (!nombreInput || !telefonoInput) {
    alert("❌ Campos del formulario no encontrados.");
    return;
  }

  // 🔠 FORZAR MAYÚSCULAS DEFINITIVAS
  const nuevoNombre = nombreInput.value.trim().toUpperCase();
  const nuevaCedula = cedulaInput?.value.trim() || null;
  const nuevoTelefono = telefonoInput.value.trim();

  if (!nuevoNombre) {
    alert("❌ El nombre no puede estar vacío.");
    return;
  }

  if (!/^\d{8}$/.test(nuevoTelefono)) {
    alert("❌ El teléfono debe tener 8 dígitos.");
    return;
  }

  const id = window.clienteSeleccionadoId;
  if (!id) {
    alert("❌ No hay cliente seleccionado.");
    return;
  }

  try {
    // 🔑 1. CLIENTES (fuente principal)
    const clienteRef = doc(db, "clientesBD", id);
    await updateDoc(clienteRef, {
      nombre: nuevoNombre,
      cedula: nuevaCedula,
      telefono: nuevoTelefono
    });

    // 🔑 2. FACTURAS (coherencia histórica / WhatsApp)
    const facturaRef = doc(db, "facturas", id);
    await updateDoc(facturaRef, {
      nombre: nuevoNombre,
      cedula: nuevaCedula,
      telefono: nuevoTelefono
    });

    // 🔒 3. Cerrar modal
    cerrarModalEditar();

    // 🔄 4. Recargar UI
    await cargarClientesBaseLigero?.();
    await seleccionarCliente?.(id);

    alert("✅ Cliente actualizado correctamente.");

  } catch (e) {
    console.error("❌ Error al guardar edición:", e);
    alert("❌ Ocurrió un error al guardar los cambios.");
  }
};

// ===============================
// 🛒 ABRIR MODAL PRODUCTOS (FINAL)
// ===============================
window.abrirModalProductos = async function () {
  if (!window.clienteSeleccionadoId) {
    alert("❌ No hay cliente seleccionado.");
    return;
  }

  // Reset estado
  window.carrito = [];
  window.productoSeleccionado = null;

  const modal = document.getElementById("modal-productos");

  // abrir
 modal.classList.remove("hidden");
 modal.style.display = "flex";

  // DOM (defensivo)
  const carritoDiv = document.getElementById("carrito-modal");
  const resumenDiv = document.getElementById("resumen-venta");
  const descuentoInput = document.getElementById("descuento");
  const selectTipoPago = document.getElementById("tipo-pago");
  const selectMetodoPago = document.getElementById("metodo-pago");
  const bloqueCredito = document.getElementById("bloque-credito");

  if (!carritoDiv || !resumenDiv || !descuentoInput || !selectTipoPago || !selectMetodoPago) {
    console.error("❌ Modal incompleto: faltan elementos del DOM");
    return;
  }

  // Reset UI
  carritoDiv.innerHTML = "";
  resumenDiv.innerHTML = "";
  descuentoInput.value = 0;

  // ✅ Default: CRÉDITO
  selectTipoPago.value = "credito";
  selectMetodoPago.disabled = true;
  selectMetodoPago.value = "Pendiente";

  if (bloqueCredito) bloqueCredito.style.display = "block";

  // Cargar productos
  if (!window.todosLosProductos.length) {
    await cargarProductosJSON();
  } else {
    mostrarVistaPrevia();
  }
  // Dentro de abrirModalProductos(), justo antes de `actualizarResumenVenta();`
 const filtroInput = document.getElementById("filtro-productos");
 if (filtroInput) {
  filtroInput.value = ""; // limpiar al abrir
  filtroInput.oninput = filtrarProductosEnModal;
 }

  // Totales iniciales
  actualizarResumenVenta();

  // Listener descuento
  descuentoInput.oninput = actualizarResumenVenta;

  // Listener tipo de pago
  selectTipoPago.onchange = () => {
    const esCredito = selectTipoPago.value === "credito";
    selectMetodoPago.disabled = esCredito;
    selectMetodoPago.value = esCredito ? "Pendiente" : "Efectivo";

    if (bloqueCredito) {
      bloqueCredito.style.display = esCredito ? "block" : "none";
    }

    document.getElementById("resumen-venta").innerHTML =
  "🧾 TOTAL: ₡10.000<br>Descuento: ₡0";

 document.getElementById("resumen-pagos").innerHTML =
  "💳 Efectivo: 2 pagos — ₡5.000<br>💳 SINPE: 1 pago — ₡5.000";

    actualizarResumenVenta();
  };
};


window.cerrarModalProductos = function () {
  const modal = document.getElementById("modal-productos");
// cerrar
modal.classList.add("hidden");
modal.style.display = "none";
};

function calcularDiasAtraso(compra) {
  if (!compra || compra.saldo <= 0) return 0;
  const fecha = compra.fecha ? new Date(compra.fecha) : null;
  if (!fecha) return 0;

  const hoy = new Date();
  const diff = hoy - fecha;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function recalcularComprasDesdeAbonos(compras, abonos) {
  // Resetear compras
  compras.forEach(c => {
    c.pagado = 0;
    c.saldo = Math.max(0, (c.total ?? (c.monto - (c.descuento || 0))));
    c.selloOtorgado = false;
  });

  // Aplicar abonos FIFO
  const comprasOrdenadas = compras
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  abonos
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .forEach(abono => {
      let restante = abono.monto;

      comprasOrdenadas.forEach(c => {
        if (restante <= 0) return;

        const total = c.total ?? (c.monto - (c.descuento || 0));
        const saldo = total - c.pagado;

        if (saldo > 0) {
          const aplicar = Math.min(saldo, restante);
          c.pagado += aplicar;
          restante -= aplicar;
        }

        c.saldo = Math.max(0, total - c.pagado);
      });
    });
}


function notificarPremio(texto) {
  const modal = document.getElementById("modal-productos");
  if (!modal) return;
  modal.insertAdjacentHTML("beforeend", `
    <div id="premio-notificacion" style="
      position:absolute; top:18px; right:18px;
      background:#4CAF50; color:white;
      padding:10px 12px; border-radius:10px;
      z-index:1001; box-shadow: 0 8px 20px rgba(0,0,0,.15);">
      ${texto}
    </div>
  `);
  setTimeout(() => document.getElementById("premio-notificacion")?.remove(), 4500);
}

// ===============================
// ➕ AGREGAR AL CARRITO
// ===============================
window.agregarAlCarritoModal = function () {
  if (!window.productoSeleccionado) {
    alert("Seleccione un producto");
    return;
  }

  const selectVar = document.getElementById("select-variante");
  const variante = selectVar?.value ? JSON.parse(selectVar.value) : null;

  window.carrito.push({
    nombre: window.productoSeleccionado.nombre,
    variante: variante?.nombre || "Única",
    precio:
  variante?.precio ??
  window.productoSeleccionado.precio ??
  window.productoSeleccionado.precioPublico ??
  window.productoSeleccionado.precioOriginal ??
  0,
    cantidad: 1
  });

  renderizarCarrito();
  actualizarResumenVenta();
};

function renderizarCarrito() {
  const cont = document.getElementById("carrito-modal");
  if (!cont) return;

  cont.innerHTML = "";

  window.carrito.forEach((p, i) => {
    const div = document.createElement("div");
    div.textContent =
      `${p.nombre} (${p.variante}) x${p.cantidad} — ₡${(p.precio * p.cantidad).toLocaleString("es-CR")}`;
    cont.appendChild(div);
  });

  // 🔑 SIEMPRE recalcular totales después de tocar el carrito
  actualizarResumenVenta();
}

window.cambiarCantidad = function (index, delta) {
  const nuevoValor = (Number(carrito[index].cantidad) || 1) + delta;
  if (nuevoValor > 0) {
    carrito[index].cantidad = nuevoValor;
    renderizarCarrito();
    actualizarResumenVenta();
  }
};

window.quitarDelCarrito = function (index) {
  carrito.splice(index, 1);
  renderizarCarrito();
  
};

// ======================================================
// 💰 MODAL PAGO
// ======================================================
window.registrarPago = window.abrirModalPago = function () {
  if (!clienteSeleccionado) return alert("Selecciona un cliente.");
  document.getElementById("pago-monto").value = "";
  document.getElementById("pago-nota").value = "";
  document.getElementById("pago-metodo").value = "Efectivo";
  cargarHistorialAbonos();
  document.getElementById("modal-pago").classList.remove("hidden");
};

window.cerrarModalPago = function () {
  document.getElementById("modal-pago").classList.add("hidden");
};

async function cargarHistorialAbonos() {
  const cont = document.getElementById("historial-abonos");
  cont.innerHTML = "";
  const abonos = clienteSeleccionado.abonos || [];
  if (!abonos.length) {
    cont.innerHTML = "<small>No hay abonos.</small>";
    return;
  }
  abonos.forEach((a, idx) => {
    const fecha = new Date(a.fecha).toLocaleDateString("es-CR");
    cont.innerHTML += `
      <div>
        🗓 ${fecha}<br>
        💵 Abono: ₡${a.monto.toLocaleString()}<br>
        Metodo: ${a.metodo}<br>
        ${a.nota ? "📝 " + a.nota : ""}
        <div class="acciones">
          <button onclick="revertirPago(${idx})">↩ Revertir</button>
        </div>
      </div>
    `;
  });
}

window.guardarPago = window.guardarPagoModal = async function () {
  const monto = Number(document.getElementById("pago-monto").value);
  const metodo = document.getElementById("pago-metodo").value;
  const nota = document.getElementById("pago-nota").value.trim();
  if (!monto || monto <= 0) return alert("Ingresa un monto válido.");

  {
   id: crypto.randomUUID(),
   monto,
   fecha
  }

  const ref = doc(db, "facturas", clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const compras = [...(data.compras || [])];
  const abonos = [...(data.abonos || [])];
  let restante = monto;

  // FIFO
  compras.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  compras.forEach(c => {
    if (restante <= 0) return;
    const total = (c.monto || 0) - (c.descuento || 0);
    const pagado = c.pagado || 0;
    const saldo = total - pagado;
    if (saldo > 0) {
      const aplicar = Math.min(saldo, restante);
      c.pagado = pagado + aplicar;
      restante -= aplicar;
      if (c.pagado >= total && !c.selloOtorgado) {
        c.selloOtorgado = true;
        data.lealtad = data.lealtad || { sellos: 0, objetivo: 6, premiosPendientes: 0 };
        data.lealtad.sellos += 1;
        if (data.lealtad.sellos >= data.lealtad.objetivo) {
          data.lealtad.sellos = 0;
          data.lealtad.premiosPendientes = (data.lealtad.premiosPendientes || 0) + 1;
        }
      }
    }
  });

  abonos.push({ fecha: new Date().toISOString(), monto, metodo, nota });

  try {
    await updateDoc(ref, { compras, abonos, lealtad: data.lealtad });
    cerrarModalPago();
    await cargarClientesBase();
renderResumenPagosPorMetodo();
    renderResumenGeneral();
    seleccionarCliente(clienteSeleccionadoId);
    alert("✔ Pago registrado con éxito.");
  } catch (e) {
    console.error("Error al guardar pago:", e);
    alert("❌ No se pudo guardar el pago.");
  }
};

// ======================================================
// 📄 Estado de cuenta (impresión)
// ======================================================
window.imprimirEstadoCuenta = function () {
  generarEstadoCuentaHTML();
  window.print();
};

function generarEstadoCuentaHTML() {
  const c = clienteSeleccionado;
  const cont = document.getElementById("print-contenido");
  if (!c) return;
  let compras = c.compras || [];
  let abonos = c.abonos || [];
  let lealtad = c.lealtad || { sellos: 0, objetivo: 6 };
  let saldoGeneral = 0;

  compras.forEach(cp => {
    const subtotal = Number(cp.monto || cp.totalBruto || 0);
    const descuento = Number(cp.descuento || 0);
    const pagado = Number(cp.pagado || 0);
    const total = subtotal - descuento;
    const saldo = total - pagado;
    cp.subtotal = subtotal;
    cp.total = total;
    cp.saldo = saldo > 0 ? saldo : 0;
    saldoGeneral += cp.saldo;
  });

  let html = `
    <h3 style="margin:0;">${c.nombre}</h3>
    <p>📞 ${c.telefono || "Sin teléfono"}</p>
    ${c.cedula ? `🆔 ${c.cedula}` : ""}
    <div id="linea"></div>
    <h3>🛍 Compras</h3>
  `;

  compras.forEach((cp, i) => {
    const fecha = cp.fecha ? new Date(cp.fecha).toLocaleDateString("es-CR") : "Sin fecha";
    const productosTxt = (cp.productos || [])
      .map(p => `▪ ${p.cantidad} × ${p.nombre} ${p.presentacion ? "(" + p.presentacion + ")" : ""}`)
      .join("<br>");
    html += `
      <div class="estado-linea">
        <strong>Compra ${i + 1}</strong> — ${fecha}<br>
        ${productosTxt}<br>
        Subtotal: ₡${cp.subtotal.toLocaleString()}<br>
        Descuento: ₡${(cp.descuento || 0).toLocaleString()}<br>
        Pagado: ₡${(cp.pagado || 0).toLocaleString()}<br>
        <strong>Saldo: ₡${cp.saldo.toLocaleString()}</strong>
      </div>
    `;
  });

  html += `<h3>💰 Historial de Pagos</h3>`;
  if (abonos.length === 0) {
    html += `<p>No hay abonos registrados.</p>`;
  } else {
    abonos.forEach((a, idx) => {
      const fecha = new Date(a.fecha).toLocaleDateString("es-CR");
      html += `
        <div class="estado-linea">
          🗓 ${fecha}<br>
          💵 Abono: ₡${a.monto.toLocaleString()}<br>
          Metodo: ${a.metodo}<br>
          ${a.nota ? "📝 " + a.nota : ""}
          <div class="acciones">
            <button onclick="revertirPago('ID_DEL_PAGO')">↩ Revertir</button>
          </div>
        </div>
      `;
    });
  }

  html += `
    <h3>💜 Saldo Total: ₡${saldoGeneral.toLocaleString()}</h3>
    <div id="linea"></div>
    <h3>🎁 Programa de Lealtad</h3>
    Sellos: ${lealtad.sellos} / ${lealtad.objetivo}
    ${lealtad.sellos >= lealtad.objetivo ? "<p>⭐ Premio disponible</p>" : ""}
  `;
  cont.innerHTML = html;
}

async function eliminarSubcoleccion(ref) {
  const snap = await getDocs(ref);
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
  }
}

window.eliminarCliente = async function () {
  if (!window.clienteSeleccionadoId) {
    alert("❌ No hay cliente seleccionado.");
    return;
  }

  const ok = confirm(
    "⚠️ ELIMINACIÓN TOTAL\n\n" +
    "• Cliente\n" +
    "• Facturas\n" +
    "• Pagos\n\n" +
    "Esta acción NO se puede deshacer."
  );

  if (!ok) return;

  try {
    const id = window.clienteSeleccionadoId;

    // 🧹 BORRAR FACTURAS (si son subcolección)
    await eliminarSubcoleccion(
      collection(db, "clientesBD", id, "facturas")
    );

    // 🧹 BORRAR PAGOS (si aplica)
    await eliminarSubcoleccion(
      collection(db, "clientesBD", id, "pagos")
    );

    // 🔥 BORRAR CLIENTE
    await deleteDoc(doc(db, "clientesBD", id));

    alert("✅ Cliente y datos eliminados.");

    window.clienteSeleccionadoId = null;
     cargarClientesBaseLigero();

  } catch (err) {
    console.error(err);
    alert("❌ Error eliminando datos");
  }

   console.log("DEBUG eliminarCliente", {
  nombre: document.getElementById("nombre-cliente"),
  telefono: document.getElementById("telefono-cliente"),
  cedula: document.getElementById("cedula-cliente")
  });

  cargarClientesBaseLigero();
};


window.cerrarModalEliminar = function () {
  document.getElementById("modal-eliminar-cliente").classList.add("hidden");
};

window.confirmarEliminarCliente = async function () {
  const tipo = document.querySelector('input[name="tipo-eliminar"]:checked').value;
  const nombreConfirmado = document.getElementById("confirmar-nombre-eliminar").value.trim();
  if (nombreConfirmado !== clienteSeleccionado.nombre) return alert("❌ El nombre no coincide. Operación cancelada.");
  const ref = doc(db, "facturas", clienteSeleccionadoId);
  try {
    if (tipo === "historial") {
      await updateDoc(ref, { compras: [], abonos: [], lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 } });
      alert("✔ Historial eliminado. El cliente se conserva.");
    } else {
      await deleteDoc(ref);
      alert("✔ Cliente eliminado completamente.");
    }
    cerrarModalEliminar();
    clienteSeleccionado = null;
    clienteSeleccionadoId = null;
    await cargarClientesBase();
    renderResumenPagosPorMetodo();
    renderResumenGeneral();
  } catch (e) {
    console.error("Error eliminando cliente:", e);
    alert("❌ Error al eliminar cliente.");
  }
};



// 💾 FACTURAR (BASE)
// ===============================
window.facturarVenta = async function () {
  if (!window.clienteSeleccionadoId || window.carrito.length === 0) {
    alert("No hay datos para facturar");
    return;
  }
  

  const tipoPago =
  document.querySelector("#modal-productos #tipo-pago")?.value || "contado";
  const descuento = Number(document.getElementById("descuento")?.value || 0);

  const subtotal = window.carrito.reduce(
    (s, p) => s + p.precio * p.cantidad,
    0
  );

  const total = Math.max(0, subtotal - descuento);

  // 🔑 Si es pago CONTADO, registrar también como abono
if (tipoPago === "contado") {
  const abono = {
    fecha: new Date().toISOString(),
    monto: total, // total - descuento
    metodo: metodoPago,
    nota: "Pago contado al facturar"
  };

  data.abonos = [...(data.abonos || []), abono];
}

  const compra = {
    fecha: new Date().toISOString(),
    productos: window.carrito,
    monto: subtotal,
    descuento,
    total,
    pagado: tipoPago === "credito" ? 0 : total,
    saldo: tipoPago === "credito" ? total : 0,
    tipoPago,
    metodoPago: tipoPago === "credito" ? "Pendiente" : "Efectivo" // 👈 CLAVE
  };

  const selectDebug = document.querySelector("#modal-productos #tipo-pago");
   console.log("🔍 Select real:", selectDebug);
   console.log("🔍 Valor real:", selectDebug?.value);
  
  console.log("🧾 Facturando con tipoPago:", tipoPago);

  // ===============================
// 🔒 VALIDAR STOCK ANTES DE FACTURAR

for (const p of window.carrito) {
  const productoId = p.codigo || p.nombre;
  const stock = await obtenerStockActual(productoId);

  if (stock === 0) {
  console.warn(`⚠️ ${p.nombre} sin stock`);
}

  if (p.cantidad > stock) {
    alert(
      `❌ Stock insuficiente para "${p.nombre}"
 Disponible: ${stock}
 Solicitado: ${p.cantidad}`
    );
    return; // ⛔ corta la facturación
  }
}

// ===============================

  const ref = doc(db, "facturas", window.clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.exists()
    ? snap.data()
    : { compras: [], abonos: [] };


  data.compras.push(compra);
  await setDoc(ref, data, { merge: true });

  // 🔥🔥 AQUÍ VA LA CONEXIÓN CON INVENTARIO 🔥🔥
  await registrarSalidasInventarioDesdeFactura(
    window.carrito,
    window.clienteSeleccionadoId
  );
alert("✅ Factura registrada correctamente");

// 🔑 SINCRONIZAR ESTADO LOCAL
  window.clienteSeleccionado.compras.push(compra);

  cerrarModalProductos();
  renderHistorialCompras();
};

/*
  //agregado por kardex en inventario NUEVO
  const facturaRef = await addDoc(
  collection(db, "facturas"),
  factura
   );

  // 👇 INVENTARIO REACCIONA
  await registrarSalidasInventario(
  facturaRef.id,
  factura.productos
);
//agregado por kardex en inventario NUEVO

  

  // 🔑 SINCRONIZAR ESTADO LOCAL
   window.clienteSeleccionado.compras.push(compra);
   
  cerrarModalProductos();
  renderHistorialCompras();
  

};

*/


// ===============================================
// ✏️ EDITAR COMPRA
// ===============================================
window.abrirEditarCompra = function (compra) {
  document.getElementById("edit-descuento").value = compra.descuento || 0;

  const resumen = calcularResumenPagosPorMetodo(compra.pagos || []);
  renderResumenPagos(resumen);
};

window.abrirEditarCompra = function (index) {
  indiceCompraEditando = index;
  const compra = clienteSeleccionado.compras[index];
  if (!compra) return;
  document.getElementById("modal-editar-compra").classList.remove("hidden");
  const cont = document.getElementById("edit-productos");
  cont.innerHTML = "";
  compra.productos.forEach((p, i) => {
    cont.innerHTML += `
      <div class="prod-line">
        <input data-i="${i}" data-k="nombre" value="${p.nombre}">
        <input data-i="${i}" data-k="cantidad" type="number" min="1" value="${p.cantidad}">
        <input data-i="${i}" data-k="precio" type="number" min="0" value="${p.precio}">
        
      </div>
    `;
  });
  document.getElementById("edit-descuento").value = compra.descuento || 0;
  const resumen = calcularResumenPagosPorMetodo(compra.pagos || []);
renderResumenPagos(resumen);
};

window.cerrarModalEditarCompra = function () {
  document.getElementById("modal-editar-compra").classList.add("hidden");
  indiceCompraEditando = null;
};

window.guardarEdicionCompra = async function () {
  if (indiceCompraEditando === null) return;
  const compra = clienteSeleccionado.compras[indiceCompraEditando];
  if (!compra) return;
  document.querySelectorAll("#edit-productos input").forEach(inp => {
    const i = Number(inp.dataset.i);
    const k = inp.dataset.k;
    let v = inp.value;
    if (k !== "nombre") v = Number(v) || 0;
    compra.productos[i][k] = v;
  });
  let nuevoMonto = compra.productos.reduce((sum, p) => sum + (p.cantidad || 0) * (p.precio || 0), 0);
  const descuento = Number(document.getElementById("edit-descuento").value) || 0;
  compra.monto = nuevoMonto; 
  compra.total = Math.max(0, nuevoMonto - descuento);
  compra.saldo = Math.max(0, compra.total - (compra.pagado || 0));

  compra.descuento = descuento;
  compra.totalNeto = Math.max(0, nuevoMonto - descuento);

  if ((compra.pagado || 0) > compra.totalNeto) compra.pagado = compra.totalNeto;
  await updateDoc(doc(db, "facturas", clienteSeleccionadoId), { compras: clienteSeleccionado.compras });
  cerrarModalEditarCompra();
  await seleccionarCliente(clienteSeleccionadoId);
  alert("✔ Compra actualizada correctamente");
};



function actualizarResumenVenta() {
  const subtotal = window.carrito.reduce(
    (sum, p) => sum + Number(p.precio) * Number(p.cantidad),
    0
  );

  const descuento = Number(document.getElementById("descuento")?.value || 0);
  const total = Math.max(0, subtotal - descuento);

  const cont = document.getElementById("resumen-venta");
  if (!cont) return;

  cont.innerHTML = `
    <div><strong>Subtotal:</strong> ₡${subtotal.toLocaleString("es-CR")}</div>
    <div><strong>Descuento:</strong> ₡${descuento.toLocaleString("es-CR")}</div>
    <hr>
    <div style="font-size:1.1em">
      <strong>Total a facturar:</strong> ₡${total.toLocaleString("es-CR")}
    </div>
  `;
}

// ===============================================
// 📦 CARGA DE PRODUCTOS
// ===============================================
async function cargarProductosJSON() {
  try {
    const [res1, res2] = await Promise.all([
      fetch(URL_ESENCIA),
      fetch(URL_LIMPIEZA)
    ]);

    const [aromas, limpieza] = await Promise.all([
      res1.json(),
      res2.json()
    ]);

    window.todosLosProductos = [...(aromas || []), ...(limpieza || [])]
      .filter(p => p && (p.disponible === undefined || p.disponible === true))
      .map(p => ({
        ...p,
        // 🔑 normalizamos precio aquí
        precio:
          p.precio ??
          p.precioPublico ??
          p.precioOriginal ??
          (p.variantes?.[0]?.precio ?? 0)
      }));

    const select = document.getElementById("select-producto");
    if (!select) return;

    select.innerHTML = "";

    window.todosLosProductos.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = p.nombre;
      select.appendChild(opt);
    });

    select.onchange = mostrarVistaPrevia;

    if (window.todosLosProductos.length > 0) {
      select.value = 0;
      mostrarVistaPrevia();
    }

  } catch (err) {
    console.error("Error cargando productos JSON:", err);
  }

  // Al terminar de cargar todos los productos
window.productosFiltrados = [...window.todosLosProductos];
// Y si el input de filtro existe, dispara el filtro una vez
if (document.getElementById("filtro-productos")) {
  filtrarProductosEnModal();
}
}

async function cargarProductosDisponibles() {
  try {
    const [resp1, resp2] = await Promise.all([
      fetch("https://wil1979.github.io/esentia-factura/productos_esentia.json"),
      fetch("https://wil1979.github.io/esentia-factura/productos_limpieza_completo.json")
    ]);
    const data1 = await resp1.json();
    const data2 = await resp2.json();
    productosDisponibles = [...data1, ...data2];
    console.log("📦 Productos cargados:", productosDisponibles.length);
  } catch (e) {
    console.error("Error cargando productos:", e);
  }
}

function cargarVariantes(producto) {
  const select = document.getElementById("select-variante");
  if (!select) return;

  select.innerHTML = "";

  if (!producto.variantes || producto.variantes.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Única presentación";
    opt.value = "";
    select.appendChild(opt);
    return;
  }

  let defaultIndex = 0;

  producto.variantes.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(v);
    opt.textContent = `${v.nombre} – ₡${(v.precio || 0).toLocaleString("es-CR")}`;
    select.appendChild(opt);

    if (String(v.nombre).toLowerCase().includes("30")) {
      defaultIndex = i;
    }
  });

  select.selectedIndex = defaultIndex;
}



function mostrarSugerenciasProducto() {
  const input = document.getElementById("producto-nombre");
  const sugerencias = document.getElementById("sugerencias-producto");
  if (!input || !sugerencias) return;

  const texto = input.value.toLowerCase();
  sugerencias.innerHTML = "";

  if (!texto || texto.length < 2) return;

  const encontrados = productosDisponibles.filter(p =>
    p.nombre.toLowerCase().includes(texto)
  ).slice(0, 6);

  encontrados.forEach(p => {
    const variante = p.variantes?.[0] || { precio: p.precioOriginal };
    const div = document.createElement("div");
    div.className = "sugerencia-item";
    div.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}" style="width:30px;height:30px;object-fit:cover;margin-right:10px;">
      <strong>${p.nombre}</strong> — ₡${variante.precio.toLocaleString()}
    `;
    div.onclick = () => {
      input.value = p.nombre;
      document.getElementById("producto-precio").value = variante.precio;
      sugerencias.innerHTML = "";
    };
    sugerencias.appendChild(div);
  });
}
function cargarVariantesProducto(prod) {
  const selectVar = document.getElementById("select-variante");
  if (!selectVar) return;

  selectVar.innerHTML = "";

  if (!prod.variantes || prod.variantes.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "Única presentación";
    opt.value = "";
    selectVar.appendChild(opt);
    return;
  }

  let defaultIndex = 0;

  prod.variantes.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(v);
    opt.textContent = `${v.nombre} – ₡${(v.precio || 0).toLocaleString("es-CR")}`;
    selectVar.appendChild(opt);

    if (String(v.nombre).toLowerCase().includes("30")) {
      defaultIndex = i;
    }
  });

  selectVar.selectedIndex = defaultIndex;
}

// ===============================
// 👁️ MOSTRAR VISTA PREVIA / VARIANTES
// ===============================
function mostrarVistaPrevia() {
  const select = document.getElementById("select-producto");
  if (!select || window.productosFiltrados.length === 0) return;

  const index = Number(select.value);
  const prod = window.productosFiltrados[index]; // ← AHORA es el correcto
  if (!prod) return;

  window.productoSeleccionado = prod;

  const previewDiv = document.getElementById("vista-previa-producto");
  if (previewDiv) {
    previewDiv.innerHTML = `
      <strong>${prod.nombre}</strong><br>
      ${prod.descripcion ? `<small>${prod.descripcion}</small><br>` : ""}
      Precio: ₡${(prod.precio || (prod.variantes?.[0]?.precio || 0)).toLocaleString()}
    `;
  }

  cargarVariantesProducto(prod);
}

// ===============================
// 🎛 Inicialización completa (DOM READY)
// ===============================
window.addEventListener("DOMContentLoaded", async () => {

  // ===============================
  // 📂 Cargas iniciales
  // ===============================
  await cargarContactosPersonal();      // personal.json
  await cargarProductosDisponibles();   // sugerencias rápidas
  //await cargarClientesBase();
  await cargarClientesBaseLigero();
  renderHistorialAbonos();            // clientes + deuda
  renderResumenGeneral();
  renderResumenGeneralLigero();
  


  // ===============================
  // 📋 Sidebar / Clientes
  // ===============================

  document
    .getElementById("btn-refrescar-clientes")
    ?.addEventListener("click", cargarClientesBaseLigero);

 /* document
    .getElementById("btn-refrescar-clientes")
    ?.addEventListener("click", cargarClientesBase);
*/
  document
    .getElementById("buscador-clientes")
    ?.addEventListener("input", renderListaClientes);

  document
    .getElementById("btn-toggle-deudores")
    ?.addEventListener("click", () => {
      soloDeudores = !soloDeudores;
      const btn = document.getElementById("btn-toggle-deudores");
      if (btn) {
        btn.textContent = soloDeudores
          ? "👥 Mostrar todos"
          : "💰 Solo deudores";
      }
      renderListaClientes();
    });

  // ===============================
  // 👤 Nuevo cliente
  // ===============================
  document
    .getElementById("btn-nuevo-cliente")
    ?.addEventListener("click", abrirModalNuevoCliente);

  document
    .getElementById("btn-cancelar-nuevo")
    ?.addEventListener("click", cerrarModalNuevoCliente);

  document
    .getElementById("btn-guardar-nuevo")
    ?.addEventListener("click", guardarNuevoCliente);

  document
    .getElementById("buscador-personal")
    ?.addEventListener("input", e =>
      filtrarContactos(e.target.value)
    );

  document
    .getElementById("modal-cedula")
    ?.addEventListener("blur", consultarNombreHacienda);

  

  // ===============================
  // 🧾 Historial / acciones globales
  // ===============================
  document
    .getElementById("btn-guardar-compra")
    ?.addEventListener("click", guardarCompraDesdeCarrito);

  // ===============================
  // ❌ Cierre genérico de modales
  // ===============================
  document
    .querySelectorAll(".modal")
    .forEach(modal => {
      modal.addEventListener("click", e => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
    });

});



// Exponer funciones globales necesarias
//window.agregarProductoAlCarrito = agregarProductoAlCarrito;
window.quitarDelCarrito = quitarDelCarrito;
window.guardarCompraDesdeCarrito = guardarCompraDesdeCarrito;
window.seleccionarCliente = seleccionarCliente;
window.abrirModalNuevoCliente = abrirModalNuevoCliente;
window.cerrarModalNuevoCliente = cerrarModalNuevoCliente;
window.guardarNuevoCliente = guardarNuevoCliente;
window.mostrarClientes = mostrarClientes;
window.calcularResumenPagosPorMetodoGlobal = calcularResumenPagosPorMetodoGlobal;


// ==============
// 📊 Cargar resumen completo (con facturas reales)
// ==============
window.cargarResumenCompleto = async function () {
  alert("Cargando resumen completo... esto puede tardar.");
  await cargarClientesBase(); // esta función ya carga facturas y genera el resumen
};


window.registrarPagoAutomatico = function () {
  const monto = Number(prompt("Monto del pago (₡):", "0"));
  if (!monto || monto <= 0) return;
  window.guardarPagoModal(monto, "Efectivo", "");
};


window.revertirPago = async function (indexPago) {
  const abonos = [...(clienteSeleccionado.abonos || [])];
  const pago = abonos[indexPago];

  if (!pago) {
    alert("⚠️ Este pago no existe o no fue registrado como abono.");
    return;
  }

  if (!confirm(
    `¿Revertir este pago?\n\n` +
    `Monto: ₡${pago.monto.toLocaleString("es-CR")}\n` +
    `Método: ${pago.metodo}\n` +
    `Fecha: ${new Date(pago.fecha).toLocaleDateString("es-CR")}`
  )) return;

  // ❌ eliminar solo este abono
  abonos.splice(indexPago, 1);

  // 🔁 recalcular compras desde cero
  recalcularComprasDesdeAbonos(
    clienteSeleccionado.compras,
    abonos
  );

  await updateDoc(doc(db, "facturas", clienteSeleccionadoId), {
    compras: clienteSeleccionado.compras,
    abonos
  });

  await seleccionarCliente(clienteSeleccionadoId);
  alert("✔ Pago revertido correctamente");
};

