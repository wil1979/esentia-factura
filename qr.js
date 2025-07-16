function abrirModal() {
  document.getElementById("modal").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}
function descargarPDF() {
  const hoja = document.getElementById("hoja");

  const options = {
    margin: 0,
    filename: 'qr_sheet.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, logging: false },
    jsPDF: { unit: 'cm', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(options).from(hoja).save();
}

function generarQRs() {
  const anchoQR = parseFloat(document.getElementById("anchoQR").value);
  const altoQR = parseFloat(document.getElementById("altoQR").value);
  const hoja = document.getElementById("hoja");

  // Limpiar contenido previo
  hoja.innerHTML = "";

  // Margen entre QRs (en cm)
  const margenCorte = 0.2;

  // Tamaño efectivo de la hoja (menos padding)
  const anchoHoja = 21.59 - 2; // 1cm de padding cada lado
  const altoHoja = 27.94 - 2;

  // Calcular cuántos QRs caben
  const qrPorFila = Math.floor(anchoHoja / (anchoQR + margenCorte));
  const filas = Math.floor(altoHoja / (altoQR + margenCorte));
  const totalQRs = qrPorFila * filas;

  // Establecer tamaño del contenedor QR
  hoja.style.setProperty('--ancho-qr', `${anchoQR}cm`);
  hoja.style.setProperty('--alto-qr', `${altoQR}cm`);

  // URL base del QR dinámico
  const urlBaseQR = " https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://wil1979.github.io/esentia-factura/catalogo.html";

  // Crear los QRs
  for (let i = 0; i < totalQRs; i++) {
    const div = document.createElement("div");
    div.className = "qr";

    const img = document.createElement("img");
    img.src = urlBaseQR;
    img.alt = "QR";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";

    div.appendChild(img);
    hoja.appendChild(div);
  }

  alert(`Se generarán ${totalQRs} QRs de ${anchoQR}x${altoQR} cm`);
  cerrarModal();
}