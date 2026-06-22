// ======================================
// SHAPE ENGINE
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

import {

  setObject,
  getObject

}

from "./object-manager.js";

const SHAPES = {

  wave1:
  "./assets/shapes/wave-1.svg",

  wave2:
  "./assets/shapes/wave-2.svg",

  blob1:
  "./assets/shapes/blob-1.svg"

};

// ======================================
// APPLY SHAPE
// ======================================

export function applyShape(type){

  const old =
  getObject("shape");

  if(old){

    canvas.remove(old);

  }

  if(type === "none") return;

  fabric.loadSVGFromURL(

    SHAPES[type],

    (objects, options) => {

      const shape =
      fabric.util.groupSVGElements(
        objects,
        options
      );

      shape.set({

        left:0,

        top:
        canvas.height - 300,

        selectable:true,

        hasControls:true,

        opacity:1

      });

      shape.scaleToWidth(
        canvas.width
      );

      canvas.add(shape);

      setObject(
        "shape",
        shape
      );

      canvas.renderAll();

    }

   );

}