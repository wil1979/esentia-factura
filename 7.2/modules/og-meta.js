/**
 * og-meta.js
 * Genera metadatos Open Graph dinámicos para compartir en Facebook
 */

// Función para aplanar el JSON categorizado
function aplanarProductos(data) {
    if (Array.isArray(data)) return data;
    let flatList = [];
    for (const categoria in data) {
        if (Array.isArray(data[categoria])) {
            flatList = flatList.concat(data[categoria]);
        }
    }
    return flatList;
}

(function() {
    'use strict';
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) return;

    // Función para insertar metas
    const addMeta = (property, content) => {
        // Verificar si ya existe
        let existing = document.querySelector(`meta[property="${property}"]`);
        if (existing) {
            existing.setAttribute("content", content);
            return;
        }
        const m = document.createElement("meta");
        m.setAttribute("property", property);
        m.setAttribute("content", content);
        document.head.appendChild(m);
    };

    const addMetaName = (name, content) => {
        let existing = document.querySelector(`meta[name="${name}"]`);
        if (existing) {
            existing.setAttribute("content", content);
            return;
        }
        const m = document.createElement("meta");
        m.setAttribute("name", name);
        m.setAttribute("content", content);
        document.head.appendChild(m);
    };

    fetch("https://wil1979.github.io/esentia-factura/productos_esentia.json")
        .then(res => res.json())
        .then(data => {
            const productos = aplanarProductos(data);
            const prod = productos.find(p => String(p.id) === String(id));
            
            if (!prod) return;

            // Datos principales
            const nombre = prod.nombre || "Producto Esentia";
            const beneficios = prod.beneficios || "";
            const uso = prod.usoRecomendado || "";
            const imagen = prod.imagen || "";
            const calificacion = prod.calificacion ? `⭐ ${prod.calificacion} / 5` : "";
            const precio = prod.precioOferta
                ? `Oferta: ₡${prod.precioOferta.toLocaleString()} (Antes ₡${prod.precioOriginal.toLocaleString()})`
                : `Precio: ₡${prod.precioOriginal?.toLocaleString() || prod.precio?.toLocaleString()}`;

            // Hashtags premium automáticos
            const hashtags = "#Esentia #FraganciasQueEnamoran #AromasParaElHogar #Bienestar";

            // Texto final para Facebook
            const desc = `${calificacion}\n${precio}\n\nBeneficios: ${beneficios}\nUso recomendado: ${uso}\n\n${hashtags}`.trim();
            const title = `${nombre} – Fragancia Esentia`;

            // Metadatos OG
            addMeta("og:title", title);
            addMeta("og:description", desc);
            addMeta("og:image", imagen);
            addMeta("og:type", "product");
            addMeta("og:url", window.location.href);
            addMeta("og:site_name", "Esentia Fragancias");
            
            // Metadatos Twitter Card
            addMetaName("twitter:card", "summary_large_image");
            addMetaName("twitter:title", title);
            addMetaName("twitter:description", desc);
            addMetaName("twitter:image", imagen);
        })
        .catch(e => console.error("Error en metadatos OG:", e));
})();