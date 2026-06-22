// ======================================
// TEMPLATES
// ======================================

import {

  canvas

}

from "./canvas-engine.js";

import {

  setObject

}

from "./object-manager.js";

// ======================================
// CREATE PRODUCT SCENE
// ======================================

export function createProductScene(product){

  // CLEAR

  canvas.clear();

  // ====================================
  // PRODUCT IMAGE
  // ====================================

  fabric.Image.fromURL(

    product.imagen ||

    "./assets/products/default.png",

    (img) => {

      // ================================
      // PRODUCT
      // ================================

      img.set({

        left:
        canvas.width / 2,

        top:
        canvas.height / 2 - 120,

        originX:"center",
        originY:"center",

        scaleX:0.55,
        scaleY:0.55,

        selectable:true,

        hasControls:true,
        hasBorders:true

      });

      canvas.add(img);

      // 🔥 REGISTER

      setObject(
        "product",
        img
      );

      // ================================
      // TITLE
      // ================================

      const title =
      new fabric.Textbox(

        product.nombre ||

        "Producto",

        {

          left:60,

          top:
          canvas.height - 320,

          width:
          canvas.width - 120,

          fontSize:52,

          fill:"#ffffff",

          fontWeight:"bold",

          textAlign:"center",

          editable:true,

          selectable:true

        }

      );

      canvas.add(title);

      // 🔥 REGISTER

      setObject(
        "title",
        title
      );

      // ================================
      // DESCRIPTION
      // ================================

      const description =
      new fabric.Textbox(

        product.descripcion ||

        product.info ||

        "Experiencia aromática premium.",

        {

          left:90,

          top:
          canvas.height - 220,

          width:
          canvas.width - 180,

          fontSize:26,

          fill:"#f1f1f1",

          opacity:0.95,

          textAlign:"center",

          lineHeight:1.3,

          editable:true,

          selectable:true

        }

      );

      canvas.add(description);

      // 🔥 REGISTER

      setObject(
        "description",
        description
      );

      // ================================
      // PRICE
      // ================================

      const price =
      new fabric.Textbox(

        `₡${product.precio || product.precioPublico || ""}`,

        {

          left:
          canvas.width / 2,

          top:
          canvas.height - 110,

          originX:"center",

          fontSize:36,

          fill:"#111111",

          backgroundColor:"#ffffff",

          padding:18,

          editable:true,

          selectable:true

        }

      );

      canvas.add(price);

      // 🔥 REGISTER

      setObject(
        "price",
        price
      );

      // ====================================
      // RENDER
      // ====================================

      canvas.renderAll();

    },

    {
      crossOrigin:"anonymous"
    }

  );

}