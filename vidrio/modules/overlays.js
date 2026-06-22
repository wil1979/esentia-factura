// ======================================
// OVERLAYS
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

let currentOverlay = null;

// ======================================
// URLS
// ======================================

const OVERLAYS = {

  Gotas:
  "/assets/overlays/drops.png",

  Smoke:
  "assets/overlays/smoke.png",

  Glossy:
  "assets/overlays/glossy.png",

  bokeh:
  "assets/overlays/bokeh.png"

};

// ======================================
// APPLY
// ======================================

export function applyOverlay(type){

  // REMOVE OLD

  if(currentOverlay){

    canvas.remove(currentOverlay);

  }

  if(type === "none") return;

  const url =
  OVERLAYS[type];

  if(!url) return;

  fabric.Image.fromURL(

    url,

    (img) => {

      currentOverlay = img;

      img.set({

        left:0,
        top:0,

        selectable:false,
        evented:false,

        opacity:0.4

      });

      img.scaleToWidth(
        canvas.width
      );

      img.scaleToHeight(
        canvas.height
      );

      canvas.add(img);

      canvas.sendToBack(img);

    },

    {
      crossOrigin:"anonymous"
    }

  );

}