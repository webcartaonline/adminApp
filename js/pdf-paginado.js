/* =========================================================
   PDF DE LA CARTA · PAGINADO
   Reparte las unidades (portada, secciones, grupos, platos,
   pie) en hojas del tamaño de papel elegido, de modo que:
     · ningún plato quede partido entre dos páginas,
     · se aprovechen las columnas que caben en el ancho,
     · el estilo y las proporciones se mantengan igual sea
       cual sea el tamaño de papel.
   ========================================================= */

function pdfMmAPx(mm) { return mm * PDF_PX_POR_MM; }

/* Traduce las opciones a medidas concretas en píxeles y decide
   cuántas columnas caben. */
function pdfMedidas(opciones) {
  const base = PDF_TAMANOS[opciones.tamano] || PDF_TAMANOS[PDF_TAMANO_DEFECTO];
  const vertical = opciones.orientacion !== 'apaisado';
  const anchoMm = vertical ? base.ancho : base.alto;
  const altoMm  = vertical ? base.alto : base.ancho;

  const m = opciones.margenes;
  const contAnchoMm = Math.max(20, anchoMm - m.izquierda - m.derecha);
  const contAltoMm  = Math.max(20, altoMm - m.arriba - m.abajo);

  // Columnas: automáticas según el ancho, o las que fije el cliente.
  let columnas;
  if (opciones.columnas === 'auto') {
    const minCol = PDF_COL_MIN_MM + (opciones.imagenes.item ? 18 : 0);
    columnas = Math.max(1, Math.min(PDF_COL_MAX, Math.floor(contAnchoMm / minCol)));
  } else {
    columnas = Math.max(1, Math.min(PDF_COL_MAX, parseInt(opciones.columnas, 10) || 1));
  }

  const gapPx = pdfMmAPx(6);
  const contAnchoPx = pdfMmAPx(contAnchoMm);
  const contAltoPx = pdfMmAPx(contAltoMm);
  const colAnchoPx = (contAnchoPx - gapPx * (columnas - 1)) / columnas;

  return {
    anchoMm, altoMm,
    anchoPx: pdfMmAPx(anchoMm), altoPx: pdfMmAPx(altoMm),
    margenPx: { arriba: pdfMmAPx(m.arriba), abajo: pdfMmAPx(m.abajo), izquierda: pdfMmAPx(m.izquierda), derecha: pdfMmAPx(m.derecha) },
    contAnchoPx, contAltoPx, columnas, colAnchoPx, gapPx,
    multicolumna: columnas > 1
  };
}

/* Un medidor invisible con los mismos estilos que las hojas, para
   saber cuánto ocupará cada unidad antes de colocarla. */
function pdfCrearMedidor(colores) {
  const raiz = pdfCrear('div', 'pdf-raiz pdf-medidor');
  for (const [k, v] of Object.entries(colores)) raiz.style.setProperty(k, v);
  const cajaCol = pdfCrear('div', 'pdf-medidor__caja');
  const cajaFull = pdfCrear('div', 'pdf-medidor__caja');
  raiz.appendChild(cajaCol);
  raiz.appendChild(cajaFull);
  document.body.appendChild(raiz);
  return {
    raiz, cajaCol, cajaFull,
    medir(el, ancho, caja) {
      caja.style.width = ancho + 'px';
      caja.appendChild(el);
      const alto = el.offsetHeight;
      caja.removeChild(el);
      return alto;
    },
    destruir() { raiz.remove(); }
  };
}

/* Crea una hoja vacía con su zona de contenido (respetando los
   márgenes) y sus columnas. */
function pdfCrearHoja(M, bandaEl, bandaAlto) {
  const hoja = pdfCrear('div', 'pdf-hoja');
  hoja.style.width = M.anchoPx + 'px';
  hoja.style.height = M.altoPx + 'px';
  hoja.style.paddingTop = M.margenPx.arriba + 'px';
  hoja.style.paddingBottom = M.margenPx.abajo + 'px';
  hoja.style.paddingLeft = M.margenPx.izquierda + 'px';
  hoja.style.paddingRight = M.margenPx.derecha + 'px';

  if (bandaEl) hoja.appendChild(bandaEl);

  const cols = pdfCrear('div', 'pdf-columnas');
  cols.style.gap = M.gapPx + 'px';
  const columnas = [];
  for (let i = 0; i < M.columnas; i++) {
    const c = pdfCrear('div', 'pdf-col');
    c.style.width = M.colAnchoPx + 'px';
    cols.appendChild(c);
    columnas.push(c);
  }
  hoja.appendChild(cols);

  return {
    hoja, columnas,
    usado: new Array(M.columnas).fill(0),
    altoCol: M.contAltoPx - (bandaAlto || 0),
    ponerPie(pieEl) { hoja.appendChild(pieEl); }
  };
}

/* Reparte y devuelve la lista de hojas ya montadas. */
function pdfPaginar(unidades, M, colores) {
  const med = pdfCrearMedidor(colores);
  const TOL = 1.5;                 // holgura de un pixel y pico al comparar alturas
  const paginas = [];
  let pag = null;
  let col = 0;

  function abrirPagina(bandaUnidad) {
    let bandaEl = null, bandaAlto = 0;
    if (bandaUnidad) {
      bandaAlto = med.medir(bandaUnidad.el, M.contAnchoPx, med.cajaFull);
      bandaEl = bandaUnidad.el;
    }
    pag = pdfCrearHoja(M, bandaEl, bandaAlto ? bandaAlto : 0);
    col = 0;
    paginas.push(pag);
    return pag;
  }

  function alturaLibre() { return pag.altoCol - pag.usado[col]; }

  function avanzarColumna() {
    col++;
    if (col >= M.columnas) abrirPagina(null);   // página de continuación, sin banda
  }

  // Coloca un bloque en la columna actual; si no cabe, salta de
  // columna o de página. Si es más alto que una columna entera, se
  // pone solo y se acepta (caso extremo y raro).
  function colocar(el, alto) {
    if (!pag) abrirPagina(null);
    if (alto > pag.altoCol) {
      if (pag.usado[col] > 0) avanzarColumna();
      pag.columnas[col].appendChild(el);
      pag.usado[col] = pag.altoCol;              // esa columna queda cerrada
      return;
    }
    while (alto > alturaLibre() + TOL) avanzarColumna();
    pag.columnas[col].appendChild(el);
    pag.usado[col] += alto;
  }

  for (let i = 0; i < unidades.length; i++) {
    const u = unidades[i];

    if (u.tipo === 'portada') {
      // La portada ocupa su propia hoja, a sangre completa.
      const hoja = pdfCrear('div', 'pdf-hoja pdf-hoja--portada');
      hoja.style.width = M.anchoPx + 'px';
      hoja.style.height = M.altoPx + 'px';
      hoja.appendChild(u.el);
      paginas.push({ hoja, columnas: [], usado: [], altoCol: 0, ponerPie() {} });
      pag = null;                                // la siguiente sección abre hoja nueva
      continue;
    }

    if (u.tipo === 'seccion') {
      if (M.multicolumna) { abrirPagina(u); continue; }
      // Una columna: la banda es un bloque más, pero no debe quedarse
      // sola al final de la página; se mira que quepa con lo que sigue.
      const h = med.medir(u.el, M.colAnchoPx, med.cajaCol);
      const sig = unidades[i + 1];
      const hSig = sig && sig.tipo !== 'portada' ? med.medir(sig.el, M.colAnchoPx, med.cajaCol) : 0;
      if (!pag) abrirPagina(null);
      if (h + hSig > alturaLibre() + TOL) { avanzarColumna(); }
      colocar(u.el, h);
      continue;
    }

    if (u.tipo === 'grupo') {
      const h = med.medir(u.el, M.colAnchoPx, med.cajaCol);
      // El título de grupo no debe quedar huérfano: tiene que caber con
      // su primer plato en la misma columna.
      const sig = unidades[i + 1];
      const hSig = (sig && sig.tipo === 'item') ? med.medir(sig.el, M.colAnchoPx, med.cajaCol) : 0;
      if (!pag) abrirPagina(null);
      if (h + hSig > alturaLibre() + TOL && (pag.usado[col] > 0 || col < M.columnas - 1)) {
        // hay sitio en otra columna/página: mover el título allí
        if (h + hSig <= pag.altoCol) { while (h + hSig > alturaLibre() + TOL) avanzarColumna(); }
      }
      colocar(u.el, h);
      continue;
    }

    if (u.tipo === 'item') {
      const h = med.medir(u.el, M.colAnchoPx, med.cajaCol);
      colocar(u.el, h);
      continue;
    }

    if (u.tipo === 'pie') {
      // El pie va a lo ancho, al final. Si cabe bajo la columna más
      // llena de la última página, se pone ahí; si no, en una hoja nueva.
      const h = med.medir(u.el, M.contAnchoPx, med.cajaFull);
      if (!pag) abrirPagina(null);
      const usadoMax = Math.max(0, ...pag.usado);
      if (h <= pag.altoCol - usadoMax) {
        pag.ponerPie(u.el);
      } else {
        abrirPagina(null);
        pag.ponerPie(u.el);
      }
      continue;
    }
  }

  med.destruir();
  return paginas.map(p => p.hoja);
}