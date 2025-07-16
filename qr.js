function abrirModal() {
  document.getElementById("modal").style.display = "block";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
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

  // Crear los QRs
  for (let i = 0; i < totalQRs; i++) {
    const div = document.createElement("div");
    div.className = "qr";
    div.textContent = `QR ${i + 1}`;
    hoja.appendChild(div);
  }

  alert(`Se generarán ${totalQRs} QRs de ${anchoQR}x${altoQR} cm`);
  cerrarModal();
}