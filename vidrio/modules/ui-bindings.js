// ======================================
// UI BINDINGS - COMPLETO
// ======================================

import {
  canvas
} from "./canvas-engine.js";

import {
  getObject,
  setObject,
  removeObject,
  toggleVisibility
} from "./object-manager.js";

import {
  applyShape
} from "./shape-engine.js";

import {
  applySmartLayout
} from "./smart-layout.js";

import {
  setBackgroundColor,
  setBackgroundImage
} from "./background-engine.js";

import {
  applyOverlay
} from "./overlays.js";

import {
  saveScene,
  loadScene
} from "./scene-manager.js";

import {
  exportPNG
} from "./exporter.js";

import {
  applyAIStyle
} from "./ai-engine.js";

// ======================================
// INIT UI
// ======================================

export function initUI(){

  bindShapeUI();
  bindProductControls();
  bindLogoControls();
  bindTextControls();
  bindDescriptionControls();
  bindPriceControls();
  bindBackgroundControls();
  bindOverlayControls();
  bindEffectsControls();
  bindExtraImageControls();
  bindLayerControls();
  bindSceneControls();
  bindExportControls();
  bindSmartAI();
  bindAIButton();

}

// ======================================
// UTILS
// ======================================

function bindRange(id, objName, prop, callback){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener("input", () => {
    const obj = getObject(objName);
    if(!obj) return;
    const val = parseFloat(el.value);
    if(prop === "scale"){
      const scale = val / 100;
      obj.scaleX = scale;
      obj.scaleY = scale;
    } else if(prop === "opacity"){
      obj.opacity = val / 100;
    } else if(prop === "angle"){
      obj.angle = val;
    } else if(prop === "left"){
      obj.left = val;
    } else if(prop === "top"){
      obj.top = val;
    } else if(callback){
      callback(obj, val);
    }
    canvas.renderAll();
  });
}

function bindColor(id, objName, prop){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener("input", () => {
    const obj = getObject(objName);
    if(!obj) return;
    if(prop === "fill"){
      obj.set({ fill: el.value });
    } else if(prop === "backgroundColor"){
      obj.set({ backgroundColor: el.value });
    } else if(prop === "stroke"){
      obj.set({ stroke: el.value });
    }
    canvas.renderAll();
  });
}

// ======================================
// SHAPE UI
// ======================================

function bindShapeUI(){

  const shapeSelect = document.getElementById("shapeSelect");
  if(shapeSelect){
    shapeSelect.addEventListener("change", () => {
      applyShape(shapeSelect.value);
    });
  }

  // Shape controls
  bindRange("shapeX", "shape", "left");
  bindRange("shapeY", "shape", "top");
  bindRange("shapeScale", "shape", "scale");
  bindRange("shapeRotate", "shape", "angle");
  bindRange("shapeOpacity", "shape", "opacity");

  const shapeColor = document.getElementById("shapeColor");
  if(shapeColor){
    shapeColor.addEventListener("input", () => {
      const obj = getObject("shape");
      if(!obj) return;
      const color = shapeColor.value;
      // Para grupos SVG, iterar sobre los objetos internos
      if(obj._objects && obj._objects.length > 0){
        obj._objects.forEach(o => {
          if(o.set) o.set({ fill: color });
        });
      } else {
        obj.set({ fill: color });
      }
      canvas.renderAll();
    });
  }

}

// ======================================
// PRODUCT CONTROLS
// ======================================

function bindProductControls(){

  bindRange("productX", "product", "left");
  bindRange("productY", "product", "top");
  bindRange("productScale", "product", "scale");
  bindRange("productRotate", "product", "angle");
  bindRange("productOpacity", "product", "opacity");

}

// ======================================
// LOGO CONTROLS
// ======================================

function bindLogoControls(){

  const logoUpload = document.getElementById("logoUpload");
  if(logoUpload){
    logoUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          const old = getObject("logo");
          if(old) canvas.remove(old);

          img.set({
            left: canvas.width / 2,
            top: 80,
            originX: "center",
            originY: "center",
            scaleX: 0.25,
            scaleY: 0.25,
            selectable: true,
            hasControls: true,
            hasBorders: true
          });

          canvas.add(img);
          setObject("logo", img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    });
  }

  bindRange("logoX", "logo", "left");
  bindRange("logoY", "logo", "top");
  bindRange("logoScale", "logo", "scale");
  bindRange("logoRotate", "logo", "angle");
  bindRange("logoOpacity", "logo", "opacity");

}

// ======================================
// TEXT CONTROLS (TITULO)
// ======================================

function bindTextControls(){

  const textSize = document.getElementById("textSize");
  if(textSize){
    textSize.addEventListener("input", () => {
      const obj = getObject("title");
      if(!obj) return;
      obj.set({ fontSize: parseInt(textSize.value) });
      canvas.renderAll();
    });
  }

  const textColor = document.getElementById("textColor");
  if(textColor){
    textColor.addEventListener("input", () => {
      const obj = getObject("title");
      if(!obj) return;
      obj.set({ fill: textColor.value });
      canvas.renderAll();
    });
  }

  bindRange("textOpacity", "title", "opacity");

  const textShadow = document.getElementById("textShadow");
  if(textShadow){
    textShadow.addEventListener("input", () => {
      const obj = getObject("title");
      if(!obj) return;
      const val = parseInt(textShadow.value);
      if(val > 0){
        obj.set({
          shadow: new fabric.Shadow({
            color: "rgba(0,0,0,0.5)",
            blur: val,
            offsetX: 2,
            offsetY: 2
          })
        });
      } else {
        obj.set({ shadow: null });
      }
      canvas.renderAll();
    });
  }

  const textStroke = document.getElementById("textStroke");
  if(textStroke){
    textStroke.addEventListener("input", () => {
      const obj = getObject("title");
      if(!obj) return;
      const val = parseInt(textStroke.value);
      obj.set({
        stroke: val > 0 ? "#000000" : null,
        strokeWidth: val
      });
      canvas.renderAll();
    });
  }

  const fontFamily = document.getElementById("fontFamily");
  if(fontFamily){
    fontFamily.addEventListener("change", () => {
      const obj = getObject("title");
      if(!obj) return;
      obj.set({ fontFamily: fontFamily.value });
      canvas.renderAll();
    });
  }

}

// ======================================
// DESCRIPTION CONTROLS
// ======================================

function bindDescriptionControls(){

  const toggleDescription = document.getElementById("toggleDescription");
  if(toggleDescription){
    toggleDescription.addEventListener("change", () => {
      const obj = getObject("description");
      if(!obj) return;
      obj.visible = toggleDescription.checked;
      canvas.renderAll();
    });
  }

  const manualDescription = document.getElementById("manualDescription");
  if(manualDescription){
    manualDescription.addEventListener("input", () => {
      const obj = getObject("description");
      if(!obj) return;
      obj.set({ text: manualDescription.value });
      canvas.renderAll();
    });
  }

  const descriptionSize = document.getElementById("descriptionSize");
  if(descriptionSize){
    descriptionSize.addEventListener("input", () => {
      const obj = getObject("description");
      if(!obj) return;
      obj.set({ fontSize: parseInt(descriptionSize.value) });
      canvas.renderAll();
    });
  }

  bindRange("descriptionOpacity", "description", "opacity");

  const descriptionColor = document.getElementById("descriptionColor");
  if(descriptionColor){
    descriptionColor.addEventListener("input", () => {
      const obj = getObject("description");
      if(!obj) return;
      obj.set({ fill: descriptionColor.value });
      canvas.renderAll();
    });
  }

}

// ======================================
// PRICE CONTROLS
// ======================================

function bindPriceControls(){

  const togglePrice = document.getElementById("togglePrice");
  if(togglePrice){
    togglePrice.addEventListener("change", () => {
      const obj = getObject("price");
      if(!obj) return;
      obj.visible = togglePrice.checked;
      canvas.renderAll();
    });
  }

  const manualPrice = document.getElementById("manualPrice");
  if(manualPrice){
    manualPrice.addEventListener("input", () => {
      const obj = getObject("price");
      if(!obj) return;
      obj.set({ text: manualPrice.value });
      canvas.renderAll();
    });
  }

}

// ======================================
// BACKGROUND CONTROLS
// ======================================

function bindBackgroundControls(){

  const bgColor = document.getElementById("bgColor");
  if(bgColor){
    bgColor.addEventListener("input", () => {
      setBackgroundColor(bgColor.value);
    });
  }

  const bgUpload = document.getElementById("bgUpload");
  if(bgUpload){
    bgUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target.result);
      };
      reader.readAsDataURL(file);
    });
  }

}

// ======================================
// OVERLAY CONTROLS
// ======================================

function bindOverlayControls(){

  const overlaySelect = document.getElementById("overlaySelect");
  if(overlaySelect){
    overlaySelect.addEventListener("change", () => {
      applyOverlay(overlaySelect.value);
    });
  }

}

// ======================================
// EFFECTS CONTROLS
// ======================================

function bindEffectsControls(){

  // Glow effect
  const effectGlow = document.getElementById("effectGlow");
  if(effectGlow){
    effectGlow.addEventListener("input", () => {
      const obj = getObject("product");
      if(!obj) return;
      const val = parseInt(effectGlow.value);
      if(val > 0){
        obj.set({
          shadow: new fabric.Shadow({
            color: obj.fill || "#ffffff",
            blur: val * 2,
            offsetX: 0,
            offsetY: 0
          })
        });
      } else {
        obj.set({ shadow: null });
      }
      canvas.renderAll();
    });
  }

  // Blur effect
  const effectBlur = document.getElementById("effectBlur");
  if(effectBlur){
    effectBlur.addEventListener("input", () => {
      const obj = getObject("product");
      if(!obj) return;
      const val = parseInt(effectBlur.value);
      if(val > 0){
        obj.filters = [new fabric.Image.filters.Blur({ blur: val / 10 })];
        obj.applyFilters();
      } else {
        obj.filters = [];
        obj.applyFilters();
      }
      canvas.renderAll();
    });
  }

  // Shadow effect
  const effectShadow = document.getElementById("effectShadow");
  if(effectShadow){
    effectShadow.addEventListener("input", () => {
      const obj = getObject("product");
      if(!obj) return;
      const val = parseInt(effectShadow.value);
      if(val > 0){
        obj.set({
          shadow: new fabric.Shadow({
            color: "rgba(0,0,0,0.6)",
            blur: val,
            offsetX: val / 3,
            offsetY: val / 3
          })
        });
      } else {
        obj.set({ shadow: null });
      }
      canvas.renderAll();
    });
  }

  // Glass opacity
  const glassOpacity = document.getElementById("glassOpacity");
  if(glassOpacity){
    glassOpacity.addEventListener("input", () => {
      // Aplica a todos los objetos de texto para efecto glass
      ["title", "description", "price"].forEach(name => {
        const obj = getObject(name);
        if(obj){
          obj.set({ opacity: glassOpacity.value / 100 });
        }
      });
      canvas.renderAll();
    });
  }

  // Apply Gradient
  const applyGradient = document.getElementById("applyGradient");
  if(applyGradient){
    applyGradient.addEventListener("click", () => {
      const obj = getObject("title");
      if(!obj) return;
      const gradient = new fabric.Gradient({
        type: "linear",
        gradientUnits: "percentage",
        coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
        colorStops: [
          { offset: 0, color: "#ff6b6b" },
          { offset: 0.5, color: "#4ecdc4" },
          { offset: 1, color: "#45b7d1" }
        ]
      });
      obj.set({ fill: gradient });
      canvas.renderAll();
    });
  }

  // Apply Glassmorphism
  const applyGlass = document.getElementById("applyGlass");
  if(applyGlass){
    applyGlass.addEventListener("click", () => {
      ["title", "description", "price"].forEach(name => {
        const obj = getObject(name);
        if(!obj) return;
        obj.set({
          backgroundColor: "rgba(255,255,255,0.1)",
          shadow: new fabric.Shadow({
            color: "rgba(255,255,255,0.2)",
            blur: 10,
            offsetX: 0,
            offsetY: 0
          })
        });
      });
      canvas.renderAll();
    });
  }

}

// ======================================
// EXTRA IMAGE CONTROLS
// ======================================

function bindExtraImageControls(){

  const extraImageUpload = document.getElementById("extraImageUpload");
  if(extraImageUpload){
    extraImageUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          const old = getObject("extra");
          if(old) canvas.remove(old);

          img.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: "center",
            originY: "center",
            scaleX: 1,
            scaleY: 1,
            selectable: true,
            hasControls: true,
            hasBorders: true
          });

          canvas.add(img);
          setObject("extra", img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    });
  }

  bindRange("extraX", "extra", "left");
  bindRange("extraY", "extra", "top");
  bindRange("extraScale", "extra", "scale");
  bindRange("extraRotate", "extra", "angle");

}

// ======================================
// LAYER CONTROLS
// ======================================

function bindLayerControls(){

  const layerMap = {
    selectProduct: "product",
    selectTitle: "title",
    selectDescription: "description",
    selectPrice: "price",
    selectLogo: "logo"
  };

  Object.entries(layerMap).forEach(([btnId, objName]) => {
    const btn = document.getElementById(btnId);
    if(btn){
      btn.addEventListener("click", () => {
        const obj = getObject(objName);
        if(obj){
          canvas.setActiveObject(obj);
          canvas.renderAll();
        }
      });
    }
  });

  const bringFront = document.getElementById("bringFront");
  if(bringFront){
    bringFront.addEventListener("click", () => {
      const obj = canvas.getActiveObject();
      if(obj){
        canvas.bringToFront(obj);
        canvas.renderAll();
      }
    });
  }

  const sendBack = document.getElementById("sendBack");
  if(sendBack){
    sendBack.addEventListener("click", () => {
      const obj = canvas.getActiveObject();
      if(obj){
        canvas.sendToBack(obj);
        // Mantener background al fondo
        const bg = canvas.backgroundImage;
        if(bg) canvas.sendToBack(bg);
        canvas.renderAll();
      }
    });
  }

}

// ======================================
// SCENE CONTROLS
// ======================================

function bindSceneControls(){

  const saveSceneBtn = document.getElementById("saveSceneBtn");
  if(saveSceneBtn){
    saveSceneBtn.addEventListener("click", saveScene);
  }

  const loadSceneBtn = document.getElementById("loadSceneBtn");
  if(loadSceneBtn){
    loadSceneBtn.addEventListener("click", loadScene);
  }

}

// ======================================
// EXPORT CONTROLS
// ======================================

function bindExportControls(){

  const downloadBtn = document.getElementById("downloadBtn");
  if(downloadBtn){
    downloadBtn.addEventListener("click", exportPNG);
  }

  const exportVideo = document.getElementById("exportVideo");
  if(exportVideo){
    exportVideo.addEventListener("click", () => {
      alert("Exportación de video requiere configuración adicional de CCapture.js");
    });
  }

}

// ======================================
// SMART AI
// ======================================

function bindSmartAI(){

  const applySmartAI = document.getElementById("applySmartAI");
  if(!applySmartAI) return;
  applySmartAI.addEventListener("click", applySmartLayout);

}

// ======================================
// AI STYLE BUTTON
// ======================================

function bindAIButton(){

  // El botón applyAI no existe en HTML, pero el select de catálogo dispara AI
  // Esto ya está manejado en app.js

}
