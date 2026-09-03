// ======================================================
// BUILD 04E — LIBRO PÚBLICO
// Desbloqueo por fecha + sincronización texto/audio
// + cambio proporcional de imágenes
// + transiciones visuales suaves
//
// BASE ESTABLE:
// BUILD 03 — Desbloqueo de capítulos por fecha
//
// NO SE MODIFICA:
// - Firebase
// - Fechas de publicación
// - Orden de capítulos
// - Sistema de capítulos disponibles
// ======================================================

import { obtenerCapitulosPublicados } from "./firebase.js";

let chapters = [];
let chapterIndex = 0;
let lineIndex = 0;
let imageIndex = 0;
let playing = false;

// ======================================================
// BUILD 04E — VARIABLES DE SINCRONIZACIÓN
// ======================================================

let syncTimes = [];
let syncReady = false;
let syncChapterIndex = -1;
let audioChapterIndex = -1;

let audioError = false;
let youtubeFallbackButton = null;

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

    prepararAudioCapitulo();

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
// BUILD 04E
// PREPARAR AUDIO DEL CAPÍTULO
// ======================================================

function prepararAudioCapitulo() {

  if (!audio) return;

  const c = chapters[chapterIndex];

  syncTimes = [];
  syncReady = false;
  syncChapterIndex = chapterIndex;
  audioChapterIndex = chapterIndex;
  audioError = false;

  playing = false;

  ocultarFallbackYouTube();

  audio.pause();

  audio.currentTime = 0;

  if (!c || !c.audio) {

    audio.removeAttribute("src");
    audio.load();

    actualizarBotonAudio();

    return;

  }

  audio.src = c.audio;

  audio.load();

  actualizarBotonAudio();

}


// ======================================================
// BUILD 04E
// CONSTRUIR SINCRONIZACIÓN
//
// Cada línea recibe una parte de la duración total
// proporcional a su longitud.
//
// Las líneas cortas no desaparecen demasiado rápido.
// ======================================================

function construirSincronizacion() {

  const c = chapters[chapterIndex];

  if (!c || !audio) {
    return;
  }

  const lineas =
    Array.isArray(c.lineas)
      ? c.lineas
      : [];

  const duration =
    Number(audio.duration);

  if (
    !lineas.length ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {

    syncTimes = [];
    syncReady = false;

    return;

  }


  const pesos =
    lineas.map(linea => {

      const texto =
        String(linea || "")
          .trim();

      // Peso mínimo para que incluso una línea
      // muy corta tenga tiempo visible.
      return Math.max(
        texto.length,
        12
      );

    });


  const pesoTotal =
    pesos.reduce(
      (total, peso) =>
        total + peso,
      0
    );


  let acumulado = 0;

  syncTimes =
    pesos.map(peso => {

      const inicio =
        acumulado;

      acumulado +=
        (peso / pesoTotal) *
        duration;

      return {
        inicio,
        fin: acumulado
      };

    });


  // Garantizamos que la última línea termine
  // exactamente con el audio.
  if (syncTimes.length) {

    syncTimes[
      syncTimes.length - 1
    ].fin = duration;

  }


  syncReady = true;

  console.log(
    "BUILD 04E — Sincronización:",
    syncTimes
  );

}


// ======================================================
// BUILD 04E
// OBTENER LÍNEA SEGÚN TIEMPO DEL AUDIO
// ======================================================

function obtenerLineaPorTiempo(currentTime) {

  if (!syncReady || !syncTimes.length) {
    return -1;
  }

  for (
    let i = 0;
    i < syncTimes.length;
    i++
  ) {

    if (
      currentTime >= syncTimes[i].inicio &&
      currentTime < syncTimes[i].fin
    ) {

      return i;

    }

  }


  // Si estamos exactamente al final,
  // mostramos la última línea.

  return syncTimes.length - 1;

}


// ======================================================
// BUILD 04E
// IMAGEN CORRESPONDIENTE A UNA LÍNEA
//
// Distribuye las imágenes a lo largo del texto.
// Si hay una sola imagen, permanece durante todo
// el capítulo.
// ======================================================

function obtenerImagenParaLinea(
  lineaActual,
  cantidadLineas,
  cantidadImagenes
) {

  if (
    !cantidadImagenes ||
    cantidadImagenes <= 0
  ) {

    return 0;

  }


  if (
    cantidadImagenes === 1 ||
    cantidadLineas <= 1
  ) {

    return 0;

  }


  const proporcion =
    lineaActual /
    Math.max(
      cantidadLineas - 1,
      1
    );


  return Math.min(
    Math.floor(
      proporcion *
      cantidadImagenes
    ),
    cantidadImagenes - 1
  );

}


// ======================================================
// BUILD 04E
// TRANSICIÓN VISUAL
// ======================================================

function aplicarTransicion(elemento, callback) {

  if (!elemento) {

    callback();

    return;

  }


  // Respeta usuarios que prefieren menos movimiento.
  const reducirMovimiento =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  if (reducirMovimiento) {

    callback();

    return;

  }


  elemento.style.transition =
    "opacity .45s ease, transform .45s ease, filter .45s ease";

  elemento.style.opacity = "0";
  elemento.style.transform =
    "translateY(8px)";
  elemento.style.filter =
    "blur(2px)";


  setTimeout(() => {

    callback();


    requestAnimationFrame(() => {

      elemento.style.opacity = "1";
      elemento.style.transform =
        "translateY(0)";
      elemento.style.filter =
        "blur(0)";

    });

  }, 180);

}


// ======================================================
// BUILD 04E
// CAMBIAR LÍNEA SIN ANIMAR CUANDO NO ES NECESARIO
// ======================================================

function actualizarLineaDesdeAudio(
  nuevaLinea,
  forzar = false
) {

  const c = chapters[chapterIndex];

  if (!c) return;

  const lineas =
    Array.isArray(c.lineas)
      ? c.lineas
      : [];


  if (
    nuevaLinea < 0 ||
    nuevaLinea >= lineas.length
  ) {

    return;

  }


  if (
    nuevaLinea === lineIndex &&
    !forzar
  ) {

    return;

  }


  const imagenes =
    Array.isArray(c.imagenes)
      ? c.imagenes
      : [];


  const anteriorLinea =
    lineIndex;


  lineIndex = nuevaLinea;


  const nuevaImagen =
    obtenerImagenParaLinea(
      lineIndex,
      lineas.length,
      imagenes.length
    );


  const cambioImagen =
    nuevaImagen !== imageIndex;


  const aplicarContenido = () => {

    $("line").textContent =
      lineas[lineIndex] || "";

    $("nextLine").textContent =
      lineas[lineIndex + 1] || "";


    if (imagenes.length) {

      imageIndex =
        nuevaImagen;

      $("sceneImage").style.backgroundImage =
        `url("${imagenes[imageIndex]}")`;

    } else {

      $("sceneImage").style.backgroundImage =
        "none";

    }


    actualizarIndicadores();

  };


  // Si solamente cambia el texto, hacemos
  // transición en el texto.

  if (!cambioImagen) {

    aplicarTransicion(
      $("line"),
      aplicarContenido
    );

  } else {

    // Para cambio de imagen y texto,
    // animamos la escena completa.

    aplicarTransicion(
      scene,
      aplicarContenido
    );

  }


  if (
    anteriorLinea !== lineIndex
  ) {

    scene.classList.remove("active");

    void scene.offsetWidth;

    scene.classList.add("active");

  }

}


// ======================================================
// BUILD 04E
// ACTUALIZAR INDICADORES
// ======================================================

function actualizarIndicadores() {

  const c =
    chapters[chapterIndex];

  if (!c) return;


  const lineas =
    Array.isArray(c.lineas)
      ? c.lineas
      : [];


  const imagenes =
    Array.isArray(c.imagenes)
      ? c.imagenes
      : [];


  $("chapterNumber").textContent =
    `CAPÍTULO ${String(c.numero).padStart(2, "0")}`;


  $("chapterTitle").textContent =
    c.titulo || "";


  $("chapterCount").textContent =
    `${String(c.numero).padStart(2, "0")} / ${TOTAL_CAPITULOS}`;


  $("progress").style.width =
    `${(Number(c.numero) / TOTAL_CAPITULOS) * 100}%`;


  $("prev").disabled =
    chapterIndex === 0 &&
    lineIndex === 0;


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


  $("dots").innerHTML =
    lineas
      .map(
        (_, i) =>
          `<i class="${i === lineIndex ? "active" : ""}"></i>`
      )
      .join("");

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
  // SEGURIDAD DE ÍNDICES
  // --------------------------------------------------

  if (lineIndex < 0) {
    lineIndex = 0;
  }

  if (
    lineIndex >= lineas.length &&
    lineas.length
  ) {

    lineIndex =
      lineas.length - 1;

  }


  imageIndex =
    obtenerImagenParaLinea(
      lineIndex,
      lineas.length,
      imagenes.length
    );


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
      `url("${imagenes[imageIndex]}")`;

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
  // ANIMACIÓN EXISTENTE
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

    render();


    // Si el audio está preparado, llevamos
    // el audio al comienzo de esta línea.

    if (
      syncReady &&
      syncTimes[lineIndex]
    ) {

      audio.currentTime =
        syncTimes[lineIndex].inicio;

    }

  } else {

    // Pasar al siguiente capítulo

    if (
      chapterIndex <
      chapters.length - 1
    ) {

      detenerAudio();

      chapterIndex++;
      lineIndex = 0;
      imageIndex = 0;

      prepararAudioCapitulo();

      render();

    } else {

      detenerAudio();

      // Llegamos al último capítulo disponible

      reader.classList.add("hidden");
      ending.classList.remove("hidden");

      return;

    }

  }

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

    render();


    if (
      syncReady &&
      syncTimes[lineIndex]
    ) {

      audio.currentTime =
        syncTimes[lineIndex].inicio;

    }

  } else if (chapterIndex > 0) {

    detenerAudio();

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

    prepararAudioCapitulo();

    render();

  }

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

  detenerAudio();

  reader.classList.add("hidden");

  ending.classList.add("hidden");

  cover.classList.remove("hidden");

}


// ======================================================
// REINICIAR
// ======================================================

function restart() {

  detenerAudio();

  ending.classList.add("hidden");

  reader.classList.remove("hidden");

  chapterIndex = 0;
  lineIndex = 0;
  imageIndex = 0;

  prepararAudioCapitulo();

  render();

}


// ======================================================
// DETENER AUDIO
// ======================================================

function detenerAudio() {

  if (!audio) return;

  audio.pause();

  audio.currentTime = 0;

  playing = false;

  actualizarBotonAudio();

}


// ======================================================
// BOTÓN DE AUDIO
// ======================================================

function actualizarBotonAudio() {

  const boton =
    $("soundBtn");

  if (!boton) return;


  const c =
    chapters[chapterIndex];


  if (!c || !c.audio) {

    boton.textContent = "·";

    boton.title =
      "Este capítulo no tiene audio disponible.";

    return;

  }


  if (audioError) {

    boton.textContent = "♪";

    boton.title =
      "El audio no está disponible. Puedes usar YouTube.";

    return;

  }


  if (playing) {

    boton.textContent = "Ⅱ";

    boton.title = "Pausar audio";

  } else {

    boton.textContent = "♪";

    boton.title = "Reproducir audio";

  }

}


// ======================================================
// BUILD 04E
// AUDIO → TEXTO
// ======================================================

function manejarTiempoAudio() {

  if (!audio) return;

  if (!syncReady) return;

  if (
    audioChapterIndex !== chapterIndex
  ) {

    return;

  }


  const nuevaLinea =
    obtenerLineaPorTiempo(
      audio.currentTime
    );


  if (
    nuevaLinea >= 0 &&
    nuevaLinea !== lineIndex
  ) {

    actualizarLineaDesdeAudio(
      nuevaLinea
    );

  }

}


// ======================================================
// AUDIO: METADATOS CARGADOS
// ======================================================

if (audio) {

  audio.addEventListener(
    "loadedmetadata",
    () => {

      if (
        audioChapterIndex !== chapterIndex
      ) {

        return;

      }

      construirSincronizacion();

    }
  );


  // ====================================================
  // AUDIO: CAMBIO DE TIEMPO
  // ====================================================

  audio.addEventListener(
    "timeupdate",
    manejarTiempoAudio
  );


  // ====================================================
  // AUDIO: PLAY
  // ====================================================

  audio.addEventListener(
    "play",
    () => {

      playing = true;

      actualizarBotonAudio();

    }
  );


  // ====================================================
  // AUDIO: PAUSE
  // ====================================================

  audio.addEventListener(
    "pause",
    () => {

      playing = false;

      actualizarBotonAudio();

    }
  );


  // ====================================================
  // AUDIO: FIN
  // ====================================================

  audio.addEventListener(
    "ended",
    () => {

      playing = false;

      const c =
        chapters[chapterIndex];

      if (c) {

        const lineas =
          Array.isArray(c.lineas)
            ? c.lineas
            : [];


        if (lineas.length) {

          actualizarLineaDesdeAudio(
            lineas.length - 1,
            true
          );

        }

      }


      actualizarBotonAudio();

    }
  );


  // ====================================================
  // AUDIO: ERROR
  // ====================================================

  audio.addEventListener(
    "error",
    () => {

      audioError = true;

      playing = false;

      actualizarBotonAudio();

      mostrarFallbackYouTube();

      console.warn(
        "BUILD 04E — No se pudo reproducir el audio."
      );

    }
  );

}


// ======================================================
// BUILD 04E
// YOUTUBE FALLBACK
//
// Si el audio falla y el capítulo tiene youtubeId,
// aparece una opción alternativa.
// ======================================================

function mostrarFallbackYouTube() {

  const c =
    chapters[chapterIndex];


  if (
    !c ||
    !c.youtubeId
  ) {

    return;

  }


  if (youtubeFallbackButton) {

    youtubeFallbackButton.style.display =
      "inline-flex";

    return;

  }


  const soundBtn =
    $("soundBtn");


  if (!soundBtn) return;


  youtubeFallbackButton =
    document.createElement("button");


  youtubeFallbackButton.type =
    "button";


  youtubeFallbackButton.textContent =
    "▶ YouTube";


  youtubeFallbackButton.title =
    "Escuchar este capítulo en YouTube";


  youtubeFallbackButton.style.marginLeft =
    "8px";


  youtubeFallbackButton.style.cursor =
    "pointer";


  youtubeFallbackButton.onclick =
    abrirYouTubeFallback;


  soundBtn.parentNode.insertBefore(
    youtubeFallbackButton,
    soundBtn.nextSibling
  );

}


// ======================================================
// OCULTAR YOUTUBE FALLBACK
// ======================================================

function ocultarFallbackYouTube() {

  if (youtubeFallbackButton) {

    youtubeFallbackButton.style.display =
      "none";

  }

}


// ======================================================
// ABRIR YOUTUBE
// ======================================================

function abrirYouTubeFallback() {

  const c =
    chapters[chapterIndex];


  if (
    !c ||
    !c.youtubeId
  ) {

    return;

  }


  const url =
    `https://www.youtube.com/watch?v=${encodeURIComponent(c.youtubeId)}`;


  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );

}


// ======================================================
// EVENTO BOTÓN AUDIO
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


  // --------------------------------------------------
  // SI EL AUDIO CAMBIÓ DE CAPÍTULO
  // --------------------------------------------------

  if (
    audioChapterIndex !== chapterIndex
  ) {

    prepararAudioCapitulo();

  }


  // --------------------------------------------------
  // PAUSAR
  // --------------------------------------------------

  if (playing) {

    audio.pause();

    playing = false;

    actualizarBotonAudio();

    return;

  }


  // --------------------------------------------------
  // CONSTRUIR SINCRONIZACIÓN SI YA TENEMOS DURACIÓN
  // --------------------------------------------------

  if (
    !syncReady &&
    Number.isFinite(audio.duration) &&
    audio.duration > 0
  ) {

    construirSincronizacion();

  }


  // --------------------------------------------------
  // REPRODUCIR
  // --------------------------------------------------

  audio.play()
    .then(() => {

      playing = true;

      audioError = false;

      actualizarBotonAudio();

      // Ocultamos fallback mientras el audio
      // local funciona correctamente.

      ocultarFallbackYouTube();

    })
    .catch(error => {

      playing = false;

      audioError = true;

      actualizarBotonAudio();

      mostrarFallbackYouTube();

      console.warn(
        "BUILD 04E — No se pudo reproducir el audio:",
        error
      );

    });

};


// ======================================================
// EVENTOS PRINCIPALES
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
// FIN BUILD 04E
// ======================================================