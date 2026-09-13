/* =========================================================
   PDF DE LA CARTA · PAGINADO
   Reparte las unidades (portada, secciones, grupos, platos,
   pie) en hojas del tamaño de papel elegido, de modo que:
     · ningún plato quede partido entre dos páginas,
     · las columnas y las páginas queden EQUILIBRADAS, para
       que no aparezca un plato suelto en una hoja casi vacía,
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

/* Crea una hoja vacía con márgenes y sus columnas. */
function pdfCrearHoja(M, bandaEl) {
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
  return { hoja, columnas };
}

/* Una hoja «suelta» (portada, banda sola o pie) con los márgenes puestos. */
function pdfHojaSimple(M, claseExtra) {
  const hoja = pdfCrear('div', 'pdf-hoja' + (claseExtra ? ' ' + claseExtra : ''));
  hoja.style.width = M.anchoPx + 'px';
  hoja.style.height = M.altoPx + 'px';
  if (!claseExtra) {
    hoja.style.paddingTop = M.margenPx.arriba + 'px';
    hoja.style.paddingBottom = M.margenPx.abajo + 'px';
    hoja.style.paddingLeft = M.margenPx.izquierda + 'px';
    hoja.style.paddingRight = M.margenPx.derecha + 'px';
  }
  return hoja;
}

/* =========================================================
   REPARTO
   ========================================================= */

const PDF_TOL = 1.5;          // holgura de un pixel y pico al comparar alturas
const PDF_HUECO_VACIO = 0.55; // por debajo de este llenado, una cola se considera «vacía»

/* Reparte una lista de piezas en tramos que no superen «tope», sin
   cortar ninguna y sin dejar una cabecera (de grupo o de sección)
   suelta al final: la cabecera se lleva SIEMPRE su primera pieza
   siguiente al mismo tramo. Con «objetivo» se busca además que los
   tramos queden parejos (equilibrados), sin pasar del tope.
   Devuelve tramos con índices LOCALES a la lista recibida. */
function pdfRepartir(piezas, tope, objetivo) {
  const tramos = [];
  let t = -1;
  const nuevo = () => { t++; tramos[t] = { idx: [], alto: 0 }; };
  const juntaConSiguiente = i =>
    (piezas[i].tipo === 'grupo' || piezas[i].tipo === 'banda') &&
    piezas[i + 1] && piezas[i + 1].tipo === 'item';
  nuevo();

  for (let i = 0; i < piezas.length; i++) {
    const par = juntaConSiguiente(i);
    const necesita = piezas[i].alto + (par ? piezas[i + 1].alto : 0);
    const vacio = tramos[t].idx.length === 0;

    if (!vacio) {
      const noCabe = tramos[t].alto + necesita > tope + PDF_TOL;
      const pasaObjetivo = objetivo && tramos[t].alto + piezas[i].alto > objetivo + PDF_TOL;
      if (noCabe || pasaObjetivo) nuevo();
    }

    tramos[t].idx.push(i); tramos[t].alto += piezas[i].alto;
    if (par) { tramos[t].idx.push(i + 1); tramos[t].alto += piezas[i + 1].alto; i++; }
  }
  return tramos;
}

/* Reequilibra los DOS últimos tramos cuando el último quedó casi
   vacío: reparte su contenido a partes iguales para que no quede una
   pieza sola en una hoja (o columna) desierta. */
function pdfEquilibrarCola(tramos, piezas, tope) {
  if (tramos.length < 2) return tramos;
  const ultimo = tramos[tramos.length - 1];
  if (ultimo.alto >= tope * PDF_HUECO_VACIO) return tramos;

  const dos = tramos.splice(tramos.length - 2, 2);
  const indices = dos[0].idx.concat(dos[1].idx);
  const sub = indices.map(g => piezas[g]);
  const total = sub.reduce((s, p) => s + p.alto, 0);
  const reparto = pdfRepartir(sub, tope, total / 2);
  reparto.forEach(tr => tramos.push({ idx: tr.idx.map(l => indices[l]), alto: tr.alto }));
  return tramos;
}

/* Nº de columnas necesario, redondeado a páginas completas para no
   dejar columnas vacías sueltas al final. */
function pdfColumnasObjetivo(minimas, porPagina, totalPiezas) {
  let n = Math.ceil(minimas / porPagina) * porPagina;
  n = Math.min(n, totalPiezas);   // no más columnas que piezas
  return Math.max(n, minimas);
}

function pdfPaginar(unidades, M, colores) {
  const med = pdfCrearMedidor(colores);
  const medirCol = el => med.medir(el, M.colAnchoPx, med.cajaCol);
  const medirFull = el => med.medir(el, M.contAnchoPx, med.cajaFull);

  // Separar en portada / secciones / pie.
  let portada = null, pie = null;
  const secciones = [];
  let actual = null;
  for (const u of unidades) {
    if (u.tipo === 'portada') { portada = u; continue; }
    if (u.tipo === 'pie') { pie = u; continue; }
    if (u.tipo === 'seccion') { actual = { banda: u, bloques: [] }; secciones.push(actual); continue; }
    if (!actual) { actual = { banda: null, bloques: [] }; secciones.push(actual); }
    actual.bloques.push(u);
  }

  const paginas = [];        // elementos .pdf-hoja, en orden
  const registro = [];       // {hoja, hueco, ponerPie} para colocar el pie al final

  function apuntar(hoja, hueco) {
    paginas.push(hoja);
    registro.push({ hoja, hueco, ponerPie: el => hoja.appendChild(el) });
  }

  function hojaConColumnas(bandaU, bandaAlto, columnasPiezas) {
    const { hoja, columnas } = pdfCrearHoja(M, bandaU ? bandaU.el : null);
    let maxAlto = 0;
    columnasPiezas.forEach((tramo, k) => {
      if (!tramo) return;
      tramo.idx.forEach(bi => columnas[k].appendChild(tramo.piezas[bi].u.el));
      maxAlto = Math.max(maxAlto, tramo.alto);
    });
    apuntar(hoja, M.contAltoPx - (bandaAlto || 0) - maxAlto);
  }

  // ---------- Portada ----------
  if (portada) {
    const hoja = pdfHojaSimple(M, 'pdf-hoja--portada');
    hoja.appendChild(portada.el);
    paginas.push(hoja);
  }

  // ---------- Secciones ----------
  if (M.multicolumna) {
    for (const sec of secciones) colocarSeccionColumnas(sec);
  } else {
    colocarUnaColumna(secciones);
  }

  // ---------- Pie ----------
  if (pie) {
    const h = medirFull(pie.el);
    const ultima = registro[registro.length - 1];
    if (ultima && h <= ultima.hueco) {
      ultima.ponerPie(pie.el);
    } else {
      const hoja = pdfHojaSimple(M);
      hoja.appendChild(pie.el);
      paginas.push(hoja);
    }
  }

  med.destruir();
  return paginas;

  /* ----- Varias columnas: cada sección empieza en hoja nueva, con su
     banda a lo ancho, y sus platos repartidos en columnas parejas. */
  function colocarSeccionColumnas(sec) {
    if (!sec.bloques.length) return;
    const bandaAlto = sec.banda ? medirFull(sec.banda.el) : 0;
    const piezas = sec.bloques.map(b => ({ u: b, tipo: b.tipo, alto: medirCol(b.el) }));

    // Altura útil de una columna en la primera hoja (con la banda encima).
    const topePrimera = Math.max(60, M.contAltoPx - bandaAlto);

    // ¿La pieza (o el par cabecera+plato) más alto cabe bajo la banda?
    let maxNecesita = 0;
    for (let i = 0; i < piezas.length; i++) {
      const par = piezas[i].tipo === 'grupo' && piezas[i + 1] && piezas[i + 1].tipo === 'item';
      maxNecesita = Math.max(maxNecesita, piezas[i].alto + (par ? piezas[i + 1].alto : 0));
    }

    // Si no cabe, la banda va en su propia hoja y las columnas usan la
    // altura completa (así ese plato alto no se queda solo por la banda).
    let bandaSola = false, tope = topePrimera;
    if (maxNecesita > topePrimera) { bandaSola = true; tope = M.contAltoPx; }
    if (bandaSola && sec.banda) {
      const hoja = pdfHojaSimple(M);
      hoja.appendChild(sec.banda.el);
      apuntar(hoja, M.contAltoPx - bandaAlto);
    }

    // 1) Cuántas columnas llenando a tope.  2) Objetivo equilibrado.
    const aTope = pdfRepartir(piezas, tope, 0);
    const nCols = pdfColumnasObjetivo(aTope.length, M.columnas, piezas.length);
    const total = piezas.reduce((s, p) => s + p.alto, 0);
    let objetivo = Math.max(total / nCols, maxNecesita);
    let cols = pdfRepartir(piezas, tope, objetivo);
    let intentos = 0;
    while (cols.length > nCols && intentos++ < 8) { objetivo *= 1.06; cols = pdfRepartir(piezas, tope, objetivo); }
    if (cols.length > nCols) cols = aTope;     // seguridad: nunca peor que a tope
    cols.forEach(c => c.piezas = piezas);

    // 3) Volcar en hojas (M.columnas columnas por hoja; banda solo en la primera).
    const bandaEnPrimera = bandaSola ? null : sec.banda;
    const bandaAltoPrimera = bandaSola ? 0 : bandaAlto;
    const nPaginas = Math.ceil(cols.length / M.columnas);
    for (let p = 0; p < nPaginas; p++) {
      const banda = p === 0 ? bandaEnPrimera : null;
      const grupo = [];
      for (let k = 0; k < M.columnas; k++) grupo.push(cols[p * M.columnas + k] || null);
      hojaConColumnas(banda, p === 0 ? bandaAltoPrimera : 0, grupo);
    }
  }

  /* ----- Una sola columna: todo seguido (las bandas son un bloque más
     a lo ancho), repartido en páginas parejas para que la última no
     quede con un plato suelto. */
  function colocarUnaColumna(secciones) {
    const flujo = [];
    for (const sec of secciones) {
      if (sec.banda) flujo.push({ u: sec.banda, tipo: 'banda', alto: medirFull(sec.banda.el) });
      sec.bloques.forEach(b => flujo.push({ u: b, tipo: b.tipo, alto: medirCol(b.el) }));
    }
    if (!flujo.length) return;

    const tope = M.contAltoPx;
    let paginasIdx = pdfRepartir(flujo, tope, 0);
    paginasIdx = pdfEquilibrarCola(paginasIdx, flujo, tope);
    paginasIdx.forEach(tramo => { tramo.piezas = flujo; hojaConColumnas(null, 0, [tramo]); });
  }
}