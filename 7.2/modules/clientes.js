// modules/clientes.js
import { getDoc, doc, setDoc, updateDoc, addDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { Store } from './core.js';
import { UI } from '../components/ui.js';

// ===============================
// 🌍 ESTADO GLOBAL
// ===============================
export let clienteSeleccionado = null;
export let clienteSeleccionadoId = null;
export let clientesBase = [];

// ===============================
// 📂 Cargar personal.json
// ===============================
let contactosPersonal = [];
export async function cargarContactosPersonal() {
  try {
    const res = await fetch('./data/personal.json');
    if (res.ok) {
      contactosPersonal = await res.json();
      console.log(`✅ personal.json cargado: ${contactosPersonal.length} contactos`);
    }
  } catch (e) {
    console.warn('⚠️ personal.json no encontrado');
    contactosPersonal = [];
  }
}

// ===============================
// 🔍 Filtrar contactos por nombre
// ===============================
export function filtrarContactos(query, contenedorId = 'resultados-personal') {
  const cont = document.getElementById(contenedorId);
  if (!cont) return;
  
  query = query.trim();
  cont.style.display = 'none';
  cont.innerHTML = '';
  
  if (query.length < 2) return;
  
  const q = query.toLowerCase();
  const coincidencias = contactosPersonal
    .filter(p => (p.nombre && p.nombre.toLowerCase().includes(q)) || (p.cedula && String(p.cedula).includes(query)))
    .slice(0, 8);
  
  if (coincidencias.length === 0) {
    cont.innerHTML = '<div style="padding:6px; color:#999; font-size:0.9rem;">Sin resultados</div>';
  } else {
    coincidencias.forEach(p => {
      const div = document.createElement('div');
      div.style.padding = '8px';
      div.style.cursor = 'pointer';
      div.style.borderBottom = '1px solid #eee';
      div.style.backgroundColor = '#f9f9f9';
      div.innerHTML = `<strong>${p.nombre}</strong><br>🆔 ${p.cedula || '—'} ${p.puesto ? `<br><small>${p.puesto}</small>` : ''}`;
      div.onclick = () => {
        document.getElementById('modal-nombre').value = p.nombre || '';
        document.getElementById('modal-telefono').value = '';
        document.getElementById('modal-cedula').value = p.cedula || '';
        cont.style.display = 'none';
        document.getElementById('buscador-personal').value = '';
      };
      cont.appendChild(div);
    });
  }
  cont.style.display = 'block';
}

// ===============================
// ✅ Consultar Hacienda (tu código funcional)
// ===============================
export async function consultarNombreHacienda() {
  const cedulaInput = document.getElementById('modal-cedula');
  const nombreInput = document.getElementById('modal-nombre');
  const mensaje = document.getElementById('nombre-desde-api');
  
  if (!cedulaInput || !nombreInput || !mensaje) return;
  
  const cedula = cedulaInput.value.trim().replace(/\D/g, '');
  mensaje.textContent = '';
  mensaje.style.color = '#4CAF50';
  
  if (cedula.length !== 9) {
    if (cedula.length > 0) {
      mensaje.textContent = 'ℹ️ Solo cédulas físicas (9 dígitos)';
      mensaje.style.color = '#ff9800';
    }
    return;
  }
  
  try {
    mensaje.textContent = '🔍 Buscando en Hacienda...';
    const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedula}`);
    
    if (!res.ok) throw new Error('No encontrado');
    
    const data = await res.json();
    const nombre = data.nombre || data.nombre_completo;
    
    if (nombre) {
      nombreInput.value = nombre;
      mensaje.textContent = `✅ ${nombre}`;
    } else {
      mensaje.textContent = '⚠️ Cédula válida, pero no encontrada';
      mensaje.style.color = '#d32f2f';
    }
  } catch (err) {
    console.warn('Error al consultar Hacienda:', err);
    mensaje.textContent = '⚠️ No se pudo contactar a Hacienda';
    mensaje.style.color = '#d32f2f';
  }
}

// ===============================
// 📥 Cargar clientes base
// ===============================
export async function cargarClientesBase() {
  try {
    const snap = await getDocs(collection(DB.db, 'clientesBD'));
    clientesBase = [];
    
    for (const d of snap.docs) {
      const data = d.data();
      clientesBase.push({
        id: d.id,
        nombre: data.nombre || 'Sin nombre',
        telefono: data.telefono || '',
        cedula: data.cedula || '',
        activo: data.activo !== false
      });
    }
    
    console.log(`✅ Clientes cargados: ${clientesBase.length}`);
    return clientesBase;
  } catch (e) {
    console.error('❌ Error cargando clientes:', e);
    return [];
  }
}

// ===============================
// 👤 Renderizar lista de clientes
// ===============================
export function renderListaClientes(filtro = '') {
  const cont = document.getElementById('lista-clientes');
  if (!cont) return;
  
  const f = filtro.toLowerCase().trim();
  cont.innerHTML = '';
  
  const filtrados = clientesBase.filter(c => 
    c.activo && (
      f === '' || 
      c.nombre?.toLowerCase().includes(f) || 
      c.telefono?.includes(f) || 
      c.cedula?.includes(f)
    )
  );
  
  if (filtrados.length === 0) {
    cont.innerHTML = '<div class="vacio">No hay clientes</div>';
    return;
  }
  
  filtrados.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cliente-item';
    div.innerHTML = `
      <strong>${c.nombre}</strong><br>
      📞 ${c.telefono || '-'}<br>
      🆔 ${c.cedula || '-'}
    `;
    div.onclick = () => seleccionarCliente(c.id);
    div.style.padding = '10px';
    div.style.borderBottom = '1px solid #eee';
    div.style.cursor = 'pointer';
    cont.appendChild(div);
  });
}

// ===============================
// 👤 Seleccionar cliente
// ===============================
export async function seleccionarCliente(id) {
  if (!id) return;
  
  const base = clientesBase.find(c => c.id === id);
  if (!base) return UI.toast('Cliente no encontrado', 'error');
  
  clienteSeleccionadoId = id;
  clienteSeleccionado = base;
  
  // Renderizar info básica
  const cont = document.getElementById('info-basica');
  if (cont) {
    cont.innerHTML = `
      <h2>${base.nombre}</h2>
      <p>📞 <a href="https://wa.me/506${base.telefono}" target="_blank">${base.telefono}</a></p>
      ${base.cedula ? `<p>🆔 ${base.cedula}</p>` : ''}
      <button class="btn primary" onclick="window.abrirModalEditarCliente()">✏️ Editar</button>
    `;
  }
  
  // Ocultar lista en móvil
  if (window.innerWidth <= 768) {
    document.getElementById('panel-clientes')?.classList.add('hidden');
  }
  
  console.log('✅ Cliente seleccionado:', base.nombre);
}

// ===============================
// ➕ ABRIR MODAL NUEVO CLIENTE
// ===============================
export function abrirModalNuevoCliente() {
  const modal = document.getElementById('modal-nuevo-cliente');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  
  // Limpiar campos
  document.getElementById('modal-nombre')?.setAttribute('value', '');
  document.getElementById('modal-telefono')?.setAttribute('value', '');
  document.getElementById('modal-cedula')?.setAttribute('value', '');
  document.getElementById('nombre-desde-api').textContent = '';
  document.getElementById('buscador-personal').value = '';
  document.getElementById('resultados-personal').style.display = 'none';
  
  // Listeners
  const buscador = document.getElementById('buscador-personal');
  if (buscador) {
    buscador.oninput = (e) => filtrarContactos(e.target.value);
  }
  
  const cedulaInput = document.getElementById('modal-cedula');
  if (cedulaInput) {
    cedulaInput.onblur = consultarNombreHacienda;
  }
}

export function cerrarModalNuevoCliente() {
  const modal = document.getElementById('modal-nuevo-cliente');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

// ===============================
// ➕ GUARDAR NUEVO CLIENTE
// ===============================
export async function guardarNuevoCliente() {
  const inputNombre = document.getElementById('modal-nombre');
  if (inputNombre) {
    inputNombre.addEventListener('input', () => {
      inputNombre.value = inputNombre.value.toUpperCase();
    });
  }
  
  const nombre = document.getElementById('modal-nombre')?.value.trim().toUpperCase();
  const tel = document.getElementById('modal-telefono')?.value.trim();
  const cedula = document.getElementById('modal-cedula')?.value.trim();
  
  if (!nombre || !tel) {
    UI.toast('Nombre y teléfono son obligatorios', 'warning');
    return;
  }
  
  if (tel.length !== 8 || !/^\d{8}$/.test(tel)) {
    UI.toast('El teléfono debe tener exactamente 8 dígitos', 'warning');
    return;
  }
  
  try {
    const ref = await addDoc(collection(DB.db, 'clientesBD'), {
      nombre,
      telefono: tel,
      cedula: cedula || null,
      activo: true,
      fechaRegistro: new Date().toISOString()
    });
    
    // Crear documento de facturas vacío
    await setDoc(doc(DB.db, 'facturas', ref.id), {
      compras: [],
      abonos: [],
      lealtad: { sellos: 0, objetivo: 6, premiosPendientes: 0 }
    });
    
    UI.toast('✅ Cliente registrado', 'success');
    cerrarModalNuevoCliente();
    await cargarClientesBase();
    renderListaClientes();
    
  } catch (e) {
    console.error('Error al guardar cliente:', e);
    UI.toast('❌ No se pudo guardar el cliente', 'error');
  }
}

// ===============================
// ✏️ EDITAR CLIENTE
// ===============================
export function abrirModalEditarCliente() {
  if (!clienteSeleccionado) {
    UI.toast('Selecciona un cliente primero', 'warning');
    return;
  }
  
  document.getElementById('edit-nombre').value = (clienteSeleccionado.nombre || '').toUpperCase();
  document.getElementById('edit-cedula').value = clienteSeleccionado.cedula || '';
  document.getElementById('edit-telefono').value = clienteSeleccionado.telefono || '';
  
  const modal = document.getElementById('modal-editar-cliente');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

export function cerrarModalEditar() {
  const modal = document.getElementById('modal-editar-cliente');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

export async function guardarEdicionCliente() {
  const nombreInput = document.getElementById('edit-nombre');
  const cedulaInput = document.getElementById('edit-cedula');
  const telefonoInput = document.getElementById('edit-telefono');
  
  if (!nombreInput || !telefonoInput) {
    UI.toast('❌ Campos del formulario no encontrados', 'error');
    return;
  }
  
  const nuevoNombre = nombreInput.value.trim().toUpperCase();
  const nuevaCedula = cedulaInput?.value.trim() || null;
  const nuevoTelefono = telefonoInput.value.trim();
  
  if (!nuevoNombre) {
    UI.toast('❌ El nombre no puede estar vacío', 'warning');
    return;
  }
  
  if (!/^\d{8}$/.test(nuevoTelefono)) {
    UI.toast('❌ El teléfono debe tener 8 dígitos', 'warning');
    return;
  }
  
  const id = clienteSeleccionadoId;
  if (!id) {
    UI.toast('❌ No hay cliente seleccionado', 'error');
    return;
  }
  
  try {
    // 1. Actualizar clientesBD
    const clienteRef = doc(DB.db, 'clientesBD', id);
    await updateDoc(clienteRef, {
      nombre: nuevoNombre,
      cedula: nuevaCedula,
      telefono: nuevoTelefono,
      fechaActualizacion: new Date().toISOString()
    });
    
    // 2. Actualizar facturas (coherencia)
    const facturaRef = doc(DB.db, 'facturas', id);
    await updateDoc(facturaRef, {
      nombre: nuevoNombre,
      cedula: nuevaCedula,
      telefono: nuevoTelefono
    });
    
    cerrarModalEditar();
    
    // 3. Recargar UI
    await cargarClientesBase();
    renderListaClientes();
    if (clienteSeleccionadoId) {
      await seleccionarCliente(clienteSeleccionadoId);
    }
    
    UI.toast('✅ Cliente actualizado', 'success');
    
  } catch (e) {
    console.error('❌ Error al guardar edición:', e);
    UI.toast('❌ Error al guardar cambios', 'error');
  }
}

// ===============================
// 🗑️ ELIMINAR/DESACTIVAR CLIENTE
// ===============================
export async function eliminarCliente() {
  if (!clienteSeleccionadoId) {
    UI.toast('Selecciona un cliente primero', 'warning');
    return;
  }
  
  if (!confirm(`¿Desactivar cliente ${clienteSeleccionado?.nombre}?`)) return;
  
  try {
    await updateDoc(doc(DB.db, 'clientesBD', clienteSeleccionadoId), {
      activo: false,
      fechaDesactivacion: new Date().toISOString()
    });
    
    UI.toast('🗑️ Cliente desactivado', 'success');
    
    // Recargar
    await cargarClientesBase();
    renderListaClientes();
    clienteSeleccionado = null;
    clienteSeleccionadoId = null;
    
    const cont = document.getElementById('info-basica');
    if (cont) cont.innerHTML = '<p class="vacio">Selecciona un cliente</p>';
    
  } catch (e) {
    console.error('Error al desactivar cliente:', e);
    UI.toast('❌ Error al desactivar', 'error');
  }
}

// ===============================
// 🔧 NORMALIZAR NOMBRES (utilidad)
// ===============================
export function normalizarNombre(nombre = '') {
  return nombre.trim().toUpperCase().replace(/\s+/g, ' ');
}

export async function normalizarClientes() {
  if (!confirm('⚠️ NORMALIZAR CLIENTES\n\n• Convertirá todos los nombres a MAYÚSCULAS\n• No afecta saldos ni historial\n• Esta acción es segura\n\n¿Deseas continuar?')) {
    return;
  }
  
  try {
    const snap = await getDocs(collection(DB.db, 'clientesBD'));
    let total = 0;
    let actualizados = 0;
    
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data.nombre) continue;
      
      const nombreNormalizado = normalizarNombre(data.nombre);
      
      if (data.nombre !== nombreNormalizado) {
        await updateDoc(doc(DB.db, 'clientesBD', docSnap.id), {
          nombre: nombreNormalizado
        });
        
        try {
          await updateDoc(doc(DB.db, 'facturas', docSnap.id), {
            nombre: nombreNormalizado
          });
        } catch (_) {}
        
        actualizados++;
      }
      total++;
    }
    
    UI.toast(`✅ Normalización completa\nRevisados: ${total}\nActualizados: ${actualizados}`, 'success');
    await cargarClientesBase();
    renderListaClientes();
    
  } catch (err) {
    console.error('❌ Error normalizando clientes:', err);
    UI.toast('❌ Error durante la normalización', 'error');
  }
}

// ===============================
// 🚀 INICIALIZACIÓN
// ===============================
export async function initClientes() {
  await cargarContactosPersonal();
  await cargarClientesBase();
  console.log('👥 Módulo de clientes inicializado');
}

// ===============================
// 🌐 EXPOSICIÓN GLOBAL (para HTML onclick)
// ===============================
window.abrirModalNuevoCliente = abrirModalNuevoCliente;
window.cerrarModalNuevoCliente = cerrarModalNuevoCliente;
window.guardarNuevoCliente = guardarNuevoCliente;
window.consultarNombreHacienda = consultarNombreHacienda;
window.filtrarContactos = filtrarContactos;
window.abrirModalEditarCliente = abrirModalEditarCliente;
window.cerrarModalEditar = cerrarModalEditar;
window.guardarEdicionCliente = guardarEdicionCliente;
window.eliminarCliente = eliminarCliente;
window.normalizarClientes = normalizarClientes;
window.seleccionarCliente = seleccionarCliente;
window.renderListaClientes = renderListaClientes;
window.cargarClientesBase = cargarClientesBase;

export default {
  init: initClientes,
  cargarClientesBase,
  renderListaClientes,
  seleccionarCliente,
  abrirModalNuevoCliente,
  cerrarModalNuevoCliente,
  guardarNuevoCliente,
  consultarNombreHacienda,
  abrirModalEditarCliente,
  cerrarModalEditar,
  guardarEdicionCliente,
  eliminarCliente,
  normalizarClientes,
  filtrarContactos
};