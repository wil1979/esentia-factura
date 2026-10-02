// ======================================================
// BUILD 04E.3 — LIBRO PÚBLICO
// Desbloqueo por fecha + sincronización texto/audio
// + cambio proporcional de imágenes
// + transiciones visuales suaves
// + INTRO CINEMATOGRÁFICA (saltabile)
// + FLUJO LINEAL (cap 29, 30 y 31 desde Firebase)
// + Loading state + debounce + accesibilidad básica
// ======================================================
import { obtenerCapitulosPublicados } from "./firebase.js";

// ======================================================
// ESTADO GLOBAL
// ======================================================
let chapters = [];
let allChapters = [];
let chapterIndex = 0;
let lineIndex = 0;
let imageIndex = 0;
let playing = false;
let syncTimes = [];
let syncReady = false;
let syncChapterIndex = -1;
let audioChapterIndex = -1;
let audioError = false;
let youtubeFallbackButton = null;
let TOTAL_CAPITULOS = 31;
let navigating = false;          // 🔒 debounce navegación
let introSkipped = false;        // 🎬 control de intro

const MODO_PRUEBA = false;

// ======================================================
// HELPERS DOM
// ======================================================
const $ = id => document.getElementById(id);
const cover  = $("cover");
const reader = $("reader");
const ending = $("ending");
const scene  = $("scene");
const audio  = $("audio");

// ======================================================
// FECHA ACTUAL
// ======================================================
function obtenerFechaHoy() {
    const hoy   = new Date();
    const year  = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, "0");
    const day   = String(hoy.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// ======================================================
// NORMALIZAR CAPÍTULO (trim de strings)
// ======================================================
function normalizarCapitulo(cap) {
    if (!cap) return cap;
    if (typeof cap.titulo === "string")           cap.titulo           = cap.titulo.trim();
    if (typeof cap.fechaPublicacion === "string") cap.fechaPublicacion = cap.fechaPublicacion.trim();
    if (typeof cap.youtubeId === "string")        cap.youtubeId        = cap.youtubeId.trim();
    if (Array.isArray(cap.lineas)) {
        cap.lineas = cap.lineas.map(l => (typeof l === "string" ? l.trim() : l));
    }
    if (!cap.youtubeId) cap.youtubeId = null;
    return cap;
}

// ======================================================
// LOADING STATE
// ======================================================
function mostrarLoading(mensaje = "Preparando tu historia…") {
    let loader = document.getElementById("appLoader");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "appLoader";
        loader.style.cssText = `
            position: fixed; inset: 0; z-index: 9999;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 18px;
            background: rgba(10, 8, 6, 0.85);
            backdrop-filter: blur(8px);
            color: #d6aa91;
            font: 500 14px 'Inter', sans-serif;
            letter-spacing: 0.1em;
            transition: opacity 0.5s ease;
        `;
        loader.innerHTML = `
            <div style="width:40px;height:40px;border:2px solid rgba(214,170,145,0.25);
                        border-top-color:#d6aa91;border-radius:50%;
                        animation: spin 1s linear infinite;"></div>
            <div class="loader-msg">${mensaje}</div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector(".loader-msg").textContent = mensaje;
        loader.style.display = "flex";
        loader.style.opacity = "1";
    }
}

function ocultarLoading() {
    const loader = document.getElementById("appLoader");
    if (!loader) return;
    loader.style.opacity = "0";
    setTimeout(() => { loader.style.display = "none"; }, 500);
}

// ======================================================
// CARGAR CAPÍTULOS
// ======================================================
async function cargarCapitulos() {
    mostrarLoading("Cargando capítulos…");
    try {
        const todosLosCapitulos = await obtenerCapitulosPublicados();

        if (!Array.isArray(todosLosCapitulos)) {
            throw new Error("Respuesta inválida de Firebase");
        }

        allChapters = todosLosCapitulos
            .map(normalizarCapitulo)
            .sort((a, b) => Number(a.numero) - Number(b.numero));

        const hoy = obtenerFechaHoy();

        if (MODO_PRUEBA) {
            chapters = allChapters
                .filter(cap => cap.publicado === true)
                .sort((a, b) => Number(a.numero) - Number(b.numero));
        } else {
            chapters = allChapters
                .filter(cap => {
                    if (cap.publicado !== true) return false;
                    if (!cap.fechaPublicacion)  return false;
                    return cap.fechaPublicacion <= hoy;
                })
                .sort((a, b) => Number(a.numero) - Number(b.numero));
        }

        // ======================================================
        // AUTOMATIZACIÓN DE RUTAS DE ARCHIVOS
        // ======================================================
        const aplicarRutas = cap => {
            const numStr = String(cap.numero);
            if (!cap.audio || cap.audio.trim() === "") {
                cap.audio = `assets/audios/cap${numStr}.m4a`;
            }
            if (!cap.imagenes || cap.imagenes.length === 0) {
                cap.imagenes = [`assets/imagenes/cap${numStr}.JPG`];
            }
            return cap;
        };
        chapters    = chapters.map(aplicarRutas);
        allChapters = allChapters.map(aplicarRutas);

        if (!chapters.length) {
            ocultarLoading();
            mostrarHistoriaAunNoDisponible();
            return;
        }

        // 🔒 Protección contra Math.max(...[])
        const maxNum = chapters.length
            ? Math.max(...chapters.map(c => Number(c.numero)))
            : 31;
        TOTAL_CAPITULOS = Math.max(maxNum, 31);

        chapterIndex = 0;
        lineIndex    = 0;
        imageIndex   = 0;
        prepararAudioCapitulo();
        render();
        actualizarBotonAudio();
        ocultarLoading();
    } catch (error) {
        console.error("Error cargando capítulos:", error);
        ocultarLoading();
        mostrarErrorConexion(error);
    }
}

// ======================================================
// MENSAJE "MUY PRONTO"
// ======================================================
function mostrarHistoriaAunNoDisponible() {
    $("chapterNumber").textContent = "MUY PRONTO";
    $("chapterTitle").textContent  = "Nuestra historia está a punto de comenzar";
    $("chapterCount").textContent  = `00 / ${TOTAL_CAPITULOS}`;
    $("progress").style.width      = "0%";
    $("line").textContent          = "Hay historias que merecen esperar el momento indicado para comenzar.";
    $("nextLine").textContent      = "El primer capítulo estará disponible el 6 de septiembre.";
    $("sceneImage").style.backgroundImage = "none";
    $("prev").disabled = true;
    $("next").disabled = true;
    $("dots").innerHTML = "";
}

// ======================================================
// MENSAJE ERROR DE CONEXIÓN
// ======================================================
function mostrarErrorConexion(error) {
    $("chapterNumber").textContent = "SIN CONEXIÓN";
    $("chapterTitle").textContent  = "No pudimos cargar la historia";
    $("chapterCount").textContent  = `00 / ${TOTAL_CAPITULOS}`;
    $("progress").style.width      = "0%";
    $("line").textContent          = "Parece que hubo un problema al conectarnos. Revisa tu conexión e intenta de nuevo.";
    $("nextLine").textContent      = error?.message || "Error desconocido.";
    $("sceneImage").style.backgroundImage = "none";
    $("prev").disabled = true;
    $("next").disabled = true;
    $("dots").innerHTML = "";
}

// ======================================================
// PREPARAR AUDIO
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

    try {
        audio.pause();
        audio.currentTime = 0;
    } catch (_) {}

    if (!c || !c.audio) {
        audio.removeAttribute("src");
        audio.load();
        actualizarBotonAudio();
        mostrarIndicadorSinAudio();
        return;
    }

    audio.src = c.audio;
    audio.load();
    actualizarBotonAudio();
    ocultarIndicadorSinAudio();
}

// ======================================================
// INDICADOR SIN AUDIO
// ======================================================
function mostrarIndicadorSinAudio() {
    let indicador = document.getElementById("sinAudioIndicator");
    if (!indicador) {
        indicador = document.createElement("div");
        indicador.id = "sinAudioIndicator";
        indicador.style.cssText = `position: absolute; top: 80px; right: 30px; background: rgba(214, 170, 145, 0.15); border: 1px solid rgba(214, 170, 145, 0.4); color: #d6aa91; padding: 8px 16px; border-radius: 20px; font: 500 12px 'Inter', sans-serif; letter-spacing: 0.08em; backdrop-filter: blur(8px); z-index: 100; opacity: 0; transform: translateY(-10px); transition: opacity 0.4s ease, transform 0.4s ease; pointer-events: none;`;
        indicador.innerHTML = "📖 Lectura sin audio · Usa ← →";
        document.body.appendChild(indicador);
    }
    requestAnimationFrame(() => {
        indicador.style.opacity = "1";
        indicador.style.transform = "translateY(0)";
    });
    setTimeout(() => {
        indicador.style.opacity = "0";
        indicador.style.transform = "translateY(-10px)";
    }, 4000);
}

function ocultarIndicadorSinAudio() {
    const indicador = document.getElementById("sinAudioIndicator");
    if (indicador) {
        indicador.style.opacity = "0";
        indicador.style.transform = "translateY(-10px)";
    }
}

// ======================================================
// CONSTRUIR SINCRONIZACIÓN
// ======================================================
function construirSincronizacion() {
    const c = chapters[chapterIndex];
    if (!c || !audio) return;
    const lineas = Array.isArray(c.lineas) ? c.lineas : [];
    let duration = Number(audio.duration);

    if (!lineas.length || !Number.isFinite(duration) || duration <= 0) {
        syncTimes = [];
        syncReady = false;
        return;
    }

    const duracionMinima = lineas.length * 0.5;
    if (duration < duracionMinima) duration = duracionMinima;

    const pesos = lineas.map(linea => {
        const texto = String(linea || "").trim();
        return Math.max(texto.length, 12);
    });
    const pesoTotal = pesos.reduce((total, peso) => total + peso, 0);

    let acumulado = 0;
    syncTimes = pesos.map(peso => {
        const inicio = acumulado;
        acumulado += (peso / pesoTotal) * duration;
        return { inicio, fin: acumulado };
    });
    if (syncTimes.length) {
        syncTimes[syncTimes.length - 1].fin = duration;
    }
    syncReady = true;
    console.log("BUILD 04E.3 — Sincronización:", syncTimes);
}

// ======================================================
// OBTENER LÍNEA SEGÚN AUDIO
// ======================================================
function obtenerLineaPorTiempo(currentTime) {
    if (!syncReady || !syncTimes.length) return -1;
    for (let i = 0; i < syncTimes.length; i++) {
        if (currentTime >= syncTimes[i].inicio && currentTime < syncTimes[i].fin) {
            return i;
        }
    }
    return syncTimes.length - 1;
}

// ======================================================
// IMAGEN PROPORCIONAL
// ======================================================
function obtenerImagenParaLinea(lineaActual, cantidadLineas, cantidadImagenes) {
    if (!cantidadImagenes || cantidadImagenes <= 0) return 0;
    if (cantidadImagenes === 1 || cantidadLineas <= 1) return 0;
    const proporcion = lineaActual / Math.max(cantidadLineas - 1, 1);
    return Math.min(Math.floor(proporcion * cantidadImagenes), cantidadImagenes - 1);
}

// ======================================================
// TRANSICIÓN VISUAL
// ======================================================
function aplicarTransicion(elemento, callback) {
    if (!elemento) { callback(); return; }
    const reducirMovimiento = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducirMovimiento) { callback(); return; }

    elemento.style.transition = "opacity .45s ease, transform .45s ease, filter .45s ease";
    elemento.style.opacity = "0";
    elemento.style.transform = "translateY(8px)";
    elemento.style.filter = "blur(2px)";
    setTimeout(() => {
        callback();
        requestAnimationFrame(() => {
            elemento.style.opacity = "1";
            elemento.style.transform = "translateY(0)";
            elemento.style.filter = "blur(0)";
        });
    }, 180);
}

// ======================================================
// ACTUALIZAR LÍNEA DESDE AUDIO
// ======================================================
function actualizarLineaDesdeAudio(nuevaLinea, forzar = false) {
    const c = chapters[chapterIndex];
    if (!c) return;
    const lineas = Array.isArray(c.lineas) ? c.lineas : [];
    if (nuevaLinea < 0 || nuevaLinea >= lineas.length) return;
    if (nuevaLinea === lineIndex && !forzar) return;

    const imagenes = Array.isArray(c.imagenes) ? c.imagenes : [];
    lineIndex = nuevaLinea;
    const nuevaImagen = obtenerImagenParaLinea(lineIndex, lineas.length, imagenes.length);
    const cambioImagen = nuevaImagen !== imageIndex;

    const aplicarContenido = () => {
        const lineEl = $("line");
        lineEl.textContent = lineas[lineIndex] || "";
        lineEl.setAttribute("aria-live", "polite");
        lineEl.setAttribute("aria-atomic", "true");

        $("nextLine").textContent = lineas[lineIndex + 1] || "";
        if (imagenes.length) {
            imageIndex = nuevaImagen;
            $("sceneImage").style.backgroundImage = `url("${imagenes[imageIndex]}")`;
        } else {
            $("sceneImage").style.backgroundImage = "none";
        }
        actualizarIndicadores();
    };

    if (!cambioImagen) {
        aplicarTransicion($("line"), aplicarContenido);
    } else {
        aplicarTransicion(scene, aplicarContenido);
    }

    scene.classList.remove("active");
    void scene.offsetWidth;
    scene.classList.add("active");
}

// ======================================================
// ACTUALIZAR INDICADORES
// ======================================================
function actualizarIndicadores() {
    const c = chapters[chapterIndex];
    if (!c) return;
    const lineas = Array.isArray(c.lineas) ? c.lineas : [];

    $("chapterNumber").textContent = `CAPÍTULO ${String(c.numero).padStart(2, "0")}`;
    $("chapterTitle").textContent  = c.titulo || "";
    $("chapterCount").textContent  = `${String(c.numero).padStart(2, "0")} / ${TOTAL_CAPITULOS}`;
    $("progress").style.width      = `${(Number(c.numero) / TOTAL_CAPITULOS) * 100}%`;

    $("prev").disabled = chapterIndex === 0 && lineIndex === 0;

    const esUltimaLinea    = lineIndex === lineas.length - 1;
    const esUltimoCapitulo = chapterIndex === chapters.length - 1;
    $("next").disabled = false;
    $("next").textContent = (esUltimaLinea && esUltimoCapitulo) ? "✓" : "→";

    $("dots").innerHTML = lineas
        .map((_, i) => `<i class="${i === lineIndex ? "active" : ""}"></i>`)
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
    const lineas   = Array.isArray(c.lineas)   ? c.lineas   : [];
    const imagenes = Array.isArray(c.imagenes) ? c.imagenes : [];

    if (lineIndex < 0) lineIndex = 0;
    if (lineIndex >= lineas.length && lineas.length) lineIndex = lineas.length - 1;
    imageIndex = obtenerImagenParaLinea(lineIndex, lineas.length, imagenes.length);

    $("chapterNumber").textContent = `CAPÍTULO ${String(c.numero).padStart(2, "0")}`;
    $("chapterTitle").textContent  = c.titulo || "";
    $("chapterCount").textContent  = `${String(c.numero).padStart(2, "0")} / ${TOTAL_CAPITULOS}`;
    $("progress").style.width      = `${(Number(c.numero) / TOTAL_CAPITULOS) * 100}%`;

    const lineEl = $("line");
    lineEl.textContent = lineas[lineIndex] || "";
    lineEl.setAttribute("aria-live", "polite");
    lineEl.setAttribute("aria-atomic", "true");

    $("nextLine").textContent = lineas[lineIndex + 1] || "";

    if (imagenes.length) {
        $("sceneImage").style.backgroundImage = `url("${imagenes[imageIndex]}")`;
    } else {
        $("sceneImage").style.backgroundImage = "none";
    }

    $("prev").disabled = chapterIndex === 0 && lineIndex === 0;

    const esUltimaLinea    = lineIndex === lineas.length - 1;
    const esUltimoCapitulo = chapterIndex === chapters.length - 1;
    $("next").disabled = false;
    $("next").textContent = (esUltimaLinea && esUltimoCapitulo) ? "✓" : "→";

    $("dots").innerHTML = lineas
        .map((_, i) => `<i class="${i === lineIndex ? "active" : ""}"></i>`)
        .join("");

    scene.classList.remove("active");
    void scene.offsetWidth;
    scene.classList.add("active");
}

// ======================================================
// SIGUIENTE (con debounce) — FLUJO LINEAL
// ======================================================
function next() {
    if (navigating) return;
    navigating = true;

    const c = chapters[chapterIndex];
    if (!c) { navigating = false; return; }
    const lineas = Array.isArray(c.lineas) ? c.lineas : [];

    if (lineIndex < lineas.length - 1) {
        lineIndex++;
        render();
        if (syncReady && syncTimes[lineIndex]) {
            audio.currentTime = syncTimes[lineIndex].inicio;
        }
    } else {
        // AVANZAR AL SIGUIENTE CAPÍTULO
        if (chapterIndex < chapters.length - 1) {
            detenerAudio();
            chapterIndex++;
            lineIndex  = 0;
            imageIndex = 0;
            prepararAudioCapitulo();
            render();
        } else {
            detenerAudio();
            reader.classList.add("hidden");
            ending.classList.remove("hidden");
        }
    }

    setTimeout(() => { navigating = false; }, 220);
}

// ======================================================
// ANTERIOR (con debounce)
// ======================================================
function prev() {
    if (navigating) return;
    navigating = true;

    const c = chapters[chapterIndex];
    if (!c) { navigating = false; return; }
    const lineas = Array.isArray(c.lineas) ? c.lineas : [];

    if (lineIndex > 0) {
        lineIndex--;
        render();
        if (c.audio && syncReady && syncTimes[lineIndex]) {
            try { audio.currentTime = syncTimes[lineIndex].inicio; } catch (_) {}
        }
    } else if (chapterIndex > 0) {
        detenerAudio();
        chapterIndex--;
        const previousChapter = chapters[chapterIndex];
        const previousLines   = Array.isArray(previousChapter.lineas) ? previousChapter.lineas : [];
        lineIndex  = Math.max(previousLines.length - 1, 0);
        imageIndex = 0;
        prepararAudioCapitulo();
        render();
    }

    setTimeout(() => { navigating = false; }, 220);
}

// ======================================================
// INTRO (saltabile + respeta prefers-reduced-motion)
// ======================================================
async function mostrarIntro() {
    const intro = $("storyIntro");
    if (!intro) {
        await cargarCapitulos();
        return;
    }

    const reduceMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
        intro.classList.add("hidden");
        reader.classList.remove("hidden");
        await cargarCapitulos();
        return;
    }

    const countdown       = $("introCountdown");
    const countdownNumber = $("countdownNumber");
    const introStart      = $("introStart");

    reader.classList.add("hidden");
    ending.classList.add("hidden");
    cover.classList.add("hidden");
    intro.classList.remove("hidden");
    intro.classList.remove("fade-out");

    if (countdown)       countdown.classList.add("hidden");
    if (introStart)      introStart.classList.add("hidden");
    if (countdownNumber) countdownNumber.textContent = "3";

    introSkipped = false;
    const saltarIntro = () => { introSkipped = true; };
    const eventosSalto = ["click", "touchstart", "keydown"];
    eventosSalto.forEach(ev => intro.addEventListener(ev, saltarIntro, { once: false }));

    const esperarSaltabile = async (ms) => {
        const inicio = Date.now();
        while (Date.now() - inicio < ms) {
            if (introSkipped) return false;
            await esperar(80);
        }
        return true;
    };

    let continuar = await esperarSaltabile(2800);
    if (!continuar) return finalizarIntro(intro, eventosSalto, saltarIntro);

    if (countdown)       countdown.classList.remove("hidden");
    if (countdownNumber) countdownNumber.textContent = "3";

    continuar = await esperarSaltabile(1000);
    if (!continuar) return finalizarIntro(intro, eventosSalto, saltarIntro);

    if (countdownNumber) {
        countdownNumber.textContent = "2";
        reiniciarAnimacion(countdownNumber, "countdownPulse .9s ease both");
    }
    continuar = await esperarSaltabile(1000);
    if (!continuar) return finalizarIntro(intro, eventosSalto, saltarIntro);

    if (countdownNumber) {
        countdownNumber.textContent = "1";
        reiniciarAnimacion(countdownNumber, "countdownPulse .9s ease both");
    }
    continuar = await esperarSaltabile(1000);
    if (!continuar) return finalizarIntro(intro, eventosSalto, saltarIntro);

    if (countdown)  countdown.classList.add("hidden");
    if (introStart) introStart.classList.remove("hidden");

    continuar = await esperarSaltabile(1800);
    if (!continuar) return finalizarIntro(intro, eventosSalto, saltarIntro);

    await finalizarIntro(intro, eventosSalto, saltarIntro);
}

async function finalizarIntro(intro, eventosSalto, saltarIntro) {
    eventosSalto.forEach(ev => intro.removeEventListener(ev, saltarIntro));

    intro.classList.add("fade-out");
    await esperar(1400);
    intro.classList.add("hidden");
    intro.classList.remove("fade-out");
    reader.classList.remove("hidden");
    await cargarCapitulos();
    window.scrollTo(0, 0);
}

// ======================================================
// UTILIDADES
// ======================================================
function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function reiniciarAnimacion(elemento, animacion) {
    elemento.style.animation = "none";
    void elemento.offsetWidth;
    elemento.style.animation = animacion;
}
function back() {
    detenerAudio();
    reader.classList.add("hidden");
    ending.classList.add("hidden");
    $("storyIntro")?.classList.add("hidden");
    cover.classList.remove("hidden");
}
function restart() {
    detenerAudio();
    ending.classList.add("hidden");
    reader.classList.remove("hidden");
    chapterIndex = 0;
    lineIndex    = 0;
    imageIndex   = 0;
    prepararAudioCapitulo();
    render();
}
function detenerAudio() {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    playing = false;
    actualizarBotonAudio();
}

// ======================================================
// BOTÓN AUDIO
// ======================================================
function actualizarBotonAudio() {
    const boton = $("soundBtn");
    if (!boton) return;
    const c = chapters[chapterIndex];

    if (!c || !c.audio) {
        boton.textContent = "📖";
        boton.title = "Este capítulo no tiene audio. Usa los botones ← → para navegar.";
        boton.style.opacity = "0.5";
        return;
    }
    boton.style.opacity = "0.85";
    if (audioError) {
        boton.textContent = "♪";
        boton.title = "El audio no está disponible. Puedes usar YouTube.";
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

function manejarTiempoAudio() {
    if (!audio) return;
    if (!syncReady || !syncTimes.length) return;
    if (audioChapterIndex !== chapterIndex) return;
    if (!playing) return;
    const nuevaLinea = obtenerLineaPorTiempo(audio.currentTime);
    if (nuevaLinea >= 0 && nuevaLinea !== lineIndex) {
        actualizarLineaDesdeAudio(nuevaLinea);
    }
}

// ======================================================
// EVENTOS AUDIO
// ======================================================
if (audio) {
    audio.addEventListener("loadedmetadata", () => {
        if (audioChapterIndex !== chapterIndex) return;
        construirSincronizacion();
    });
    audio.addEventListener("timeupdate", manejarTiempoAudio);
    audio.addEventListener("play", () => {
        playing = true;
        actualizarBotonAudio();
    });
    audio.addEventListener("pause", () => {
        playing = false;
        actualizarBotonAudio();
    });
    audio.addEventListener("ended", () => {
        playing = false;
        const c = chapters[chapterIndex];
        if (c) {
            const lineas = Array.isArray(c.lineas) ? c.lineas : [];
            if (lineas.length) actualizarLineaDesdeAudio(lineas.length - 1, true);
        }
        actualizarBotonAudio();
    });
    audio.addEventListener("error", () => {
        audioError = true;
        playing = false;
        actualizarBotonAudio();
        mostrarFallbackYouTube();
        console.warn("BUILD 04E.3 — No se pudo reproducir el audio.");
    });
}

// ======================================================
// YOUTUBE FALLBACK
// ======================================================
function mostrarFallbackYouTube() {
    const c = chapters[chapterIndex];
    if (!c || !c.youtubeId) return;

    if (youtubeFallbackButton && youtubeFallbackButton.parentNode) {
        youtubeFallbackButton.parentNode.removeChild(youtubeFallbackButton);
    }

    const soundBtn = $("soundBtn");
    if (!soundBtn) return;

    youtubeFallbackButton = document.createElement("button");
    youtubeFallbackButton.type = "button";
    youtubeFallbackButton.textContent = "▶ YouTube";
    youtubeFallbackButton.title = "Escuchar este capítulo en YouTube";
    youtubeFallbackButton.setAttribute("aria-label", "Abrir audio en YouTube");
    youtubeFallbackButton.style.marginLeft = "8px";
    youtubeFallbackButton.style.cursor = "pointer";
    youtubeFallbackButton.onclick = abrirYouTubeFallback;
    soundBtn.parentNode.insertBefore(youtubeFallbackButton, soundBtn.nextSibling);
}

function ocultarFallbackYouTube() {
    if (youtubeFallbackButton && youtubeFallbackButton.parentNode) {
        youtubeFallbackButton.parentNode.removeChild(youtubeFallbackButton);
        youtubeFallbackButton = null;
    }
}

function abrirYouTubeFallback() {
    const c = chapters[chapterIndex];
    if (!c || !c.youtubeId) return;
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(c.youtubeId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
}

const soundBtn = $("soundBtn");
if (soundBtn) {
    soundBtn.onclick = () => {
        const c = chapters[chapterIndex];
        if (!c || !c.audio) {
            soundBtn.textContent = "·";
            soundBtn.title = "Este capítulo no tiene audio disponible.";
            return;
        }
        if (audioChapterIndex !== chapterIndex) {
            prepararAudioCapitulo();
        }
        if (playing) {
            audio.pause();
            playing = false;
            actualizarBotonAudio();
            return;
        }
        if (!syncReady && Number.isFinite(audio.duration) && audio.duration > 0) {
            construirSincronizacion();
        }
        audio.play()
            .then(() => {
                playing = true;
                audioError = false;
                actualizarBotonAudio();
                ocultarFallbackYouTube();
            })
            .catch(error => {
                playing = false;
                audioError = true;
                actualizarBotonAudio();
                mostrarFallbackYouTube();
                console.warn("BUILD 04E.3 — No se pudo reproducir el audio:", error);
            });
    };
}

// ======================================================
// EVENTOS PRINCIPALES
// ======================================================
const openBookBtn  = $("openBook");
const nextBtn      = $("next");
const prevBtn      = $("prev");
const backCoverBtn = $("backCover");
const restartBtn   = $("restart");

if (openBookBtn)  openBookBtn.onclick  = mostrarIntro;
if (nextBtn)      nextBtn.onclick      = next;
if (prevBtn)      prevBtn.onclick      = prev;
if (backCoverBtn) backCoverBtn.onclick = back;
if (restartBtn)   restartBtn.onclick   = restart;

if (nextBtn) nextBtn.setAttribute("aria-label", "Siguiente");
if (prevBtn) prevBtn.setAttribute("aria-label", "Anterior");

// ======================================================
// ÍNDICE DE CAPÍTULOS (todos vienen de Firebase)
// ======================================================
const indexModal = $("indexModal");
const indexList  = $("indexList");

function abrirIndice() {
    renderizarIndice();
    indexModal.classList.remove("hidden");
}
function cerrarIndice() {
    indexModal.classList.add("hidden");
}

function renderizarIndice() {
    if (!indexList) return;
    indexList.innerHTML = "";
    const hoy = obtenerFechaHoy();

    for (let i = 1; i <= TOTAL_CAPITULOS; i++) {
        const cap = allChapters.find(c => Number(c.numero) === i);
        const item = document.createElement("div");
        item.className = "index-item";

        if (!cap) {
            item.classList.add("locked");
            item.innerHTML = `<span class="num">${String(i).padStart(2, "0")}</span><span class="status">🔒 Próximamente</span>`;
        } else {
            const estaDesbloqueado = MODO_PRUEBA || (cap.fechaPublicacion && cap.fechaPublicacion <= hoy);
            if (estaDesbloqueado) {
                item.classList.add("unlocked");
                item.innerHTML = `<span class="num">${String(i).padStart(2, "0")}</span><span class="status">Disponible</span>`;
                item.onclick = () => { irACapitulo(i); cerrarIndice(); };
                item.style.cursor = "pointer";
            } else {
                item.classList.add("locked");
                const fechaFormateada = cap.fechaPublicacion ? formatearFechaCorta(cap.fechaPublicacion) : "Próximamente";
                item.innerHTML = `<span class="num">${String(i).padStart(2, "0")}</span><span class="status">🔒 ${fechaFormateada}</span>`;
            }
        }
        indexList.appendChild(item);
    }
}

function formatearFechaCorta(fecha) {
    if (!fecha) return "";
    const partes = fecha.split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}` : fecha;
}

function irACapitulo(numero) {
    const targetIndex = chapters.findIndex(c => Number(c.numero) === numero);
    if (targetIndex !== -1) {
        detenerAudio();
        chapterIndex = targetIndex;
        lineIndex    = 0;
        imageIndex   = 0;
        prepararAudioCapitulo();
        render();
        window.scrollTo(0, 0);
    }
}

// ======================================================
// EVENTOS ÍNDICE
// ======================================================
const indexBtn   = $("indexBtn");
const indexClose = $("indexClose");
if (indexBtn)   indexBtn.onclick   = abrirIndice;
if (indexClose) indexClose.onclick = cerrarIndice;
if (indexModal) {
    indexModal.onclick = (e) => {
        if (e.target === indexModal) cerrarIndice();
    };
}

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && indexModal && !indexModal.classList.contains("hidden")) {
        cerrarIndice();
    }
});

// ======================================================
// TECLADO
// ======================================================
document.addEventListener("keydown", e => {
    if (!reader || reader.classList.contains("hidden")) return;
    if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (!$("next").disabled) next();
    }
    if (e.key === "ArrowLeft") {
        if (!$("prev").disabled) prev();
    }
    if (e.key === "Escape") {
        back();
    }
});

// ======================================================
// FIN BUILD 04E.3
// ======================================================