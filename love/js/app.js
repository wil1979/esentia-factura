
// BUILD 03 — Desbloqueo de capítulos por fecha

import { obtenerCapitulosPublicados } from "./firebase.js";

let chapters = [];
let chapterIndex = 0;
let lineIndex = 0;
let imageIndex = 0;
let playing = false;

const TOTAL_CAPITULOS = 31;

const $ = id => document.getElementById(id);

const cover = $("cover");
const reader = $("reader");
const ending = $("ending");
const scene = $("scene");
const audio = $("audio");


// ======================================================
// FECHA ACTUAL
// ======================================================

function obtenerFechaHoy() {

  const hoy = new Date();

  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// ======================================================
// CARGAR CAPÍTULOS
// ======================================================

async function cargarCapitulos() {

  try {

    const todosLosCapitulos =
      await obtenerCapitulosPublicados();

    const hoy = obtenerFechaHoy();

    /*
      BUILD 03

      Solo dejamos disponibles los capítulos cuya
      fecha de publicación ya llegó.

      Ejemplo:

      hoy = 2026-09-07

      Cap. 1 → 2026-09-06 → disponible
      Cap. 2 → 2026-09-07 → disponible
      Cap. 3 → 2026-09-08 → bloqueado
    */

    chapters =
      todosLosCapitulos
        .filter(cap => {

          if (cap.publicado !== true) {
            return false;
          }

          if (!cap.fechaPublicacion) {
            return false;
          }

          return cap.fechaPublicacion <= hoy;

        })
        .sort(
          (a, b) =>
            Number(a.numero) - Number(b.numero)
        );


    console.log(
      "BUILD 03 — Fecha actual:",
      hoy
    );

    console.log(
      "BUILD 03 — Capítulos publicados:",
      todosLosCapitulos
    );

    console.log(
      "BUILD 03 — Capítulos disponibles:",
      chapters
    );


    // --------------------------------------------------
    // NO HAY CAPÍTULOS DISPONIBLES
    // --------------------------------------------------

    if (!chapters.length) {

      mostrarHistoriaAunNoDisponible();

      return;

    }


    // --------------------------------------------------
    // INICIALIZAR
    // --------------------------------------------------

    chapterIndex = 0;
    lineIndex = 0;
    imageIndex = 0;

    render();

  } catch (error) {

    console.error(
      "BUILD 03 — Error cargando capítulos:",
      error
    );

  }

}


// ======================================================
// MENSAJE ANTES DEL INICIO
// ======================================================

function mostrarHistoriaAunNoDisponible() {

  $("chapterNumber").textContent =
    "MUY PRONTO";

  $("chapterTitle").textContent =
    "Nuestra historia está a punto de comenzar";

  $("chapterCount").textContent =
    `00 / ${TOTAL_CAPITULOS}`;

  $("progress").style.width =
    "0%";

  $("line").textContent =
    "Hay historias que merecen esperar el momento indicado para comenzar.";

  $("nextLine").textContent =
    "El primer capítulo estará disponible el 6 de septiembre.";

  $("sceneImage").style.backgroundImage =
    "none";

  $("prev").disabled = true;
  $("next").disabled = true;

  $("dots").innerHTML = "";

}


// ======================================================
// RENDER
// ======================================================

function render() {

  const c = chapters[chapterIndex];

  if (!c) {

    reader.classList.add("hidden");
    ending.classList.remove("hidden");

    return;

  }


  const lineas =
    Array.isArray(c.lineas)
      ? c.lineas
      : [];

  const imagenes =
    Array.isArray(c.imagenes)
      ? c.imagenes
      : [];


  // --------------------------------------------------
  // INFORMACIÓN DEL CAPÍTULO
  // --------------------------------------------------

  $("chapterNumber").textContent =
    `CAPÍTULO ${String(c.numero).padStart(2, "0")}`;

  $("chapterTitle").textContent =
    c.titulo || "";


  // --------------------------------------------------
  // CONTADOR
  // --------------------------------------------------

  $("chapterCount").textContent =
    `${String(c.numero).padStart(2, "0")} / ${TOTAL_CAPITULOS}`;


  // --------------------------------------------------
  // PROGRESO
  // --------------------------------------------------

  $("progress").style.width =
    `${(Number(c.numero) / TOTAL_CAPITULOS) * 100}%`;


  // --------------------------------------------------
  // TEXTO
  // --------------------------------------------------

  $("line").textContent =
    lineas[lineIndex] || "";

  $("nextLine").textContent =
    lineas[lineIndex + 1] || "";


  // --------------------------------------------------
  // IMAGEN
  // --------------------------------------------------

  if (imagenes.length) {

    $("sceneImage").style.backgroundImage =
      `url("${imagenes[imageIndex % imagenes.length]}")`;

  } else {

    $("sceneImage").style.backgroundImage =
      "none";

  }


  // --------------------------------------------------
  // BOTÓN ANTERIOR
  // --------------------------------------------------

  $("prev").disabled =
    chapterIndex === 0 &&
    lineIndex === 0;


  // --------------------------------------------------
  // BOTÓN SIGUIENTE
  // --------------------------------------------------

  const esUltimaLinea =
    lineIndex === lineas.length - 1;

  const esUltimoCapitulo =
    chapterIndex === chapters.length - 1;


  $("next").disabled = false;

  $("next").textContent =
    (
      esUltimaLinea &&
      esUltimoCapitulo
    )
      ? "✓"
      : "→";


  // --------------------------------------------------
  // PUNTOS
  // --------------------------------------------------

  $("dots").innerHTML =
    lineas
      .map(
        (_, i) =>
          `<i class="${i === lineIndex ? "active" : ""}"></i>`
      )
      .join("");


  // --------------------------------------------------
  // ANIMACIÓN
  // --------------------------------------------------

  scene.classList.remove("active");

  void scene.offsetWidth;

  scene.classList.add("active");

}


// ======================================================
// SIGUIENTE
// ======================================================

function next() {

  const c = chapters[chapterIndex];

  if (!c) return;


  const lineas =
    Array.isArray(c.lineas)
      ? c.lineas
      : [];


  if (lineIndex < lineas.length - 1) {

    lineIndex++;
    imageIndex++;

  } else {

    // Pasar al siguiente capítulo

    if (
      chapterIndex <
      chapters.length - 1
    ) {

      chapterIndex++;
      lineIndex = 0;
      imageIndex = 0;

    } else {

      // Llegamos al último capítulo disponible

      reader.classList.add("hidden");
      ending.classList.remove("hidden");

      return;

    }

  }


  render();

}


// ======================================================
// ANTERIOR
// ======================================================

function prev() {

  const c = chapters[chapterIndex];

  if (!c) return;


  const lineas =
    Array.isArray(c.lineas)
      ? c.lineas
      : [];


  if (lineIndex > 0) {

    lineIndex--;
    imageIndex--;

  } else if (chapterIndex > 0) {

    chapterIndex--;

    const previousChapter =
      chapters[chapterIndex];

    const previousLines =
      Array.isArray(previousChapter.lineas)
        ? previousChapter.lineas
        : [];


    lineIndex =
      Math.max(
        previousLines.length - 1,
        0
      );

    imageIndex = 0;

  }


  render();

}


// ======================================================
// ABRIR LIBRO
// ======================================================

async function openBook() {

  cover.classList.add("hidden");

  reader.classList.remove("hidden");

  await cargarCapitulos();

  window.scrollTo(0, 0);

}


// ======================================================
// VOLVER A PORTADA
// ======================================================

function back() {

  reader.classList.add("hidden");

  ending.classList.add("hidden");

  cover.classList.remove("hidden");

}


// ======================================================
// REINICIAR
// ======================================================

function restart() {

  ending.classList.add("hidden");

  reader.classList.remove("hidden");

  chapterIndex = 0;
  lineIndex = 0;
  imageIndex = 0;

  render();

}


// ======================================================
// EVENTOS
// ======================================================

$("openBook").onclick =
  openBook;


$("next").onclick =
  next;


$("prev").onclick =
  prev;


$("backCover").onclick =
  back;


$("restart").onclick =
  restart;


// ======================================================
// TECLADO
// ======================================================

document.addEventListener(
  "keydown",
  e => {

    if (
      reader.classList.contains("hidden")
    ) {
      return;
    }


    if (
      e.key === "ArrowRight" ||
      e.key === " "
    ) {

      e.preventDefault();

      if (!$("next").disabled) {
        next();
      }

    }


    if (e.key === "ArrowLeft") {

      if (!$("prev").disabled) {
        prev();
      }

    }


    if (e.key === "Escape") {

      back();

    }

  }
);


// ======================================================
// AUDIO
// ======================================================

$("soundBtn").onclick = () => {

  const c =
    chapters[chapterIndex];


  if (!c || !c.audio) {

    $("soundBtn").textContent = "·";

    $("soundBtn").title =
      "Este capítulo no tiene audio disponible.";

    return;

  }


  if (playing) {

    audio.pause();

    playing = false;

    $("soundBtn").textContent = "♪";

  } else {

    audio.src =
      c.audio;


    audio.play()
      .then(() => {

        playing = true;

        $("soundBtn").textContent =
          "Ⅱ";

      })
      .catch(error => {

        console.warn(
          "No se pudo reproducir el audio:",
          error
        );

      });

  }

};

