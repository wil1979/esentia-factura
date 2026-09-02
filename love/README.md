# W & E · 19 años — BOOK 01

## Qué contiene
- `index.html`: experiencia pública tipo libro cinematográfico.
- `admin.html`: pantalla inicial de preparación.
- `js/data.js`: 3 capítulos reales/provisionales.
- `js/app.js`: navegación, animaciones y lector.
- `css/style.css`: diseño responsive.

## Cómo probarlo
Abrir `index.html` desde un servidor local (recomendado) o subir toda la carpeta a un hosting estático.

## Importante
Los fondos fotográficos son provisionales y externos. Los capítulos 1–3 usan el contenido trabajado hasta ahora. El capítulo 3 se mantiene deliberadamente como versión de trabajo porque la historia aún se está construyendo por partes.

## Logo / tatuaje
La portada está preparada para mostrar `assets/logo-we.png` centrado, como símbolo del amor infinito que representa el tatuaje de ambos.

## BUILD 02
Conectar:
1. Firestore → `capitulos`.
2. Panel admin real → crear/editar/eliminar/publicar.
3. URLs de imágenes y audio.
4. Firebase Storage para archivos.
5. Configuración de portada y fecha de aniversario.
6. Seguridad real con Firebase Authentication.

No se reutiliza la contraseña del antiguo admin como mecanismo de seguridad: una contraseña escrita dentro del HTML no protege realmente un panel web.
