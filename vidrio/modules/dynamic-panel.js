// ======================================
// DYNAMIC PANEL
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

// ======================================
// PANEL
// ======================================

const panel =
document.getElementById(
  "dynamicPanel"
);

// ======================================
// INIT
// ======================================

export function initDynamicPanel(){

  canvas.on(

    "selection:created",

    updatePanel

  );

  canvas.on(

    "selection:updated",

    updatePanel

  );

}

// ======================================
// UPDATE PANEL
// ======================================

function updatePanel(){

  const obj =
  canvas.getActiveObject();

  if(!obj) return;

  panel.innerHTML = "";

  // ====================================
  // SCALE
  // ====================================

  createRange(

    "Scale",

    obj.scaleX * 100,

    10,
    300,

    (value) => {

      const scale =
      value / 100;

      obj.scaleX = scale;
      obj.scaleY = scale;

      canvas.renderAll();

    }

  );

  // ====================================
  // ROTATE
  // ====================================

  createRange(

    "Rotate",

    obj.angle || 0,

    -180,
    180,

    (value) => {

      obj.angle =
      parseInt(value);

      canvas.renderAll();

    }

  );

  // ====================================
  // OPACITY
  // ====================================

  createRange(

    "Opacity",

    (obj.opacity || 1) * 100,

    0,
    100,

    (value) => {

      obj.opacity =
      value / 100;

      canvas.renderAll();

    }

  );

  // ====================================
  // TEXT OPTIONS
  // ====================================

  if(

    obj.type === "textbox" ||

    obj.type === "text"

  ){

    createColor(

      "Color",

      obj.fill || "#ffffff",

      (value) => {

        obj.set({

          fill:value

        });

        canvas.renderAll();

      }

    );

    createRange(

      "Font Size",

      obj.fontSize || 40,

      10,
      150,

      (value) => {

        obj.set({

          fontSize:
          parseInt(value)

        });

        canvas.renderAll();

      }

    );

  }

}

// ======================================
// RANGE
// ======================================

function createRange(

  label,
  value,
  min,
  max,
  callback

){

  const wrapper =
  document.createElement("div");

  const text =
  document.createElement("label");

  text.textContent = label;

  const input =
  document.createElement("input");

  input.type = "range";

  input.min = min;

  input.max = max;

  input.value = value;

  input.addEventListener(

    "input",

    (e) => {

      callback(e.target.value);

    }

  );

  wrapper.appendChild(text);

  wrapper.appendChild(input);

  panel.appendChild(wrapper);

}

// ======================================
// COLOR
// ======================================

function createColor(

  label,
  value,
  callback

){

  const wrapper =
  document.createElement("div");

  const text =
  document.createElement("label");

  text.textContent = label;

  const input =
  document.createElement("input");

  input.type = "color";

  input.value = value;

  input.addEventListener(

    "input",

    (e) => {

      callback(e.target.value);

    }

  );

  wrapper.appendChild(text);

  wrapper.appendChild(input);

  panel.appendChild(wrapper);

}