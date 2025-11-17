import { db } from './firebaseConfig.js';

// --- Lógica de premios ---
function sortearPremio() {
  const premios = [
    { nombre: "Más suerte la próxima vez", prob: 50 },
    { nombre: "5% de descuento", prob: 30 },
    { nombre: "10% de descuento", prob: 15 },
    { nombre: "50% de descuento", prob: 3 },
    { nombre: "Difusor de 5 ml", prob: 2 }
  ];

  const total = premios.reduce((sum, p) => sum + p.prob, 0);
  let rand = Math.random() * total;

  for (const premio of premios) {
    if (rand < premio.prob) {
      return premio.nombre;
    }
    rand -= premio.prob;
  }
  return premios[premios.length - 1].nombre;
}

// --- Firebase: registrar premio ---
async function registrarPremio(cedula) {
  const { doc, updateDoc, getDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js");
  
  const clienteRef = doc(collection(db, "clienteBD"), cedula.toString());
  const clienteSnap = await getDoc(clienteRef);

  if (!clienteSnap.exists()) {
    throw new Error("Cliente no registrado en Esentia");
  }

  const data = clienteSnap.data();
  if (data.yaParticipo) {
    throw new Error("Ya has girado la ruleta");
  }

  const premio = sortearPremio();

  await updateDoc(clienteRef, {
    premioObtenido: premio,
    fechaPremio: new Date(),
    yaParticipo: true
  });

  return premio;
}

// --- Interfaz visual ---
const premiosVisuales = [
  "Más suerte\nla próxima vez",
  "5% descuento",
  "10% descuento",
  "50% descuento",
  "Difusor\n5 ml"
];

const ruletaEl = document.getElementById("ruleta");

// Crear segmentos
premiosVisuales.forEach((texto, i) => {
  const segmento = document.createElement("div");
  segmento.className = `p${i + 1}`;
  segmento.innerText = texto;
  ruletaEl.appendChild(segmento);
});

let yaGiro = false;

document.getElementById("girar-btn").addEventListener("click", async () => {
  if (yaGiro) return;

  const cedula = prompt("Ingresa tu número de cédula para participar:");
  if (!cedula || isNaN(cedula) || cedula.trim() === "") {
    alert("Por favor ingresa una cédula válida.");
    return;
  }

  const cedulaNum = Number(cedula.trim());
  const btn = document.getElementById("girar-btn");
  const resultadoEl = document.getElementById("resultado");

  btn.disabled = true;
  resultadoEl.innerText = "Girando...";

  try {
    const girosExtra = 5;
    const premioTemporal = sortearPremio();
    const textoLimpio = premioTemporal
      .replace(" de descuento", "")
      .replace("Difusor de 5 ml", "Difusor\n5 ml")
      .replace("Más suerte la próxima vez", "Más suerte\nla próxima vez");

    const indexPremio = premiosVisuales.findIndex(p => 
      p === textoLimpio || 
      (p.includes("descuento") && premioTemporal.includes(p.split(" ")[0]))
    );

    const anguloPorSegmento = 360 / 5;
    const anguloFinal = 360 * girosExtra + (90 - indexPremio * anguloPorSegmento - anguloPorSegmento / 2);

    ruletaEl.style.transform = `rotate(${anguloFinal}deg)`;

    setTimeout(async () => {
      try {
        const premioReal = await registrarPremio(cedulaNum);
        resultadoEl.innerText = `¡Felicidades! Ganaste:\n${premioReal}`;
        yaGiro = true;
      } catch (error) {
        resultadoEl.innerText = `❌ ${error.message}`;
        ruletaEl.style.transform = "rotate(0deg)";
      } finally {
        btn.disabled = false;
      }
    }, 4100);

  } catch (error) {
    resultadoEl.innerText = `Error inesperado: ${error.message}`;
    btn.disabled = false;
  }
});