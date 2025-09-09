// ==============================
// 📦 VARIABLES GLOBALES
// ==============================
let productosFactura = [];

// URLs de los productos en GitHub
const URL_ESENCIA = "https://wil1979.github.io/esentia-factura/productos_esentia.json";
const URL_LIMPIEZA = "https://wil1979.github.io/esentia-factura/productos_limpieza_completo.json";

// ==============================
// 🧾 VALIDACIÓN DE FACTURA
// ==============================
function validarFactura() {
  if (productosFactura.length === 0) {
    alert("⚠️ Debes agregar al menos un producto.");
    return false;
  }
  if (!document.getElementById("cliente").value.trim()) {
    alert("⚠️ Debes ingresar el nombre del cliente.");
    return false;
  }
  return true;
}

// ==============================
// 📦 CARGAR PRODUCTOS DE AROMATIZANTES
// ==============================
function cargarProductosEnFacturacion() {
  fetch(URL_ESENCIA)
    .then(res => res.json())
    .then(data => {
      const sel = document.getElementById("productoSelect");
      if (!sel) return;

      sel.innerHTML = '<option value="">-- Selecciona un producto --</option>';

      if (Array.isArray(data) && data[0] && data[0].productos) {
        data.forEach(categoria => {
          const grupo = document.createElement("optgroup");
          grupo.label = categoria.nombre;

          categoria.productos.forEach(producto => {
            if (!producto.disponible) return;

            if (producto.variantes && producto.variantes.length > 0) {
              producto.variantes.forEach(variante => {
                const option = document.createElement("option");
                option.value = `${producto.nombre} ${variante.nombre}|${variante.precio}`;
                option.textContent = `${producto.nombre} (${variante.nombre}) – ₡${variante.precio.toLocaleString()}`;
                grupo.appendChild(option);
              });
            } else {
              const precioFinal = producto.precioOferta || producto.precio;
              const option = document.createElement("option");
              option.value = `${producto.nombre}|${precioFinal}`;
              option.textContent = `${producto.nombre} – ₡${precioFinal.toLocaleString()}`;
              grupo.appendChild(option);
            }
          });

          sel.appendChild(grupo);
        });
      } else {
        data.forEach(producto => {
          if (!producto.disponible) return;

          if (producto.variantes && producto.variantes.length > 0) {
            producto.variantes.forEach(variante => {
              const option = document.createElement("option");
              option.value = `${producto.nombre} ${variante.nombre}|${variante.precio}`;
              option.textContent = `${producto.nombre} (${variante.nombre}) – ₡${variante.precio.toLocaleString()}`;
              sel.appendChild(option);
            });
          } else {
            const precioFinal = producto.precioOferta || producto.precio;
            const option = document.createElement("option");
            option.value = `${producto.nombre}|${precioFinal}`;
            option.textContent = `${producto.nombre} – ₡${precioFinal.toLocaleString()}`;
            sel.appendChild(option);
          }
        });
      }

      $('#productoSelect').select2({
        placeholder: "Busca un producto",
        allowClear: true,
        width: '100%'
      });
    })
    .catch(err => console.error("Error cargando productos de Esencia:", err));
}

// ==============================
// 🧼 CARGAR PRODUCTOS DE LIMPIEZA
// ==============================
function cargarProductosLimpieza() {
  fetch(URL_LIMPIEZA)
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("productoLimpiezaSelect");
      select.innerHTML = '<option value="">-- Selecciona un producto --</option>';

      if (Array.isArray(data) && data[0] && data[0].productos) {
        data.forEach(categoria => {
          const grupo = document.createElement("optgroup");
          grupo.label = categoria.nombre;

          categoria.productos.forEach(prod => {
            if (!prod.disponible) return;

            if (prod.variantes && prod.variantes.length > 0) {
              prod.variantes.forEach(variante => {
                const precioFinal = variante.precio;
                const option = document.createElement("option");
                option.value = `${prod.nombre} ${variante.nombre}|${precioFinal}`;
                option.textContent = `${prod.nombre} (${variante.nombre}) – ₡${precioFinal.toLocaleString()}`;
                grupo.appendChild(option);
              });
            } else {
              const precioFinal = prod.precioOferta || prod.precioPublico || prod.precio;
              const option = document.createElement("option");
              option.value = `${prod.nombre}|${precioFinal}`;
              option.textContent = `${prod.nombre} – ₡${precioFinal.toLocaleString()}`;
              grupo.appendChild(option);
            }
          });

          select.appendChild(grupo);
        });
      } else {
        data.forEach(prod => {
          if (!prod.disponible) return;

          if (prod.variantes && prod.variantes.length > 0) {
            prod.variantes.forEach(variante => {
              const option = document.createElement("option");
              option.value = `${prod.nombre} ${variante.nombre}|${variante.precio}`;
              option.textContent = `${prod.nombre} (${variante.nombre}) – ₡${variante.precio.toLocaleString()}`;
              select.appendChild(option);
            });
          } else {
            const precioFinal = prod.precioOferta || prod.precioPublico || prod.precio;
            const option = document.createElement("option");
            option.value = `${prod.nombre}|${precioFinal}`;
            option.textContent = `${prod.nombre} – ₡${precioFinal.toLocaleString()}`;
            select.appendChild(option);
          }
        });
      }

      $('#productoLimpiezaSelect').select2({
        placeholder: "Buscar producto de limpieza",
        allowClear: true,
        width: '100%'
      });
    })
    .catch(err => console.error("Error cargando productos de Limpieza:", err));
}

// ==============================
// 🔢 GENERAR NÚMERO DE FACTURA
// ==============================
function generarNumeroFactura() {
  const consecutivoKey = "esentia_factura_consecutivo";
  let consecutivo = parseInt(localStorage.getItem(consecutivoKey)) || 1;

  const numeroFormateado = String(consecutivo).padStart(4, '0');
  const nuevoNumero = `ES-${numeroFormateado}`;

  localStorage.setItem(consecutivoKey, consecutivo + 1);
  return nuevoNumero;
}

// ==============================
// ➕ AGREGAR PRODUCTO (AROMATIZANTE)
// ==============================
function agregarProducto() {
  const sel = document.getElementById("productoSelect");
  const [nombre, precio] = sel.value.split("|");
  const cantidad = parseInt(document.getElementById("cantidadSelect").value) || 1;

  if (!nombre) return alert("Por favor selecciona un producto válido");

  productosFactura.push({ nombre, precio: parseInt(precio), cantidad });
  actualizarVista();
  actualizarTotal();
}

// ==============================
// ➕ AGREGAR PRODUCTO (LIMPIEZA)
// ==============================
function agregarProductoLimpieza() {
  const select = document.getElementById("productoLimpiezaSelect");
  const [nombre, precio] = select.value.split("|");
  const cantidad = parseInt(document.getElementById("cantidadLimpieza").value) || 1;

  if (!nombre) return alert("Selecciona un producto válido");

  productosFactura.push({ nombre, precio: parseInt(precio), cantidad });
  actualizarVista();
  actualizarTotal();
}

// ==============================
// 📋 ACTUALIZAR VISTA DEL CARRITO
// ==============================
function actualizarVista() {
  const ul = document.getElementById("listaProductos");
  ul.innerHTML = "";
  productosFactura.forEach((p, i) => {
    ul.innerHTML += `
      <li>
        ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}
        <button onclick="productosFactura.splice(${i},1); actualizarVista(); actualizarTotal();">🗑️</button>
      </li>`;
  });
}

// ==============================
// 💰 ACTUALIZAR TOTAL EN TIEMPO REAL
// ==============================
function actualizarTotal() {
  let subtotal = productosFactura.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  const descuentoFijo = parseFloat(document.getElementById("descuentoCantidad").value) || 0;
  const descuentoPorcentaje = parseFloat(document.getElementById("descuentoPorcentaje").value) || 0;
  const descuento = descuentoFijo + (subtotal * descuentoPorcentaje / 100);
  const total = subtotal - descuento;

  document.getElementById("totalDisplay").textContent = `✅ Subtotal: ₡${subtotal.toLocaleString()} | Descuento: ₡${descuento.toLocaleString()} | Total a pagar: ₡${total.toLocaleString()}`;

  // Guardar para reutilizar en PDF/WhatsApp
  window.facturaCalculada = { subtotal, descuento, total };
}

// ==============================
// 📲 ENVIAR FACTURA POR WHATSAPP
// ==============================
async function enviarFacturaPorWhatsApp() {
  if (!validarFactura()) return;

  const numero = document.getElementById("numeroWhatsApp").value.trim();
  if (!/^[678]\d{7}$/.test(numero)) {
    alert("Número inválido. Debe tener 8 dígitos y empezar con 6, 7 u 8.");
    return;
  }

  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;
  const cliente = document.getElementById("cliente").value;

  const { subtotal, descuento, total } = window.facturaCalculada || {};

  let mensaje = `🧾 Factura Esentia\n`;
  mensaje += `N°: ${factura}\nFecha: ${fecha}\nCliente: ${cliente}\n\n`;

  productosFactura.forEach(p => {
    mensaje += `- ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}\n`;
  });

  mensaje += `\n💰 Subtotal: ₡${subtotal.toLocaleString()}`;
  mensaje += `\n🔖 Descuento: ₡${descuento.toLocaleString()}`;
  mensaje += `\n✅ Total a pagar: ₡${total.toLocaleString()}`;
  mensaje += `\n\n💳 Formas de pago:\n1. Efectivo contra entrega\n2. SINPE 72952454 Wilber Calderón M.\n3. BAC: CR59010200009453897656\n\n🌿 Estamos encantados de atenderte...`;

  const url = `https://wa.me/506${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");

  await guardarFacturaActual();
}

// ==============================
// 📄 GENERAR FACTURA EN PDF
// ==============================
async function generarFacturaPDF() {
  if (!validarFactura()) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const cliente = document.getElementById("cliente").value;
  const factura = document.getElementById("factura").value;
  const fecha = document.getElementById("fecha").value;

  const { subtotal, descuento, total } = window.facturaCalculada || {};

  try {
    doc.addImage("images/logo.png", "PNG", 15, 10, 40, 20);
  } catch (e) {
    console.warn("Logo no encontrado");
  }

  doc.setFontSize(16);
  doc.text(" Factura - Esentia", 60, 20);

  doc.setFontSize(12);
  doc.text(`N°: ${factura}`, 15, 40);
  doc.text(`Fecha: ${fecha}`, 15, 50);
  doc.text(`Cliente: ${cliente}`, 15, 60);

  let y = 70;
  productosFactura.forEach(p => {
    doc.text(`• ${p.nombre} x${p.cantidad} – ₡${(p.precio * p.cantidad).toLocaleString()}`, 15, y);
    y += 10;
  });

  y += 10;
  doc.text(`Subtotal: ₡${subtotal.toLocaleString()}`, 15, y);
  y += 10;
  doc.text(`Descuento: ₡${descuento.toLocaleString()}`, 15, y);
  y += 10;
  doc.text(`Total: ₡${total.toLocaleString()}`, 15, y);

  y += 20;
  doc.setFontSize(14);
  doc.text("🙏 ¡Gracias por tu confianza!", 15, y);

  const nota = `
Estamos encantados de atenderte.
Es un placer ayudarte a crear espacios más limpios, frescos y armoniosos con nuestras fragancias y productos de limpieza.

Formas de pago:
1. Efectivo contra entrega
2. SINPE Móvil: 72952454 - Wilber Calderón M.
3. Depósito bancario: CR59010200009453897656`;

  y += 10;
  doc.text(nota, 15, y + 10);

  doc.save(`factura-${factura}.pdf`);

  await guardarFacturaActual();
}

// ==============================
// ☁️ GUARDAR FACTURA EN FIRESTORE
// ==============================
async function guardarFacturaActual() {
  try {
    // Obtener datos de la UI
    const facturaNumero = document.getElementById("factura").value;
    const clienteNombre = document.getElementById("cliente").value;
    const clienteTelefono = document.getElementById("numeroWhatsApp").value.trim();
    const clienteCedula = document.getElementById("idCliente").value.trim();
    const fecha = document.getElementById("fecha").value;

    // Usar valores ya calculados
    const { subtotal, descuento, total } = window.facturaCalculada || {};

    // Crear objeto de factura
    const facturaData = {
      numero: facturaNumero,
      fecha: fecha,
      cliente: {
        nombre: clienteNombre,
        telefono: clienteTelefono,
        cedula: clienteCedula || null
      },
      productos: productosFactura.map(p => ({
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad
      })),
      subtotal: subtotal,
      descuento: descuento,
      total: total,
      enviada: true,
      fechaCreacion: serverTimestamp()
    };

    // Guardar en colección 'facturas'
    const facturaRef = doc(collection(db, "facturas"));
    await setDoc(facturaRef, facturaData);

    // Guardar/actualizar cliente en colección 'clientes'
    if (clienteTelefono) {
      const clienteRef = doc(db, "clientes", clienteTelefono); // Usamos teléfono como ID
      const clienteSnap = await getDoc(clienteRef);

      if (clienteSnap.exists()) {
        // Actualizar cliente existente
        await updateDoc(clienteRef, {
          nombre: clienteNombre,
          cedula: clienteCedula || null,
          compras: arrayUnion(facturaRef.id), // Agregar ID de la factura
          ultimaCompra: serverTimestamp()
        });
      } else {
        // Crear nuevo cliente
        await setDoc(clienteRef, {
          nombre: clienteNombre,
          telefono: clienteTelefono,
          cedula: clienteCedula || null,
          compras: [facturaRef.id], // Array con el primer ID
          ultimaCompra: serverTimestamp()
        });
      }
    }

    mostrarToast("✅ Factura guardada en la nube", "#4caf50");
  } catch (error) {
    console.error("Error guardando factura:", error);
    mostrarToast("⚠️ Error al guardar factura", "#e53935");
  }
}

// ==============================
// 📂 MEJORAR HISTORIAL (FIRESTORE + LOCAL)
// ==============================
async function mostrarHistorial() {
  const contenedor = document.getElementById("historial");
  contenedor.innerHTML = "<p>Cargando...</p>";

  try {
    // Primero: Obtener últimas 5 facturas de Firestore
    const facturasRef = collection(db, "facturas");
    const q = query(facturasRef, orderBy("fechaCreacion", "desc"), limit(5));
    const snapshot = await getDocs(q);

    let html = "";

    if (!snapshot.empty) {
      html += "<h4>☁️ Últimas facturas (Firestore):</h4>";
      snapshot.docs.forEach(doc => {
        const f = doc.data();
        html += `
          <div style="margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; background: #f9f9f9; border-radius: 5px;">
            <strong>Factura:</strong> ${f.numero}<br>
            <strong>Cliente:</strong> ${f.cliente.nombre}<br>
            <strong>Total:</strong> ₡${f.total.toLocaleString()}<br>
            <small>${f.fecha}</small>
            <button onclick="reenviarPorWhatsApp('${f.cliente.telefono}', '${f.numero}')">📲</button>
          </div>`;
      });
    }

    // Segundo: Obtener historial local
    const historialLocal = JSON.parse(localStorage.getItem("facturas")) || [];
    if (historialLocal.length > 0) {
      html += "<h4>💾 Historial local:</h4>";
      historialLocal.slice(0, 3).forEach(f => {
        html += `
          <div style="margin-bottom: 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem;">
            <strong>Factura:</strong> ${f.factura}<br>
            <strong>Cliente:</strong> ${f.cliente}<br>
            <strong>Total:</strong> ₡${f.total.toLocaleString()}<br>
            <small>${f.fecha}</small>
          </div>`;
      });
    }

    if (html === "") {
      html = "<p>No hay facturas guardadas (ni en la nube ni localmente).</p>";
    }

    contenedor.innerHTML = html;

  } catch (error) {
    console.error("Error cargando historial:", error);
    contenedor.innerHTML = "<p style='color: #e53935;'>⚠️ Error al cargar historial. Revisa la consola.</p>";
  }
}

// ==============================
// 📁 BORRAR HISTORIAL LOCAL
// ==============================
function borrarHistorial() {
  if (confirm("¿Estás seguro de querer borrar todo el historial local? (Las de Firestore se mantienen)")) {
    localStorage.removeItem("facturas");
    mostrarHistorial();
  }
}

// ==============================
// 🔍 BUSCAR FACTURA POR NÚMERO O CLIENTE
// ==============================
async function buscarFactura() {
  const query = document.getElementById("buscarFacturaInput").value.trim();
  const resultadoDiv = document.getElementById("resultadoBusqueda");

  if (!query) {
    alert("Por favor ingresa un número de factura o teléfono.");
    return;
  }

  try {
    let facturaEncontrada = null;
    let clienteEncontrado = null;

    // Primero, intentar buscar por número de factura
    const facturasRef = collection(db, "facturas");
    const qFactura = query(facturasRef, where("numero", "==", query));
    const snapshotFactura = await getDocs(qFactura);

    if (!snapshotFactura.empty) {
      const doc = snapshotFactura.docs[0];
      facturaEncontrada = { id: doc.id, ...doc.data() };
    } else {
      // Si no se encuentra por número, buscar por teléfono de cliente
      const clienteRef = doc(db, "clientes", query);
      const clienteSnap = await getDoc(clienteRef);

      if (clienteSnap.exists()) {
        clienteEncontrado = { id: clienteSnap.id, ...clienteSnap.data() };

        // Obtener las facturas del cliente
        const facturasCliente = [];
        for (const facturaId of clienteEncontrado.compras || []) {
          const facturaRef = doc(db, "facturas", facturaId);
          const facturaSnap = await getDoc(facturaRef);
          if (facturaSnap.exists()) {
            facturasCliente.push({ id: facturaId, ...facturaSnap.data() });
          }
        }
        clienteEncontrado.facturas = facturasCliente;
      }
    }

    // Mostrar resultados
    if (facturaEncontrada) {
      mostrarResultadoFactura(facturaEncontrada, resultadoDiv);
    } else if (clienteEncontrado) {
      mostrarResultadoCliente(clienteEncontrado, resultadoDiv);
    } else {
      resultadoDiv.innerHTML = `<p style="color: #e53935;">❌ No se encontró ninguna factura o cliente con ese criterio.</p>`;
      resultadoDiv.style.display = "block";
    }

  } catch (error) {
    console.error("Error buscando factura:", error);
    resultadoDiv.innerHTML = `<p style="color: #e53935;">⚠️ Error en la búsqueda. Intenta de nuevo.</p>`;
    resultadoDiv.style.display = "block";
  }
}

function mostrarResultadoFactura(factura, contenedor) {
  contenedor.innerHTML = `
    <h4>📄 Factura encontrada: ${factura.numero}</h4>
    <p><strong>Cliente:</strong> ${factura.cliente.nombre}</p>
    <p><strong>Teléfono:</strong> ${factura.cliente.telefono}</p>
    <p><strong>Fecha:</strong> ${factura.fecha}</p>
    <p><strong>Total:</strong> ₡${factura.total.toLocaleString()}</p>
    <h5>Productos:</h5>
    <ul>
      ${factura.productos.map(p => `<li>${p.nombre} x${p.cantidad} - ₡${(p.precio * p.cantidad).toLocaleString()}</li>`).join('')}
    </ul>
    <button onclick="reenviarPorWhatsApp('${factura.cliente.telefono}', '${factura.numero}')">📲 Reenviar por WhatsApp</button>
  `;
  contenedor.style.display = "block";
}

function mostrarResultadoCliente(cliente, contenedor) {
  contenedor.innerHTML = `
    <h4>👤 Cliente encontrado: ${cliente.nombre}</h4>
    <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
    <p><strong>Última compra:</strong> ${cliente.ultimaCompra?.toDate?.()?.toLocaleDateString?.() || 'N/A'}</p>
    <h5>Facturas (${cliente.facturas?.length || 0}):</h5>
    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
      ${(cliente.facturas || []).map(f => `
        <div style="margin-bottom: 10px; padding: 8px; border-bottom: 1px solid #eee;">
          <strong>${f.numero}</strong> - ₡${f.total.toLocaleString()} - ${f.fecha}
          <button onclick="reenviarPorWhatsApp('${f.cliente.telefono}', '${f.numero}')">📲</button>
        </div>
      `).join('')}
    </div>
  `;
  contenedor.style.display = "block";
}

function reenviarPorWhatsApp(telefono, numeroFactura) {
  const mensaje = `Hola! Aquí tienes tu factura ${numeroFactura} de Esentia. ¡Gracias por tu compra! 🌿`;
  window.open(`https://wa.me/506${telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
}

// ==============================
// 📊 PANEL DE ESTADÍSTICAS
// ==============================
async function cargarEstadisticas() {
  const panel = document.getElementById("panelEstadisticas");
  panel.style.display = "block";
  panel.innerHTML = "<p>Cargando estadísticas...</p>";

  try {
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);

    // Obtener facturas
    const facturasRef = collection(db, "facturas");
    const snapshot = await getDocs(facturasRef);

    let totalVentas = 0;
    let totalFacturas = 0;
    const ventasPorDia = {};
    const productosVendidos = {};

    snapshot.docs.forEach(doc => {
      const f = doc.data();
      totalVentas += f.total;
      totalFacturas++;

      // Contar productos
      f.productos.forEach(p => {
        if (!productosVendidos[p.nombre]) {
          productosVendidos[p.nombre] = { cantidad: 0, total: 0 };
        }
        productosVendidos[p.nombre].cantidad += p.cantidad;
        productosVendidos[p.nombre].total += p.precio * p.cantidad;
      });

      // Agrupar por día
      const fecha = f.fecha.split('T')[0]; // "YYYY-MM-DD"
      if (!ventasPorDia[fecha]) {
        ventasPorDia[fecha] = 0;
      }
      ventasPorDia[fecha] += f.total;
    });

    // Ordenar productos más vendidos
    const productosOrdenados = Object.entries(productosVendidos)
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .slice(0, 5);

    // Generar gráfico de barras simple para últimos 7 días
    const fechas = [];
    const valores = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      fechas.push(fechaStr);
      valores.push(ventasPorDia[fechaStr] || 0);
    }

    const maxValor = Math.max(...valores) || 1;

    let graficoHTML = "";
    let leyendaHTML = "";
    fechas.forEach((fecha, i) => {
      const altura = (valores[i] / maxValor) * 180 || 0;
      const color = altura > 0 ? "#4caf50" : "#ccc";
      graficoHTML += `<div style="width: 30px; height: ${altura}px; background: ${color}; border-radius: 4px 4px 0 0;"></div>`;
      leyendaHTML += `<span style="display: inline-block; width: 40px; text-align: center; font-size: 0.8rem;">${fecha.split('-')[2]}</span>`;
    });

    // HTML final
    panel.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem;">
        <div style="flex: 1; min-width: 300px; background: #f0f7ff; padding: 1rem; border-radius: 8px;">
          <h4>📈 Ventas por día (últimos 7 días)</h4>
          <div id="graficoVentasDia" style="height: 200px; display: flex; align-items: flex-end; gap: 4px; margin-top: 1rem;">
            ${graficoHTML}
          </div>
          <div id="leyendaVentasDia" style="margin-top: 0.5rem; font-size: 0.9rem;">
            ${leyendaHTML}
          </div>
        </div>

        <div style="flex: 1; min-width: 300px; background: #fff0f0; padding: 1rem; border-radius: 8px;">
          <h4>🏆 Productos más vendidos</h4>
          <ul id="listaProductosTop" style="margin-top: 1rem; max-height: 200px; overflow-y: auto; padding-left: 20px;">
            ${productosOrdenados.map(([nombre, data]) => `
              <li><strong>${nombre}</strong> - ${data.cantidad} uds - ₡${data.total.toLocaleString()}</li>
            `).join('')}
          </ul>
        </div>
      </div>

      <div style="margin-top: 1rem; background: #f0fff0; padding: 1rem; border-radius: 8px;">
        <h4>💰 Resumen general</h4>
        <div id="resumenGeneral">
          <p><strong>Total facturas:</strong> ${totalFacturas}</p>
          <p><strong>Total vendido:</strong> ₡${totalVentas.toLocaleString()}</p>
          <p><strong>Promedio por factura:</strong> ₡${totalFacturas ? Math.round(totalVentas / totalFacturas).toLocaleString() : 0}</p>
        </div>
      </div>
    `;

  } catch (error) {
    console.error("Error cargando estadísticas:", error);
    panel.innerHTML = "<p style='color: #e53935;'>⚠️ Error al cargar estadísticas.</p>";
  }
}

// ==============================
// 🔍 CONSULTAR API DE HACIENDA
// ==============================
document.getElementById("idCliente").addEventListener("blur", () => {
  const cedula = document.getElementById("idCliente").value.trim().replace(/\D/g, '');
  if (!cedula || !/^(\d{9}|\d{12})$/.test(cedula)) {
    alert("Cédula inválida. Debe tener 9 o 12 dígitos.");
    return;
  }

  fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`)
    .then(response => {
      if (!response.ok) throw new Error("Respuesta no válida");
      return response.json();
    })
    .then(data => {
      if (data && data.nombre) {
        document.getElementById("cliente").value = data.nombre;
      } else {
        alert("No se encontró información para esta identificación.");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error al consultar la API de Hacienda. Intente más tarde.");
    });
});

// ==============================
// 🆕 NUEVA FACTURA
// ==============================
function nuevaFactura() {
  productosFactura = [];
  document.getElementById("listaProductos").innerHTML = "";
  document.getElementById("descuentoCantidad").value = 0;
  document.getElementById("descuentoPorcentaje").value = 0;
  document.getElementById("totalDisplay").textContent = "";
  document.getElementById("cliente").value = "";
  document.getElementById("idCliente").value = "";
  document.getElementById("numeroWhatsApp").value = "";
  document.getElementById("factura").value = generarNumeroFactura();
}

// ==============================
// 🍞 TOAST (NOTIFICACIONES)
// ==============================
function mostrarToast(mensaje, color = "#4caf50") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.backgroundColor = color;
    toast.style.color = "white";
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "6px";
    toast.style.zIndex = "10000";
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
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

// ==============================
// 🚀 INICIALIZAR
// ==============================
window.addEventListener("DOMContentLoaded", () => {
  const fechaInput = document.getElementById("fecha");
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = new Date().toISOString().split("T")[0];
  }

  const facturaInput = document.getElementById("factura");
  if (facturaInput && !facturaInput.value) {
    facturaInput.value = generarNumeroFactura();
  }

  cargarProductosEnFacturacion();
  cargarProductosLimpieza();

  // Eventos para actualizar total en tiempo real
  document.getElementById("descuentoCantidad").addEventListener("input", actualizarTotal);
  document.getElementById("descuentoPorcentaje").addEventListener("input", actualizarTotal);
});