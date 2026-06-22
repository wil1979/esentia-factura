// ======================================
// BACKGROUND ENGINE
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

// ======================================
// COLOR
// ======================================

export function setBackgroundColor(color){

  canvas.backgroundColor = color;

  canvas.renderAll();

}

// ======================================
// IMAGE
// ======================================

export function setBackgroundImage(url){

  fabric.Image.fromURL(

    url,

    (img) => {

      img.scaleToWidth(
        canvas.width
      );

      img.scaleToHeight(
        canvas.height
      );

      canvas.setBackgroundImage(

        img,

        canvas.renderAll.bind(canvas)

      );

    }

  );

}