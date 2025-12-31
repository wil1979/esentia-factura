//<!-- Código JavaScript unificado y corregido para el sistema de facturación de Esentia -->
//<script type="module">
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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
let soloDeudores = true; // ← true = al iniciar, solo muestra deudores
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
// ===============================
async function cargarClientesBase() {
  const snapClientes = await getDocs(collection(db, "clientesBD"));
  const facturasMap = await cargarFacturasMap();

  clientesBase = [];

  snapClientes.docs.forEach(d => {
    const cliente = { id: d.id, ...d.data() };

    const dataMov = facturasMap.get(cliente.id) || {};
    const compras = dataMov.compras || [];
    const abonos = dataMov.abonos || [];

    cliente.compras = compras;
    cliente.abonos = abonos;

    // 🔢 Calcular deuda
    cliente.totalDeuda = compras.reduce((acc, c) => {
      const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
      const pagado = Number(c.pagado || 0);
      return acc + Math.max(0, total - pagado);
    }, 0);

    cliente.diasAtraso = 0;
    compras.forEach(c => {
      const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
      const saldo = total - (c.pagado || 0);
      if (saldo > 0 && c.fecha) {
        cliente.diasAtraso = Math.max(
          cliente.diasAtraso,
          calcularDiasAtraso(c)
        );
      }
    });

    clientesBase.push(cliente);
  });

  renderListaClientes();
  renderResumenGeneral();
}




async function cargarFacturasMap() {
  const snap = await getDocs(collection(db, "facturas"));
  const map = new Map();

  snap.docs.forEach(d => {
    map.set(d.id, d.data());
  });

  return map;
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

function renderResumenGeneral() {
  const cont = document.getElementById("resumen-general");
  if (!cont) return;

  const r = calcularResumenGeneral();

  cont.innerHTML = `
    <h3>📊 Resumen General</h3>
    <div>🧾 Facturas: <strong>${r.totalFacturas}</strong></div>
    <div>💰 Total vendido: <strong>₡${r.totalVendido.toLocaleString("es-CR")}</strong></div>
    <div>💳 Total pagado: <strong>₡${r.totalPagado.toLocaleString("es-CR")}</strong></div>
    <div>🔴 Pendiente: <strong>₡${r.totalPendiente.toLocaleString("es-CR")}</strong></div>
  `;

  const pagos = calcularResumenPagosPorMetodoGlobal();

let htmlPagos = `<h4>💳 Pagos por método</h4>`;
Object.entries(pagos).forEach(([metodo, total]) => {
  if (total > 0) {
    htmlPagos += `
      <div>
        ${metodo}: <strong>₡${total.toLocaleString("es-CR")}</strong>
      </div>
    `;
  }
});


cont.innerHTML += htmlPagos;
}



function renderResumenPagosPorMetodo() {
  const cont = document.getElementById("resumen-pagos");
  if (!cont) return;

  const r = calcularResumenPagosPorMetodoGlobal();

  cont.innerHTML = `
    <h3>💳 Pagos por método</h3>
    <div>💵 Efectivo: ₡${r.Efectivo.toLocaleString("es-CR")}</div>
    <div>📲 SINPE: ₡${r.SINPE.toLocaleString("es-CR")}</div>
    <div>🏦 Transferencia: ₡${r.Transferencia.toLocaleString("es-CR")}</div>
    <div>💳 Tarjeta: ₡${r.Tarjeta.toLocaleString("es-CR")}</div>
    <div>⏳ Pendiente: ₡${r.Pendiente.toLocaleString("es-CR")}</div>
  `;
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
}



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

function obtenerClientesConAtraso(minDias = 7) {
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

  const ref = doc(db, "facturas", id);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  window.clienteSeleccionado = {
    ...base,
    compras: data.compras || [],
    abonos: data.abonos || [],
    lealtad: data.lealtad || { sellos: 0, objetivo: 6, premiosPendientes: 0 }
  };

  console.log("✅ Cliente seleccionado:", window.clienteSeleccionadoId);

  document.getElementById("info-cliente")?.classList.remove("vacio");
  renderInfoCliente();
  renderHistorialCompras();
  ocultarClientesEnMovil();
  renderResumenPagosPorMetodo();
};

function renderInfoCliente() {
  const cont = document.getElementById("info-basica");
  if (!clienteSeleccionado || !cont) return;

   cont.innerHTML = `
    <h2>${clienteSeleccionado.nombre}</h2>
    <p>📞 <a href="https://wa.me/506${clienteSeleccionado.telefono}" target="_blank">${clienteSeleccionado.telefono}</a></p>
    ${clienteSeleccionado.cedula ? `<p>🆔 ${clienteSeleccionado.cedula}</p>` : ""}
    <button onclick="abrirModalProductos()">🛒 Agregar productos</button>
    <button onclick="enviarWhatsAppCliente('suave')">🟢 WhatsApp Suave</button>
    <button onclick="enviarWhatsAppCliente('firme')">🔴 WhatsApp Fuerte</button>
    <button onclick="enviarRecordatoriosAtraso()" style="margin-bottom:10px">🔔 Enviar recordatorios</button>
    <button onclick="mostrarClientes()" class="btn-volver"> 👈 Clientes</button>
  `;
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
    renderResumenGeneral();
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
  renderResumenGeneral();

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
  pagado > 0
    ? `<button onclick="revertirPago(${index})">↩ Revertir</button>`
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

window.enviarRecordatoriosAtraso = function () {
  const atrasados = obtenerClientesConAtraso(7);

  if (!atrasados.length) {
    alert("🎉 No hay clientes con atraso.");
    return;
  }

  atrasados.forEach(({ cliente, dias }) => {
    let modo = "suave";
    if (dias >= 30) modo = "firme";
    else if (dias >= 15) modo = "firme";

    // reutiliza tu función existente
    enviarWhatsAppCliente(modo);
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
renderResumenPagosPorMetodo();
renderResumenGeneral();
limpieza
  alert("🗑 Compra eliminada correctamente");
};

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
  const nombre = document.getElementById("modal-nombre").value.trim();
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
// ✏️ EDITAR CLIENTE
// ===============================================
window.abrirModalEditarCliente = function () {
  if (!clienteSeleccionado) {
    alert("Selecciona un cliente.");
    return;
  }
  document.getElementById("edit-nombre").value = clienteSeleccionado.nombre || "";
  document.getElementById("edit-cedula").value = clienteSeleccionado.cedula || "";
  document.getElementById("edit-telefono").value = clienteSeleccionado.telefono || "";
  document.getElementById("modal-editar-cliente").classList.remove("hidden");
};

window.cerrarModalEditar = function () {
  document.getElementById("modal-editar-cliente").classList.add("hidden");
};

window.guardarEdicionCliente = async function () {
  const nuevoNombre = document.getElementById("edit-nombre").value.trim();
  const nuevaCedula = document.getElementById("edit-cedula").value.trim();
  const nuevoTelefono = document.getElementById("edit-telefono").value.trim();
  if (!nuevoNombre) return alert("El nombre no puede estar vacío.");
  try {
    await updateDoc(doc(db, "facturas", clienteSeleccionadoId), { nombre: nuevoNombre, cedula: nuevaCedula, telefono: nuevoTelefono });
    cerrarModalEditar();
    await cargarClientesBase();
renderResumenPagosPorMetodo();
    renderResumenGeneral();
    seleccionarCliente(clienteSeleccionadoId);
    alert("✔ Cliente actualizado correctamente.");
  } catch (e) {
    console.error("Error al guardar edición:", e);
    alert("❌ Ocurrió un error.");
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
            <button onclick="revertirPago(${idx})">↩ Revertir</button>
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

// ===============================================
// 🗑️ ELIMINAR CLIENTE
// ===============================================
window.eliminarCliente = function () {
  if (!clienteSeleccionado) return alert("Selecciona un cliente.");
  const saldo = calcularSaldoCliente(clienteSeleccionado);
  document.getElementById("info-eliminar").innerHTML = `
    <strong>${clienteSeleccionado.nombre}</strong><br>
    💸 Saldo pendiente: ₡${saldo.toLocaleString()}
  `;
  document.getElementById("confirmar-nombre-eliminar").value = "";
  document.getElementById("modal-eliminar-cliente").classList.remove("hidden");
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

// ===============================
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


  const ref = doc(db, "facturas", window.clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.exists()
    ? snap.data()
    : { compras: [], abonos: [] };

  data.compras.push(compra);
  await setDoc(ref, data, { merge: true });

  alert("✅ Factura registrada correctamente");

  // 🔑 SINCRONIZAR ESTADO LOCAL
   window.clienteSeleccionado.compras.push(compra);
   
  cerrarModalProductos();
  renderHistorialCompras();
  

};




// ===============================================
// ✏️ EDITAR COMPRA
// ===============================================
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

/*
window.revertirPago = async function (indexPago) {
  const abonos = [...(clienteSeleccionado.abonos || [])];
  const pago = abonos[indexPago];
  if (!pago) return;

  if (!confirm(`¿Revertir este pago?
Monto: ₡${pago.monto.toLocaleString()}
Fecha: ${new Date(pago.fecha).toLocaleDateString("es-CR")}`)) return;

  // Quitar solo ese abono
  abonos.splice(indexPago, 1);

  // 🔁 Recalcular TODAS las compras desde cero
  clienteSeleccionado.compras.forEach(c => {
    const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
    c.pagado = 0;
    c.saldo = total;
    c.selloOtorgado = false;
  });

  // FIFO limpio
  const comprasOrdenadas = clienteSeleccionado.compras
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  abonos
    .slice()
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .forEach(abono => {
      let restante = abono.monto;

      comprasOrdenadas.forEach(c => {
        if (restante <= 0) return;

        const total = Number(c.total ?? (c.monto - (c.descuento || 0)));
        const disponible = total - c.pagado;

        if (disponible > 0) {
          const aplicar = Math.min(disponible, restante);
          c.pagado += aplicar;
          c.saldo = total - c.pagado;
          restante -= aplicar;
        }
      });
    });

  await updateDoc(doc(db, "facturas", clienteSeleccionadoId), {
    compras: clienteSeleccionado.compras,
    abonos
  });

  await seleccionarCliente(clienteSeleccionadoId);
  alert("✔ Pago revertido correctamente");
};
*/



window.revertirPago = async function (indexAbono) {
  if (!clienteSeleccionadoId) return;

  if (!confirm("¿Deseas revertir este pago?")) return;

  const ref = doc(db, "facturas", clienteSeleccionadoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  let compras = data.compras || [];
  let abonos = data.abonos || [];

  const abono = abonos[indexAbono];
  if (!abono) return;

  // 1️⃣ Eliminar abono
  abonos.splice(indexAbono, 1);

  // 2️⃣ Recalcular compras desde cero
  recalcularComprasDesdeAbonos(compras, abonos);

  // 3️⃣ Guardar en Firestore
  await updateDoc(ref, { compras, abonos });

  // 4️⃣ Actualizar estado local
  clienteSeleccionado.compras = compras;
  clienteSeleccionado.abonos = abonos;

  // 5️⃣ UI
  renderHistorialCompras();
  renderResumenPagosPorMetodo();
  renderResumenGeneral();
  await cargarClientesBase();

  alert("↩ Pago revertido correctamente");
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
  if (!select) return;

  const index = Number(select.value);
  const prod = window.todosLosProductos[index];
  if (!prod) return;

  window.productoSeleccionado = prod;
  console.log("📦 Producto seleccionado:", prod.nombre);

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
  await cargarClientesBase();
renderResumenPagosPorMetodo();            // clientes + deuda
  renderResumenGeneral();

  // ===============================
  // 📋 Sidebar / Clientes
  // ===============================
  document
    .getElementById("btn-refrescar-clientes")
    ?.addEventListener("click", cargarClientesBase);

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


/*

document.getElementById("monto-pagado").oninput = e => {
  carritoVenta.montoPagado = Number(e.target.value || 0);
  actualizarResumenVenta();
  //renderResumenVenta();
};

*/


window.registrarPagoAutomatico = function () {
  const monto = Number(prompt("Monto del pago (₡):", "0"));
  if (!monto || monto <= 0) return;
  window.guardarPagoModal(monto, "Efectivo", "");
};

