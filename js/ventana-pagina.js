/* =========================================================
   VENTANA DE «AJUSTES DE LA PÁGINA»
   Abre los ajustes de la página (colores, portada, fuentes,
   pie, redes…) en una ventana flotante (ventana-flotante.js).
   Dentro va un marco aislado que carga pagina.html, para que
   sus estilos no toquen el editor.

   La ventana se carga UNA sola vez y se queda: abrir y cerrar
   no la recarga, así lo que estás editando no se pierde. Y
   como cada cambio se guarda en el cajón del navegador, la
   vista previa y el botón «Publicar cambios» lo ven igual.
   ========================================================= */
(function () {
  let ventana = null;
  let cargada = false;   // ¿ya se pidió pagina.html y se puso en el marco?

  function crearVentana() {
    if (ventana) return ventana;
    ventana = crearVentanaFlotante({
      titulo: 'Ajustes de la página',
      subtitulo: 'Se publican con «Publicar cambios»',
      rotuloCerrar: 'Cerrar los ajustes de la página',
      // La apariencia pudo cambiar: que la vista previa se entere.
      alCerrar: () => { if (typeof refrescarBotonVistaPrevia === 'function') refrescarBotonVistaPrevia(); }
    });
    ventana.lienzo.innerHTML =
      '<iframe class="vp__marco" title="Ajustes de la página" referrerpolicy="no-referrer"></iframe>';
    return ventana;
  }

  async function abrir() {
    const v = crearVentana();
    if (!cargada) {
      avisar('Abriendo los ajustes de la página…');
      try {
        const r = await fetch('pagina.html', { cache: 'no-store' });
        v.lienzo.querySelector('.vp__marco').srcdoc = await r.text();  // se carga una vez y se queda
        cargada = true;
        $('#mensaje').hidden = true;
      } catch (e) {
        avisar('No se han podido abrir los ajustes de la página: ' + e.message, 'error');
        return;
      }
    }
    v.abrir();
  }

  /* ---------- Arranque ---------- */
  const boton = $('#btnAjustesPagina');
  if (boton) boton.addEventListener('click', abrir);

  /* La ventana de ajustes (el marco de dentro) avisa por mensajes cuando
     tiene o deja de tener cambios sin publicar. Se lo pasamos al editor
     para que encienda o apague «Publicar cambios». */
  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || d.fuente !== 'ajustes-pagina') return;
    if (typeof marcarAparienciaSucia === 'function') marcarAparienciaSucia(d.sucio);
  });
})();
