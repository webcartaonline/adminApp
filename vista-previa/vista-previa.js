/* =========================================================
   VISTA PREVIA
   Abre la página del cliente tal y como se verá, pero pintada
   con los cambios que todavía NO se han publicado. Se muestra
   en una ventana a pantalla completa, dentro de un marco
   aislado (un iframe), para que no se mezcle con el editor.

   De dónde sale cada cosa:
     · La carta (secciones, grupos, platos)  -> lo que se está
       editando ahora mismo en esta pantalla (estado.datos).
     · La apariencia (colores, portada, pie…) -> el borrador
       guardado en el navegador; si no lo hay, la última
       apariencia publicada.
     · Las fotos -> si están sin publicar, la copia local; si
       ya están publicadas, se cargan desde GitHub.

   La plantilla NO se modifica: los datos se le "sirven" desde
   el puente (vista-previa/puente.js). Ver plantilla.js para
   cómo llegan aquí sus archivos.
   ========================================================= */
(function () {

  /* Rutas que ya son absolutas (no hay que resolverlas). */
  const ES_ABSOLUTA = /^(https?:|data:|blob:)/i;

  /* El texto del puente se pide una sola vez y se reutiliza. */
  let textoPuente = null;
  async function obtenerPuente() {
    if (textoPuente != null) return textoPuente;
    const r = await fetch('vista-previa/puente.js', { cache: 'no-store' });
    textoPuente = await r.text();
    return textoPuente;
  }

  /* ---------- Resolver dónde está cada foto ----------
     La carta guarda las fotos con una ruta relativa (y a veces con un
     ?v=… para forzar recarga). Aquí decidimos qué dirección usar:
       1) ¿Está pendiente de subir en el editor de la carta? -> copia local.
       2) ¿Está pendiente de subir en los ajustes (portada/logo)? -> copia local.
       3) Si no, la versión ya publicada en GitHub. */
  async function resolverImagen(a, rutaEnCarta) {
    const original = String(rutaEnCarta || '');
    if (!original) return '';
    if (ES_ABSOLUTA.test(original)) return original;

    // Ruta dentro del repositorio (con la carpeta de la carta por delante,
    // si la hubiera, y sin el ?v=). Es la misma clave que usa el editor.
    const rutaRepo = carpetaDeLaCarta(a.ruta) + sinVersion(original);

    const pendCarta = estado.imagenesPendientes && estado.imagenesPendientes[rutaRepo];
    if (pendCarta) {
      return pendCarta.previa ||
             (pendCarta.base64 ? `data:image/jpeg;base64,${pendCarta.base64}` : '');
    }

    try {
      const img = await Almacen.leer('imagenes', `${clienteActual(a)}::${rutaRepo}`);
      if (img && img.base64) return `data:${img.tipo || 'image/jpeg'};base64,${img.base64}`;
    } catch { /* sin copia local de apariencia: se usa la publicada */ }

    return `https://raw.githubusercontent.com/${a.owner}/${a.repo}/${a.rama || 'main'}/${rutaRepo}`;
  }

  /* Copia de la carta con TODAS las fotos ya resueltas a una dirección
     que se pueda mostrar. Se trabaja sobre una copia para no tocar lo
     que el cliente está editando. */
  async function resolverDatos(a, datosVivos) {
    const d = JSON.parse(JSON.stringify(datosVivos || {}));
    if (d.negocio) {
      if (d.negocio.portada) d.negocio.portada = await resolverImagen(a, d.negocio.portada);
      if (d.negocio.logo)    d.negocio.logo    = await resolverImagen(a, d.negocio.logo);
    }
    for (const s of (d.secciones || [])) {
      if (s.imagen) s.imagen = await resolverImagen(a, s.imagen);
      for (const g of (s.grupos || [])) {
        if (g.imagen) g.imagen = await resolverImagen(a, g.imagen);
        for (const it of (g.items || [])) {
          if (it.imagen) it.imagen = await resolverImagen(a, it.imagen);
        }
      }
    }
    return d;
  }

  /* La apariencia: primero el borrador sin publicar (lo deja la pantalla
     de ajustes); si no hay, la última publicada. Con sus fotos resueltas. */
  async function resolverApariencia(a) {
    let apar = null;
    try {
      const b = await Almacen.leer('apariencia', clienteActual(a));
      if (b && b.datos) apar = b.datos;
    } catch { /* sin borrador */ }

    if (!apar) {
      try {
        const r = await fetch(
          `https://raw.githubusercontent.com/${a.owner}/${a.repo}/${a.rama || 'main'}/${carpetaDeLaCarta(a.ruta)}apariencia.json`,
          { cache: 'no-store' });
        if (r.ok) apar = await r.json();
      } catch { /* la página aún no tiene apariencia propia */ }
    }
    if (!apar) return null;

    apar = JSON.parse(JSON.stringify(apar));
    if (apar.identidad) {
      if (apar.identidad.logo) apar.identidad.logo = await resolverImagen(a, apar.identidad.logo);
      if (apar.identidad.fondo && apar.identidad.fondo.imagen) {
        apar.identidad.fondo.imagen = await resolverImagen(a, apar.identidad.fondo.imagen);
      }
    }
    // Las fuentes personalizadas se resuelven igual que las fotos: si están
    // sin publicar, la copia local; si no, la publicada en GitHub. Así la
    // vista previa muestra también la tipografía elegida sin haberla subido.
    if (apar.fuentes) {
      for (const clave of ['titulo', 'texto']) {
        const f = apar.fuentes[clave];
        if (f && f.archivo) f.archivo = await resolverImagen(a, f.archivo);
      }
    }
    return apar;
  }

  /* ---------- Montar el documento de la vista previa ----------
     Se parte del index.html de la plantilla y se hacen tres cosas:
       · Meter los estilos y el carta.js de la plantilla dentro del
         propio documento (así no dependen de ninguna dirección).
       · Colocar los datos preparados en window.__VP__.
       · Colar el puente ANTES que el carta.js de la plantilla. */
  function nombreDeArchivo(href, nombres) {
    const limpio = sinVersion(href).replace(/^\.\//, '');
    return nombres.find(n => limpio === n || limpio.endsWith('/' + n)) || null;
  }

  function incrustarArchivos(doc, archivos) {
    const nombres = Object.keys(archivos);
    doc.querySelectorAll('link[rel="stylesheet"][href]').forEach(el => {
      const n = nombreDeArchivo(el.getAttribute('href'), nombres);
      if (!n) return; // enlaces externos (por ejemplo, las fuentes) se dejan
      const estilo = doc.createElement('style');
      estilo.textContent = String(archivos[n]).replace(/<\/style/gi, '<\\/style');
      el.replaceWith(estilo);
    });
    doc.querySelectorAll('script[src]').forEach(el => {
      const n = nombreDeArchivo(el.getAttribute('src'), nombres);
      if (!n) return;
      const guion = doc.createElement('script');
      guion.textContent = String(archivos[n]).replace(/<\/script/gi, '<\\/script');
      el.replaceWith(guion);
    });
  }

  async function construirDocumento(a) {
    const meta = plantillaEnMemoria;
    const nombreHtml = meta.archivos['index.html']
      ? 'index.html'
      : Object.keys(meta.archivos).find(n => n.endsWith('.html'));
    const html = nombreHtml && meta.archivos[nombreHtml];
    if (!html) throw new Error('la plantilla no trae su página (index.html).');

    const doc = new DOMParser().parseFromString(html, 'text/html');
    incrustarArchivos(doc, meta.archivos);

    const inyectado = {
      datos: await resolverDatos(a, estado.datos),
      apariencia: await resolverApariencia(a)
    };

    // Los datos primero…
    const datosScript = doc.createElement('script');
    // Escapamos "<" para que ningún texto de la carta pueda cerrar el <script>.
    datosScript.textContent =
      'window.__VP__=' + JSON.stringify(inyectado).replace(/</g, '\\u003c') + ';';
    doc.head.insertBefore(datosScript, doc.head.firstChild);

    // …y justo después el puente, para que actúe antes que el carta.js.
    const puenteScript = doc.createElement('script');
    puenteScript.textContent = await obtenerPuente();
    doc.head.insertBefore(puenteScript, datosScript.nextSibling);

    return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
  }

  /* ---------- La ventana ---------- */
  let capa = null;

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
            <span class="vp__titulo">Vista previa</span>
            <span class="vp__sub">Cambios sin publicar</span>
          </div>
        </div>
        <button class="vp__cerrar" type="button" aria-label="Cerrar la vista previa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          <span>Cerrar</span>
        </button>
      </div>
      <div class="vp__lienzo">
        <iframe class="vp__marco" title="Vista previa de la carta"
                referrerpolicy="no-referrer"
                sandbox="allow-scripts allow-popups allow-same-origin"></iframe>
      </div>`;
    document.body.appendChild(capa);
    capa.querySelector('.vp__cerrar').addEventListener('click', cerrarVistaPrevia);
    return capa;
  }

  function cerrarVistaPrevia() {
    if (!capa || capa.hidden) return;
    const marco = capa.querySelector('.vp__marco');
    marco.srcdoc = '';           // libera la página cargada
    capa.hidden = true;
    document.documentElement.classList.remove('vp-abierta');
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && capa && !capa.hidden) cerrarVistaPrevia();
  });

  async function abrirVistaPrevia() {
    if (!estado.datos) {
      avisar('Trae la carta antes de ver la vista previa.', 'error');
      return;
    }
    if (!hayPlantilla()) {
      avisar('Esta página todavía no admite vista previa. Vuelve a traerla de GitHub cuando esté actualizada.', 'error');
      return;
    }
    avisar('Preparando la vista previa…');
    try {
      const a = leerAjustes();
      const documento = await construirDocumento(a);
      const marco = crearCapa().querySelector('.vp__marco');
      marco.srcdoc = documento;
      capa.hidden = false;
      document.documentElement.classList.add('vp-abierta');
      $('#mensaje').hidden = true;
    } catch (e) {
      avisar('No se ha podido abrir la vista previa: ' + e.message, 'error');
    }
  }

  /* Enciende o apaga el botón según haya carta cargada y plantilla lista. */
  function refrescarBotonVistaPrevia() {
    const btn = $('#btnVistaPrevia');
    if (!btn) return;
    const listo = !!(estado.datos && hayPlantilla());
    btn.disabled = !listo;
    btn.title = !estado.datos
      ? 'Trae la carta primero'
      : (hayPlantilla() ? 'Ver la carta con los cambios sin publicar'
                        : 'Esta página todavía no admite vista previa');
  }

  /* Se comparte con el resto del programa (lo llama github.js al traer). */
  window.refrescarBotonVistaPrevia = refrescarBotonVistaPrevia;

  /* ---------- Arranque ---------- */
  const boton = $('#btnVistaPrevia');
  if (boton) boton.addEventListener('click', abrirVistaPrevia);
  cargarPlantillaGuardada().finally(refrescarBotonVistaPrevia);

})();