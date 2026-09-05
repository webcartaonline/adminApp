/* =========================================================
   VENTANA DE «AJUSTES DE LA PÁGINA»
   Abre los ajustes de la página (colores, portada, fuentes,
   pie, redes…) en una ventana a pantalla completa, igual que
   la vista previa. Dentro va un marco aislado que carga
   pagina.html, para que sus estilos no toquen el editor.

   La ventana se carga UNA sola vez y se queda: abrir y cerrar
   no la recarga, así lo que estás editando no se pierde. Y
   como cada cambio se guarda en el cajón del navegador, la
   vista previa y el botón «Publicar cambios» lo ven igual.
   ========================================================= */
(function () {
  let capa = null;
  let cargada = false;   // ¿ya se pidió pagina.html y se puso en el marco?

  function crearCapa() {
    if (capa) return capa;
    capa = document.createElement('div');
    capa.className = 'vp';
    capa.hidden = true;
    capa.innerHTML = `
      <div class="vp__barra">
        <div class="vp__marca">
          <span class="vp__punto" aria-hidden="true"></span>
          <div class="vp__rotulos">
            <span class="vp__titulo">Ajustes de la página</span>
            <span class="vp__sub">Se publican con «Publicar cambios»</span>
          </div>
        </div>
        <button class="vp__cerrar" type="button" aria-label="Cerrar los ajustes de la página">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          <span>Cerrar</span>
        </button>
      </div>
      <div class="vp__lienzo">
        <iframe class="vp__marco" title="Ajustes de la página"
                referrerpolicy="no-referrer"></iframe>
      </div>`;
    document.body.appendChild(capa);
    capa.querySelector('.vp__cerrar').addEventListener('click', cerrar);
    return capa;
  }

  function cerrar() {
    if (!capa || capa.hidden) return;
    capa.hidden = true;                 // se oculta, NO se recarga
    document.documentElement.classList.remove('vp-abierta');
    // La apariencia pudo cambiar: que la vista previa se entere.
    if (typeof refrescarBotonVistaPrevia === 'function') refrescarBotonVistaPrevia();
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && capa && !capa.hidden) cerrar();
  });

  async function abrir() {
    const c = crearCapa();
    const marco = c.querySelector('.vp__marco');
    if (!cargada) {
      avisar('Abriendo los ajustes de la página…');
      try {
        const r = await fetch('pagina.html', { cache: 'no-store' });
        marco.srcdoc = await r.text();  // se carga una vez y se queda
        cargada = true;
        $('#mensaje').hidden = true;
      } catch (e) {
        avisar('No se han podido abrir los ajustes de la página: ' + e.message, 'error');
        return;
      }
    }
    c.hidden = false;
    document.documentElement.classList.add('vp-abierta');
  }

  /* ---------- Arranque ---------- */
  const boton = $('#btnAjustesPagina');
  if (boton) boton.addEventListener('click', abrir);
})();