// ======================================
// SCENE MANAGER
// ======================================

import {
  canvas
} from "./canvas-engine.js";

import {
  setObject,
  getObject
} from "./object-manager.js";

// ======================================
// SAVE
// ======================================

export function saveScene(){

  const scene = {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    background: canvas.backgroundColor,
    objects: []
  };

  canvas.getObjects().forEach(obj => {
    scene.objects.push({
      type: obj.type,
      left: obj.left,
      top: obj.top,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      angle: obj.angle,
      opacity: obj.opacity,
      text: obj.text || null,
      fill: obj.fill || null,
      fontSize: obj.fontSize || null,
      fontFamily: obj.fontFamily || null,
      backgroundColor: obj.backgroundColor || null,
      stroke: obj.stroke || null,
      strokeWidth: obj.strokeWidth || null,
      shadow: obj.shadow ? {
        color: obj.shadow.color,
        blur: obj.shadow.blur,
        offsetX: obj.shadow.offsetX,
        offsetY: obj.shadow.offsetY
      } : null
    });
  });

  localStorage.setItem("esentiaScene", JSON.stringify(scene));
  console.log("ESCENA GUARDADA");
  alert("Escena guardada correctamente");
}

// ======================================
// LOAD
// ======================================

export function loadScene(){

  const saved = localStorage.getItem("esentiaScene");
  if(!saved){
    alert("No hay escena guardada");
    return;
  }

  const scene = JSON.parse(saved);
  console.log("ESCENA CARGADA", scene);

  // Restaurar tamaño
  canvas.setWidth(scene.canvasWidth);
  canvas.setHeight(scene.canvasHeight);
  canvas.backgroundColor = scene.background;

  // Limpiar objetos actuales
  canvas.clear();
  canvas.backgroundColor = scene.background;

  // Restaurar objetos
  scene.objects.forEach(objData => {
    let obj;

    if(objData.type === "image"){
      // Para imágenes necesitaríamos la URL original
      // Por ahora solo restauramos propiedades básicas
      return;
    }
    else if(objData.type === "textbox" || objData.type === "text"){
      obj = new fabric.Textbox(objData.text || "", {
        left: objData.left,
        top: objData.top,
        scaleX: objData.scaleX,
        scaleY: objData.scaleY,
        angle: objData.angle,
        opacity: objData.opacity,
        fill: objData.fill,
        fontSize: objData.fontSize,
        fontFamily: objData.fontFamily,
        backgroundColor: objData.backgroundColor,
        stroke: objData.stroke,
        strokeWidth: objData.strokeWidth,
        textAlign: "center",
        editable: true,
        selectable: true
      });

      if(objData.shadow){
        obj.set({
          shadow: new fabric.Shadow(objData.shadow)
        });
      }
    }

    if(obj){
      canvas.add(obj);
      // Registrar en object-manager
      if(objData.text && objData.text.includes("₡")){
        setObject("price", obj);
      } else if(objData.fontSize > 40){
        setObject("title", obj);
      } else if(objData.fontSize < 40){
        setObject("description", obj);
      }
    }
  });

  canvas.renderAll();
  alert("Escena cargada correctamente");
}
