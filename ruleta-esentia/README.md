# Ruleta de Premios - Esentia

## Requisitos
- Cliente debe estar registrado en la colección `clienteBD` en Firestore.
- El documento debe usar la **cédula como ID**.
- El cliente debe haber comprado ≥ ₡10,000 (verificación manual o externa).

## Configuración
1. Reemplaza `firebaseConfig.js` con tu configuración real de Firebase.
2. Asegúrate de que los campos en Firestore incluyan:
   - `cedula` (number, como ID del documento)
   - `nombre` (string)
   - `telefono` (number)
   - (opcional) `yaParticipo`, `premioObtenido`, `fechaPremio`

## Personalización
- Ajusta probabilidades en `script.js`.
- Modifica colores en `style.css`.
- Cambia textos de premios en `premiosVisuales`.

## Seguridad
Configura reglas de Firestore para evitar accesos no autorizados.