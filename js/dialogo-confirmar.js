/* =========================================================
   CUADRO DE «¿ESTÁS SEGURO?»
   Una ventanita pequeña con una pregunta y dos botones abajo:
   uno para echarse atrás y otro para seguir. Sirve para
   cualquier acción que no se pueda deshacer.

     const seguir = await confirmar({
       titulo:'¿Descartar todos los cambios?',
       texto:'Esto no se puede deshacer.',
       rotuloSi:'Sí, descartar', rotuloNo:'Cancelar', peligro:true
     });

   Devuelve una promesa que dice true (ha confirmado) o false
   (ha cancelado, ha pulsado Esc o ha tocado fuera).

   Usa el aspecto de las ventanas del editor (.modal, en
   imagenes.css), que va por encima de las ventanas flotantes:
   así se puede abrir desde dentro de una de ellas. Al abrirse
   se queda señalado «Cancelar», a propósito: un Intro sin
   pensar no debe borrar nada.
   ========================================================= */
function confirmar({ titulo, texto = '', rotuloSi = 'Aceptar', rotuloNo = 'Cancelar', peligro = false }) {
  return new Promise((resolver) => {
    const antes = document.activeElement;
    const capa = document.createElement('div');
    capa.className = 'modal confirmar';
    capa.setAttribute('role', 'alertdialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-labelledby', 'confirmarTitulo');
    capa.setAttribute('aria-describedby', 'confirmarTexto');
    capa.innerHTML = `
      <div class="modal__caja confirmar__caja">
        ${peligro ? `<span class="confirmar__icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"/><path d="M12 16.5v.5"/>
            <path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
        </span>` : ''}
        <h2 class="modal__titulo" id="confirmarTitulo">${escapar(titulo)}</h2>
        <p class="modal__pista confirmar__texto" id="confirmarTexto">${escapar(texto)}</p>
        <div class="modal__acc confirmar__botones">
          <button class="btn btn--suave" type="button" data-confirmar="no">${escapar(rotuloNo)}</button>
          <button class="btn ${peligro ? 'btn--peligro-fuerte' : 'btn--principal'}" type="button"
                  data-confirmar="si">${escapar(rotuloSi)}</button>
        </div>
      </div>`;

    function cerrar(respuesta) {
      document.removeEventListener('keydown', alPulsarTecla, true);
      capa.remove();
      if (antes && typeof antes.focus === 'function') antes.focus();
      resolver(respuesta);
    }

    /* Esc cancela. Se escucha antes que nadie y no se deja pasar: así no
       cierra también la ventana que haya debajo. */
    function alPulsarTecla(ev) {
      if (ev.key !== 'Escape') return;
      ev.preventDefault();
      ev.stopPropagation();
      cerrar(false);
    }

    capa.addEventListener('click', (ev) => {
      if (ev.target === capa) { cerrar(false); return; }   // tocar fuera = cancelar
      const boton = ev.target.closest('[data-confirmar]');
      if (boton) cerrar(boton.dataset.confirmar === 'si');
    });
    document.addEventListener('keydown', alPulsarTecla, true);

    document.body.appendChild(capa);
    capa.querySelector('[data-confirmar="no"]').focus();
  });
}
