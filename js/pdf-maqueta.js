/* =========================================================
   PDF DE LA CARTA · MAQUETA
   Dibuja la carta pensada para papel. No es una foto de la
   pantalla: coloca TODO seguido (todas las secciones, con sus
   grupos y platos) respetando los colores, la letra y el
   estilo de las fichas de la carta real.

   Devuelve una lista ordenada de «unidades» (portada, banda de
   sección, cabecera de grupo, plato, pie). El módulo de
   paginado se encarga luego de repartirlas en hojas sin
   cortar ninguna.
   ========================================================= */

/* ---------- Utilidades de texto ---------- */
function pdfTexto(campo, idioma) {
  if (campo == null) return '';
  if (typeof campo === 'string') return campo;
  return campo[idioma] || campo.es || campo.en || '';
}
function pdfEuros(precio, idioma) {
  const loc = idioma === 'en' ? 'en-IE' : 'es-ES';
  return new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' }).format(Number(precio) || 0);
}
function pdfNormalizar(nombre) {
  return String(nombre ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_]+/g, '-');
}
function pdfDatoAlergeno(nombre, idioma) {
  const clave = pdfNormalizar(nombre);
  const ficha = PDF_ALERGENOS[clave];
  return {
    clave,
    etiqueta: ficha ? (ficha[idioma] || ficha.es) : nombre,
    icono: ficha ? ficha.icono : PDF_ICONO_DESCONOCIDO
  };
}
const PDF_FOCOS = {
  'centro': 'center', 'arriba': 'center top', 'abajo': 'center bottom',
  'izquierda': 'left center', 'derecha': 'right center',
  'arriba-izquierda': 'left top', 'arriba-derecha': 'right top',
  'abajo-izquierda': 'left bottom', 'abajo-derecha': 'right bottom'
};
function pdfPosicionFoco(foco) { return PDF_FOCOS[pdfNormalizar(foco)] || 'center'; }

/* ---------- Fabriquita de nodos ---------- */
function pdfCrear(tag, clase, html) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (html != null) el.innerHTML = html;
  return el;
}
function pdfSvg(contenido) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`;
}

/* Una foto de fondo, ya convertida a «data:…». Si no hay foto (o no
   bajó), devuelve null y quien llama decide qué hacer. */
function pdfFondoFoto(ctx, rutaRelativa, foco) {
  if (!rutaRelativa) return null;
  const url = ctx.paquete.urlDe(rutaRelativa);
  const dato = ctx.fotos.get(url);
  if (!dato) return null;
  const div = pdfCrear('div', 'pdf-img');
  div.style.backgroundImage = `url("${dato}")`;
  div.style.backgroundPosition = pdfPosicionFoco(foco);
  return div;
}

/* ---------- Etiquetas y alertas (destacados) ----------
   Llevan el color escrito a mano en cada una; se calcula igual
   que en la carta real, con la paleta ya resuelta. */
function pdfEsHex(v) { return pdfHexARgb(v) !== null; }
function pdfFondoDestacado(ctx, d) {
  const e = String(d?.fondo ?? 'principal').trim();
  if (e === 'secundario') return ctx.paquete.paleta.superficie;
  if (pdfEsHex(e)) return e;
  return ctx.paquete.paleta.principal;
}
function pdfLetraDestacado(d, fondo) {
  const e = String(d?.color ?? 'auto').trim();
  if (pdfEsHex(e)) return e;
  return pdfEsColorClaro(fondo) ? '#17140F' : '#FFF8EC';
}
function pdfDestacadosVisibles(lista, idioma) {
  return (Array.isArray(lista) ? lista : []).filter(d => String(pdfTexto(d?.texto, idioma)).trim());
}
function pdfEtiquetasHtml(ctx, lista, posicion) {
  const visibles = pdfDestacadosVisibles(lista, ctx.idioma)
    .filter(e => (pdfNormalizar(e?.posicion) === 'abajo' ? 'abajo' : 'arriba') === posicion);
  if (!visibles.length) return '';
  const items = visibles.map(d => {
    const fondo = pdfFondoDestacado(ctx, d);
    const letra = pdfLetraDestacado(d, fondo);
    return `<li class="pdf-etiqueta" style="background:${fondo};color:${letra}">${escapar(pdfTexto(d.texto, ctx.idioma).trim())}</li>`;
  }).join('');
  return `<ul class="pdf-etiquetas pdf-etiquetas--${posicion}">${items}</ul>`;
}
const PDF_ICONO_ALERTA = '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2v4.6"/><circle cx="12" cy="16" r=".9" fill="currentColor" stroke="none"/>';
function pdfAlertaHtml(ctx, grupo) {
  const escrito = grupo?.alerta ?? grupo?.alertas;
  const primera = pdfDestacadosVisibles(Array.isArray(escrito) ? escrito : [escrito], ctx.idioma)[0];
  if (!primera) return '';
  const fondo = pdfFondoDestacado(ctx, primera);
  const letra = pdfLetraDestacado(primera, fondo);
  const borde = pdfMezclar(fondo, letra, 0.18);
  return `<span class="pdf-alerta" style="background:${fondo};color:${letra};border-color:${borde}">
    ${pdfSvg(PDF_ICONO_ALERTA)}<span>${escapar(pdfTexto(primera.texto, ctx.idioma).trim())}</span></span>`;
}

/* ---------- Portada ---------- */
function pdfUnidadPortada(ctx) {
  const o = ctx.opciones;
  if (!o.portada) return null;

  const negocio = ctx.paquete.carta.negocio || {};
  const marca = ctx.paquete.apariencia?.identidad;
  const master = negocio.imagenes === true;

  const logoRuta = marca?.logo || '';
  const tituloConfig = typeof marca?.titulo === 'string';
  let titulo = tituloConfig ? marca.titulo.trim() : (negocio.nombre ?? 'Carta');
  if (!titulo) titulo = negocio.nombre ?? 'Carta';
  const eslogan = marca?.eslogan != null ? pdfTexto(marca.eslogan, ctx.idioma) : pdfTexto(negocio.lema, ctx.idioma);

  const fondo = marca?.fondo?.imagen ? marca.fondo : (negocio.portada || null);
  const fondoEl = (master && fondo?.imagen) ? pdfFondoFoto(ctx, fondo.imagen, fondo.foco) : null;
  const logoDato = (master && o.mostrarLogo && logoRuta) ? ctx.fotos.get(ctx.paquete.urlDe(logoRuta)) : null;

  const el = pdfCrear('section', 'pdf-portada' + (fondoEl ? ' pdf-portada--foto' : ''));
  if (fondoEl) { el.appendChild(fondoEl); el.appendChild(pdfCrear('div', 'pdf-portada__velo')); }

  const interior = pdfCrear('div', 'pdf-portada__interior');
  if (eslogan) interior.appendChild(pdfCrear('p', 'pdf-portada__lema', escapar(eslogan)));

  const marcaEl = pdfCrear('div', 'pdf-portada__marca');
  if (logoDato) {
    const img = pdfCrear('div', 'pdf-portada__logo');
    img.style.backgroundImage = `url("${logoDato}")`;
    marcaEl.appendChild(img);
  }
  if (o.mostrarTitulo && titulo) {
    marcaEl.appendChild(pdfCrear('h1', 'pdf-portada__nombre', escapar(titulo)));
  }
  // Si el cliente quitó título y logo y no hay foto, no hay portada que enseñar.
  if (!marcaEl.childElementCount && !fondoEl && !eslogan) return null;
  interior.appendChild(marcaEl);
  el.appendChild(interior);

  return { tipo: 'portada', el };
}

/* ---------- Cabecera de sección ----------
   En pantalla el nombre de la sección lo canta la barra de pestañas;
   en papel no hay pestañas, así que la sección SÍ lleva su nombre,
   con el mismo lenguaje visual: sobre su foto si la tiene, o como
   rótulo grande en ámbar si no. */
function pdfUnidadSeccion(ctx, seccion) {
  const nombre = escapar(pdfTexto(seccion.nombre, ctx.idioma));
  const fondoEl = ctx.opciones.imagenes.seccion ? pdfFondoFoto(ctx, seccion.imagen, seccion.foco) : null;

  let el;
  if (fondoEl) {
    el = pdfCrear('header', 'pdf-seccion pdf-seccion--foto');
    el.appendChild(fondoEl);
    el.appendChild(pdfCrear('div', 'pdf-seccion__velo'));
    el.appendChild(pdfCrear('h2', 'pdf-seccion__titulo', nombre));
  } else {
    el = pdfCrear('header', 'pdf-seccion pdf-seccion--simple');
    el.appendChild(pdfCrear('h2', 'pdf-seccion__titulo', nombre));
    el.appendChild(pdfCrear('span', 'pdf-seccion__regla'));
  }
  return { tipo: 'seccion', el, seccionId: seccion.id };
}

/* ---------- Cabecera de grupo ---------- */
function pdfUnidadGrupo(ctx, grupo, seccionId) {
  const titulo = `<h3 class="pdf-grupo__titulo">${escapar(pdfTexto(grupo.nombre, ctx.idioma))}</h3>`;
  const alerta = pdfAlertaHtml(ctx, grupo);
  const fondoEl = ctx.opciones.imagenes.grupo ? pdfFondoFoto(ctx, grupo.imagen, grupo.foco) : null;

  let el;
  if (fondoEl) {
    el = pdfCrear('header', 'pdf-grupo pdf-grupo--foto' + (alerta ? ' pdf-grupo--con-alerta' : ''));
    el.appendChild(fondoEl);
    el.appendChild(pdfCrear('div', 'pdf-grupo__velo'));
    el.appendChild(pdfCrear('div', 'pdf-grupo__rotulo', titulo + alerta));
  } else {
    el = pdfCrear('header', 'pdf-grupo pdf-grupo--simple' + (alerta ? ' pdf-grupo--con-alerta' : ''),
      titulo + alerta + '<span class="pdf-grupo__regla"></span>');
  }
  return { tipo: 'grupo', el, seccionId };
}

/* ---------- Plato ---------- */
function pdfUnidadItem(ctx, item, seccionId) {
  const fichas = (Array.isArray(item.alergenos) ? item.alergenos : []).map(a => pdfDatoAlergeno(a, ctx.idioma));
  const listaFichas = fichas.length
    ? `<ul class="pdf-item__alergenos">${fichas.map(f =>
        `<li class="pdf-ficha" title="${escapar(f.etiqueta)}">${pdfSvg(f.icono)}</li>`).join('')}</ul>`
    : `<span class="pdf-item__limpio">${ctx.ui.sinAlergenos}</span>`;

  const descripcion = pdfTexto(item.descripcion, ctx.idioma);
  const cuerpo =
    `<div class="pdf-item__linea">
       <h4 class="pdf-item__nombre">${escapar(pdfTexto(item.nombre, ctx.idioma))}</h4>
       <span class="pdf-item__precio">${pdfEuros(item.precio, ctx.idioma)}</span>
     </div>
     ${pdfEtiquetasHtml(ctx, item.etiquetas, 'arriba')}
     ${descripcion ? `<p class="pdf-item__descripcion">${escapar(descripcion)}</p>` : ''}
     ${pdfEtiquetasHtml(ctx, item.etiquetas, 'abajo')}
     ${listaFichas}`;

  const el = pdfCrear('article', 'pdf-item');
  el.appendChild(pdfCrear('div', 'pdf-item__cuerpo', cuerpo));

  const fotoEl = ctx.opciones.imagenes.item ? pdfFondoFoto(ctx, item.imagen, 'centro') : null;
  if (fotoEl) {
    const marco = pdfCrear('div', 'pdf-item__foto');
    marco.appendChild(fotoEl);
    el.appendChild(marco);
  }
  return { tipo: 'item', el, seccionId };
}

/* ---------- Pie ----------
   Los mensajes del negocio (horarios, avisos…) y la nota de IVA con
   la fecha, como en la carta real. Las redes sociales no se pintan:
   en papel un icono para tocar no sirve de nada. */
function pdfUnidadPie(ctx) {
  const pie = ctx.paquete.apariencia?.pie;
  const el = pdfCrear('footer', 'pdf-pie');
  el.appendChild(pdfCrear('span', 'pdf-pie__marca'));

  const bloques = (pie?.bloques ?? [])
    .filter(b => String(b?.titulo ?? '').trim() || String(b?.texto ?? '').trim());
  if (bloques.length) {
    const caja = pdfCrear('div', 'pdf-pie__bloques');
    bloques.forEach(b => {
      const t = String(b.titulo ?? '').trim();
      const x = String(b.texto ?? '').trim();
      caja.appendChild(pdfCrear('div', 'pdf-pie__bloque',
        (t ? `<h3 class="pdf-pie__bloque-titulo">${escapar(t)}</h3>` : '') +
        (x ? `<p class="pdf-pie__bloque-texto">${escapar(x)}</p>` : '')));
    });
    el.appendChild(caja);
  }

  const hoy = new Date().getFullYear();
  el.appendChild(pdfCrear('p', 'pdf-pie__nota', `${ctx.ui.ivaNota} · © ${hoy} - ${hoy + 1}`));
  return { tipo: 'pie', el };
}

/* ---------- Montaje ----------
   Devuelve la lista de unidades en el orden en que deben ir. */
function pdfConstruirUnidades(ctx) {
  const unidades = [];
  const portada = pdfUnidadPortada(ctx);
  if (portada) unidades.push(portada);

  for (const s of (ctx.paquete.carta.secciones || [])) {
    const grupos = s.grupos || [];
    if (!grupos.some(g => (g.items || []).length)) continue; // sección vacía: no se imprime
    unidades.push(pdfUnidadSeccion(ctx, s));
    for (const g of grupos) {
      const items = g.items || [];
      if (!items.length) continue;
      unidades.push(pdfUnidadGrupo(ctx, g, s.id));
      for (const it of items) unidades.push(pdfUnidadItem(ctx, it, s.id));
    }
  }
  unidades.push(pdfUnidadPie(ctx));
  return unidades;
}

/* Reúne todas las direcciones de foto que harán falta según las
   opciones, para bajarlas antes de dibujar. */
function pdfUrlsNecesarias(ctx) {
  const urls = [];
  const o = ctx.opciones;
  const carta = ctx.paquete.carta;
  const master = carta?.negocio?.imagenes === true;
  const add = ruta => { if (ruta) urls.push(ctx.paquete.urlDe(ruta)); };

  if (master && o.portada) {
    const marca = ctx.paquete.apariencia?.identidad;
    if (o.mostrarLogo && marca?.logo) add(marca.logo);
    const fondo = marca?.fondo?.imagen ? marca.fondo : (carta.negocio?.portada || null);
    if (fondo?.imagen) add(fondo.imagen);
  }
  if (master) {
    for (const s of (carta.secciones || [])) {
      if (o.imagenes.seccion) add(s.imagen);
      for (const g of (s.grupos || [])) {
        if (o.imagenes.grupo) add(g.imagen);
        for (const it of (g.items || [])) if (o.imagenes.item) add(it.imagen);
      }
    }
  }
  return urls;
}