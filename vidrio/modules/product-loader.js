// modules/product-loader.js

const URLS = {

  ESENCIAS:
  "https://wil1979.github.io/esentia-factura/data/productos_esentia.json",

  LIMPIEZA:
  "https://wil1979.github.io/esentia-factura/data/productos_limpieza_completo.json",

  VELAS:
  "https://wil1979.github.io/esentia-factura/data/catalogo-velas.json"
};

export async function loadProducts(catalog){

  const response =
  await fetch(URLS[catalog]);

  const data =
  await response.json();

  let products = [];

  if(catalog === "ESENCIAS"){

    Object.entries(data).forEach(([tipo, items]) => {

      items.forEach(item => {

        products.push({
          ...item,
          tipo
        });

      });

    });

  }

  else{

    products =
    Array.isArray(data)
    ? data
    : [data];

  }

  return products;
}