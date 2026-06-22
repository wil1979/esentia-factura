// ======================================
// EXPORTER
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

// ======================================
// PNG
// ======================================

export function exportPNG(){

  const dataURL =
  canvas.toDataURL({

    format:"png",

    quality:1,

    multiplier:4

  });

  const link =
  document.createElement("a");

  link.href =
  dataURL;

  link.download =
  "esentia-promo.png";

  link.click();

}