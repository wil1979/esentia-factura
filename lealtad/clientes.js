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
  addDoc
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

// ============================
// MOTOR PRODUCTOS JSON (PRO)
// ============================

const URL_ESENCIA = "https://wil1979.github.io/esentia-factura/productos_esentia.json";
const URL_LIMPIEZA = "https://wil1979.github.io/esentia-factura/productos_limpieza_completo.json";

let todosLosProductos = [];
let carrito = [];
let clientes = [];
let clienteSeleccionadoId = null;
let clienteSeleccionado = null;
let soloDeudores = false;
window.premioAplicado = null;


// ===============================
// 🧩 Utilidades
// ===============================
function formatearColones(n) {
  return `₡${Math.round(n).toLocaleString("es-CR")}`;
}

// ===============================
// 👥 Cargar clientes
// ===============================
async function cargarClientes() {
  const cont = document.getElementById("lista-clientes");
  if (!cont) return;

  cont.innerHTML = "Cargando clientes...";

  const ref = collection(db, "clientes");
  const snap = await getDocs(ref);

 // console.log("📦 Clientes encontrados en Firestore:", snap.size);

  clientes = [];
  snap.forEach((d) => {
    console.log("➡️ Cliente:", d.id, d.data());
    clientes.push({ id: d.id, ...d.data() });
  });

  renderListaClientes();
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

function renderListaClientes() {
  const cont = document.getElementById("lista-clientes");
  const filtro = document
    .getElementById("buscador-clientes")
    ?.value.toLowerCase();

  cont.innerHTML = "";

  clientes.forEach((c) => {
    const nombre = (c.nombre || "").toLowerCase();
    const tel = (c.telefono || "").toLowerCase();

    if (filtro && !nombre.includes(filtro) && !tel.includes(filtro)) return;

    const saldo = calcularSaldoCliente(c);

    if (soloDeudores && saldo <= 0) return;

    const div = document.createElement("div");
    div.className = "cliente-item" + (saldo > 0 ? " deudor" : "");
    div.innerHTML = `
      <strong>${c.nombre || "Sin nombre"}</strong><br>
      Tel: ${c.telefono || "-"}<br>
      <small>Saldo: ${formatearColones(saldo)}</small>
    `;
    div.onclick = () => seleccionarCliente(c.id);
    cont.appendChild(div);
  });

  if (!cont.innerHTML) {
    cont.innerHTML = `<div class="vacio">No hay clientes para mostrar.</div>`;
  }
}

// ===============================
// 👤 Seleccionar cliente
// ===============================
async function seleccionarCliente(id) {
  clienteSeleccionadoId = id;
  clienteSeleccionado = clientes.find(c => c.id === id);

  const panel = document.getElementById("info-cliente");
  const panelAcciones = document.getElementById("panel-acciones");
  const infoBasica = document.getElementById("info-basica");

  const c = clienteSeleccionado;
  const saldo = calcularSaldoCliente(c);
  const lealtad = c.lealtad || {};

  if (panel) panel.classList.remove("vacio");
if (panelAcciones) panelAcciones.classList.remove("hidden");

  infoBasica.innerHTML = `
    <h2>${c.nombre}</h2>
    <p>📞 <a href="https://wa.me/506${c.telefono}" target="_blank">${c.telefono}</a></p>
    ${c.cedula ? `<p>🆔 ${c.cedula}</p>` : ""}
    <p>💸 Pendiente: ${formatearColones(saldo)}</p>
    <p>🎁 Sellos: ${lealtad.sellos || 0} / ${lealtad.objetivo || 6}</p>
    <p>⭐ Premios pendientes: ${lealtad.premiosPendientes || 0}</p>
  `;

  renderComprasCliente(c);
}


function renderComprasCliente(cliente) {
  const cont = document.getElementById("lista-compras");
  cont.innerHTML = "";

  const compras = cliente.compras || [];
  if (!compras.length) {
    cont.innerHTML = `<div class="vacio">Sin compras registradas.</div>`;
    return;
  }

  compras.forEach((compra, index) => {
    const fecha = compra.fecha
      ? new Date(compra.fecha).toLocaleString("es-CR")
      : "";
    const monto = Number(compra.monto ?? compra.totalBruto ?? compra.total ?? 0);
    const descuento = Number(compra.descuento || 0);
    const pagado = Number(compra.pagado || 0);
    const totalCompra = Math.max(0, monto - descuento);
    const saldo = Math.max(0, totalCompra - pagado);

    const productos = compra.productos || [];

    const div = document.createElement("div");
    div.className = "compra-item";

    div.innerHTML = `
      <div class="compra-header">
        <div>
          <strong>${fecha}</strong><br>
          Total: ${formatearColones(totalCompra)} | Pagado: ${formatearColones(
      pagado
    )} | Saldo: ${formatearColones(saldo)}
        </div>
        <span>${saldo > 0 ? "🔸 Pendiente" : "✅ Cancelado"}</span>
      </div>
      <div class="compra-detalle">
        Productos: ${
          productos.length
            ? productos
                .map(
                  (p) =>
                    `${p.cantidad}x ${p.nombre} (${formatearColones(
                      p.precioUnitario ?? p.precio ?? 0
                    )})`
                )
                .join(", ")
            : "Sin detalle"
        }
      </div>
      <div class="compra-acciones">
        <button class="btn-pendiente" onclick="marcarAbono(${index})">💰 Registrar pago</button>
        <button class="btn-inventario" onclick="marcarInventario(${index})">📦 Inventario</button>
        <button class="btn-eliminar" onclick="eliminarCompra(${index})">🗑 Eliminar</button>
      </div>
    `;

    cont.appendChild(div);
  });
}

// ========================================================
// 📲 WHATSAPP PRO — Mensaje Suave / Mensaje Firme + Lealtad
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

  // Facturas pendientes
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

  if (pendientes.length === 0) {
    alert("🎉 No tiene saldos pendientes.");
    return;
  }

  // TOTAL general
  const totalGeneral = pendientes.reduce((sum, f) => sum + f.saldo, 0);

  // Sugerencias de abono PRO
  let sugerido = 0;
  if (totalGeneral <= 5000) sugerido = totalGeneral;
  else if (totalGeneral <= 10000) sugerido = Math.ceil(totalGeneral / 2 / 1000) * 1000;
  else sugerido = 5000; // mínimo profesional

  // Modo suave o firme
  const textoModo = {
    suave: `Hola ${nombre} 🌿\nTe compartimos tu estado de cuenta actualizado en *Esentia*. Gracias por tu preferencia 💜\n\n`,
    firme: `Hola ${nombre} 👋\nTe envío tu estado de cuenta actualizado. Te agradezco confirmar tu fecha de pago para mantener tu cuenta al día 💜\n\n`
  };

  // Encabezado PRO
  let mensaje = textoModo[modo];
  mensaje += `🧾 *Estado de Cuenta - Esentia*\n`;
  mensaje += `📅 ${new Date().toLocaleDateString("es-CR")}\n`;
  mensaje += `──────────────────────\n\n`;

  // Detalle de facturas
  pendientes.forEach((f, index) => {
    const fecha = f.fecha
      ? new Date(f.fecha).toLocaleDateString("es-CR")
      : "Sin fecha";

    const productosTxt = (f.productos || [])
      .map(p =>
        `  ▸ ${p.cantidad}× ${p.nombre}${p.presentacion ? " (" + p.presentacion + ")" : ""}`
      )
      .join("\n") || "  ▸ Sin productos";

    mensaje += `*Factura ${index + 1}*\n`;
    mensaje += `📆 ${fecha}\n`;
    mensaje += `${productosTxt}\n`;
    mensaje += `Subtotal: ₡${f.subtotal.toLocaleString()}\n`;

    if (f.descuento > 0)
      mensaje += `Descuento: -₡${f.descuento.toLocaleString()}\n`;

    mensaje += `Pagado: ₡${(f.pagado || 0).toLocaleString()}\n`;
    mensaje += `*Saldo pendiente: ₡${f.saldo.toLocaleString()}*\n`;
    mensaje += `──────────────────────\n`;
  });

  // Total general
  mensaje += `\n💜 *TOTAL PENDIENTE: ₡${totalGeneral.toLocaleString()}*\n\n`;

  // Sello de lealtad (si aplica)
  if ((lealtad.sellos || 0) >= (lealtad.objetivo || 6)) {
    mensaje += `🎁 *Tienes un premio por reclamar.*\n\n`;
  }

  // Abono sugerido
  mensaje += `💡 *Sugerencia de abono*: ₡${sugerido.toLocaleString()}\n\n`;

  // Métodos de pago
  mensaje += `💳 *Formas de pago*\n`;
  mensaje += `1️⃣ Efectivo contra entrega\n`;
  mensaje += `2️⃣ SINPE Móvil: *7295-2454* (Wilber Calderón)\n`;
  mensaje += `3️⃣ Cuenta BAC: *CR59010200009453897656*\n\n`;

  //mensaje += `📲 *Pagar con SINPE QR:*\n`;
  //mensaje += `https://wil1979.github.io/esentia-factura/sinpe-qr.png\n\n`;

  // Mensaje final PRO
  mensaje += modo === "suave"
    ? `🌸 Gracias por confiar en *Esentia*, siempre un gusto atenderte 💜`
    : `✨ Agradecemos tu pronta gestión. Estamos para servirte 💜`;

  // Enviar por WhatsApp
  window.open(
    `https://wa.me/506${limpio}?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );

  // Guardar fecha de recordatorio
  try {
    const clienteDoc = doc(db, "clientes", clienteSeleccionadoId);
    await updateDoc(clienteDoc, {
      ultimoRecordatorio: new Date().toISOString()
    });
    await cargarClientes(filtroDeudoresActivo);
  } catch (e) {
    console.error("Error guardando recordatorio:", e);
  }
};



window.quitarDelCarrito = function (index) {
  carrito.splice(index, 1);
  renderCarrito();
};

// ===============================
// 💾 Guardar compra (incluye lealtad, regla B)
// ===============================
async function guardarCompraDesdeCarrito() {
  try {
    if (!clienteSeleccionadoId) {
      alert("Selecciona un cliente primero.");
      return;
    }
    if (!carrito.length) {
      alert("No hay productos en el carrito.");
      return;
    }

    // Calcular totales
    let totalBruto = 0;
    carrito.forEach((item) => {
      totalBruto += item.precioUnitario * item.cantidad;
    });

    const descuentoInput = document.getElementById("descuento");
    const descuento = descuentoInput ? Number(descuentoInput.value) || 0 : 0;
    const totalNeto = Math.max(0, totalBruto - descuento);

    // REGLA B: 1 sello por compra >= 5000
    let sellosOtorgados = 0;
    if (totalNeto >= 5000) sellosOtorgados = 1;

    const clienteRef = doc(db, "clientes", clienteSeleccionadoId);
    const snap = await getDoc(clienteRef);
    if (!snap.exists()) {
      alert("El cliente no existe en Firestore.");
      return;
    }

    const data = snap.data();
    const compras = data.compras || [];
    const lealtad = data.lealtad || {
      sellos: 0,
      objetivo: 6,
      premiosPendientes: 0,
      ultimaActualizacion: null
    };

    let sellos = Number(lealtad.sellos || 0);
    let premiosPendientes = Number(lealtad.premiosPendientes || 0);

    sellos += sellosOtorgados;

    let premioGenerado = 0;
    if (sellos >= lealtad.objetivo) {
      premiosPendientes += 1;
      sellos -= lealtad.objetivo;
      premioGenerado = 1;
    }

    const nuevaCompra = {
      fecha: new Date().toISOString(),
      productos: carrito.map((item) => ({
        nombre: item.nombre,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.precioUnitario * item.cantidad
      })),
      monto: totalBruto,
      descuento,
      totalNeto,
      pagado: 0,
      inventarioActualizado: false,
      sellosOtorgados,
      premioGenerado
    };

    compras.push(nuevaCompra);

    await updateDoc(clienteRef, {
      compras,
      lealtad: {
        sellos,
        objetivo: lealtad.objetivo || 6,
        premiosPendientes,
        ultimaActualizacion: new Date().toISOString()
      }
    });

    alert(
      `✅ Compra guardada.\n` +
        `Total: ${formatearColones(totalNeto)}\n` +
        (sellosOtorgados
          ? `🎁 Se otorgó 1 sello.\nSellos: ${sellos} | Premios: ${premiosPendientes}`
          : `ℹ️ No alcanza el mínimo para sello (₡5,000).`)
    );

    carrito = [];
    if (descuentoInput) descuentoInput.value = 0;
    renderCarrito();

    await cargarClientes();
    await seleccionarCliente(clienteSeleccionadoId);
  } catch (e) {
    console.error("Error al guardar compra:", e);
    alert("Ocurrió un error al guardar la compra.");
  }
}

window.guardarCompraDesdeCarrito = guardarCompraDesdeCarrito;
window.cargarClientes = cargarClientes;

// ===============================
// 🗑 Eliminar compra (revierte lealtad)
// ===============================
window.eliminarCompra = async function (index) {
  if (!clienteSeleccionadoId) return;
  if (!confirm("¿Eliminar esta compra?")) return;

  try {
    const clienteRef = doc(db, "clientes", clienteSeleccionadoId);
    const snap = await getDoc(clienteRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const compras = data.compras || [];
    const lealtad = data.lealtad || {
      sellos: 0,
      objetivo: 6,
      premiosPendientes: 0
    };

    const compraEliminada = compras[index];
    if (!compraEliminada) return;

    // Revertir lealtad
    let sellos = Number(lealtad.sellos || 0);
    let premiosPendientes = Number(lealtad.premiosPendientes || 0);

    const sellosC = Number(compraEliminada.sellosOtorgados || 0);
    const premiosC = Number(compraEliminada.premioGenerado || 0);

    sellos = Math.max(0, sellos - sellosC);
    premiosPendientes = Math.max(0, premiosPendientes - premiosC);

    // Quitar compra
    compras.splice(index, 1);

    await updateDoc(clienteRef, {
      compras,
      lealtad: {
        sellos,
        objetivo: lealtad.objetivo || 6,
        premiosPendientes,
        ultimaActualizacion: new Date().toISOString()
      }
    });

    alert(
      "✅ Compra eliminada.\n" +
        `Sellos: ${sellos} | Premios: ${premiosPendientes}`
    );

    await cargarClientes();
    await seleccionarCliente(clienteSeleccionadoId);
  } catch (e) {
    console.error("Error al eliminar compra:", e);
    alert("Ocurrió un error al eliminar la compra.");
  }
};

// ===============================
// 💰 Registrar pago (abono rápido)
// ===============================
window.marcarAbono = async function (index) {
  if (!clienteSeleccionadoId) return;

  const montoAbono = Number(
    prompt("Monto a abonar (solo número, sin ¢):", "0")
  );
  if (!montoAbono || montoAbono <= 0) return;

  try {
    const clienteRef = doc(db, "clientes", clienteSeleccionadoId);
    const snap = await getDoc(clienteRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const compras = data.compras || [];
    const compra = compras[index];
    if (!compra) return;

    const pagadoActual = Number(compra.pagado || 0);
    compra.pagado = pagadoActual + montoAbono;

    await updateDoc(clienteRef, { compras });

    alert("💰 Pago registrado.");

    await cargarClientes();
    await seleccionarCliente(clienteSeleccionadoId);
  } catch (e) {
    console.error("Error al registrar pago:", e);
    alert("Error al registrar pago.");
  }
};

// ===============================
// 📦 Marcar inventario actualizado (marcador simple)
// ===============================
window.marcarInventario = async function (index) {
  if (!clienteSeleccionadoId) return;

  try {
    const clienteRef = doc(db, "clientes", clienteSeleccionadoId);
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
// ➕ Nuevo cliente (modal)
// ===============================
function abrirModalNuevoCliente() {
  document.getElementById("modal-nuevo-cliente").classList.remove("hidden");
}

function cerrarModalNuevoCliente() {
  document.getElementById("modal-nuevo-cliente").classList.add("hidden");
}

async function guardarNuevoCliente() {
  const nombre = document.getElementById("nuevo-nombre").value.trim();
  const tel = document.getElementById("nuevo-telefono").value.trim();
  const cedula = document.getElementById("nuevo-cedula").value.trim();

  if (!nombre || !tel) {
    alert("Nombre y teléfono son obligatorios.");
    return;
  }

  await addDoc(collection(db, "clientes"), {
    nombre,
    telefono: tel,
    cedula: cedula || null,
    compras: [],
    lealtad: {
      sellos: 0,
      objetivo: 6,
      premiosPendientes: 0,
      ultimaActualizacion: null
    }
  });

  cerrarModalNuevoCliente();
  await cargarClientes();
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

  if (!nuevoNombre) {
    alert("El nombre no puede estar vacío.");
    return;
  }

  const ref = doc(db, "clientes", clienteSeleccionadoId);

  try {
    await updateDoc(ref, {
      nombre: nuevoNombre,
      cedula: nuevaCedula,
      telefono: nuevoTelefono
    });

    cerrarModalEditar();
    await cargarClientes(filtroDeudoresActivo);
    seleccionarCliente(clienteSeleccionadoId);

    alert("✔ Cliente actualizado correctamente.");
  } catch (e) {
    console.error("Error al guardar edición:", e);
    alert("❌ Ocurrió un error.");
  }
};
// ===============================================
// ➕ AGREGAR PRODUCTOS A UNA COMPRA RÁPIDA
// ===============================================

window.abrirModalProductos = async function (idCliente) {
  clienteSeleccionadoId = idCliente;

  // reset sesión
  carrito = [];
  window.premioAplicado = null;

  // limpiar UI
  document.getElementById("carrito-modal").innerHTML = "";
  document.getElementById("total-compra").textContent = "0";
  document.getElementById("descuento").value = "0";

  // abrir modal
  document.getElementById("modal-productos").classList.remove("hidden");

  // cargar productos si falta
  if (!todosLosProductos.length) await cargarProductosJSON();
  else mostrarVistaPrevia();

  // escuchar descuento (una sola vez)
  const desc = document.getElementById("descuento");
  if (desc && !desc.dataset.bound) {
    desc.addEventListener("input", actualizarTotal);
    desc.dataset.bound = "1";
  }

  // ✅ Verificar premio pendiente (desde Firestore)
  try {
    const clienteDocRef = doc(db, "clientes", idCliente);
    const docSnap = await getDoc(clienteDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data.codigoCanje && data.codigoUsado !== true && data.premioObtenido) {
        const premio = String(data.premioObtenido || "");

        // Descuento %
        if (premio.toLowerCase().includes("descuento")) {
          const porcentaje =
            premio.includes("50%") ? 50 :
            premio.includes("10%") ? 10 : 5;

          window.premioAplicado = { tipo: "descuento", valor: porcentaje };

          notificarPremio(`🎁 Premio aplicado: ${porcentaje}% de descuento`);
        }
        // Difusor gratis
        else if (premio.toLowerCase().includes("difusor")) {
          const difusor = todosLosProductos.find(p =>
            String(p.nombre || "").toLowerCase().includes("difusor") &&
            (p.disponible !== false)
          );

          if (difusor) {
            carrito.push({
              nombre: `${difusor.nombre} (🎁 Premio)`,
              precioUnitario: 0,
              cantidad: 1,
              producto: difusor,
              esPremio: true
            });
            window.premioAplicado = { tipo: "difusor", producto: difusor };
            notificarPremio(`🎁 Premio aplicado: ${difusor.nombre} gratis`);
          }
        }
      }
    }

    renderizarCarrito();
  } catch (err) {
    console.error("Error al verificar premio:", err);
  }
};


window.cerrarModalCompra = function () {
  document.getElementById("modal-compra-json").classList.add("hidden");
};


window.cerrarModalProductos = function () {
  document.getElementById("modal-productos").classList.add("hidden");
};

function notificarPremio(texto) {
  const modal = document.getElementById("modal-productos");
  if (!modal) return;

  modal.insertAdjacentHTML("beforeend", `
    <div id="premio-notificacion" style="
      position:absolute; top:18px; right:18px;
      background:#4CAF50; color:white;
      padding:10px 12px; border-radius:10px;
      z-index:1001; box-shadow: 0 8px 20px rgba(0,0,0,.15);
      ">
      ${texto}
    </div>
  `);

  setTimeout(() => document.getElementById("premio-notificacion")?.remove(), 4500);
}
// aqui
window.agregarAlCarritoModal = function () {
  const index = parseInt(document.getElementById("select-producto").value);
  const producto = todosLosProductos[index];
  if (!producto) return;

  let nombreFinal = producto.nombre;
  let precioFinal = producto.precioOferta ?? producto.precio ?? producto.precioOriginal ?? 0;
  let presentacion = "";

  const selectVariante = document.getElementById("select-variante");

  // variantes
  if (selectVariante && selectVariante.value) {
    try {
      const variante = JSON.parse(selectVariante.value);
      presentacion = variante.nombre || "";
      nombreFinal = `${producto.nombre}${presentacion ? " (" + presentacion + ")" : ""}`;
      precioFinal = variante.precio ?? precioFinal;
    } catch {
      alert("Error al procesar la variante.");
      return;
    }
  } else if (producto.variantes && producto.variantes.length > 0) {
    alert("⚠️ Selecciona una presentación.");
    return;
  }

  // evitar duplicado (excepto premios)
  if (carrito.some(item => item.nombre === nombreFinal && !item.esPremio)) {
    alert("Este producto ya está en el carrito.");
    return;
  }

  carrito.push({
    nombre: nombreFinal,
    presentacion,
    precioUnitario: Number(precioFinal) || 0,
    cantidad: 1,
    producto,
    productoOriginalIndex: index
  });

  renderizarCarrito();
};
function renderizarCarrito() {
  const contenedor = document.getElementById("carrito-modal");
  contenedor.innerHTML = "";

  if (carrito.length === 0) {
    contenedor.innerHTML = "<p>No hay productos en el carrito.</p>";
    actualizarTotal();
    return;
  }

  carrito.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "producto-item";

    div.innerHTML = `
      <div class="producto-info">
        <strong>${item.nombre}</strong><br>
        Precio: ₡${(Number(item.precioUnitario) || 0).toLocaleString()}
        ${item.esPremio ? `<div style="color:#2e7d32;font-weight:700;margin-top:4px;">🎁 Premio</div>` : ""}
      </div>
      <div class="producto-cantidad">
        <div class="cantidad-control">
          <button class="btn-cantidad" onclick="cambiarCantidad(${i}, -1)">−</button>
          <input type="text" class="cantidad-display" value="${item.cantidad}" readonly>
          <button class="btn-cantidad" onclick="cambiarCantidad(${i}, 1)">+</button>
        </div>
        <button class="btn-rojo" onclick="quitarDelCarrito(${i})" style="padding:6px 10px;">Eliminar</button>
      </div>
    `;

    contenedor.appendChild(div);
  });

  actualizarTotal();
}
window.cambiarCantidad = function (index, delta) {
  const nuevoValor = (Number(carrito[index].cantidad) || 1) + delta;
  if (nuevoValor > 0) {
    carrito[index].cantidad = nuevoValor;
    renderizarCarrito();
  }
};

window.quitarDelCarrito = function (index) {
  carrito.splice(index, 1);
  renderizarCarrito();
};

function calcularTotalBruto() {
  return carrito.reduce((sum, item) => {
    const precio = Number(item.precioUnitario) || 0;
    const cant = Number(item.cantidad) || 0;
    return sum + (precio * cant);
  }, 0);
}

function actualizarTotal() {
  const total = calcularTotalBruto();

  const descuentoManual = Number(document.getElementById("descuento")?.value) || 0;
  let descuentoTotal = descuentoManual;

  // ✅ descuento por premio %
  if (window.premioAplicado?.tipo === "descuento") {
    const descPremio = total * (window.premioAplicado.valor / 100);
    descuentoTotal += descPremio;
  }

  const totalConDescuento = Math.max(0, total - descuentoTotal);
  document.getElementById("total-compra").textContent = Math.round(totalConDescuento).toLocaleString("es-CR");
}

// ============================
// GUARDAR COMPRA (PRO)
// ============================
window.guardarCompraDesdeCarrito = async function () {
  try {
    if (!clienteSeleccionadoId) {
      alert("Primero selecciona un cliente.");
      return;
    }
    if (!Array.isArray(carrito) || carrito.length === 0) {
      alert("No hay productos en el carrito.");
      return;
    }

    // Totales
    const totalBruto = calcularTotalBruto();
    const descuentoManual = Number(document.getElementById("descuento")?.value) || 0;

    let descuentoPremio = 0;
    if (window.premioAplicado?.tipo === "descuento") {
      descuentoPremio = totalBruto * (window.premioAplicado.valor / 100);
    }

    const descuentoTotal = Math.max(0, descuentoManual + descuentoPremio);
    const totalNeto = Math.max(0, totalBruto - descuentoTotal);

    // 🎡 reiniciar ruleta si >= 10.000
    let reiniciarParticipacion = false;
    if (totalNeto >= 10000) {
      reiniciarParticipacion = confirm(
        `✅ Compra de ₡${totalNeto.toLocaleString("es-CR")} registrada.\n\n` +
        `¿Deseas permitir que este cliente participe nuevamente en la ruleta?`
      );
    }

    // cargar cliente
    const clienteDocRef = doc(db, "clientes", clienteSeleccionadoId);
    const docSnap = await getDoc(clienteDocRef);
    if (!docSnap.exists()) {
      alert("❌ No se encontró el cliente en Firestore.");
      return;
    }

    const data = docSnap.data() || {};
    const comprasActuales = Array.isArray(data.compras) ? [...data.compras] : [];

    // normalizar productos para compras[]
    const productos = carrito.map(item => {
      const precioUnitario = Number(item.precioUnitario) || 0;
      const cantidad = Number(item.cantidad) || 0;
      return {
        nombre: item.nombre || "Producto",
        presentacion: item.presentacion || "",
        cantidad,
        precioUnitario,
        subtotal: precioUnitario * cantidad,
        esPremio: item.esPremio === true
      };
    });

    const compra = {
      fecha: new Date().toISOString(),
      productos,
      monto: totalBruto,               // ✅ CLAVE: esto evita que quede en 0
      descuento: descuentoTotal,        // descuento final aplicado (manual + premio)
      descuentoManual,
      descuentoPremio,
      pagado: 0,
      totalNeto
    };

    comprasActuales.push(compra);

    // updates extra: ruleta + premio
    const updatePayload = { compras: comprasActuales };

    if (reiniciarParticipacion) {
      updatePayload.yaParticipo = false; // o el campo exacto que uses para ruleta
      updatePayload.ultimaParticipacion = null;
    }

    // si se usó premio, marcarlo como usado
    if (data.codigoCanje && data.codigoUsado !== true && data.premioObtenido && window.premioAplicado) {
      updatePayload.codigoUsado = true;
      updatePayload.premioUsadoEn = new Date().toISOString();
    }

    await updateDoc(clienteDocRef, updatePayload);

    cerrarModalProductos();

    // refrescar UI
    await cargarClientes(filtroDeudoresActivo);
    if (clienteSeleccionadoId) seleccionarCliente(clienteSeleccionadoId);

    alert("✅ Compra registrada correctamente.");
  } catch (err) {
    console.error("Error guardando compra:", err);
    alert("❌ Error guardando compra.");
  }
};


window.guardarProductoEnCompra = async function () {
  const nombre = document.getElementById("prod-nombre").value.trim();
  const cantidad = Number(document.getElementById("prod-cantidad").value);
  const precio = Number(document.getElementById("prod-precio").value);

  if (!nombre || cantidad <= 0 || precio <= 0) {
    alert("Completa los datos del producto.");
    return;
  }

  const subtotal = cantidad * precio;

  const compra = {
    fecha: new Date().toISOString(),
    productos: [{ nombre, cantidad, precioUnitario: precio }],
    monto: subtotal,
    descuento: 0,
    pagado: 0,
    totalNeto: subtotal,
  };

  const ref = doc(db, "clientes", clienteSeleccionadoId);

  try {
    const snap = await getDoc(ref);
    const data = snap.data();
    const compras = data.compras || [];
    compras.push(compra);

    await updateDoc(ref, { compras });

    cerrarModalProductos();
    await cargarClientes(filtroDeudoresActivo);
    seleccionarCliente(clienteSeleccionadoId);

    alert("✔ Producto agregado a la cuenta.");
  } catch (e) {
    console.error("Error al agregar producto:", e);
  }
};
// ======================================================
// 💰 MODAL PAGO PRO — abrir / cerrar
// ======================================================
window.registrarPago = function () {
  if (!clienteSeleccionado) {
    alert("Selecciona un cliente.");
    return;
  }

  // Limpiar campos
  document.getElementById("pago-monto").value = "";
  document.getElementById("pago-nota").value = "";
  document.getElementById("pago-metodo").value = "Efectivo";

  cargarHistorialAbonos();

  document.getElementById("modal-pago").classList.remove("hidden");
};

window.cerrarModalPago = function () {
  document.getElementById("modal-pago").classList.add("hidden");
};

// Mostrar historial de abonos
async function cargarHistorialAbonos() {
  const cont = document.getElementById("historial-abonos");
  cont.innerHTML = "";

  const abonos = clienteSeleccionado.abonos || [];

  if (!abonos.length) {
    cont.innerHTML = "<small>No hay abonos.</small>";
    return;
  }

  abonos.forEach(a => {
    const fecha = new Date(a.fecha).toLocaleDateString("es-CR");
    cont.innerHTML += `
      <div>
        🗓 ${fecha}<br>
        💵 Abono: ₡${a.monto.toLocaleString()}<br>
        Metodo: ${a.metodo}<br>
        ${a.nota ? "📝 " + a.nota : ""}
      </div>
    `;
  });
}
// ======================================================
// 💰 GUARDAR PAGO PRO — recalculo de saldo completo
// ======================================================
window.guardarPago = async function () {
  const monto = Number(document.getElementById("pago-monto").value);
  const metodo = document.getElementById("pago-metodo").value;
  const nota = document.getElementById("pago-nota").value.trim();

  if (!monto || monto <= 0) {
    alert("Ingresa un monto válido.");
    return;
  }

  const ref = doc(db, "clientes", clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.data();

  const compras = data.compras || [];
  const abonos = data.abonos || [];

  let restante = monto;

  // 💵 Rebajar factura por factura (FIFO)
  compras.forEach(c => {
    const subtotal = Number(c.monto || c.totalBruto || 0);
    const descuento = Number(c.descuento || 0);
    const pagado = Number(c.pagado || 0);

    const total = subtotal - descuento;
    const saldo = total - pagado;

    if (saldo > 0 && restante > 0) {
      const aplicar = Math.min(saldo, restante);
      c.pagado = pagado + aplicar;
      restante -= aplicar;

      // Si la factura terminó de pagarse → sello lealtad
      if (c.pagado >= total) {
        data.lealtad = data.lealtad || { sellos: 0, objetivo: 6 };
        data.lealtad.sellos = (data.lealtad.sellos || 0) + 1;
      }
    }
  });

  // Registrar en historial de abonos
  abonos.push({
    fecha: new Date().toISOString(),
    monto,
    metodo,
    nota
  });

  try {
    await updateDoc(ref, {
      compras,
      abonos,
      lealtad: data.lealtad || null
    });

    document.getElementById("modal-pago").classList.add("hidden");

    await cargarClientes(filtroDeudoresActivo);
    seleccionarCliente(clienteSeleccionadoId);

    alert("✔ Pago registrado con éxito.");

  } catch (e) {
    console.error("Error al guardar pago:", e);
    alert("❌ No se pudo guardar el pago.");
  }
};

/// =======================================================
// 🧾 GENERAR ESTADO DE CUENTA — VERSIÓN PRO
// =======================================================
function generarEstadoCuentaHTML() {
  const c = clienteSeleccionado;
  const cont = document.getElementById("print-contenido");

  let compras = c.compras || [];
  let abonos = c.abonos || [];
  let lealtad = c.lealtad || { sellos: 0, objetivo: 6 };

  let saldoGeneral = 0;

  // Calcular saldo total
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

  // ===================================
  // ENCABEZADO DEL ESTADO
  // ===================================
  let html = `
    <h3 style="margin:0;">${c.nombre}</h3>
    <p>📞 ${c.telefono || "Sin teléfono"}</p>
    ${c.cedula ? `🆔 ${c.cedula}` : ""}
    <div id="linea"></div>

    <h3>🛍 Compras</h3>
  `;

  // ===================================
  // LISTADO DE COMPRAS
  // ===================================
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

  // ===================================
  // SECCIÓN DE PAGOS
  // ===================================
  html += `
    <h3>💰 Historial de Pagos</h3>
  `;

  if (abonos.length === 0) {
    html += `<p>No hay abonos registrados.</p>`;
  } else {
    abonos.forEach(a => {
      const fecha = new Date(a.fecha).toLocaleDateString("es-CR");
      html += `
        <div class="estado-linea">
          🗓 ${fecha}<br>
          💵 Abono: ₡${a.monto.toLocaleString()}<br>
          Metodo: ${a.metodo}<br>
          ${a.nota ? "📝 " + a.nota : ""}
        </div>
      `;
    });
  }

  // ===================================
  // TOTAL GENERAL + LEALTAD
  // ===================================
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
// 📋 VER / OCULTAR HISTORIAL DE COMPRAS
// ===============================================
window.toggleHistorial = function () {
  const cont = document.getElementById("historial-compras");
  if (!cont) return;

  if (cont.classList.contains("hidden")) {
    renderHistorial();
    cont.classList.remove("hidden");
  } else {
    cont.classList.add("hidden");
  }
};
function renderHistorial() {
  const cont = document.getElementById("historial-compras");
  cont.innerHTML = "";

  if (!clienteSeleccionado) return;

  const compras = clienteSeleccionado.compras || [];

  if (compras.length === 0) {
    cont.innerHTML = "<small>No hay compras registradas.</small>";
    return;
  }

  compras.forEach((c, i) => {
    const fecha = c.fecha
      ? new Date(c.fecha).toLocaleDateString("es-CR")
      : "Sin fecha";

    const subtotal = Number(c.monto || c.totalBruto || 0);
    const descuento = Number(c.descuento || 0);
    const pagado = Number(c.pagado || 0);
    const total = subtotal - descuento;
    const saldo = total - pagado;

    const estado = saldo > 0 ? "pendiente" : "pagada";

    cont.innerHTML += `
      <div class="historial-item ${estado}">
        <strong>Compra ${i + 1}</strong> — ${fecha}<br>
        Subtotal: ₡${subtotal.toLocaleString()}<br>
        Descuento: ₡${descuento.toLocaleString()}<br>
        Pagado: ₡${pagado.toLocaleString()}<br>
        <strong>Saldo: ₡${Math.max(0, saldo).toLocaleString()}</strong>
      </div>
    `;
  });
}

// ===============================================
// 🗑️ ELIMINAR CLIENTE — abrir / cerrar modal
// ===============================================
window.eliminarCliente = function () {
  if (!clienteSeleccionado) {
    alert("Selecciona un cliente.");
    return;
  }

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

// ==================================================
// 🗑️ CONFIRMAR ELIMINACIÓN DEL CLIENTE
// ==================================================
window.confirmarEliminarCliente = async function () {
  const tipo = document.querySelector('input[name="tipo-eliminar"]:checked').value;
  const nombreConfirmado = document.getElementById("confirmar-nombre-eliminar").value.trim();

  if (nombreConfirmado !== clienteSeleccionado.nombre) {
    alert("❌ El nombre no coincide. Operación cancelada.");
    return;
  }

  const ref = doc(db, "clientes", clienteSeleccionadoId);

  try {
    if (tipo === "historial") {
      // 🧹 Solo limpiar historial
      await updateDoc(ref, {
        compras: [],
        abonos: [],
        lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 }
      });

      alert("✔ Historial eliminado. El cliente se conserva.");

    } else {
      // ❌ Eliminar cliente completo
      await deleteDoc(ref);
      alert("✔ Cliente eliminado completamente.");
    }

    cerrarModalEliminar();
    clienteSeleccionado = null;
    clienteSeleccionadoId = null;

    document.getElementById("info-cliente").innerHTML =
      "Selecciona un cliente para ver detalles.";

    document.getElementById("panel-acciones").classList.add("hidden");

    await cargarClientes(filtroDeudoresActivo);

  } catch (e) {
    console.error("Error eliminando cliente:", e);
    alert("❌ Error al eliminar cliente.");
  }
};
let indiceCompraEditando = null;

// ===============================================
// ✏️ EDITAR COMPRA — abrir / cerrar
// ===============================================
window.abrirEditarCompra = function (index) {
  if (!clienteSeleccionado) return;
  const compra = clienteSeleccionado.compras[index];
  if (!compra) return;

  indiceCompraEditando = index;

  document.getElementById("edit-descuento").value = compra.descuento || 0;

  document.getElementById("edit-compra-info").innerHTML = `
    <small>
      Fecha: ${compra.fecha ? new Date(compra.fecha).toLocaleDateString("es-CR") : "Sin fecha"}<br>
      Pagado: ₡${(compra.pagado || 0).toLocaleString()}
    </small>
  `;

  // Render productos
  const cont = document.getElementById("edit-productos");
  cont.innerHTML = "";

  (compra.productos || []).forEach((p, i) => {
    cont.innerHTML += `
      <div class="prod-line">
        <input data-i="${i}" data-k="nombre" value="${p.nombre}">
        <input data-i="${i}" data-k="cantidad" type="number" min="1" value="${p.cantidad}">
        <input data-i="${i}" data-k="precioUnitario" type="number" min="0" value="${p.precioUnitario || p.precio || 0}">
      </div>
    `;
  });

  document.getElementById("modal-editar-compra").classList.remove("hidden");
};

window.cerrarModalEditarCompra = function () {
  document.getElementById("modal-editar-compra").classList.add("hidden");
  indiceCompraEditando = null;
};
// ==================================================
// ✏️ GUARDAR EDICIÓN DE COMPRA (SEGURO)
// ==================================================
window.guardarEdicionCompra = async function () {
  if (indiceCompraEditando === null) return;

  const ref = doc(db, "clientes", clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.data();

  const compras = data.compras || [];
  const compra = compras[indiceCompraEditando];
  if (!compra) return;

  // Leer productos editados
  const inputs = document.querySelectorAll("#edit-productos input");
  inputs.forEach(inp => {
    const i = Number(inp.dataset.i);
    const k = inp.dataset.k;
    let v = inp.value;

    if (k === "cantidad" || k === "precioUnitario") v = Number(v) || 0;
    compra.productos[i][k] = v;
  });

  // Recalcular subtotal
  let nuevoSubtotal = 0;
  compra.productos.forEach(p => {
    const cant = Number(p.cantidad || 0);
    const precio = Number(p.precioUnitario || p.precio || 0);
    nuevoSubtotal += cant * precio;
  });

  const nuevoDescuento = Number(document.getElementById("edit-descuento").value) || 0;

  compra.monto = nuevoSubtotal;
  compra.descuento = nuevoDescuento;
  compra.totalNeto = Math.max(0, nuevoSubtotal - nuevoDescuento);

  // ⚠️ Ajuste de pagado si supera el nuevo total
  if ((compra.pagado || 0) > compra.totalNeto) {
    compra.pagado = compra.totalNeto;
  }

  try {
    await updateDoc(ref, { compras });

    cerrarModalEditarCompra();
    await cargarClientes(filtroDeudoresActivo);
    seleccionarCliente(clienteSeleccionadoId);

    alert("✔ Compra actualizada correctamente.");
  } catch (e) {
    console.error("Error editando compra:", e);
    alert("❌ No se pudo editar la compra.");
  }
};

// --- Cargar productos (una vez) ---
async function cargarProductosJSON() {
  try {
    const [res1, res2] = await Promise.all([fetch(URL_ESENCIA), fetch(URL_LIMPIEZA)]);
    const [aromas, limpieza] = await Promise.all([res1.json(), res2.json()]);

    todosLosProductos = [...(aromas || []), ...(limpieza || [])]
      .filter(p => p && (p.disponible === undefined || p.disponible === true));

    const select = document.getElementById("select-producto");
    if (!select) return;

    select.innerHTML = "";
    todosLosProductos.forEach((p, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = p.nombre;
      select.appendChild(opt);
    });

    select.onchange = mostrarVistaPrevia;

    if (todosLosProductos.length > 0) {
      select.value = 0;
      mostrarVistaPrevia();
    }
  } catch (err) {
    console.error("Error cargando productos JSON:", err);
  }
}

function mostrarVistaPrevia() {
  const index = parseInt(document.getElementById("select-producto")?.value);
  const prod = todosLosProductos[index];
  const img = document.getElementById("img-producto");
  const info = document.getElementById("info-producto");
  const selectorDiv = document.getElementById("selector-variantes");

  if (img) img.style.display = "none";
  if (info) info.textContent = "";
  if (selectorDiv) selectorDiv.innerHTML = "";
  if (!prod) return;

  if (prod.imagen && img) {
    const baseUrl = "https://wil1979.github.io/esentia-factura/";
    let src = prod.imagen;
    if (!src.startsWith("http")) src = baseUrl + (src.startsWith("/") ? src.slice(1) : src);
    img.src = src;
    img.style.display = "inline-block";
  }

  if (info) info.textContent = prod.info || prod.beneficios || "";

  if (prod.variantes && prod.variantes.length > 0 && selectorDiv) {
    const label = document.createElement("div");
    label.textContent = "Selecciona una presentación:";
    label.style.marginBottom = "6px";
    label.style.fontWeight = "bold";
    selectorDiv.appendChild(label);

    const select = document.createElement("select");
    select.id = "select-variante";
    select.style.width = "100%";
    select.style.padding = "8px";
    select.style.borderRadius = "8px";
    select.style.border = "1px solid #ccc";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Selecciona --";
    select.appendChild(defaultOpt);

    prod.variantes.forEach(v => {
      const opt = document.createElement("option");
      opt.value = JSON.stringify(v);
      opt.textContent = `${v.nombre} – ₡${(v.precio || 0).toLocaleString()}`;
      select.appendChild(opt);
    });

    selectorDiv.appendChild(select);
  }
}

function agregarProductoAlCarrito() {
  const idx = parseInt(document.getElementById("select-producto").value);
  const prod = todosLosProductos[idx];
  if (!prod) return;

  const cantidad = Number(document.getElementById("cantidad-producto").value);
  if (cantidad <= 0) return;

  let precio = prod.precio || 0;
  let presentacion = "";

  const selVar = document.getElementById("select-variante");
  if (selVar && selVar.value) {
    const variante = JSON.parse(selVar.value);
    precio = variante.precio || 0;
    presentacion = variante.nombre;
  }

  carrito.push({
    nombre: prod.nombre,
    presentacion,
    cantidad,
    precioUnitario: precio,
    subtotal: cantidad * precio
  });

  renderCarrito();
}
   
function renderCarrito() {
  const cont = document.getElementById("lista-carrito");
  cont.innerHTML = "";

  let total = 0;

  carrito.forEach((p, i) => {
    total += p.subtotal;

    cont.innerHTML += `
      <div style="margin-bottom:6px;">
        ${p.cantidad} × ${p.nombre} ${p.presentacion ? "(" + p.presentacion + ")" : ""} 
        — ₡${p.subtotal.toLocaleString()}
        <button onclick="eliminarItemCarrito(${i})">❌</button>
      </div>
    `;
  });

  document.getElementById("total-carrito").textContent = total.toLocaleString();
}

function eliminarItemCarrito(i) {
  carrito.splice(i, 1);
  renderCarrito();
}
async function guardarCompraCredito() {
  if (carrito.length === 0) {
    alert("Carrito vacío.");
    return;
  }

  const total = carrito.reduce((s, p) => s + p.subtotal, 0);

  const compra = {
    fecha: new Date().toISOString(),
    productos: carrito,
    monto: total,
    descuento: 0,
    pagado: 0,
    totalNeto: total
  };

  const ref = doc(db, "clientes", clienteSeleccionadoId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const compras = data.compras || [];

  compras.push(compra);

  await updateDoc(ref, { compras });

  cerrarModalCompra();
  await cargarClientes(filtroDeudoresActivo);
  seleccionarCliente(clienteSeleccionadoId);

  alert("✔ Compra registrada correctamente.");
}



// ===============================
// 🎛 Listeners e inicialización
// ===============================
window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("btn-refrescar-clientes")
    .addEventListener("click", cargarClientes);

  document
    .getElementById("buscador-clientes")
    .addEventListener("input", renderListaClientes);

  document
    .getElementById("btn-toggle-deudores")
    .addEventListener("click", () => {
      soloDeudores = !soloDeudores;
      renderListaClientes();
    });

  document
    .getElementById("btn-nuevo-cliente")
    .addEventListener("click", abrirModalNuevoCliente);

  document
    .getElementById("btn-cancelar-nuevo")
    .addEventListener("click", cerrarModalNuevoCliente);

  document
    .getElementById("btn-guardar-nuevo")
    .addEventListener("click", guardarNuevoCliente);

  document
    .getElementById("btn-agregar-carrito")
    .addEventListener("click", () => {
      const nombre = document.getElementById("nombre-producto").value.trim();
      const precio = Number(
        document.getElementById("precio-producto").value
      );
      const cantidad = Number(
        document.getElementById("cantidad-producto").value
      );

      if (!nombre || !precio || !cantidad) {
        alert("Completa nombre, precio y cantidad.");
        return;
      }

      carrito.push({
        nombre,
        precioUnitario: precio,
        cantidad
      });

      document.getElementById("nombre-producto").value = "";
      document.getElementById("precio-producto").value = "";
      document.getElementById("cantidad-producto").value = 1;

      renderCarrito();
    });

  document
    .getElementById("btn-vaciar-carrito")
    .addEventListener("click", () => {
      carrito = [];
      renderCarrito();
    });

  document
    .getElementById("descuento")
    .addEventListener("input", renderCarrito);

  document
    .getElementById("btn-guardar-compra")
    .addEventListener("click", guardarCompraDesdeCarrito);

    document.addEventListener("readystatechange", () => {
  if (document.readyState === "complete") {
    cargarClientes();
  }
});




  // Cargar lista inicial
  //cargarClientes();
});
