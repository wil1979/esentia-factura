let capituloActual = 0;

function abrirLibro() {
    document.getElementById('portada').style.display = 'none';
    document.getElementById('pagina').classList.add('activa');
    mostrarCapitulo(0);
}

function mostrarCapitulo(index) {
    const capitulo = capitulos[index];
    
    // Actualizar título
    document.getElementById('titulo-capitulo').textContent = capitulo.titulo;
    
    // Actualizar imagen
    const img = document.getElementById('imagen-capitulo');
    img.src = capitulo.imagen;
    img.alt = capitulo.titulo;
    
    // Limpiar líneas anteriores
    const lineasContainer = document.getElementById('lineas-texto');
    lineasContainer.innerHTML = '';
    
    // Agregar líneas con animación
    capitulo.lineas.forEach((linea, i) => {
        const div = document.createElement('div');
        div.className = 'linea';
        div.textContent = linea;
        div.style.animationDelay = `${i * 0.1}s`;
        lineasContainer.appendChild(div);
    });
    
    // Actualizar indicador de página
    document.getElementById('indicador-pagina').textContent = 
        `Capítulo ${capitulo.numero} de ${capitulos.length}`;
    
    // Actualizar botones
    document.getElementById('btn-anterior').disabled = index === 0;
    document.getElementById('btn-siguiente').disabled = index === capitulos.length - 1;
    
    // Reproducir audio si existe
    const audio = new Audio(capitulo.audio);
    audio.play().catch(e => console.log('Audio no disponible'));
    
    capituloActual = index;
}

function paginaAnterior() {
    if (capituloActual > 0) {
        mostrarCapitulo(capituloActual - 1);
    }
}

function paginaSiguiente() {
    if (capituloActual < capitulos.length - 1) {
        mostrarCapitulo(capituloActual + 1);
    }
}