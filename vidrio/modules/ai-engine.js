// ======================================
// AI ENGINE
// ======================================

import {

  setBackgroundColor

}

from "./background-engine.js";

// ======================================
// APPLY AI STYLE
// ======================================

export function applyAIStyle(product){

  if(!product) return;

  const name =
  (product.nombre || "")
  .toLowerCase();

  // ====================================
  // CHERRY
  // ====================================

  if(
    name.includes("cherry") ||
    name.includes("cereza")
  ){

    setBackgroundColor(
      "#b31239"
    );

  }

  // ====================================
  // MENTA
  // ====================================

  else if(
    name.includes("menta")
  ){

    setBackgroundColor(
      "#2f9e66"
    );

  }

  // ====================================
  // VAINILLA
  // ====================================

  else if(
    name.includes("vainilla")
  ){

    setBackgroundColor(
      "#9c7b52"
    );

  }

  // ====================================
  // COCO
  // ====================================

  else if(
    name.includes("coco")
  ){

    setBackgroundColor(
      "#d9c7a1"
    );

  }

  // ====================================
  // DEFAULT
  // ====================================

  else{

    setBackgroundColor(
      "#444"
    );

  }

}