/* =========================================================
   VENTANA EMERGENTE (EL ANUNCIO)
   La ventanita que sale encima de la carta al abrirla, para
   destacar algo: un plato nuevo, una oferta, un evento… Desde
   aquí se cambia lo que enseña: si sale o no, sus textos (en
   cada idioma de la carta) y su foto.

   Sus COLORES y sus LETRAS no se tocan aquí: los pone cada
   plantilla con los de la página, así que se cambian en
   «Ajustes de la carta».

   Los datos van en el carta.json, en «anuncio» (SISTEMA.md
   §5.2). Por eso se guardan como cualquier otro cambio de la
   carta: marcarSucio() y «Publicar cambios», y su foto sube en
   el mismo orden que las demás (fotos nuevas → carta → fotos
   que sobran). La foto usa la misma ventana de encuadre que
   las de la carta (imagen-recorte.js, tipo «anuncio»).

   Qué deja hacer el plan:
     · el interruptor y los textos, cualquier plan con editor;
     · la foto, solo con «imagenesDecorativas»: el portero la
       guarda en img/anuncio/, que es lo que protege ese permiso.
   ========================================================= */
(function () {

  /* Los textos de la ventana, en el orden en que salen en la carta. */
  const TEXTOS_DEL_ANUNCIO = [
    { campo: 'titulo', etiqueta: 'Línea pequeña',
      pista: 'Va arriba, en letra pequeña. Una o dos palabras que llamen la atención: «¡Novedad!», «Solo este fin de semana»…' },
    { campo: 'mensaje', etiqueta: 'Mensaje principal',
      pista: 'Lo que quieres destacar, en grande: el nombre del plato, la oferta o el evento.' },
    { campo: 'descripcion', etiqueta: 'Descripción', textarea: true,
      pista: 'El detalle: qué lleva, hasta cuándo dura, a qué hora empieza… Los saltos de línea se respetan.' }
  ];

  /* Solo hay una foto de anuncio por carta: se llama siempre igual
     (img/anuncio/anuncio.jpg) y el ?v=… de su ruta hace que los móviles
     cojan la nueva cuando se cambia. */
  const ID_FOTO = 'anuncio';

  let ventana = null;

  const anuncioActual = () => estado.datos?.anuncio ?? null;

  /* El anuncio se crea la primera vez que se toca algo. Nace encendido:
     mientras no tenga nada escrito, la carta no lo enseña. */
  function asegurarAnuncio() {
    const a = estado.datos.anuncio;
    if (!a || typeof a !== 'object' || Array.isArray(a)) estado.datos.anuncio = { activo: true };
    return estado.datos.anuncio;
  }

  /* Al cerrar la ventana: si el anuncio se creó pero no se llegó a poner
     nada (se abrió la foto y se canceló, por ejemplo), se quita. Un
     { activo:true } solo es lo mismo que no tener anuncio, y así la carta
     no se lleva un campo vacío. */
  function quitarAnuncioSinUsar() {
    const a = anuncioActual();
    if (a && Object.keys(a).every((clave) => clave === 'activo') && a.activo !== false) {
      delete estado.datos.anuncio;
    }
  }

  const fotoPermitida = () => hayImagenes() && puedeImagenesDecorativas();

  const tieneTexto = (a) =>
    TEXTOS_DEL_ANUNCIO.some(({ campo }) => estado.idiomas.some((L) => valorTexto(a[campo], L).trim()));

  /* Qué verá el comensal al abrir la carta, en una frase. Son las mismas
     cuentas que hace anuncio.js en las plantillas. */
  function situacion(a) {
    if (a.activo === false) return { clase: 'apagada', texto: 'Apagada: no sale en la carta' };
    const conFoto = !!a.imagen && hayImagenes();
    if (!tieneTexto(a) && !conFoto) return { clase: 'vacia', texto: 'Vacía: no sale hasta que escribas algo' };
    return { clase: 'encendida', texto: 'Encendida: sale al abrir la carta' };
  }

  /* ---------- Piezas de la ventana ---------- */

  function htmlEstado(a) {
    const s = situacion(a || {});
    return `<span class="anuncio-editor__estado anuncio-editor__estado--${s.clase}"
                  data-anuncio-estado>${s.texto}</span>`;
  }

  function bloqueInterruptor(a) {
    const encendida = a?.activo !== false;
    return `
      <section class="bloque">
        <h2 class="bloque__titulo">¿Sale en la carta? ${htmlEstado(a)}</h2>
        <div class="chips" role="group" aria-label="¿Sale la ventana emergente en la carta?">
          <button class="chip" type="button" data-anuncio-activo="si" aria-pressed="${encendida}">Encendida</button>
          <button class="chip" type="button" data-anuncio-activo="no" aria-pressed="${!encendida}">Apagada</button>
        </div>
        <p class="campo__pista">Encendida, sale cada vez que alguien abre tu carta, y solo
          entonces: cambiar de idioma o de sección no la vuelve a sacar. Apagada, no sale,
          pero lo que hayas escrito se guarda para otra vez.</p>
      </section>`;
  }

  function campoDelAnuncio(a, { campo, etiqueta, pista, textarea }) {
    return `
      <div class="anuncio-editor__campo">
        <div class="par-idiomas">${camposTexto(`anuncio-${campo}`, a?.[campo], etiqueta, !!textarea)}</div>
        <p class="campo__pista">${pista}</p>
      </div>`;
  }

  function bloqueTextos(a) {
    const variosIdiomas = estado.idiomas.length > 1
      ? ' Si dejas un idioma vacío, en ese idioma sale el texto en español.'
      : '';
    return `
      <section class="bloque">
        <h2 class="bloque__titulo">Textos</h2>
        ${TEXTOS_DEL_ANUNCIO.map((texto) => campoDelAnuncio(a, texto)).join('')}
        <p class="campo__pista anuncio-editor__nota">Lo que dejes vacío no sale.${variosIdiomas}</p>
      </section>`;
  }

  function bloqueFoto(a) {
    if (!fotoPermitida()) return '';
    const pendiente = estado.imagenesPendientes[rutaImagenRepo('anuncio', ID_FOTO)];
    const rotulo = (a?.imagen || pendiente) ? 'Cambiar o quitar' : 'Poner una foto';
    return `
      <section class="bloque">
        <h2 class="bloque__titulo">Foto
          <span class="bloque__acciones">
            <button class="btn btn--suave" type="button" data-anuncio-foto>${rotulo}</button>
          </span>
        </h2>
        <p class="campo__pista">Opcional. Sale arriba, a lo ancho de la ventana.</p>
        ${bloqueImagen('anuncio', { ...(a || {}), id: ID_FOTO },
          { vacio: 'Sin foto: la ventana sale solo con los textos.' })}
      </section>`;
  }

  function bloqueAcciones(a) {
    const conVista = typeof hayPlantilla === 'function' && hayPlantilla();
    return `
      <div class="acc anuncio-editor__acciones">
        <button class="btn btn--principal" type="button" data-anuncio-ver
                ${conVista ? '' : 'disabled title="Esta carta todavía no admite vista previa"'}>Ver cómo queda</button>
        <button class="btn btn--peligro" type="button" data-anuncio-borrar
                ${a ? '' : 'disabled'}>Borrar el anuncio</button>
      </div>`;
  }

  const INTRO = `
    <p class="anuncio-editor__intro">Es la ventanita que sale encima de tu carta al abrirla, para
      destacar algo: un plato nuevo, una oferta, un evento… Sus colores y su letra son los de tu
      carta: se cambian en «Ajustes de la carta». Lo que cambies aquí se publica con
      «Publicar cambios».</p>`;

  /* Repinta la ventana entera, sin mover el desplazamiento. Se usa al
     abrirla y cuando cambia algo que no es un texto (el interruptor, la
     foto…). Al escribir no se repinta: se perdería el cursor. */
  function pintarVentanaAnuncio() {
    if (!ventana || !ventana.abierta() || !estado.datos) return;
    const lienzo = ventana.lienzo;
    const desplazado = lienzo.scrollTop;
    const a = anuncioActual();
    lienzo.innerHTML = `
      <div class="anuncio-editor">
        ${INTRO}
        ${bloqueInterruptor(a)}
        ${bloqueTextos(a)}
        ${bloqueFoto(a)}
        ${bloqueAcciones(a)}
      </div>`;
    lienzo.scrollTop = desplazado;
  }

  function refrescarEstado() {
    const pastilla = ventana.lienzo.querySelector('[data-anuncio-estado]');
    if (pastilla) pastilla.outerHTML = htmlEstado(anuncioActual());
  }

  /* ---------- Lo que se puede hacer ---------- */

  function cambiarEncendida(encendida) {
    const a = asegurarAnuncio();
    if ((a.activo !== false) === encendida) return;
    a.activo = encendida;
    marcarSucio();
    pintarVentanaAnuncio();
  }

  function elegirFoto() {
    asegurarAnuncio();
    abrirModalImagen('anuncio', ID_FOTO);
  }

  /* La vista previa abre la carta como el comensal: si el anuncio está
     encendido y tiene algo, sale encima, con lo que hay sin publicar. */
  function verComoQueda() {
    if (typeof abrirVistaPrevia !== 'function') return;
    ventana.cerrar();
    abrirVistaPrevia();
  }

  function borrarAnuncio() {
    const a = anuncioActual();
    if (!a) return;
    const conFoto = !!(a.imagen || estado.imagenesPendientes[rutaImagenRepo('anuncio', ID_FOTO)]);
    if (!confirm(`¿Borrar el anuncio entero? Se quitan sus textos${conFoto ? ' y su foto' : ''}. ` +
                 'Al publicar, la carta se abrirá sin ventana emergente.')) return;
    // Olvida la foto preparada y, si había una publicada, la borra al publicar.
    marcarImagenParaBorrar('anuncio', ID_FOTO, a);
    delete estado.datos.anuncio;
    marcarSucio();
    pintarVentanaAnuncio();
    avisar('Anuncio borrado. Pulsa «Publicar cambios» para quitarlo de la carta.', 'bien');
  }

  /* ---------- Sucesos de la ventana ---------- */

  function alEscribir(ev) {
    const t = ev.target;
    const ed = t.dataset.ed || '';
    if (!ed.startsWith('anuncio-')) return;
    asignarTexto(asegurarAnuncio(), ed.slice('anuncio-'.length), t.dataset.lang, t.value);
    marcarSucio();
    refrescarEstado();
  }

  function alPulsar(ev) {
    const t = ev.target;
    const interruptor = t.closest('[data-anuncio-activo]');
    if (interruptor) { cambiarEncendida(interruptor.dataset.anuncioActivo === 'si'); return; }
    if (t.closest('[data-anuncio-foto]')) { elegirFoto(); return; }
    if (t.closest('[data-anuncio-ver]')) { verComoQueda(); return; }
    if (t.closest('[data-anuncio-borrar]')) borrarAnuncio();
  }

  function crearVentana() {
    if (ventana) return ventana;
    ventana = crearVentanaFlotante({
      titulo: 'Ventana emergente',
      subtitulo: 'Se publica con «Publicar cambios»',
      rotuloCerrar: 'Cerrar la ventana emergente',
      alCerrar: quitarAnuncioSinUsar
    });
    ventana.lienzo.classList.add('vp__lienzo--formulario');
    ventana.lienzo.addEventListener('input', alEscribir);
    ventana.lienzo.addEventListener('click', alPulsar);
    return ventana;
  }

  function abrir() {
    if (!estado.datos) {
      avisar('Trae la carta antes de preparar la ventana emergente.', 'error');
      return;
    }
    crearVentana().abrir();
    ventana.lienzo.scrollTop = 0;
    pintarVentanaAnuncio();
  }

  /* ---------- Arranque ---------- */
  // La ventana de la foto la vuelve a pintar al guardar o quitar la foto.
  window.pintarVentanaAnuncio = pintarVentanaAnuncio;

  const boton = $('#btnAnuncio');
  if (boton) boton.addEventListener('click', abrir);
})();
