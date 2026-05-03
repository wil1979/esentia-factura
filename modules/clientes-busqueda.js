// modules/clientes-busqueda.js
import { UI } from '../components/ui.js';

export const ClientesBusqueda = {
  
  // ✅ Normalizar cédula (solo números)
  normalizarCedula(cedula) {
    return String(cedula || '').replace(/\D/g, '').trim();
  },

  // ✅ Consultar API Hacienda (tu código funcional)
  async consultarHacienda(cedula) {
    const cedulaNorm = this.normalizarCedula(cedula);
    
    // Validar cédula física CR (9 dígitos)
    if (cedulaNorm.length !== 9) {
      return { 
        success: false, 
        message: cedulaNorm.length > 0 ? 'Solo cédulas físicas (9 dígitos)' : null 
      };
    }

    try {
      const res = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cedulaNorm}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!res.ok) throw new Error('No encontrado');
      
      const data = await res.json();
      const nombre = data.nombre || data.nombre_completo;
      
      if (nombre) {
        return {
          success: true,
          data: {
            cedula: cedulaNorm,
            nombre: nombre.toUpperCase().trim(),
            telefono: data.telefono || '',
            email: data.correo || data.email || '',
            direccion: data.direccion || '',
            _origen: 'hacienda'
          }
        };
      }
      return { success: false, message: 'Cédula válida, pero no encontrada' };
      
    } catch (err) {
      console.warn('⚠️ Error consultando Hacienda:', err.message);
      return { success: false, message: 'No se pudo contactar a Hacienda' };
    }
  },

  // ✅ Mostrar resultado en UI
  mostrarResultado(data, containerId = 'clientesResultados') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (data.success) {
      container.innerHTML = `<div class="result-item success">✅ ${data.data.nombre}</div>`;
    } else if (data.message) {
      container.innerHTML = `<div class="result-item warn">⚠️ ${data.message}</div>`;
    }
  },

  // ✅ Auto-llenar formulario con datos de Hacienda
  autoLlenarFormulario(data) {
    if (!data.success || !data.data) return;
    
    const formCedula = document.getElementById('formCedula');
    const formNombre = document.getElementById('formNombre');
    const formTelefono = document.getElementById('formTelefono');
    const formEmail = document.getElementById('formEmail');
    const formDireccion = document.getElementById('formDireccion');
    
    if (formCedula) formCedula.value = data.data.cedula;
    if (formNombre) formNombre.value = data.data.nombre;
    if (formTelefono) formTelefono.value = data.data.telefono;
    if (formEmail) formEmail.value = data.data.email;
    if (formDireccion) formDireccion.value = data.data.direccion;
    
    // Cambiar a pestaña de registro
    const tabRegistrar = document.querySelector('[data-tab="registrar"]');
    if (tabRegistrar) tabRegistrar.click();
  }
};

export default ClientesBusqueda;