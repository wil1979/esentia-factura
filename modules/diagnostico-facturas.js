// modules/diagnostico-facturas.js
import { collection, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { DB } from './firebase.js';
import { UI } from '../components/ui.js';

export const DiagnosticoFacturas = {
  
  // ✅ DIAGNÓSTICO COMPLETO
  async diagnosticarColeccion(coleccion = 'facturas_rapidas') {
    console.group('🔍 DIAGNÓSTICO DE FACTURAS');
    
    const reporte = {
      total: 0,
      saludables: 0,
      corruptas: 0,
      problemas: [],
      facturas: []
    };

    try {
      const snap = await getDocs(collection(DB.db, coleccion));
      reporte.total = snap.size;

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        const problemas = [];

        // ✅ VERIFICACIONES
        if (!Array.isArray(data.compras)) {
          problemas.push(`compras no es array: ${typeof data.compras}`);
        }

        if (!data.clienteId) {
          problemas.push('Falta clienteId');
        }

        if (!data.total || typeof data.total !== 'number') {
          problemas.push(`total inválido: ${data.total}`);
        }

        if (!data.fecha) {
          problemas.push('Falta fecha');
        }

        // Verificar que productos sea array
        if (data.productos && !Array.isArray(data.productos)) {
          problemas.push(`productos no es array: ${typeof data.productos}`);
        }

        if (problemas.length > 0) {
          reporte.corruptas++;
          reporte.problemas.push({ id, problemas, data });
        } else {
          reporte.saludables++;
        }

        reporte.facturas.push({
          id,
          clienteId: data.clienteId,
          clienteNombre: data.clienteNombre,
          total: data.total,
          estado: data.estado,
          comprasCount: Array.isArray(data.compras) ? data.compras.length : 'CORRUPTO',
          problemas
        });
      });

      console.log(`📊 RESUMEN:`);
      console.log(`Total facturas: ${reporte.total}`);
      console.log(`✅ Saludables: ${reporte.saludables}`);
      console.log(`❌ Corruptas: ${reporte.corruptas}`);
      
      if (reporte.problemas.length > 0) {
        console.warn('⚠️ FACTURAS CON PROBLEMAS:');
        reporte.problemas.forEach(p => {
          console.warn(`- ${p.id}:`, p.problemas);
        });
      }

      console.groupEnd();
      return reporte;

    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      UI.toast('Error al diagnosticar', 'error');
      return null;
    }
  },

  // ✅ GENERAR BACKUP JSON
  async generarBackup(coleccion = 'facturas_rapidas') {
    console.log('💾 Generando backup...');
    
    try {
      const snap = await getDocs(collection(DB.db, coleccion));
      const backup = {
        fecha: new Date().toISOString(),
        coleccion,
        totalDocs: snap.size,
        documentos: []
      };

      snap.forEach(docSnap => {
        backup.documentos.push({
          id: docSnap.id,
          data: docSnap.data()
        });
      });

      // Descargar archivo
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${coleccion}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      UI.toast(`✅ Backup generado: ${backup.totalDocs} documentos`, 'success');
      return backup;

    } catch (error) {
      console.error('❌ Error generando backup:', error);
      UI.toast('Error al generar backup', 'error');
      return null;
    }
  },

  // ✅ REPARAR FACTURA INDIVIDUAL
  async repararFactura(facturaId, coleccion = 'facturas_rapidas') {
    try {
      const docRef = doc(DB.db, coleccion, facturaId);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        UI.toast('Factura no encontrada', 'error');
        return false;
      }

      const data = snap.data();
      let cambios = {};
      let modificado = false;

      // Reparar compras si no es array
      if (!Array.isArray(data.compras)) {
        console.warn(`🔧 Reparando 'compras' en ${facturaId}`);
        cambios.compras = data.compras ? [data.compras] : [];
        modificado = true;
      }

      // Reparar productos si no es array
      if (data.productos && !Array.isArray(data.productos)) {
        console.warn(`🔧 Reparando 'productos' en ${facturaId}`);
        cambios.productos = [data.productos];
        modificado = true;
      }

      // Asegurar campos numéricos
      if (typeof data.total !== 'number') {
        cambios.total = parseFloat(data.total) || 0;
        modificado = true;
      }

      if (typeof data.subtotal !== 'number') {
        cambios.subtotal = parseFloat(data.subtotal) || 0;
        modificado = true;
      }

      if (typeof data.descuento !== 'number') {
        cambios.descuento = parseFloat(data.descuento) || 0;
        modificado = true;
      }

      if (modificado) {
        await updateDoc(docRef, cambios);
        console.log(`✅ Factura ${facturaId} reparada`);
        UI.toast(`✅ Factura reparada`, 'success');
        return true;
      } else {
        UI.toast('Factura no requiere reparación', 'info');
        return false;
      }

    } catch (error) {
      console.error('❌ Error reparando factura:', error);
      UI.toast('Error al reparar', 'error');
      return false;
    }
  },

  // ✅ REPARAR TODAS LAS FACTURAS CORRUPTAS
  async repararTodas(coleccion = 'facturas_rapidas') {
    const reporte = await this.diagnosticarColeccion(coleccion);
    if (!reporte) return;

    if (reporte.corruptas === 0) {
      UI.toast('✅ No hay facturas corruptas', 'success');
      return;
    }

    if (!confirm(`⚠️ Se repararán ${reporte.corruptas} facturas corruptas.\n¿Continuar?`)) {
      return;
    }

    let reparadas = 0;
    let errores = 0;

    for (const factura of reporte.problemas) {
      try {
        const exito = await this.repararFactura(factura.id, coleccion);
        if (exito) reparadas++;
      } catch (e) {
        console.error(`Error reparando ${factura.id}:`, e);
        errores++;
      }
    }

    UI.toast(`✅ Reparadas: ${reparadas} | Errores: ${errores}`, reparadas > 0 ? 'success' : 'error');
  },

  // ✅ MOSTRAR PANEL DE DIAGNÓSTICO
  async mostrarPanel() {
    // ✅ 1. LIMPIEZA PREVENTIVA (Esto soluciona el problema)
  const existingModal = document.getElementById('modalFacturacionRapida');
  if (existingModal) {
    existingModal.remove(); // Borra el modal viejo por completo
  }
  
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.id = 'modalDiagnostico';
    modal.innerHTML = `
      <div class="modal-content modal-xl">
        <button class="modal-close" onclick="UI.modal('modalDiagnostico','close')">✕</button>
        <h2>🔍 Diagnóstico y Reparación de Facturas</h2>
        
        <div class="diagnostico-panel">
          <div class="diagnostico-acciones">
            <button class="btn-primary" onclick="DiagnosticoFacturas.ejecutarDiagnostico()">
              🔍 Diagnosticar Colección
            </button>
            <button class="btn-secondary" onclick="DiagnosticoFacturas.generarBackup('facturas_rapidas')">
              💾 Generar Backup
            </button>
            <button class="btn-warning" onclick="DiagnosticoFacturas.repararTodas('facturas_rapidas')">
              🔧 Reparar Todas
            </button>
          </div>
          
          <div id="diagnosticoResultado" class="diagnostico-resultado">
            <p class="instrucciones">Presiona "Diagnosticar" para analizar las facturas</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },

  async ejecutarDiagnostico() {
    const container = document.getElementById('diagnosticoResultado');
    container.innerHTML = '<div class="loading-state">🔍 Analizando facturas...</div>';
    
    const reporte = await this.diagnosticarColeccion('facturas_rapidas');
    
    if (!reporte) {
      container.innerHTML = '<p style="color:red">❌ Error en el diagnóstico</p>';
      return;
    }

    container.innerHTML = `
      <div class="diagnostico-resumen">
        <div class="stat-card healthy">
          <span class="stat-number">${reporte.saludables}</span>
          <span class="stat-label">✅ Saludables</span>
        </div>
        <div class="stat-card corrupt">
          <span class="stat-number">${reporte.corruptas}</span>
          <span class="stat-label">❌ Corruptas</span>
        </div>
        <div class="stat-card total">
          <span class="stat-number">${reporte.total}</span>
          <span class="stat-label">📊 Total</span>
        </div>
      </div>

      ${reporte.problemas.length > 0 ? `
        <div class="problemas-lista">
          <h3>⚠️ Facturas con Problemas:</h3>
          ${reporte.problemas.map(p => `
            <div class="problema-item">
              <div class="problema-header">
                <strong>ID: ${p.id}</strong>
                <button class="btn-sm" onclick="DiagnosticoFacturas.repararFactura('${p.id}', 'facturas_rapidas')">
                  🔧 Reparar
                </button>
              </div>
              <ul class="problema-detalles">
                ${p.problemas.map(prob => `<li>${prob}</li>`).join('')}
              </ul>
              <small>Cliente: ${p.data.clienteNombre || 'N/A'} | Total: ₡${p.data.total?.toLocaleString() || 0}</small>
            </div>
          `).join('')}
        </div>
      ` : '<p style="color:green; text-align:center; padding:20px">✅ Todas las facturas están saludables</p>'}
    `;
  }
};

export default DiagnosticoFacturas;