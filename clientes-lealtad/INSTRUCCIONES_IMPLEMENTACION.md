# 🎁 Sistema de Tarjeta de Lealtad Virtual - Instrucciones de Implementación

## Resumen de Cambios

Se han integrado exitosamente dos componentes principales en tu proyecto:

### 1. **Tarjeta de Lealtad Flotante en `catalogo.html`**
- Interfaz visual profesional y responsiva
- Muestra sellos (⭐) del cliente en tiempo real
- Caja de regalo flotante (🎁) que aparece al cerrar la tarjeta
- Sincronización automática con datos de Firestore

### 2. **Lógica de Cálculo y Aplicación de Sellos en `clientes.html`**
- Cálculo automático de sellos (1 sello por cada 5000 colones)
- Aplicación automática de sellos al finalizar una venta
- Gestión de premios pendientes
- Funciones auxiliares para administración manual de sellos

---

## 📋 Archivos Modificados

### `catalogo_modificado.html`
**Cambios realizados:**
- ✅ Agregados estilos CSS para la tarjeta de lealtad (líneas ~266-490)
- ✅ Agregado HTML de la tarjeta flotante (líneas ~636-665)
- ✅ Agregadas funciones JavaScript de control de tarjeta (líneas ~742-820)

**Nuevas funciones:**
```javascript
abrirTarjetaLealtad()              // Abre la tarjeta
cerrarTarjetaLealtad()             // Cierra la tarjeta y muestra caja de regalo
mostrarTarjetaLealtad()            // Muestra/oculta según autenticación
cargarDatosLealtadCliente()        // Carga datos de Firestore
actualizarVisualizacionLealtad()   // Actualiza visualización de sellos
actualizarLealtadAlAutenticar()    // Se llama al iniciar sesión
ocultarTarjetaLealtadAlCerrarSesion() // Se llama al cerrar sesión
```

### `clientes_modificado.html`
**Cambios realizados:**
- ✅ Agregadas funciones de cálculo de sellos (líneas ~2458-2620)
- ✅ Integrada lógica de aplicación de sellos en `guardarCompraDesdeCarrito()` (líneas ~2200-2210)
- ✅ Agregada función auxiliar `obtenerCedulaPorId()` (líneas ~2130-2145)

**Nuevas funciones:**
```javascript
calcularSellospor Compra(montoCompra)           // Calcula sellos por monto
aplicarSellosaCliente(cedula, sellos, monto)   // Aplica sellos a Firestore
procesarVentayAplicarSellos(cedula, monto)     // Procesa venta y aplica sellos
recalcularSellosaCliente(cedula, cantidad)     // Recalcula sellos manualmente
obtenerEstadoLealtadCliente(cedula)            // Obtiene estado actual
marcarPremioComoReclamado(cedula)              // Marca premio como reclamado
obtenerCedulaPorId(clienteId)                  // Obtiene cédula por ID
```

---

## 🔧 Pasos de Implementación

### Paso 1: Reemplazar los Archivos
1. Descarga los archivos modificados:
   - `catalogo_modificado.html` → Renombra a `catalogo.html`
   - `clientes_modificado.html` → Renombra a `clientes.html`

2. Reemplaza los archivos originales en tu servidor/proyecto

### Paso 2: Verificar la Conexión a Firestore
Asegúrate de que:
- ✅ Las credenciales de Firebase estén correctamente configuradas
- ✅ La colección `clientes` exista en Firestore
- ✅ Los documentos tengan la estructura de datos correcta

### Paso 3: Estructura de Datos Requerida en Firestore

Cada documento en la colección `clientes` debe tener esta estructura:

```javascript
{
  cedula: "304110055",
  nombre: "María Elena Gutiérrez Soto",
  telefono: "60840204",
  
  // Datos de lealtad (se crean automáticamente si no existen)
  lealtad: {
    sellos: 1,                    // Cantidad actual de sellos
    objetivo: 6,                  // Sellos necesarios para premio
    premiosPendientes: 0,         // Premios no reclamados
    ultimaActualizacion: "2025-12-14T03:18:07.456Z"
  },
  
  // Otros campos existentes...
  compras: [...],
  ultimaCompra: Timestamp,
  yaParticipo: boolean,
  // etc.
}
```

### Paso 4: Integración con el Flujo Existente

#### En `catalogo.html`:
- La tarjeta se muestra automáticamente cuando el cliente inicia sesión
- Se actualiza automáticamente cada vez que se carga la página
- El estado (abierta/cerrada) se persiste en localStorage

#### En `clientes.html`:
- Los sellos se aplican automáticamente al guardar una compra
- Se calcula 1 sello por cada 5000 colones de compra
- Si se completan 6 sellos, se incrementa `premiosPendientes` en 1

---

## 💡 Flujo de Funcionamiento

### Cuando un Cliente Compra:

1. **En `clientes.html`:**
   - El usuario registra una venta
   - Se llama a `guardarCompraDesdeCarrito()`
   - Se obtiene la cédula del cliente con `obtenerCedulaPorId()`
   - Se llama a `procesarVentayAplicarSellos(cedula, montoTotal)`

2. **Cálculo de Sellos:**
   - `calcularSellospor Compra()` divide el monto entre 5000
   - Ejemplo: ₡15,000 = 3 sellos

3. **Actualización en Firestore:**
   - `aplicarSellosaCliente()` actualiza el documento
   - Si se completan 6 sellos → se crea 1 premio pendiente
   - Los sellos se reinician a 0 después de cada premio

4. **En `catalogo.html`:**
   - Cuando el cliente abre el catálogo, ve su tarjeta de lealtad actualizada
   - La tarjeta muestra los sellos actuales y premios pendientes

---

## 🎨 Personalización

### Cambiar el Objetivo de Sellos
En `clientes.html`, línea ~2469:
```javascript
objetivo: lealtad.objetivo || 6  // Cambiar 6 por otro número
```

### Cambiar el Monto por Sello
En `clientes.html`, línea ~2458:
```javascript
return Math.floor(montoCompra / 5000);  // Cambiar 5000 por otro monto
```

### Cambiar Colores de la Tarjeta
En `catalogo.html`, línea ~281:
```css
.tarjeta-lealtad {
  background: linear-gradient(135deg, #6c4ba3 0%, #8b6bb4 100%);
  /* Cambiar colores aquí */
}
```

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Crear Cliente y Compra
1. Crea un nuevo cliente en `clientes.html`
2. Registra una compra de ₡5,000 o más
3. Verifica que en Firestore se creó el campo `lealtad` con 1 sello

### Prueba 2: Ver Tarjeta en Catálogo
1. Abre `catalogo.html`
2. Inicia sesión con el cliente creado
3. Verifica que la tarjeta de lealtad aparece con 1 sello

### Prueba 3: Completar Tarjeta
1. Registra 5 compras más de ₡5,000 cada una
2. Verifica que en la tarjeta aparecen 6 sellos
3. Verifica que `premiosPendientes` es 1 en Firestore

### Prueba 4: Cerrar y Abrir Tarjeta
1. Cierra la tarjeta (debe aparecer caja de regalo)
2. Recarga la página
3. Verifica que la caja de regalo sigue visible
4. Haz clic en la caja para abrir la tarjeta nuevamente

---

## 📞 Soporte y Troubleshooting

### La tarjeta no aparece en catalogo.html
- ✅ Verifica que el cliente esté autenticado
- ✅ Abre la consola (F12) y busca errores de Firebase
- ✅ Verifica que `window.db` y `window.firebaseUtils` estén disponibles

### Los sellos no se aplican
- ✅ Verifica que la cédula del cliente sea correcta
- ✅ Verifica que el monto de compra sea >= 5000
- ✅ Abre la consola y busca mensajes de error en `procesarVentayAplicarSellos()`

### Los datos no se actualizan en tiempo real
- ✅ Recarga la página en `catalogo.html`
- ✅ Verifica que la estructura de datos en Firestore sea correcta
- ✅ Verifica que los permisos de Firestore permitan lectura/escritura

---

## 📝 Notas Importantes

1. **Independencia por Cliente:** Cada cliente tiene su propia tarjeta de lealtad independiente
2. **Persistencia:** El estado de abierta/cerrada se guarda en localStorage
3. **Sincronización:** Los datos se sincronizan en tiempo real con Firestore
4. **Seguridad:** Asegúrate de que tus reglas de Firestore permitan que los usuarios actualicen sus propios datos

---

## 🚀 Próximos Pasos Opcionales

1. **Agregar Sistema de Canje:** Crear una función para canjear premios
2. **Notificaciones:** Enviar notificación cuando se completa una tarjeta
3. **Historial:** Mostrar historial de premios reclamados
4. **Análisis:** Crear reportes de lealtad por cliente

---

**¡Listo! Tu sistema de tarjeta de lealtad está completamente integrado.** 🎉
