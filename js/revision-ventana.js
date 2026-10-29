/* =========================================================
   REVISAR ANTES DE PUBLICAR
   «Publicar cambios» ya no publica a la primera: abre esta
   ventana grande, que enseña en tarjetas lo que se va a
   publicar y lo que falta, para que nada salga sin querer.

     · «Lo que vas a publicar»: qué cambia respecto a lo que
       ven hoy los clientes (revision-cambios.js), de la carta
       y de «Ajustes de la carta».
     · «Antes de publicar, revisa esto»: nombres en blanco,
       traducciones, alérgenos, precios a cero, platos sin
       foto… (revision-avisos.js). Se arreglan aquí mismo, y lo
       arreglado se publica con lo demás.

   Abajo, dos botones juntos:
     · «Descartar todos los cambios»: pregunta antes
       (dialogo-confirmar.js) y, si se confirma, vuelve a
       traer la carta publicada y olvida todo lo que había sin
       publicar (descartarCambios(), en publicar.js).
     · «Publicar»: cierra la ventana y publica como siempre
       (publicar(), en publicar.js), en el orden de siempre.

   Cerrar la ventana (la X, Esc o tocar fuera) no toca nada:
   los cambios siguen ahí, sin publicar.

   La ventana es el molde de siempre (ventana-flotante.js),
   con su tamaño propio (vp--revision: todo el ancho, con
   margen) y la animación de abrir y cerrar (vp--animada).
   Su aspecto está en css/revision.css.
   ========================================================= */
(function () {

  /* Cuántas líneas se ven de entrada en cada tarjeta. El resto, detrás
     de «Ver N más»: una carta con cien platos sin alérgenos no debe
     convertir la ventana en una lista sin fin. */
  const A_LA_VISTA_CAMBIOS = 6;
  const A_LA_VISTA_AVISOS = 5;

  /* Lo que tarda «Ajustes de la carta» en guardar su borrador tras la
     última tecla (guardarBorradorApariencia, 350 ms), con un poco de
     margen. Se espera eso antes de leerlo, mientras se abre la ventana. */
  const ESPERA_BORRADOR_MS = 400;

  let ventana = null;

  /* Lo que se lee de «Ajustes de la carta» al abrir. publicada vale
     undefined si no se ha podido leer (sin internet, por ejemplo). */
  let pagina = { borrador: null, publicada: null, archivos: 0, porBorrar: 0 };

  /* ---------- Iconos (trazos de 24×24) ---------- */
  const ICONOS = {
    mas: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    lapiz: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    capas: '<path d="m12 4 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 16 8 4 8-4"/>',
    carpeta: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
    orden: '<path d="M8 4v16M4.5 7.5 8 4l3.5 3.5"/><path d="M16 20V4M12.5 16.5 16 20l3.5-3.5"/>',
    anuncio: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 9.5h9M7.5 13h6"/>',
    idioma: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.5 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.5-3.5-8.5s1.1-5.9 3.5-8.5Z"/>',
    pincel: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5 8.5-8.5Z"/><path d="M6 13c-2 0-2.5 2-2.5 3.5S2.5 19.5 2.5 19.5 7 20 8.5 18.5 9 15 6 13Z"/>',
    gota: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z"/>',
    portada: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="m3.5 16 5-5 4 4 2.5-2.5 5 5"/><circle cx="15.5" cy="9" r="1.6"/>',
    letra: '<path d="M5 19 10.5 5h1L17 19"/><path d="M7.2 14h7.6"/>',
    disposicion: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 9h16M9 9v11"/>',
    pie: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M4 15h16M8 18h8"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    bolsa: '<path d="M5.5 8h13l-1 11.5h-11Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    aviso: '<path d="M12 9v4"/><path d="M12 16.5v.5"/><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
    euro: '<path d="M17 6.5A7 7 0 1 0 17 17.5"/><path d="M4 10.5h9M4 13.5h9"/>',
    hecho: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };

  const icono = (nombre) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre] || ICONOS.lapiz}</svg>`;

  const ICONO_DEL_AVISO = {
    nombres: 'lapiz', traducciones: 'idioma', alergenos: 'aviso', precios: 'euro',
    fotos: 'portada', vacios: 'carpeta', anuncio: 'anuncio'
  };

  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  /* Un texto largo (una descripción entera) no cabe en una línea del
     resumen: se recorta y el entero queda en el globito. */
  function corto(texto, max = 90) {
    const t = String(texto ?? '');
    return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
  }

  /* ---------- Lo que se lee al abrir ---------- */

  /* El borrador de «Ajustes de la carta» y, si lo hay, lo publicado
     para compararlo. Sin borrador no hay nada que leer de internet. */
  async function leerLaPagina() {
    pagina = { borrador: null, publicada: null, archivos: 0, porBorrar: 0 };
    if (estado.aparienciaSucia) await new Promise((r) => setTimeout(r, ESPERA_BORRADOR_MS));
    const cliente = clienteActual();
    let borrador = null;
    try { borrador = await Almacen.leer('apariencia', cliente); } catch { /* sin cajón */ }
    if (!borrador || !borrador.datos) return;

    const [publicada, archivos] = await Promise.all([
      leerApariencia().catch(() => undefined),
      archivosSinSubir(cliente)
    ]);
    pagina = {
      borrador: borrador.datos,
      publicada,
      archivos: archivos.length,
      porBorrar: Array.isArray(borrador.porBorrar) ? borrador.porBorrar.length : 0
    };
  }

  /* ---------- Lo que se calcula ---------- */

  function tarjetasDeLaPagina() {
    if (!pagina.borrador) return [];
    if (pagina.publicada === undefined) {
      return [{
        clave: 'pagina-sin-comparar', zona: 'pagina', titulo: 'Ajustes de la carta', icono: 'pincel',
        lineas: [{ tipo: 'cambiado', titulo: 'Hay cambios sin publicar', donde: '',
                   detalles: [{ texto: 'No hemos podido traer lo publicado para compararlo (¿sin conexión?). Se publicarán igualmente.' }] }]
      }];
    }
    return CambiosSinPublicar.deLaApariencia(pagina.publicada, pagina.borrador);
  }

  /* ¿La ventana emergente está encendida, se ha tocado y no tiene nada?
     Las mismas cuentas que hace la propia ventana (ventana-anuncio.js). */
  function anuncioEncendidoYVacio() {
    const a = estado.datos?.anuncio;
    if (!a || typeof a !== 'object' || a.activo === false) return false;
    if (!Object.keys(a).some((k) => k !== 'activo')) return false;
    const conTexto = ['titulo', 'mensaje', 'descripcion']
      .some((campo) => estado.idiomas.some((L) => valorTexto(a[campo], L).trim()));
    return !conTexto && !(a.imagen && hayImagenes());
  }

  function avisosDeAhora() {
    return AvisosDeLaCarta.deLaCarta(estado.datos, {
      idiomas: estado.idiomas,
      fotosDePlatos: hayImagenes() && puedeImagenItem(),
      anuncioVacio: anuncioEncendidoYVacio()
    });
  }

  /* ---------- Piezas de la ventana: los cambios ---------- */

  function htmlValor(valor) {
    return valor === '' ? '<i class="rev-vacio">vacío</i>' : `<span title="${escapar(valor)}">${escapar(corto(valor))}</span>`;
  }

  function htmlColor(valor) {
    const valido = /^#[0-9a-f]{3,8}$/i.test(String(valor || ''));
    const muestra = valido ? `<span class="rev-muestra" style="background:${valor}" aria-hidden="true"></span>` : '';
    return `<span class="rev-color">${muestra}${valor ? escapar(valor) : '<i class="rev-vacio">sin color</i>'}</span>`;
  }

  function htmlDetalle(d) {
    if (d.texto) return `<li>${escapar(d.texto)}</li>`;
    const campo = `<span class="rev-campo">${escapar(d.campo)}:</span>`;
    if (d.mas || d.menos) {
      const etiquetas = [
        ...(d.mas || []).map((x) => `<span class="rev-etq rev-etq--mas">+ ${escapar(x)}</span>`),
        ...(d.menos || []).map((x) => `<span class="rev-etq rev-etq--menos">− ${escapar(x)}</span>`)
      ].join(' ');
      return `<li>${campo} ${etiquetas}</li>`;
    }
    const pinta = d.color ? htmlColor : htmlValor;
    if (d.antes === null || d.antes === undefined) return `<li>${campo} <span class="rev-despues">${pinta(d.despues)}</span></li>`;
    return `<li>${campo} <span class="rev-antes">${pinta(d.antes)}</span>
              <span class="rev-flecha" aria-label="pasa a">→</span>
              <span class="rev-despues">${pinta(d.despues)}</span></li>`;
  }

  const MARCAS = {
    nuevo: { signo: '+', rotulo: 'Nuevo' },
    quitado: { signo: '−', rotulo: 'Quitado' },
    cambiado: { signo: '•', rotulo: 'Cambiado' },
    movido: { signo: '↕', rotulo: 'Movido' }
  };

  function htmlLinea(l) {
    const marca = MARCAS[l.tipo] || MARCAS.cambiado;
    return `
      <li class="rev-linea">
        <span class="rev-marca rev-marca--${l.tipo}" title="${marca.rotulo}" aria-label="${marca.rotulo}">${marca.signo}</span>
        <div class="rev-linea__cuerpo">
          <p class="rev-linea__titulo">${escapar(l.titulo)}</p>
          ${l.donde ? `<p class="rev-linea__donde">${escapar(l.donde)}</p>` : ''}
          ${l.detalles.length ? `<ul class="rev-detalles">${l.detalles.map(htmlDetalle).join('')}</ul>` : ''}
        </div>
      </li>`;
  }

  /* Las primeras a la vista; el resto, plegado detrás de «Ver N más». */
  function htmlLista(elementos, aLaVista, clase, pintar) {
    const vistos = elementos.slice(0, aLaVista).map(pintar).join('');
    const resto = elementos.slice(aLaVista);
    return `<ul class="${clase}">${vistos}</ul>` + (resto.length ? `
      <details class="rev-mas">
        <summary>Ver ${plural(resto.length, 'más', 'más')}</summary>
        <ul class="${clase}">${resto.map(pintar).join('')}</ul>
      </details>` : '');
  }

  function htmlTarjetaDeCambio(t) {
    return `
      <article class="rev-tarjeta rev-tarjeta--${t.zona}">
        <header class="rev-tarjeta__cabecera">
          <span class="rev-icono">${icono(t.icono)}</span>
          <div class="rev-tarjeta__rotulos">
            <span class="rev-tarjeta__zona">${t.zona === 'pagina' ? 'Ajustes de la carta' : 'Carta'}</span>
            <h3 class="rev-tarjeta__titulo">${escapar(t.titulo)}</h3>
          </div>
          <span class="rev-cuenta" title="${plural(t.lineas.length, 'cambio', 'cambios')}">${t.lineas.length}</span>
        </header>
        ${htmlLista(t.lineas, A_LA_VISTA_CAMBIOS, 'rev-lineas', htmlLinea)}
      </article>`;
  }

  function htmlCambios(tarjetas) {
    const cuerpo = tarjetas.length
      ? `<div class="rev-rejilla">${tarjetas.map(htmlTarjetaDeCambio).join('')}</div>`
      : `<p class="rev-nada">No hay cambios que se noten en la carta: quizá cambiaste algo y lo dejaste como estaba.
           Puedes publicar igualmente o cerrar esta ventana.</p>`;
    return `
      <section class="rev-apartado" aria-labelledby="revTituloCambios">
        <div class="rev-apartado__cabecera">
          <h2 class="rev-apartado__titulo" id="revTituloCambios">Lo que vas a publicar</h2>
          <p class="rev-apartado__intro">Esto es lo que cambia respecto a la carta que ven hoy tus clientes.
            Si ves algo que no querías tocar, cierra esta ventana y corrígelo antes de publicar.</p>
        </div>
        ${cuerpo}
      </section>`;
  }

  /* ---------- Piezas de la ventana: los avisos ---------- */

  const atributosDe = (caso) =>
    `data-tipo="${escapar(caso.tipo)}" data-id="${escapar(caso.id)}"`;

  function campoDeArreglo(caso, idioma, { etiqueta, largo, marcador }) {
    const atributos = `data-rev-texto ${atributosDe(caso)} data-campo="${escapar(caso.campo || 'nombre')}"
                       data-lang="${escapar(idioma)}" placeholder="${escapar(marcador)}" aria-label="${escapar(etiqueta)}"`;
    return largo ? `<textarea ${atributos} rows="2"></textarea>` : `<input type="text" ${atributos}>`;
  }

  /* Lo que se puede hacer con cada caso, según el aviso. */
  const ARREGLOS = {
    nombres: (caso) => campoDeArreglo(caso, estado.idiomas[0], {
      etiqueta: `Nombre de ${caso.que.toLowerCase()}`, marcador: `Escribe el nombre`
    }),
    traducciones: (caso, aviso) => `
      <p class="rev-caso__original"><span>${escapar(nombreDeIdioma(estado.idiomas[0]))}:</span> ${escapar(caso.referencia)}</p>
      ${campoDeArreglo(caso, aviso.idioma, {
        etiqueta: `${caso.rotulo} en ${idiomaEnEspanol(aviso.idioma)}`, largo: caso.largo,
        marcador: `${caso.rotulo} en ${idiomaEnEspanol(aviso.idioma)}`
      })}`,
    alergenos: (caso) => `
      <div class="chips rev-chips" role="group" aria-label="Alérgenos de ${escapar(caso.nombre || 'este plato')}">
        ${ALERGENOS.map((a) => `<button class="chip" type="button" data-rev-alergeno="${a}" ${atributosDe(caso)}
                                aria-pressed="false">${ETIQUETAS[a]}</button>`).join('')}
      </div>`,
    precios: (caso) => `
      <label class="rev-precio">
        <span class="campo__etiqueta">Precio (€)</span>
        <input type="number" step="0.05" min="0" inputmode="decimal" data-rev-precio ${atributosDe(caso)}
               value="${caso.precio}" aria-label="Precio de ${escapar(caso.nombre || 'este plato')}">
      </label>`,
    fotos: (caso) => `<button class="btn btn--suave btn--mini" type="button" data-rev-foto ${atributosDe(caso)}>Subir foto</button>`,
    vacios: (caso) => `
      <p class="rev-caso__motivo">${escapar(caso.motivo)}</p>
      <button class="btn btn--suave btn--mini" type="button" data-rev-ir ${atributosDe(caso)}
              data-seccion="${escapar(caso.seccion || '')}">Ir ${caso.tipo === 'seccion' ? 'a la sección' : 'al grupo'}</button>`,
    anuncio: () => `<button class="btn btn--suave btn--mini" type="button" data-rev-anuncio>Abrir la ventana emergente</button>`
  };

  function htmlCaso(caso, aviso) {
    const nombre = caso.nombre || `${caso.que || 'Plato'} sin nombre`;
    const rotulo = aviso.clave === 'traducciones' ? `${nombre} · ${caso.rotulo}` : nombre;
    return `
      <li class="rev-caso" data-rev-caso>
        <div class="rev-caso__cabecera">
          <span class="rev-caso__hecho" aria-hidden="true">${icono('hecho')}</span>
          <div>
            <p class="rev-caso__nombre">${escapar(rotulo)}</p>
            <p class="rev-caso__donde">${escapar(caso.donde)}</p>
          </div>
        </div>
        <div class="rev-caso__arreglo">${ARREGLOS[aviso.clave](caso, aviso)}</div>
      </li>`;
  }

  const ZONA_DEL_NIVEL = { falta: 'Falta', revisa: 'Revisa', idea: 'Sugerencia' };

  function htmlTarjetaDeAviso(aviso) {
    return `
      <article class="rev-tarjeta rev-tarjeta--aviso rev-tarjeta--${aviso.nivel}" data-rev-aviso>
        <header class="rev-tarjeta__cabecera">
          <span class="rev-icono">${icono(ICONO_DEL_AVISO[aviso.clave])}</span>
          <div class="rev-tarjeta__rotulos">
            <span class="rev-tarjeta__zona">${ZONA_DEL_NIVEL[aviso.nivel]}</span>
            <h3 class="rev-tarjeta__titulo">${escapar(aviso.titulo)}</h3>
          </div>
          <span class="rev-cuenta" data-rev-pendientes title="Por revisar">${aviso.casos.length}</span>
        </header>
        <p class="rev-tarjeta__explicacion">${escapar(aviso.explicacion)}</p>
        ${htmlLista(aviso.casos, A_LA_VISTA_AVISOS, 'rev-casos', (caso) => htmlCaso(caso, aviso))}
      </article>`;
  }

  function htmlAvisos(avisos) {
    const cuerpo = avisos.length
      ? `<div class="rev-rejilla">${avisos.map(htmlTarjetaDeAviso).join('')}</div>`
      : `<p class="rev-todo-bien"><span class="rev-icono">${icono('hecho')}</span>
           Todo en orden: no falta ningún nombre, precio, traducción ni alérgeno.</p>`;
    return `
      <section class="rev-apartado" aria-labelledby="revTituloAvisos">
        <div class="rev-apartado__cabecera">
          <h2 class="rev-apartado__titulo" id="revTituloAvisos">Antes de publicar, revisa esto</h2>
          <p class="rev-apartado__intro">Datos que faltan o que conviene comprobar en toda la carta. Puedes
            arreglarlos aquí mismo: lo que cambies se publica con lo demás. Ninguno impide publicar.</p>
        </div>
        ${cuerpo}
      </section>`;
  }

  /* ---------- Piezas de la ventana: el resumen de arriba y el pie ---------- */

  function htmlCifra(n, texto, clase = '') {
    return `<span class="rev-cifra ${clase}"><b>${n}</b> ${escapar(texto)}</span>`;
  }

  function htmlResumen(tarjetasCarta, tarjetasPagina, avisos) {
    const cuenta = (tarjetas) => tarjetas.reduce((n, t) => n + t.lineas.length, 0);
    const enCarta = cuenta(tarjetasCarta), enPagina = cuenta(tarjetasPagina);
    const suben = Object.keys(estado.imagenesPendientes).length + pagina.archivos;
    const seBorran = estado.imagenesPorBorrar.length + pagina.porBorrar;
    const porRevisar = avisos.reduce((n, a) => n + a.casos.length, 0);
    const cifras = [
      htmlCifra(enCarta, enCarta === 1 ? 'cambio en la carta' : 'cambios en la carta'),
      enPagina ? htmlCifra(enPagina, enPagina === 1 ? 'cambio en los ajustes' : 'cambios en los ajustes') : '',
      suben ? htmlCifra(suben, suben === 1 ? 'archivo nuevo se subirá' : 'archivos nuevos se subirán', 'rev-cifra--sube') : '',
      seBorran ? htmlCifra(seBorran, seBorran === 1 ? 'archivo se borrará' : 'archivos se borrarán', 'rev-cifra--borra') : '',
      porRevisar
        ? `<span class="rev-cifra rev-cifra--aviso"><b data-rev-total>${porRevisar}</b> por revisar</span>`
        : htmlCifra('✓', 'nada por revisar', 'rev-cifra--bien')
    ].join('');
    return `<div class="rev-resumen">${cifras}</div>`;
  }

  function htmlPie() {
    const puede = puedePublicar();
    const nota = puede
      ? 'Cerrar esta ventana no borra nada: tus cambios siguen aquí, sin publicar.'
      : 'Tu plan no permite publicar cambios. Puedes descartarlos o cerrar esta ventana.';
    return `
      <p class="rev-pie__nota">${nota}</p>
      <div class="rev-pie__botones">
        <button class="btn btn--peligro" type="button" data-rev-descartar>Descartar todos los cambios</button>
        <button class="btn btn--principal" type="button" data-rev-publicar ${puede ? '' : 'disabled'}>Publicar</button>
      </div>`;
  }

  /* ---------- Pintar ---------- */

  const cuerpo = () => ventana.lienzo.querySelector('[data-rev-cuerpo]');
  const pie = () => ventana.lienzo.querySelector('[data-rev-pie]');

  /* Repinta la ventana entera sin mover el desplazamiento. Se usa al
     abrirla y al cambiar una foto. Al escribir o marcar un alérgeno NO
     se repinta: se perdería el cursor y lo que se está arreglando
     desaparecería de golpe. */
  function pintarVentanaRevision() {
    if (!ventana || !ventana.abierta() || !estado.datos) return;
    const caja = cuerpo();
    const desplazado = caja.scrollTop;
    const tarjetasCarta = CambiosSinPublicar.deLaCarta(estado.publicado, estado.datos);
    const tarjetasPagina = tarjetasDeLaPagina();
    const avisos = avisosDeAhora();
    caja.innerHTML = `
      <div class="rev-contenido">
        ${htmlResumen(tarjetasCarta, tarjetasPagina, avisos)}
        ${htmlCambios([...tarjetasCarta, ...tarjetasPagina])}
        ${htmlAvisos(avisos)}
      </div>`;
    pie().innerHTML = htmlPie();
    caja.scrollTop = desplazado;
  }

  function pintarCargando() {
    cuerpo().innerHTML = `<p class="rev-cargando"><span class="rev-cargando__punto" aria-hidden="true"></span>Preparando el resumen…</p>`;
    pie().innerHTML = htmlPie();
    pie().querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }

  /* Un caso arreglado se queda en su sitio, marcado en verde, y su
     tarjeta descuenta uno. Así se ve el progreso sin que nada salte. */
  function marcarCaso(elemento, hecho) {
    const caso = elemento.closest('[data-rev-caso]');
    if (!caso) return;
    caso.classList.toggle('rev-caso--hecho', hecho);
    const tarjeta = caso.closest('[data-rev-aviso]');
    const pendientes = tarjeta.querySelectorAll('[data-rev-caso]:not(.rev-caso--hecho)').length;
    tarjeta.querySelector('[data-rev-pendientes]').textContent = pendientes;
    tarjeta.classList.toggle('rev-tarjeta--resuelta', pendientes === 0);
    const total = cuerpo().querySelector('[data-rev-total]');
    if (total) total.textContent = cuerpo().querySelectorAll('[data-rev-caso]:not(.rev-caso--hecho)').length;
  }

  /* ---------- Arreglos rápidos ---------- */

  const objetoDe = (el) => objetoDeImagen(el.dataset.tipo, el.dataset.id);

  function alEscribir(ev) {
    const t = ev.target;
    if (t.matches('[data-rev-texto]')) {
      const obj = objetoDe(t);
      if (!obj) return;
      asignarTexto(obj, t.dataset.campo, t.dataset.lang, t.value);
      marcarSucio();
      marcarCaso(t, t.value.trim() !== '');
      return;
    }
    if (t.matches('[data-rev-precio]')) {
      const obj = objetoDe(t);
      if (!obj) return;
      obj.precio = Number(t.value) || 0;
      marcarSucio();
      marcarCaso(t, obj.precio > 0);
    }
  }

  function cambiarAlergeno(boton) {
    const obj = objetoDe(boton);
    if (!obj) return;
    const lista = obj.alergenos = obj.alergenos ?? [];
    const clave = boton.dataset.revAlergeno;
    const sitio = lista.indexOf(clave);
    if (sitio === -1) lista.push(clave); else lista.splice(sitio, 1);
    boton.setAttribute('aria-pressed', String(sitio === -1));
    marcarSucio();
    marcarCaso(boton, lista.length > 0);
  }

  /* Lleva al editor, a la sección o al grupo, para llenarlo allí. */
  function irA(boton) {
    const { tipo, id, seccion } = boton.dataset;
    ventana.cerrar();
    estado.seccionActiva = tipo === 'seccion' ? id : seccion;
    estado.expandidas.add(estado.seccionActiva);
    estado.grupoActivo = tipo === 'grupo' ? id : null;
    pintarTodo();
    $('#zona').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* La ventana emergente tiene su propia ventana: se abre al terminar
     de plegarse esta, para que no se monten una encima de otra. */
  function abrirAnuncio() {
    ventana.cerrar();
    setTimeout(() => $('#btnAnuncio')?.click(), VENTANA_CIERRE_MS);
  }

  /* ---------- Publicar y descartar ---------- */

  /* Lo que se cuenta al publicar o al descartar ya va abajo, como siempre,
     aunque la ventana tarde un momento en plegarse. */
  function cerrarParaSeguir() {
    document.documentElement.classList.remove('revision-abierta');
    ventana.cerrar();
  }

  function publicarYa() {
    cerrarParaSeguir();
    publicar();
  }

  async function pedirDescartar() {
    const seguro = await confirmar({
      titulo: '¿Descartar todos los cambios?',
      texto: 'Se perderá todo lo que has cambiado desde la última vez que publicaste: textos, precios, ' +
             'fotos preparadas y ajustes de la carta. Volverás a tener la carta tal y como la ven tus ' +
             'clientes. Esto no se puede deshacer.',
      rotuloSi: 'Sí, descartarlo todo',
      rotuloNo: 'Cancelar',
      peligro: true
    });
    if (!seguro) return;
    cerrarParaSeguir();
    descartarCambios();
  }

  function alPulsar(ev) {
    const t = ev.target;
    const alergeno = t.closest('[data-rev-alergeno]');
    if (alergeno) { cambiarAlergeno(alergeno); return; }
    const foto = t.closest('[data-rev-foto]');
    if (foto) { abrirModalImagen('item', foto.dataset.id); return; }
    const ir = t.closest('[data-rev-ir]');
    if (ir) { irA(ir); return; }
    if (t.closest('[data-rev-anuncio]')) { abrirAnuncio(); return; }
    if (t.closest('[data-rev-publicar]')) { publicarYa(); return; }
    if (t.closest('[data-rev-descartar]')) pedirDescartar();
  }

  /* ---------- La ventana ---------- */

  function crearVentana() {
    if (ventana) return ventana;
    ventana = crearVentanaFlotante({
      titulo: 'Revisar antes de publicar',
      subtitulo: 'Nada se publica hasta que pulses «Publicar»',
      rotuloCerrar: 'Cerrar sin publicar',
      clase: 'vp--revision',
      animada: true,
      // Lo arreglado aquí tiene que verse también en el editor de detrás.
      alCerrar: () => {
        document.documentElement.classList.remove('revision-abierta');
        if (estado.datos) pintarTodo();
      }
    });
    ventana.lienzo.classList.add('vp__lienzo--revision');
    ventana.lienzo.innerHTML = `
      <div class="rev-cuerpo" data-rev-cuerpo></div>
      <footer class="rev-pie" data-rev-pie></footer>`;
    ventana.lienzo.addEventListener('input', alEscribir);
    ventana.lienzo.addEventListener('click', alPulsar);
    return ventana;
  }

  async function abrir() {
    if (!estado.datos) {
      avisar('Trae la carta antes de publicar.', 'error');
      return;
    }
    crearVentana();
    pintarCargando();
    $('#mensaje').hidden = true;   // el último aviso ya no hace falta
    document.documentElement.classList.add('revision-abierta');
    ventana.abrir();
    cuerpo().scrollTop = 0;
    ventana.lienzo.closest('.vp').querySelector('.vp__cerrar').focus();
    await leerLaPagina();
    pintarVentanaRevision();
  }

  /* ---------- Arranque ---------- */
  // La ventana de la foto la vuelve a pintar al guardar o quitar una foto.
  window.pintarVentanaRevision = pintarVentanaRevision;

  const boton = $('#btnPublicar');
  if (boton) {
    boton.title = 'Revisa lo que has cambiado antes de publicarlo';
    boton.addEventListener('click', abrir);
  }
})();
