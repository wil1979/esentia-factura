// modules/clientes-editor.js
import { getDoc, doc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const ClientesEditor = {
  
  // ✅ Buscar cliente existente en Firestore
  async buscarEnBD(cedula) {
    if (!cedula || cedula.trim().length < 5) return null;
    
    try {
      const snap = await getDoc(doc(DB.db, "clientesBD", cedula.trim()));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data(), _origen: 'bd' };
      }
      return null;
    } catch (e) {
      console.warn('Error buscando en BD:', e);
      return null;
    }
  },

  // ✅ Llenar formulario para edición
  llenarFormulario(data, isEdit = true) {
    document.getElementById('formCedula').value = data.cedula || '';
    document.getElementById('formNombre').value = data.nombre || '';
    document.getElementById('formTelefono').value = data.telefono || '';
    document.getElementById('formEmail').value = data.email || '';
    document.getElementById('formDireccion').value = data.direccion || '';

    // Modo edición: cédula readonly, mostrar botón eliminar
    document.getElementById('formCedula').toggleAttribute('readonly', isEdit);
    document.getElementById('formCedula').style.background = isEdit ? '#f0f0f0' : '';
    
    const titulo = document.querySelector('#modalClientes h3');
    const btnEliminar = document.getElementById('btnEliminarCliente');
    const btnGuardar = document.querySelector('#formCliente button[type="submit"]');
    
    if (titulo) titulo.textContent = isEdit ? '✏️ Editar Cliente' : '📝 Nuevo Cliente';
    if (btnEliminar) btnEliminar.style.display = isEdit ? 'inline-block' : 'none';
    if (btnGuardar) btnGuardar.textContent = isEdit ? '💾 Actualizar' : '💾 Guardar';
    
    // Cambiar a pestaña de formulario
    document.querySelector('[data-tab="registrar"]')?.click();
  },

  // ✅ Guardar/Actualizar en Firestore
  async guardarCliente(data) {
    const normalizado = {
      cedula: String(data.cedula || '').trim(),
      nombre: (data.nombre || '').toUpperCase().trim(),
      telefono: (data.telefono || '').trim(),
      email: (data.email || '').toLowerCase().trim(),
      direccion: (data.direccion || '').toUpperCase().trim(),
      tipo: (data.tipo || 'Físico').trim(),
      fechaActualizacion: new Date().toISOString(),
      activo: true
    };

    const ref = doc(DB.db, "clientesBD", normalizado.cedula);
    
    // Mantener puntos de lealtad si ya existen
    const snap = await getDoc(ref);
    if (snap.exists()) {
      normalizado.puntosLealtad = snap.data().puntosLealtad || 0;
    }

    await setDoc(ref, normalizado, { merge: true });
    return normalizado;
  },

  // ✅ Eliminar/Desactivar cliente
  async eliminarCliente(cedula) {
    if (!confirm(`¿Desactivar cliente ${cedula}?`)) return false;
    try {
      await updateDoc(doc(DB.db, "clientesBD", cedula), { 
        activo: false,
        fechaDesactivacion: new Date().toISOString()
      });
      UI.toast('🗑️ Cliente desactivado', 'success');
      return true;
    } catch (e) {
      console.error(e);
      UI.toast('❌ Error al desactivar', 'error');
      return false;
    }
  }
};

export default ClientesEditor;