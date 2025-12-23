# 📚 Ejemplos de Uso - Sistema de Tarjeta de Lealtad

## Funciones Disponibles en `clientes.html`

### 1. Calcular Sellos por Compra

```javascript
// Calcular cuántos sellos obtiene un cliente por una compra
const montoCompra = 15000;  // ₡15,000
const sellos = calcularSellospor Compra(montoCompra);
console.log(sellos);  // Output: 3 (porque 15000 / 5000 = 3)

// Ejemplos:
calcularSellospor Compra(5000);   // 1 sello
calcularSellospor Compra(10000);  // 2 sellos
calcularSellospor Compra(25000);  // 5 sellos
calcularSellospor Compra(3000);   // 0 sellos (insuficiente)
```

### 2. Aplicar Sellos a un Cliente

```javascript
// Aplicar 3 sellos a un cliente específico
const cedula = "304110055";
const sellosaAgregar = 3;
const montoCompra = 15000;

const resultado = await aplicarSellosaCliente(cedula, sellosaAgregar, montoCompra);

if (resultado) {
  console.log("✓ Sellos aplicados exitosamente");
} else {
  console.log("✗ Error al aplicar sellos");
}
```

### 3. Procesar Venta y Aplicar Sellos (Automático)

```javascript
// Esta función es llamada automáticamente en guardarCompraDesdeCarrito()
// Pero puedes usarla manualmente si necesitas:

const cedula = "304110055";
const montoTotal = 25000;

const resultado = await procesarVentayAplicarSellos(cedula, montoTotal);

if (resultado && resultado.exito) {
  console.log(`✓ ${resultado.sellosaAgregar} sellos agregados`);
  console.log(`  Monto: ₡${resultado.montoTotal}`);
}
```

### 4. Obtener Estado Actual de Lealtad

```javascript
// Ver cuántos sellos tiene un cliente actualmente
const cedula = "304110055";
const estadoLealtad = await obtenerEstadoLealtadCliente(cedula);

console.log(estadoLealtad);
// Output:
// {
//   sellos: 3,
//   objetivo: 6,
//   premiosPendientes: 1
// }

// Acceder a valores individuales:
console.log(`Sellos: ${estadoLealtad.sellos}`);
console.log(`Objetivo: ${estadoLealtad.objetivo}`);
console.log(`Premios pendientes: ${estadoLealtad.premiosPendientes}`);
```

### 5. Recalcular Sellos Manualmente

```javascript
// Útil para correcciones o ajustes administrativos
const cedula = "304110055";
const nuevaCantidad = 5;

const resultado = await recalcularSellosaCliente(cedula, nuevaCantidad);

if (resultado) {
  console.log(`✓ Sellos recalculados a ${nuevaCantidad}`);
}
```

### 6. Marcar Premio como Reclamado

```javascript
// Cuando un cliente reclama su premio
const cedula = "304110055";

const resultado = await marcarPremioComoReclamado(cedula);

if (resultado) {
  console.log("✓ Premio marcado como reclamado");
  // El campo premiosPendientes se decrementa automáticamente
}
```

---

## Funciones Disponibles en `catalogo.html`

### 1. Abrir Tarjeta de Lealtad

```javascript
// Abre la tarjeta y oculta la caja de regalo
abrirTarjetaLealtad();

// La tarjeta se mostrará con los datos actuales del cliente
```

### 2. Cerrar Tarjeta de Lealtad

```javascript
// Cierra la tarjeta y muestra la caja de regalo flotante
cerrarTarjetaLealtad();

// El estado se guarda en localStorage
```

### 3. Mostrar/Ocultar Tarjeta según Autenticación

```javascript
// Se llama automáticamente al iniciar/cerrar sesión
// Pero puedes llamarla manualmente:
mostrarTarjetaLealtad();

// Si el cliente está autenticado, muestra la tarjeta
// Si no, la oculta
```

### 4. Cargar Datos de Lealtad del Cliente

```javascript
// Carga los datos del cliente desde Firestore
await cargarDatosLealtadCliente();

// Los datos se guardan en la variable global: datosLealtadCliente
console.log(datosLealtadCliente);
```

### 5. Actualizar Visualización de Sellos

```javascript
// Actualiza la tarjeta con los datos actuales
actualizarVisualizacionLealtad();

// Esto se llama automáticamente después de cargarDatosLealtadCliente()
```

---

## Casos de Uso Prácticos

### Caso 1: Cliente Realiza una Compra

**En `clientes.html`:**
```javascript
// El usuario registra una venta de ₡20,000
// Se llama automáticamente en guardarCompraDesdeCarrito():

// 1. Se obtiene la cédula del cliente
const cedula = await obtenerCedulaPorId(clienteSeleccionadoId);

// 2. Se procesan los sellos
const resultado = await procesarVentayAplicarSellos(cedula, 20000);

// Resultado:
// - Se calculan 4 sellos (20000 / 5000 = 4)
// - Se actualizan los datos en Firestore
// - Si el cliente tenía 2 sellos, ahora tiene 6 (completa tarjeta)
// - Se incrementa premiosPendientes a 1
```

**En `catalogo.html`:**
```javascript
// Cuando el cliente abre el catálogo después de comprar:
// - La tarjeta se carga automáticamente
// - Muestra 6 sellos completados
// - Muestra "¡Completaste tu tarjeta! Reclama tu regalo"
// - Muestra "Tienes 1 premio por reclamar"
```

### Caso 2: Cliente Completa Varias Compras

**Escenario:**
- Cliente compra ₡5,000 → 1 sello (total: 1)
- Cliente compra ₡10,000 → 2 sellos (total: 3)
- Cliente compra ₡15,000 → 3 sellos (total: 6) → ¡PREMIO!
- Sellos se reinician a 0
- premiosPendientes = 1

**En Firestore:**
```javascript
{
  cedula: "304110055",
  lealtad: {
    sellos: 0,              // Se reinician después del premio
    objetivo: 6,
    premiosPendientes: 1,   // Cliente tiene 1 premio por reclamar
    ultimaActualizacion: "2025-12-19T..."
  }
}
```

### Caso 3: Cliente Reclama su Premio

**En `clientes.html` (función administrativa):**
```javascript
// El administrador marca el premio como reclamado
const cedula = "304110055";
const resultado = await marcarPremioComoReclamado(cedula);

// Resultado en Firestore:
// premiosPendientes: 0 (se decrementa automáticamente)
```

**En `catalogo.html`:**
```javascript
// Cuando el cliente abre el catálogo después:
// - Ya no ve "Tienes 1 premio por reclamar"
// - Vuelve al estado normal de la tarjeta
```

### Caso 4: Corrección Manual de Sellos

**Escenario:** El administrador necesita ajustar los sellos de un cliente

```javascript
// En la consola de clientes.html:
const cedula = "304110055";

// Opción 1: Recalcular a un valor específico
await recalcularSellosaCliente(cedula, 4);

// Opción 2: Obtener estado actual
const estado = await obtenerEstadoLealtadCliente(cedula);
console.log(estado);  // Ver estado actual

// Opción 3: Aplicar sellos adicionales
const sellosaAgregar = 2;
await aplicarSellosaCliente(cedula, sellosaAgregar, 10000);
```

---

## Integración con el Flujo Existente

### Cuando se Guarda una Compra

```javascript
// En clientes.html, función guardarCompraDesdeCarrito()

// 1. Se calcula el total de la compra
let total = 0;
carrito.forEach(item => {
  total += item.precioUnitario * item.cantidad;
});

// 2. Se aplica descuento si existe
const descuento = parseFloat(document.getElementById("descuento").value) || 0;
const totalNeto = Math.max(0, total - descuento);

// 3. Se guarda la compra en Firestore
await updateDoc(clienteDoc, actualizacion);

// 4. ✨ NUEVO: Se aplican los sellos automáticamente
const cedulaCliente = await obtenerCedulaPorId(clienteSeleccionadoId);
if (cedulaCliente) {
  const resultado = await procesarVentayAplicarSellos(cedulaCliente, totalNeto);
  if (resultado && resultado.exito) {
    console.log(`✓ ${resultado.sellosaAgregar} sellos agregados`);
  }
}
```

---

## Monitoreo y Debugging

### Ver Logs en la Consola

```javascript
// Abre la consola del navegador (F12) y verás mensajes como:

// ✓ Sellos aplicados a 304110055: {
//   sellosaAgregar: 3,
//   nuevosSellos: 5,
//   premiosPendientes: 0,
//   montoCompra: 15000
// }

// ✓ Venta procesada: 3 sello(s) agregado(s) por ₡15000
```

### Verificar Datos en Firestore

```javascript
// En Firebase Console:
// 1. Ve a Firestore Database
// 2. Abre la colección "clientes"
// 3. Selecciona un documento
// 4. Busca el campo "lealtad"
// 5. Verifica: sellos, objetivo, premiosPendientes, ultimaActualizacion
```

### Verificar Estado en localStorage

```javascript
// En la consola del navegador (catalogo.html):
console.log(localStorage.getItem('tarjetaLealtadAbierta'));
// Output: "true" o "false"

console.log(localStorage.getItem('sesionEsentia'));
// Output: JSON con datos del cliente autenticado
```

---

## Errores Comunes y Soluciones

### Error: "Cliente no encontrado"
```javascript
// Causa: La cédula no existe en Firestore
// Solución: Verifica que la cédula sea correcta
// Ejemplo incorrecto:
await procesarVentayAplicarSellos("123456789", 5000);  // Cédula incorrecta

// Ejemplo correcto:
await procesarVentayAplicarSellos("304110055", 5000);  // Cédula correcta
```

### Error: "Monto insuficiente para obtener sellos"
```javascript
// Causa: El monto es menor a 5000
// Solución: Asegúrate de que el monto sea >= 5000
// Ejemplo incorrecto:
await procesarVentayAplicarSellos(cedula, 3000);  // < 5000

// Ejemplo correcto:
await procesarVentayAplicarSellos(cedula, 5000);  // >= 5000
```

### Tarjeta no aparece en catalogo.html
```javascript
// Causa: El cliente no está autenticado
// Solución: Inicia sesión primero
// Verifica en la consola:
console.log(clienteAutenticado);  // Debe tener datos del cliente
```

---

**¡Ahora estás listo para usar el sistema de tarjeta de lealtad!** 🚀
