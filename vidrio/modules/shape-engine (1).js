// ======================================
// SHAPE ENGINE
// ======================================

import {
  canvas
} from "./canvas-engine.js";

import {
  setObject,
  getObject
} from "./object-manager.js";

const SHAPES = {
  wave1: "./assets/shapes/wave-1.svg",
  wave2: "./assets/shapes/wave-2.svg",
  blob1: "./assets/shapes/blob-1.svg"
};

// ======================================
// APPLY SHAPE
// ======================================

export function applyShape(type){

  const old = getObject("shape");
  if(old){
    canvas.remove(old);
    setObject("shape", null);
  }

  if(type === "none"){
    canvas.renderAll();
    return;
  }

  const url = SHAPES[type];
  if(!url) return;

  fabric.loadSVGFromURL(
    url,
    (objects, options) => {
      const shape = fabric.util.groupSVGElements(objects, options);

      shape.set({
        left: 0,
        top: canvas.height - 300,
        selectable: true,
        hasControls: true,
        opacity: 1,
        originX: "left",
        originY: "top"
      });

      shape.scaleToWidth(canvas.width);

      canvas.add(shape);
      setObject("shape", shape);
      canvas.renderAll();

      // Aplicar valores actuales de los sliders
      applyShapeControls();
    }
  );
}

// ======================================
// APPLY SHAPE CONTROLS
// ======================================

function applyShapeControls(){
  const shape = getObject("shape");
  if(!shape) return;

  const shapeX = document.getElementById("shapeX");
  const shapeY = document.getElementById("shapeY");
  const shapeScale = document.getElementById("shapeScale");
  const shapeRotate = document.getElementById("shapeRotate");
  const shapeOpacity = document.getElementById("shapeOpacity");
  const shapeColor = document.getElementById("shapeColor");

  if(shapeX) shape.left = parseInt(shapeX.value);
  if(shapeY) shape.top = parseInt(shapeY.value);
  if(shapeScale){
    const scale = parseInt(shapeScale.value) / 100;
    shape.scaleX = scale;
    shape.scaleY = scale;
  }
  if(shapeRotate) shape.angle = parseInt(shapeRotate.value);
  if(shapeOpacity) shape.opacity = parseInt(shapeOpacity.value) / 100;

  if(shapeColor){
    const color = shapeColor.value;
    if(shape._objects){
      shape._objects.forEach(o => {
        if(o.setFill) o.setFill(color);
        if(o.fill !== undefined) o.set({ fill: color });
      });
    } else {
      shape.set({ fill: color });
    }
  }

  canvas.renderAll();
}
