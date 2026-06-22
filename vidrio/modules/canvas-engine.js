// modules/canvas-engine.js

export const canvas =
new fabric.Canvas("canvas", {
  preserveObjectStacking:true
});

export function setCanvasSize(type){

  let width = 1080;
  let height = 1920;

  if(type === "post"){
    width = 1080;
    height = 1080;
  }

  if(type === "portrait"){
    width = 1080;
    height = 1350;
  }

  canvas.setWidth(width / 2);
  canvas.setHeight(height / 2);

  canvas.renderAll();
}