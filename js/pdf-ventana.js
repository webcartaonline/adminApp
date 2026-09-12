/* =========================================================
   PDF DE LA CARTA · VENTANA
   El botón de arriba abre esta ventana (igual que «Ajustes de
   la carta»). Dentro, el cliente elige tamaño de papel,
   márgenes, idioma, portada y fotos, ve una vista previa y
   descarga el PDF.

   Importante: el PDF se hace con la carta PUBLICADA, no con lo
   que haya a medias en el navegador. Se avisa dentro.
   ========================================================= */
(function () {
  let capa = null;
  let paquete = null;         // la carta publicada ya preparada
  let opciones = null;        // lo elegido en la ventana
  let temporizador = null;    // para no rehacer la vista en cada tecla
  let generando = false;
  let fuentesPedidas = false;

  /* La carta usa otras letras que el editor (Fraunces y Space Grotesk).
     Se piden solo al abrir esta ventana, para no cargarlas de balde en
     todo el editor. Si no hay internet, el PDF usa letras parecidas. */
  function pedirFuentesCarta() {
    if (fuentesPedidas) return;
    fuentesPedidas = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Space+Grotesk:wght@400;500;700&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- La ventana ---------- */
  function crearCapa() {
    if (capa) return capa;
    capa = document.createElement('div');
    capa.className = 'vp vp--ajustes vp--pdf';
    capa.hidden = true;
    capa.innerHTML = `
      <div class="vp__ventana">
        <div class="vp__barra">
          <div class="vp__marca">
            <span class="vp__punto" aria-hidden="true"></span>
            <div class="vp__rotulos">
              <span class="vp__titulo">Descargar en PDF</span>
              <span class="vp__sub">Para imprimir la carta</span>
            </div>
          </div>
          <button class="vp__cerrar" type="button" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            <span>Cerrar</span>
          </button>
        </div>

        <div class="vp__cuerpo pdf-cuerpo">
          <aside class="pdf-panel" id="pdfPanel"></aside>
          <div class="pdf-vista">
            <div class="pdf-lienzo" id="pdfLienzo">
              <p class="pdf-vacio" id="pdfEstado">Preparando…</p>
            </div>
            <div class="pdf-acciones">
              <span class="pdf-info" id="pdfInfo"></span>
              <button class="btn btn--principal" id="pdfDescargar" type="button" disabled>Descargar PDF</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(capa);
    capa.querySelector('.vp__cerrar').addEventListener('click', cerrar);
    capa.addEventListener('click', ev => { if (ev.target === capa) cerrar(); });
    capa.querySelector('#pdfDescargar').addEventListener('click', descargar);
    window.addEventListener('resize', reajustarVista);
    return capa;
  }

  function cerrar() {
    if (!capa || capa.hidden) return;
    if (generando) return;    // no cerrar a mitad de una descarga
    capa.hidden = true;
    document.documentElement.classList.remove('vp-abierta');
  }

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && capa && !capa.hidden) cerrar();
  });

  async function abrir() {
    pedirFuentesCarta();
    const c = crearCapa();
    c.hidden = false;
    document.documentElement.classList.add('vp-abierta');
    if (!paquete) await cargarDatos();
  }

  /* ---------- Traer la carta publicada ---------- */
  async function cargarDatos() {
    const estadoEl = capa.querySelector('#pdfEstado');
    const panel = capa.querySelector('#pdfPanel');
    panel.innerHTML = '';
    estadoEl.textContent = 'Cargando la carta publicada…';
    estadoEl.hidden = false;
    try {
      paquete = await pdfCartaPublicada();
      opciones = pdfOpcionesDefecto();
      opciones.idioma = paquete.idiomas[0] || 'es';
      construirFormulario();
      capa.querySelector('#pdfDescargar').disabled = false;
      await actualizarVista();
    } catch (e) {
      estadoEl.innerHTML = `<span class="pdf-error">${escapar(e.message)}</span>`;
    }
  }

  /* ---------- El formulario de opciones ---------- */
  function construirFormulario() {
    const panel = capa.querySelector('#pdfPanel');
    const tam = Object.entries(PDF_TAMANOS)
      .map(([k, v]) => `<option value="${k}"${k === opciones.tamano ? ' selected' : ''}>${escapar(v.rotulo)}</option>`).join('');
    const idiomasDisp = paquete.idiomas.filter(l => PDF_NOMBRE_IDIOMA[l] || l);
    const idiomaSel = idiomasDisp
      .map(l => `<option value="${l}"${l === opciones.idioma ? ' selected' : ''}>${escapar(PDF_NOMBRE_IDIOMA[l] || l.toUpperCase())}</option>`).join('');
    const tipos = paquete.tipos;
    const sinFotos = !tipos.seccion && !tipos.grupo && !tipos.item;

    panel.innerHTML = `
      <p class="pdf-aviso">
        El PDF se genera a partir de la carta <b>publicada</b>, no de los cambios
        que tengas guardados en el navegador sin publicar.
      </p>

      <div class="pdf-bloque">
        <h3 class="pdf-bloque__titulo">Papel</h3>
        <label class="pdf-campo">
          <span>Tamaño</span>
          <select id="pdfTamano">${tam}</select>
        </label>
        <label class="pdf-campo">
          <span>Orientación</span>
          <select id="pdfOrientacion">
            <option value="vertical">Vertical</option>
            <option value="apaisado">Horizontal (apaisado)</option>
          </select>
        </label>
        <label class="pdf-campo">
          <span>Columnas</span>
          <select id="pdfColumnas">
            <option value="auto">Automáticas</option>
            <option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4">4</option>
          </select>
        </label>
      </div>

      <div class="pdf-bloque"${idiomasDisp.length > 1 ? '' : ' hidden'}>
        <h3 class="pdf-bloque__titulo">Idioma del PDF</h3>
        <label class="pdf-campo">
          <span>Idioma</span>
          <select id="pdfIdioma">${idiomaSel}</select>
        </label>
      </div>

      <div class="pdf-bloque">
        <h3 class="pdf-bloque__titulo">Portada</h3>
        <label class="pdf-check"><input type="checkbox" id="pdfPortada" checked><span>Incluir página de portada</span></label>
        <div id="pdfPortadaOpc">
          <label class="pdf-check pdf-check--sangria"><input type="checkbox" id="pdfTitulo" checked><span>Mostrar el título</span></label>
          <label class="pdf-check pdf-check--sangria"><input type="checkbox" id="pdfLogo" checked><span>Mostrar el logotipo</span></label>
        </div>
      </div>

      <div class="pdf-bloque">
        <h3 class="pdf-bloque__titulo">Fotos</h3>
        ${sinFotos
          ? '<p class="pdf-nota">Esta carta no lleva fotos, así que el PDF saldrá solo con texto.</p>'
          : `<label class="pdf-check"><input type="checkbox" id="pdfImgSeccion"${tipos.seccion ? '' : ' disabled'}><span>Fotos de las secciones</span></label>
             <label class="pdf-check"><input type="checkbox" id="pdfImgGrupo"${tipos.grupo ? '' : ' disabled'}><span>Fotos de los grupos</span></label>
             <label class="pdf-check"><input type="checkbox" id="pdfImgItem"${tipos.item ? '' : ' disabled'}><span>Fotos de los platos</span></label>
             <p class="pdf-nota">Cada interruptor afecta a todas las fotos de su tipo.</p>`}
      </div>

      <div class="pdf-bloque">
        <h3 class="pdf-bloque__titulo">Márgenes (mm)</h3>
        <label class="pdf-check"><input type="checkbox" id="pdfMargenIguales" checked><span>Los cuatro iguales</span></label>
        <div id="pdfMargenUno">
          <label class="pdf-campo"><span>Margen</span>
            <input type="number" id="pdfMargen" min="${PDF_MARGEN_MIN}" max="${PDF_MARGEN_MAX}" value="${PDF_MARGEN_DEFECTO}"></label>
        </div>
        <div id="pdfMargenCuatro" hidden>
          <div class="pdf-margenes">
            <label class="pdf-campo"><span>Arriba</span><input type="number" id="pdfMArriba" min="${PDF_MARGEN_MIN}" max="${PDF_MARGEN_MAX}" value="${PDF_MARGEN_DEFECTO}"></label>
            <label class="pdf-campo"><span>Abajo</span><input type="number" id="pdfMAbajo" min="${PDF_MARGEN_MIN}" max="${PDF_MARGEN_MAX}" value="${PDF_MARGEN_DEFECTO}"></label>
            <label class="pdf-campo"><span>Izquierda</span><input type="number" id="pdfMIzq" min="${PDF_MARGEN_MIN}" max="${PDF_MARGEN_MAX}" value="${PDF_MARGEN_DEFECTO}"></label>
            <label class="pdf-campo"><span>Derecha</span><input type="number" id="pdfMDer" min="${PDF_MARGEN_MIN}" max="${PDF_MARGEN_MAX}" value="${PDF_MARGEN_DEFECTO}"></label>
          </div>
        </div>
      </div>`;

    cablearFormulario();
  }

  /* Conecta cada control con las opciones y con la vista previa. */
  function cablearFormulario() {
    const $$ = s => capa.querySelector(s);
    const cambio = (el, fn) => el && el.addEventListener('change', () => { fn(); programarVista(); });
    const tecla = (el, fn) => el && el.addEventListener('input', () => { fn(); programarVista(); });

    cambio($$('#pdfTamano'), () => opciones.tamano = $$('#pdfTamano').value);
    cambio($$('#pdfOrientacion'), () => opciones.orientacion = $$('#pdfOrientacion').value);
    cambio($$('#pdfColumnas'), () => { const v = $$('#pdfColumnas').value; opciones.columnas = v === 'auto' ? 'auto' : parseInt(v, 10); });
    cambio($$('#pdfIdioma'), () => opciones.idioma = $$('#pdfIdioma').value);

    const portada = $$('#pdfPortada');
    cambio(portada, () => {
      opciones.portada = portada.checked;
      $$('#pdfPortadaOpc').classList.toggle('pdf-apagado', !portada.checked);
      $$('#pdfTitulo').disabled = $$('#pdfLogo').disabled = !portada.checked;
    });
    cambio($$('#pdfTitulo'), () => opciones.mostrarTitulo = $$('#pdfTitulo').checked);
    cambio($$('#pdfLogo'), () => opciones.mostrarLogo = $$('#pdfLogo').checked);

    cambio($$('#pdfImgSeccion'), () => opciones.imagenes.seccion = $$('#pdfImgSeccion').checked);
    cambio($$('#pdfImgGrupo'), () => opciones.imagenes.grupo = $$('#pdfImgGrupo').checked);
    cambio($$('#pdfImgItem'), () => opciones.imagenes.item = $$('#pdfImgItem').checked);

    const iguales = $$('#pdfMargenIguales');
    cambio(iguales, () => {
      opciones.margenesIguales = iguales.checked;
      $$('#pdfMargenUno').hidden = !iguales.checked;
      $$('#pdfMargenCuatro').hidden = iguales.checked;
      leerMargenes();
    });
    tecla($$('#pdfMargen'), leerMargenes);
    ['#pdfMArriba', '#pdfMAbajo', '#pdfMIzq', '#pdfMDer'].forEach(s => tecla($$(s), leerMargenes));
  }

  function limitarMargen(v) {
    const n = parseFloat(v);
    if (!isFinite(n)) return PDF_MARGEN_DEFECTO;
    return Math.max(PDF_MARGEN_MIN, Math.min(PDF_MARGEN_MAX, n));
  }
  function leerMargenes() {
    const $$ = s => capa.querySelector(s);
    if ($$('#pdfMargenIguales').checked) {
      const v = limitarMargen($$('#pdfMargen').value);
      opciones.margenes = { arriba: v, abajo: v, izquierda: v, derecha: v };
    } else {
      opciones.margenes = {
        arriba: limitarMargen($$('#pdfMArriba').value),
        abajo: limitarMargen($$('#pdfMAbajo').value),
        izquierda: limitarMargen($$('#pdfMIzq').value),
        derecha: limitarMargen($$('#pdfMDer').value)
      };
    }
  }

  /* ---------- Vista previa ---------- */
  function programarVista() {
    clearTimeout(temporizador);
    temporizador = setTimeout(actualizarVista, 260);
  }

  async function actualizarVista() {
    if (!paquete) return;
    const lienzo = capa.querySelector('#pdfLienzo');
    const info = capa.querySelector('#pdfInfo');
    info.textContent = 'Preparando vista previa…';
    try {
      const { paginas } = await pdfMostrarVistaPrevia(lienzo, paquete, opciones);
      info.textContent = paginas === 1 ? '1 página' : `${paginas} páginas`;
    } catch (e) {
      lienzo.innerHTML = `<p class="pdf-vacio pdf-error">${escapar(e.message)}</p>`;
      info.textContent = '';
    }
  }

  function reajustarVista() {
    if (!capa || capa.hidden || !paquete) return;
    const lienzo = capa.querySelector('#pdfLienzo');
    const M = pdfMedidas(opciones);
    pdfAjustarZoomPreview(lienzo, M);
  }

  /* ---------- Descargar ---------- */
  async function descargar() {
    if (generando || !paquete) return;
    generando = true;
    const btn = capa.querySelector('#pdfDescargar');
    const info = capa.querySelector('#pdfInfo');
    btn.disabled = true;
    const antes = btn.textContent;
    btn.textContent = 'Generando…';
    try {
      await pdfFabricar(paquete, opciones, (hechas, total) => {
        info.textContent = `Preparando página ${Math.min(hechas + 1, total)} de ${total}…`;
      });
      info.textContent = '¡PDF descargado!';
    } catch (e) {
      info.innerHTML = `<span class="pdf-error">${escapar(e.message)}</span>`;
    } finally {
      generando = false;
      btn.disabled = false;
      btn.textContent = antes;
    }
  }

  /* ---------- Arranque ---------- */
  const boton = document.querySelector('#btnPdf');
  if (boton) boton.addEventListener('click', abrir);
})();