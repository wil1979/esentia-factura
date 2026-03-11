// Variables globales
let carrito = [];
let productos = [];
let productoSeleccionado = null;
let codigoAplicado = null;
let descuentoAplicado = 0;
let clienteAutenticado = null;
let datosLealtadCliente = null;
let tarjetaLealtadAbierta = true;
let adminProductoActualId = null;
window.catalogoListo = false;

// ================================
// FUNCIONES DE UI
// ================================

function mostrarToast(mensaje, color = "#6c4ba3") {
  const toast = document.getElementById("toast");
  toast.textContent = mensaje;
  toast.style.background = color;
  toast.classList.add("mostrar");
  setTimeout(() => {
    toast.classList.remove("mostrar");
  }, 3000);
}

function cambiarTab(tab) {
  document.querySelectorAll(".btn-tab").forEach(btn => btn.classList.remove("activo"));
  event.target.classList.add("activo");

  document.getElementById("formLogin").style.display = tab === "login" ? "block" : "none";
  document.getElementById("formRegistro").style.display = tab === "registro" ? "block" : "none";
  document.getElementById("loginMensaje").textContent = "";
}

function cerrarModalLogin() {
  document.getElementById("modalLoginRegistro").style.display = "none";
}

// ================================
// AUTENTICACION
// ================================

function abrirLoginRegistro() {
  document.getElementById("modalLoginRegistro").style.display = "flex";
}

function verificarSesion() {
  const sesion = localStorage.getItem("sesionEsentia");
  if (!sesion) {
    document.getElementById("loader").style.display = "none";
    document.getElementById("modalLoginRegistro").style.display = "flex";
    return;
  }

  clienteAutenticado = JSON.parse(sesion);
  document.getElementById("nombreUsuario").textContent = clienteAutenticado.nombre;
  document.getElementById("panelUsuario").style.display = "flex";
  document.getElementById("btnLogin").style.display = "none";
  document.getElementById("modalLoginRegistro").style.display = "none";

  const esAdmin = clienteAutenticado.cedula === "110350666" || clienteAutenticado.id === "110350666";
  localStorage.setItem("adminEsentia", esAdmin ? "1" : "");

  const btnAdmin = document.getElementById("btnAdminVelas");
  if (btnAdmin) btnAdmin.style.display = esAdmin ? "inline-block" : "none";

  window.catalogoListo = true;
  intentarRenderizar();
  actualizarLealtadAlAutenticar();
}

function cerrarSesion() {
  localStorage.removeItem("sesionEsentia");
  localStorage.removeItem("adminEsentia");
  clienteAutenticado = null;
  carrito = [];
  localStorage.removeItem("carrito");

  document.getElementById("panelUsuario").style.display = "none";
  document.getElementById("btnLogin").style.display = "inline-block";
  document.getElementById("loader").style.display = "none";
  document.getElementById("productos-hogar").innerHTML = "";
  document.getElementById("modalLoginRegistro").style.display = "flex";

  ocultarTarjetaLealtad();
}

// ================================
// TARJETA DE LEALTAD
// ================================

function abrirTarjetaLealtad() {
  document.getElementById("tarjetaLealtad").style.display = "block";
  document.getElementById("cajaRegaloFlotante").style.display = "none";
  tarjetaLealtadAbierta = true;
  localStorage.setItem("tarjetaLealtadAbierta", "true");
}

function cerrarTarjetaLealtad() {
  document.getElementById("tarjetaLealtad").style.display = "none";
  document.getElementById("cajaRegaloFlotante").style.display = "flex";
  tarjetaLealtadAbierta = false;
  localStorage.setItem("tarjetaLealtadAbierta", "false");
}

function ocultarTarjetaLealtad() {
  document.getElementById("lealtadContainer").style.display = "none";
}

async function actualizarLealtadAlAutenticar() {
  if (!clienteAutenticado) return;

  document.getElementById("lealtadContainer").style.display = "block";
  await cargarDatosLealtadCliente();
  registrarVisita();

  const abierta = localStorage.getItem("tarjetaLealtadAbierta") !== "false";
  if (abierta) {
    abrirTarjetaLealtad();
  } else {
    cerrarTarjetaLealtad();
  }
}

async function cargarDatosLealtadCliente() {
  if (!clienteAutenticado) return;

  try {
    const { doc, getDoc } = window.firebaseUtils;
    const ref = doc(window.db, "facturas", clienteAutenticado.id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      datosLealtadCliente = {
        nombre: clienteAutenticado.nombre,
        sellos: 0,
        objetivo: 6,
        premiosPendientes: 0
      };
    } else {
      const data = snap.data();
      datosLealtadCliente = {
        nombre: clienteAutenticado.nombre,
        sellos: data.lealtad?.sellos || 0,
        objetivo: data.lealtad?.objetivo || 6,
        premiosPendientes: data.lealtad?.premiosPendientes || 0
      };
    }

    renderizarTarjetaLealtad();
  } catch (error) {
    console.error("Error cargando lealtad:", error);
  }
}

function renderizarTarjetaLealtad() {
  if (!datosLealtadCliente) return;

  document.getElementById("nombreClienteLealtad").textContent = datosLealtadCliente.nombre;
  document.getElementById("sellsActualesLealtad").textContent = datosLealtadCliente.sellos;
  document.getElementById("sellsObjetivoLealtad").textContent = datosLealtadCliente.objetivo;

  const grid = document.getElementById("sellsGrid");
  grid.innerHTML = "";

  for (let i = 1; i <= datosLealtadCliente.objetivo; i++) {
    const div = document.createElement("div");
    div.className = "sello " + (i <= datosLealtadCliente.sellos ? "activo" : "inactivo");
    div.textContent = "★";
    grid.appendChild(div);
  }

  const progreso = document.getElementById("progresoLealtad");
  if (datosLealtadCliente.sellos >= datosLealtadCliente.objetivo) {
    progreso.innerHTML = "<div class='estado-premio'>🎉 ¡Completaste tu tarjeta! Reclama tu regalo</div>";
  } else {
    const faltan = datosLealtadCliente.objetivo - datosLealtadCliente.sellos;
    progreso.textContent = `Faltan ${faltan} sello${faltan !== 1 ? 's' : ''} para tu regalo`;
  }

  const estadoPremio = document.getElementById("estadoPremioLealtad");
  if (datosLealtadCliente.premiosPendientes > 0) {
    estadoPremio.innerHTML = `<div class="estado-premio">🎁 Tienes ${datosLealtadCliente.premiosPendientes} premio${datosLealtadCliente.premiosPendientes !== 1 ? 's' : ''} por reclamar</div>`;
  } else {
    estadoPremio.innerHTML = "";
  }
}

async function registrarVisita() {
  if (!clienteAutenticado) return;
  try {
    const { doc, setDoc, serverTimestamp } = window.firebaseUtils;
    const ref = doc(window.db, "registroVisitas", clienteAutenticado.id);
    await setDoc(ref, {
      nombre: clienteAutenticado.nombre,
      cedula: clienteAutenticado.cedula || "",
      pagina: "catalogo.html",
      ultimaVisita: serverTimestamp(),
      navegador: navigator.userAgent
    }, { merge: true });
  } catch (error) {
    console.error("Error registrando visita:", error);
  }
}

// ================================
// HISTORIAL DE COMPRAS
// ================================

function abrirHistorial() {
  if (!clienteAutenticado) {
    mostrarToast("Inicia sesión para ver tu historial", "#e74c3c");
    abrirLoginRegistro();
    return;
  }

  document.getElementById("modalHistorial").style.display = "flex";
  cargarHistorialCompras();
}

function cerrarModalHistorial() {
  document.getElementById("modalHistorial").style.display = "none";
}

async function cargarHistorialCompras() {
  const container = document.getElementById("listaHistorial");
  container.innerHTML = '<div class="loading-historial">📦 Cargando tu historial...</div>';

  try {
    const { doc, getDoc } = window.firebaseUtils;

    // Obtener el documento del cliente usando su ID
    const ref = doc(window.db, "facturas", clienteAutenticado.id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      mostrarSinCompras();
      actualizarResumen(0, 0, null);
      return;
    }

    const datosCliente = snap.data();
    const compras = datosCliente.compras || [];

    if (compras.length === 0) {
      mostrarSinCompras();
      actualizarResumen(0, 0, null);
      return;
    }

    let html = '';
    let totalGastado = 0;
    let totalCompras = compras.length;
    let ultimaFecha = null;

    // Ordenar compras por fecha descendente
    const comprasOrdenadas = [...compras].sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
      const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
      return fechaB - fechaA;
    });

    comprasOrdenadas.forEach((compra, index) => {
      const fecha = compra.fecha ? new Date(compra.fecha) : new Date();

      if (index === 0) ultimaFecha = fecha;

      const total = compra.total || 0;
      totalGastado += total;

      // Usar estado de la compra o 'entregado' por defecto
      const estado = compra.estado || 'entregado';
      const estadoClass = getEstadoClass(estado);
      const estadoTexto = getEstadoTexto(estado);

      html += crearCardCompra(index, compra, fecha, estadoClass, estadoTexto);
    });

    container.innerHTML = html;
    actualizarResumen(totalCompras, totalGastado, ultimaFecha, datosCliente);

  } catch (error) {
    console.error("Error cargando historial:", error);
    container.innerHTML = `
      <div class="sin-compras">
        <div class="sin-compras-icono">⚠️</div>
        <div class="sin-compras-texto">Error al cargar el historial</div>
        <div class="sin-compras-subtexto">Intenta de nuevo más tarde</div>
      </div>
    `;
  }
}

function crearCardCompra(id, factura, fecha, estadoClass, estadoTexto) {
  const fechaStr = fecha.toLocaleDateString('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const horaStr = fecha.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let productosHTML = '';
  const productos = factura.productos || factura.items || [];

  productos.forEach(prod => {
    const imagen = prod.imagen || 'https://wil1979.github.io/esentia-factura/images/logo.png';
    productosHTML += `
      <div class="producto-historial">
        <div class="producto-historial-info">
          <img src="${imagen}" alt="${prod.nombre}" class="producto-historial-img" onerror="this.src='https://wil1979.github.io/esentia-factura/images/logo.png'">
          <div>
            <div class="producto-historial-nombre">${prod.nombre}</div>
            <div class="producto-historial-variante">${prod.variante || 'Estándar'} × ${prod.cantidad}</div>
          </div>
        </div>
        <div class="producto-historial-precio">₡${(prod.precio * prod.cantidad).toLocaleString()}</div>
      </div>
    `;
  });

  const descuento = factura.descuento || 0;
  const total = factura.total || 0;
  const saldo = factura.saldo || 0;
  const metodoPago = factura.metodoPago || 'No especificado';
  const tipoPago = factura.tipoPago || 'contado';

  const iconoMetodo = metodoPago === 'SINPE' ? '📱' : metodoPago === 'Efectivo' ? '💵' : '💳';

  return `
    <div class="compra-card">
      <div class="compra-header">
        <div class="compra-fecha">
          <span class="compra-fecha-icono">📅</span>
          <span>${fechaStr} · ${horaStr}</span>
        </div>
        <span class="compra-estado ${estadoClass}">${estadoTexto}</span>
      </div>

      <div class="compra-productos">
        ${productosHTML}
      </div>

      ${descuento > 0 ? `
        <div class="compra-descuento">
          🎉 Descuento aplicado: -₡${descuento.toLocaleString()}
        </div>
      ` : ''}

      <div class="compra-detalles">
        <div class="detalle-fila">
          <span class="detalle-label">${iconoMetodo} Método:</span>
          <span class="detalle-valor">${metodoPago}</span>
        </div>
        <div class="detalle-fila">
          <span class="detalle-label">💰 Tipo:</span>
          <span class="detalle-valor">${tipoPago === 'credito' ? 'Crédito' : 'Contado'}</span>
        </div>
        ${saldo > 0 ? `
          <div class="detalle-fila" style="color: #e74c3c;">
            <span class="detalle-label">⚠️ Pendiente:</span>
            <span class="detalle-valor">₡${saldo.toLocaleString()}</span>
          </div>
        ` : ''}
      </div>

      <div class="compra-footer">
        <span class="compra-id">#${id.toString().slice(-6).toUpperCase()}</span>
        <div style="text-align: right;">
          <div class="compra-total-label">Total</div>
          <div class="compra-total-valor">₡${total.toLocaleString()}</div>
        </div>
      </div>
    </div>
  `;
}


function getEstadoClass(estado) {
  const estados = {
    'pendiente': 'estado-pendiente',
    'proceso': 'estado-proceso',
    'en proceso': 'estado-proceso',
    'entregado': 'estado-entregado',
    'cancelado': 'estado-cancelado'
  };
  return estados[estado.toLowerCase()] || 'estado-pendiente';
}

function getEstadoTexto(estado) {
  const estados = {
    'pendiente': '⏳ Pendiente',
    'proceso': '📦 En proceso',
    'en proceso': '📦 En proceso',
    'entregado': '✅ Entregado',
    'cancelado': '❌ Cancelado'
  };
  return estados[estado.toLowerCase()] || estado;
}

function actualizarResumen(totalCompras, totalGastado, ultimaFecha) {
  document.getElementById("totalCompras").textContent = totalCompras;
  document.getElementById("totalGastado").textContent = `₡${totalGastado.toLocaleString()}`;

  if (ultimaFecha) {
    const dias = Math.floor((new Date() - ultimaFecha) / (1000 * 60 * 60 * 24));
    let texto;
    if (dias === 0) texto = "Hoy";
    else if (dias === 1) texto = "Ayer";
    else if (dias < 7) texto = `Hace ${dias} días`;
    else if (dias < 30) texto = `Hace ${Math.floor(dias/7)} semanas`;
    else texto = `Hace ${Math.floor(dias/30)} meses`;
    document.getElementById("ultimaCompra").textContent = texto;
  } else {
    document.getElementById("ultimaCompra").textContent = "-";
  }
}

function mostrarSinCompras() {
  document.getElementById("listaHistorial").innerHTML = `
    <div class="sin-compras">
      <div class="sin-compras-icono">🛍️</div>
      <div class="sin-compras-texto">Aún no tienes compras</div>
      <div class="sin-compras-subtexto">¡Explora nuestro catálogo y haz tu primer pedido!</div>
      <button onclick="cerrarModalHistorial();" class="btn-submit" style="margin-top: 1.5rem; max-width: 250px;">
        Ver catálogo
      </button>
    </div>
  `;
}

// ================================
// PRODUCTOS Y CATALOGO
// ================================

async function cargarProductos() {
  try {
    const resp = await fetch("https://wil1979.github.io/esentia-factura/productos_esentia.json");
    const datosPorTipo = await resp.json();

    productos = [];
    for (const tipo in datosPorTipo) {
      if (Array.isArray(datosPorTipo[tipo])) {
        datosPorTipo[tipo].forEach(producto => {
          productos.push({ ...producto, tipo });
        });
      }
    }

    intentarRenderizar();
  } catch (error) {
    console.error("Error cargando productos:", error);
    document.getElementById("loader").innerHTML = "<p>Error cargando catálogo</p>";
  }
}

function intentarRenderizar() {
  if (window.catalogoListo && Object.keys(window.inventario).length > 0 && productos.length > 0) {
    renderizarProductos();
  }
}

function renderizarProductos() {
  const container = document.getElementById("productos-hogar");
  const loader = document.getElementById("loader");

  loader.style.display = "none";
  container.innerHTML = "";

  const productosFiltrados = productos.filter(p => p.disponible && (window.inventario[p.nombre] ?? 0) > 0);

  if (productosFiltrados.length === 0) {
    container.innerHTML = `<p style="text-align:center; padding:40px; color:#666;">No hay productos disponibles</p>`;
    return;
  }

  const porTipo = {};
  productosFiltrados.forEach(p => {
    const tipo = p.tipo || 'Otros';
    if (!porTipo[tipo]) porTipo[tipo] = [];
    porTipo[tipo].push(p);
  });

  Object.keys(porTipo).sort().forEach(tipo => {
    const seccion = document.createElement("div");
    seccion.className = "seccion-tipo";

    const titulo = document.createElement("h2");
    titulo.className = "titulo-tipo";
    titulo.innerHTML = `${getIconoTipo(tipo)} ${capitalizar(tipo)} <span class="contador-productos">${porTipo[tipo].length}</span>`;
    seccion.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className = "productos-grid";

    porTipo[tipo].forEach(p => {
      grid.appendChild(crearCardProducto(p));
    });

    seccion.appendChild(grid);
    container.appendChild(seccion);
  });

  if (localStorage.getItem("adminEsentia") === "1") {
    activarAccionesAdmin();
  }
}

function crearCardProducto(p) {
  const precioFinal = p.precioOferta || p.precio || 3000;
  const precioOriginal = p.precioOriginal;
  const stock = window.inventario[p.nombre] ?? 0;

  const card = document.createElement("div");
  card.className = p.precioOferta ? "producto-card oferta" : "producto-card";
  card.dataset.nombre = p.nombre;

  let badges = "";
  if (p.esNuevo) badges += `<span class="badge badge-nuevo">Nuevo</span>`;
  badges += `<span class="badge badge-tipo">${p.tipo}</span>`;
  if (p.precioOferta) badges += `<span class="badge badge-oferta">Oferta</span>`;

  let precioHTML = "";
  if (p.precioOferta && precioOriginal) {
    precioHTML = `<span class="precio-original">₡${precioOriginal.toLocaleString()}</span><span class="precio-oferta">₡${precioFinal.toLocaleString()}</span>`;
  } else {
    precioHTML = `<span class="precio-normal">₡${precioFinal.toLocaleString()}</span>`;
  }

  let stockClass = stock > 10 ? "stock-alto" : stock > 0 ? "stock-bajo" : "stock-agotado";
  let stockText = stock > 10 ? "✓ En stock" : stock > 0 ? `⚠ Stock: ${stock}` : "✗ Agotado";

  const nombreEsc = p.nombre.replace(/'/g, "\\'");
  const infoEsc = (p.info || "").replace(/`/g, "\\`");
  const benefEsc = (p.beneficios || "").replace(/`/g, "\\`");
  const usoEsc = (p.usoRecomendado || "").replace(/`/g, "\\`");

  card.innerHTML = `
    <div class="producto-imagen-container">
      <div class="badges-container">${badges}</div>
      <img src="${p.imagen}" alt="${p.nombre}" loading="lazy"
           onclick="mostrarInfoProducto('${nombreEsc}', ${precioFinal}, '${p.imagen}', \`${infoEsc}\`, \`${benefEsc}\`, \`${usoEsc}\`)">
    </div>
    <div class="producto-info">
      <div class="producto-header">
        <h3 class="producto-nombre">${p.nombre}</h3>
        ${p.calificacion ? `<div class="producto-calificacion">${"★".repeat(Math.floor(p.calificacion))}</div>` : ""}
      </div>
      <div class="producto-precio-container">${precioHTML}</div>
      <div class="stock-label ${stockClass}">${stockText}</div>
      <button class="btn-agregar" ${stock === 0 ? "disabled" : ""}
              onclick="mostrarInfoProducto('${nombreEsc}', ${precioFinal}, '${p.imagen}', \`${infoEsc}\`, \`${benefEsc}\`, \`${usoEsc}\`)">
        ${stock === 0 ? "Agotado" : "Ver detalles →"}
      </button>
    </div>
  `;

  return card;
}

function getIconoTipo(tipo) {
  const iconos = {
    'Aromaterapia': '🌿',
    'Difusores': '💨',
    'Velas': '🕯️',
    'Aceites': '💧',
    'Perfumes': '🌸',
    'Ambientadores': '🏠',
    'Regalos': '🎁',
    'Limpieza': '🧼'
  };
  return iconos[tipo] || '✨';
}

function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ================================
// MODAL PRODUCTO
// ================================

function mostrarInfoProducto(nombre, precio, imagen, info, beneficios, uso) {
  document.getElementById("modalProductoNombre").textContent = nombre;
  document.getElementById("modalProductoImagen").src = imagen;
  document.getElementById("modalProductoInfo").textContent = info || "";
  document.getElementById("modalProductoUso").innerHTML = 
    `<strong>✨ Beneficios:</strong> ${beneficios || "No especificado"}<br><br><strong>🏠 Uso recomendado:</strong> ${uso || "No especificado"}`;
  document.getElementById("modalProductoPrecio").textContent = `₡${precio.toLocaleString()}`;

  const p = productos.find(x => x.nombre === nombre);
  productoSeleccionado = { ...p };

  const selector = document.getElementById("selectorVariante");
  selector.innerHTML = "";

  if (p.variantes && p.variantes.length > 0) {
    const select = document.createElement("select");
    select.className = "selector-variante";
    select.id = "varianteSeleccionada";

    const nombres = ["Auto", "Hogar / Oficina 30 ml", "Hogar / Oficina 120 ml"];

    p.variantes.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = JSON.stringify({ nombre: nombres[i] || "Presentación", precio: v.precio });
      opt.textContent = `${nombres[i] || "Presentación"} – ₡${v.precio.toLocaleString()}`;
      if (v.precio === 3000) opt.selected = true;
      select.appendChild(opt);
    });

    select.onchange = () => {
      const v = JSON.parse(select.value);
      document.getElementById("modalProductoPrecio").textContent = `₡${v.precio.toLocaleString()}`;
    };

    selector.appendChild(select);
    setTimeout(() => select.dispatchEvent(new Event("change")), 0);
  }

  document.getElementById("modalProducto").style.display = "flex";
}

function cerrarModalProducto() {
  document.getElementById("modalProducto").style.display = "none";
}

// ================================
// CARRITO
// ================================

function agregarAlCarritoDesdeModal() {
  if (!productoSeleccionado) return;

  const selectVar = document.getElementById("varianteSeleccionada");
  let variante = { nombre: "Hogar / Oficina 30 ml", precio: 3000 };

  if (selectVar && selectVar.value) {
    try {
      variante = JSON.parse(selectVar.value);
    } catch (e) {}
  }

  if (productoSeleccionado.variantes?.length > 0 && (!selectVar || !selectVar.value)) {
    mostrarToast("Selecciona una presentación", "#e74c3c");
    return;
  }

  carrito.push({
    id: Date.now(),
    nombre: productoSeleccionado.nombre,
    imagen: productoSeleccionado.imagen,
    variante: variante.nombre,
    precio: variante.precio,
    cantidad: 1
  });

  guardarCarrito();
  cerrarModalProducto();
  mostrarToast("✓ Producto agregado");
}

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
  document.getElementById("contadorCarrito").textContent = carrito.length;
}

function cargarCarrito() {
  const data = localStorage.getItem("carrito");
  if (data) {
    carrito = JSON.parse(data);
    document.getElementById("contadorCarrito").textContent = carrito.length;
  }
}

function abrirModalCarrito() {
  renderCarrito();
  document.getElementById("modalCarrito").style.display = "flex";
}

function cerrarModalCarrito() {
  document.getElementById("modalCarrito").style.display = "none";
}

function renderCarrito() {
  const lista = document.getElementById("listaCarrito");
  lista.innerHTML = "";
  let total = 0;

  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "item-carrito";
    li.innerHTML = `
      <div class="item-carrito-info">
        <div class="item-carrito-nombre">${item.nombre}</div>
        <div class="item-carrito-variante">${item.variante} × ${item.cantidad}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="item-carrito-precio">₡${(item.precio * item.cantidad).toLocaleString()}</span>
        <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">🗑</button>
      </div>
    `;
    lista.appendChild(li);
    total += item.precio * item.cantidad;
  });

  if (descuentoAplicado > 0) {
    total -= descuentoAplicado;
    document.getElementById("totalModal").textContent = `Total: ₡${total.toLocaleString()} (-₡${descuentoAplicado.toLocaleString()})`;
  } else {
    document.getElementById("totalModal").textContent = `Total: ₡${total.toLocaleString()}`;
  }
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  guardarCarrito();
  renderCarrito();
}

function aplicarCodigoPremio() {
  const input = document.getElementById("codigoPremio");
  const codigo = input.value.trim().toUpperCase();

  const codigos = {
    "ESENTIA10": { tipo: "porcentaje", valor: 10 },
    "ESENTIA20": { tipo: "porcentaje", valor: 20 },
    "NAVIDAD": { tipo: "monto", valor: 1500 },
    "PREMIO1": { tipo: "monto", valor: 1000 }
  };

  const promo = codigos[codigo];
  if (!promo) {
    mostrarToast("Código inválido", "#e74c3c");
    return;
  }

  let total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  if (promo.tipo === "porcentaje") {
    descuentoAplicado = Math.round(total * (promo.valor / 100));
  } else {
    descuentoAplicado = promo.valor;
  }

  codigoAplicado = codigo;
  renderCarrito();
  mostrarToast(`¡Código aplicado! -₡${descuentoAplicado.toLocaleString()}`);
}

function finalizarPedido() {
  if (!clienteAutenticado) {
    mostrarToast("Inicia sesión para continuar", "#e74c3c");
    abrirLoginRegistro();
    return;
  }

  if (carrito.length === 0) {
    mostrarToast("Tu carrito está vacío", "#e74c3c");
    return;
  }

  let mensaje = `Hola Wilber 👋\n\nQuiero hacer un pedido:\n\n`;
  carrito.forEach(item => {
    mensaje += `• ${item.nombre} (${item.variante}) × ${item.cantidad} – ₡${(item.precio * item.cantidad).toLocaleString()}\n`;
  });

  let total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  if (descuentoAplicado > 0) {
    mensaje += `\nDescuento: -₡${descuentoAplicado.toLocaleString()}`;
    total -= descuentoAplicado;
  }

  mensaje += `\n\n*Total: ₡${total.toLocaleString()}*\n\n`;
  mensaje += `Cliente: ${clienteAutenticado.nombre}\nTel: ${clienteAutenticado.telefono || "No registrado"}`;

  window.open(`https://wa.me/50672952454?text=${encodeURIComponent(mensaje)}`, "_blank");
}

// ================================
// UTILIDADES
// ================================

function solicitarAroma() {
  const msg = encodeURIComponent("Hola, me gustaría un aroma personalizado para mi hogar 🌸");
  window.open(`https://wa.me/50672952454?text=${msg}`, "_blank");
}

function copiarEnlaceRecomendacion() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    mostrarToast("¡Enlace copiado! 💌");
  });
}

// ================================
// ADMIN
// ================================

function activarAccionesAdmin() {
  // Implementacion de acciones admin si es necesario
}

function togglePanelVisitas() {
  const panel = document.getElementById("panelVisitas");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) {
    mostrarPanelVisitas();
  }
}

async function mostrarPanelVisitas() {
  if (localStorage.getItem("adminEsentia") !== "1") return;

  const lista = document.getElementById("listaVisitas");
  lista.innerHTML = "Cargando...";

  try {
    const { collection, getDocs } = window.firebaseUtils;
    const snap = await getDocs(collection(window.db, "registroVisitas"));

    lista.innerHTML = "";
    snap.docs
      .sort((a, b) => (b.data().ultimaVisita?.seconds || 0) - (a.data().ultimaVisita?.seconds || 0))
      .forEach(d => {
        const v = d.data();
        const fecha = v.ultimaVisita?.seconds 
          ? new Date(v.ultimaVisita.seconds * 1000).toLocaleString("es-CR") 
          : "—";

        lista.innerHTML += `
          <div style="margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid rgba(108,75,163,0.1);">
            <strong>${v.nombre || "Sin nombre"}</strong><br>
            <small style="color:#666;">${fecha}</small>
          </div>
        `;
      });
  } catch (e) {
    lista.innerHTML = "Error cargando visitas";
  }
}

function abrirAdminSheet(id) {
  adminProductoActualId = id;
  document.getElementById("adminSheetOverlay").style.display = "flex";
}

function cerrarAdminSheet(e) {
  if (!e || e.target === document.getElementById("adminSheetOverlay")) {
    document.getElementById("adminSheetOverlay").style.display = "none";
  }
}

function publicarFacebookOG() {
  if (!adminProductoActualId) return;
  const url = `https://wil1979.github.io/esentia-factura/og/${adminProductoActualId}.html`;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
}

function publicarFacebookDirecto() {
  if (!adminProductoActualId) return;
  const url = `https://wil1979.github.io/esentia-factura/producto.html?id=${encodeURIComponent(adminProductoActualId)}`;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
}

// ================================
// LOGIN / REGISTRO
// ================================

async function buscarCedulaHacienda(cedula) {
  try {
    const resp = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.nombre || null;
  } catch {
    return null;
  }
}

// Login
document.getElementById("formLogin")?.addEventListener("submit", async e => {
  e.preventDefault();
  const valor = document.getElementById("loginCedulaTel").value.trim();
  const msg = document.getElementById("loginMensaje");

  if (!valor) {
    msg.textContent = "Ingresa cédula o teléfono";
    return;
  }

  msg.textContent = "Buscando...";

  try {
    const { query, where, collection, getDocs } = window.firebaseUtils;
    const col = collection(window.db, "clientesBD");
    const q1 = query(col, where("cedula", "==", valor));
    const q2 = query(col, where("telefono", "==", valor));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    let docSnap = null;

    if (!snap1.empty) docSnap = snap1.docs[0];
    else if (!snap2.empty) docSnap = snap2.docs[0];

    if (!docSnap) {
      msg.textContent = "Cliente no registrado. Usa 'Registrarse'.";
      return;
    }

    const data = docSnap.data();
    clienteAutenticado = {
      id: docSnap.id,
      nombre: data.nombre,
      cedula: data.cedula,
      telefono: data.telefono
    };

    localStorage.setItem("sesionEsentia", JSON.stringify(clienteAutenticado));

    const esAdmin = data.cedula === "110350666" || data.telefono === "110350666";
    localStorage.setItem("adminEsentia", esAdmin ? "1" : "");

    verificarSesion();
    msg.textContent = "";
  } catch (err) {
    msg.textContent = "Error de conexión";
  }
});

// Registro
let cedulaValidaCache = null;

document.getElementById("regCedula")?.addEventListener("input", async (e) => {
  let val = e.target.value.replace(/\D/g, "");
  e.target.value = val;

  const status = document.getElementById("cedulaStatus");
  const btn = document.getElementById("btnRegistrar");
  const nombreInput = document.getElementById("regNombre");

  if (val.length === 9) {
    status.textContent = "🔍";
    btn.disabled = true;
    btn.textContent = "Verificando...";

    const nombre = await buscarCedulaHacienda(val);
    if (nombre) {
      status.textContent = "✓";
      nombreInput.value = nombre;
      cedulaValidaCache = { cedula: val, nombre };
      btn.disabled = false;
      btn.textContent = "Registrarme";
    } else {
      status.textContent = "✗";
      nombreInput.value = "";
      cedulaValidaCache = null;
      btn.disabled = true;
      btn.textContent = "Cédula inválida";
    }
  } else {
    status.textContent = "";
    btn.disabled = true;
    btn.textContent = "Verificando cédula...";
  }
});

document.getElementById("formRegistro")?.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = document.getElementById("loginMensaje");

  const cedula = document.getElementById("regCedula").value;
  const telefono = document.getElementById("regTelefono").value;
  const nombre = document.getElementById("regNombre").value;

  if (!nombre) {
    msg.textContent = "Cédula no verificada";
    return;
  }

  if (telefono.length < 8) {
    msg.textContent = "Teléfono inválido";
    return;
  }

  try {
    const { collection, addDoc } = window.firebaseUtils;
    const ref = await addDoc(collection(window.db, "clientesBD"), {
      nombre,
      cedula,
      telefono: telefono.replace(/\D/g, ""),
      creado: new Date()
    });

    clienteAutenticado = {
      id: ref.id,
      nombre,
      cedula,
      telefono
    };

    localStorage.setItem("sesionEsentia", JSON.stringify(clienteAutenticado));

    const esAdmin = cedula === "110350666";
    localStorage.setItem("adminEsentia", esAdmin ? "1" : "");

    mostrarToast(`¡Bienvenido, ${nombre}!`);
    verificarSesion();
  } catch (err) {
    msg.textContent = "Error al registrar";
  }
});

// ================================
// INICIALIZACION
// ================================

document.addEventListener("DOMContentLoaded", () => {
  cargarCarrito();
  verificarSesion();
  cargarProductos();

  // Cerrar modales al hacer click fuera
  document.querySelectorAll(".modal-carrito").forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.style.display = "none";
    });
  });
});

// Prevenir salir con carrito
window.addEventListener("beforeunload", e => {
  if (carrito.length > 0) {
    e.preventDefault();
    e.returnValue = "Tienes productos en el carrito";
  }
});