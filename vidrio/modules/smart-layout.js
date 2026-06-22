// ======================================
// SMART LAYOUT
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

import {

  getObject

}

from "./object-manager.js";

// ======================================
// APPLY SMART LAYOUT
// ======================================

export function applySmartLayout(){

  const product =
  getObject("product");

  const title =
  getObject("title");

  const description =
  getObject("description");

  const shape =
  getObject("shape");

  if(product){

    product.set({

      left:
      canvas.width / 2,

      top:
      canvas.height / 2 - 150,

      scaleX:0.7,
      scaleY:0.7

    });

  }

  if(title){

    title.set({

      left:60,

      top:
      canvas.height - 260,

      fontSize:52

    });

  }

  if(description){

    description.set({

      left:80,

      top:
      canvas.height - 170

    });

  }

  if(shape){

    shape.set({

      top:
      canvas.height - 250,

      opacity:0.95

    });

  }

  canvas.renderAll();

}