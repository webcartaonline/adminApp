/* =========================================================
   REVISIÓN · QUÉ HA CAMBIADO
   Compara lo que hay publicado con lo que se va a publicar y
   lo cuenta en frases cortas, para la ventana «Revisar antes
   de publicar» (revision-ventana.js).

   Aquí no se pinta nada: solo se calcula. Devuelve una lista
   de TARJETAS, cada una con sus LÍNEAS:

     tarjeta  { clave, zona:'carta'|'pagina', titulo, icono, lineas:[…] }
     línea    { tipo:'nuevo'|'quitado'|'cambiado'|'movido',
                titulo, donde, detalles:[…] }
     detalle  { texto }                         una frase suelta
              { campo, antes, despues, color? } «Precio: 3,50 € → 4,00 €»
              { campo, mas:[…], menos:[…] }      «Alérgenos: + Gluten − Huevos»

   Las piezas de la carta se reconocen por su id (s-…, g-…,
   i-…), no por su nombre ni por su sitio: así un plato
   renombrado y movido sigue siendo el mismo plato.

   Lo que esté dentro de una sección o un grupo nuevo (o
   eliminado) no se cuenta uno a uno: se resume en la línea de
   la sección o del grupo, para que el resumen no se llene de
   ruido.
   ========================================================= */
const CambiosSinPublicar = (() => {

  /* ---------- Pequeñas herramientas ---------- */

  /* El texto de un campo en un idioma. Igual que valorTexto(), pero sin
     depender del estado: aquí se comparan dos cartas distintas. */
  function texto(valor, idioma, principal) {
    if (valor == null) return '';
    if (typeof valor === 'string') return idioma === principal ? valor.trim() : '';
    if (typeof valor === 'object' && !Array.isArray(valor)) return String(valor[idioma] ?? '').trim();
    return '';
  }

  const nombreEn = (obj, principal) => texto(obj?.nombre, principal, principal) || 'Sin nombre';

  function precio(valor) {
    const n = Number(valor) || 0;
    return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  /* «(EN)» al lado del campo, solo si la carta tiene más de un idioma. */
  const conIdioma = (campo, idioma, idiomas) =>
    idiomas.length > 1 ? `${campo} (${idioma.toUpperCase()})` : campo;

  const rotuloDelFoco = (foco) => (typeof rotuloFoco === 'function' ? rotuloFoco(foco) : String(foco || 'centro'));
  const nombreDelAlergeno = (clave) => (typeof ETIQUETAS !== 'undefined' && ETIQUETAS[clave]) || clave;
  const nombreDelIdioma = (codigo) => (typeof nombreDeIdioma === 'function' ? nombreDeIdioma(codigo) : codigo);
  const iguales = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

  /* Lo que cambia en una foto, en una frase (o nada). «masculino» para
     decir «Logotipo nuevo» y no «Logotipo nueva». */
  function cambioDeFoto(antes, despues, nombre = 'Foto', masculino = false) {
    const o = masculino ? 'o' : 'a';
    if (!antes && despues) return { texto: `${nombre} nuev${o}` };
    if (antes && !despues) return { texto: `${nombre} quitad${o}` };
    if (antes !== despues) return { texto: `${nombre} cambiad${o}` };
    return null;
  }

  /* Un campo de texto en todos los idiomas: una línea por idioma que cambie. */
  function cambiosDeTexto(antes, despues, campo, idiomas, principal) {
    return idiomas
      .map((idioma) => ({ idioma, a: texto(antes, idioma, principal), b: texto(despues, idioma, principal) }))
      .filter(({ a, b }) => a !== b)
      .map(({ idioma, a, b }) => ({ campo: conIdioma(campo, idioma, idiomas), antes: a, despues: b }));
  }

  /* El texto principal de una lista de destacados (etiquetas, notas…). */
  function textosDeDestacados(lista, principal) {
    return (Array.isArray(lista) ? lista : (lista ? [lista] : []))
      .map((d) => texto(d?.texto, principal, principal))
      .filter(Boolean);
  }

  function cambioDeDestacados(antes, despues, campo, principal) {
    const a = Array.isArray(antes) ? antes : (antes ? [antes] : []);
    const b = Array.isArray(despues) ? despues : (despues ? [despues] : []);
    if (iguales(a, b)) return null;
    const ta = textosDeDestacados(a, principal).join(' · ');
    const tb = textosDeDestacados(b, principal).join(' · ');
    if (ta === tb) return { texto: `${campo}: cambian los colores, la posición o la traducción` };
    return { campo, antes: ta, despues: tb };
  }

  /* ---------- Índice de una carta ----------
     Cada sección, grupo y plato por su id, con dónde está. Si una carta
     antigua trajera algo sin id, se le da uno por su posición. */
  function indexar(datos) {
    const secciones = new Map(), grupos = new Map(), items = new Map();
    (datos?.secciones ?? []).forEach((s, si) => {
      const sid = s.id ?? `@s${si}`;
      secciones.set(sid, { obj: s, pos: si });
      (s.grupos ?? []).forEach((g, gi) => {
        const gid = g.id ?? `@g${si}.${gi}`;
        grupos.set(gid, { obj: g, pos: gi, sec: sid, secObj: s });
        (g.items ?? []).forEach((it, ii) => {
          const iid = it.id ?? `@i${si}.${gi}.${ii}`;
          items.set(iid, { obj: it, pos: ii, gru: gid, gruObj: g, sec: sid, secObj: s });
        });
      });
    });
    return { secciones, grupos, items };
  }

  /* ¿Las piezas que siguen estando en los dos sitios han cambiado de orden? */
  function cambiaElOrden(idsAntes, idsDespues) {
    const comunes = new Set(idsAntes.filter((id) => idsDespues.includes(id)));
    const a = idsAntes.filter((id) => comunes.has(id));
    const b = idsDespues.filter((id) => comunes.has(id));
    return a.join('|') !== b.join('|');
  }

  /* Hasta cinco nombres, y «y N más» si hay más. */
  function listaCorta(nombres) {
    if (nombres.length <= 5) return nombres.join(', ');
    return `${nombres.slice(0, 5).join(', ')} y ${nombres.length - 5} más`;
  }

  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  /* =========================================================
     LA CARTA
     ========================================================= */
  function deLaCarta(antes, ahora) {
    if (!ahora) return [];
    const idiomasAhora = typeof detectarIdiomas === 'function' ? detectarIdiomas(ahora) : ['es'];
    const idiomasAntes = antes && typeof detectarIdiomas === 'function' ? detectarIdiomas(antes) : idiomasAhora;
    const principal = idiomasAhora[0];
    const idiomas = [...new Set([...idiomasAhora, ...idiomasAntes])];
    const A = indexar(antes), B = indexar(ahora);

    const rutaDe = (secObj, gruObj) =>
      [secObj && nombreEn(secObj, principal), gruObj && nombreEn(gruObj, principal)].filter(Boolean).join(' › ');

    const tarjetas = {
      platosNuevos:   { clave: 'platos-nuevos',   zona: 'carta', titulo: 'Platos nuevos',     icono: 'mas',     lineas: [] },
      platosCambiados:{ clave: 'platos-cambiados',zona: 'carta', titulo: 'Platos cambiados',  icono: 'lapiz',   lineas: [] },
      platosFuera:    { clave: 'platos-fuera',    zona: 'carta', titulo: 'Platos eliminados', icono: 'menos',   lineas: [] },
      secciones:      { clave: 'secciones',       zona: 'carta', titulo: 'Secciones',         icono: 'capas',   lineas: [] },
      grupos:         { clave: 'grupos',          zona: 'carta', titulo: 'Grupos',            icono: 'carpeta', lineas: [] },
      orden:          { clave: 'orden',           zona: 'carta', titulo: 'Orden',             icono: 'orden',   lineas: [] },
      anuncio:        { clave: 'anuncio',         zona: 'carta', titulo: 'Ventana emergente', icono: 'anuncio', lineas: [] },
      idiomas:        { clave: 'idiomas',         zona: 'carta', titulo: 'Idiomas',           icono: 'idioma',  lineas: [] }
    };

    /* ---------- Secciones ---------- */
    for (const [id, { obj: s }] of B.secciones) {
      if (A.secciones.has(id)) continue;
      const grupos = s.grupos ?? [];
      const platos = grupos.reduce((n, g) => n + (g.items ?? []).length, 0);
      tarjetas.secciones.lineas.push({
        tipo: 'nuevo', titulo: nombreEn(s, principal), donde: 'Sección nueva',
        detalles: grupos.length
          ? [{ texto: `Con ${plural(grupos.length, 'grupo', 'grupos')} y ${plural(platos, 'plato', 'platos')}` }]
          : [{ texto: 'Todavía vacía' }]
      });
    }
    for (const [id, { obj: s }] of A.secciones) {
      if (B.secciones.has(id)) continue;
      const grupos = s.grupos ?? [];
      const platos = grupos.reduce((n, g) => n + (g.items ?? []).length, 0);
      tarjetas.secciones.lineas.push({
        tipo: 'quitado', titulo: nombreEn(s, principal), donde: 'Sección eliminada',
        detalles: grupos.length
          ? [{ texto: `Se van con ella ${plural(grupos.length, 'grupo', 'grupos')} y ${plural(platos, 'plato', 'platos')}` }]
          : []
      });
    }
    for (const [id, { obj: s }] of B.secciones) {
      const previa = A.secciones.get(id)?.obj;
      if (!previa) continue;
      const detalles = [
        ...cambiosDeTexto(previa.nombre, s.nombre, 'Nombre', idiomas, principal),
        cambioDeFoto(previa.imagen, s.imagen),
        previa.imagen && s.imagen && (previa.foco || 'centro') !== (s.foco || 'centro')
          ? { campo: 'Zona importante de la foto', antes: rotuloDelFoco(previa.foco), despues: rotuloDelFoco(s.foco) } : null,
        cambioDeDestacados(previa.notas ?? previa.nota, s.notas ?? s.nota, 'Notas', principal)
      ].filter(Boolean);
      if (detalles.length) {
        tarjetas.secciones.lineas.push({ tipo: 'cambiado', titulo: nombreEn(s, principal), donde: 'Sección', detalles });
      }
    }
    if (cambiaElOrden([...A.secciones.keys()], [...B.secciones.keys()])) {
      tarjetas.orden.lineas.push({ tipo: 'movido', titulo: 'Orden de las secciones', donde: 'Toda la carta', detalles: [] });
    }

    /* ---------- Grupos ---------- */
    for (const [id, { obj: g, sec, secObj }] of B.grupos) {
      if (A.grupos.has(id) || !A.secciones.has(sec)) continue;   // dentro de una sección nueva: ya contado
      const platos = (g.items ?? []).map((it) => nombreEn(it, principal));
      tarjetas.grupos.lineas.push({
        tipo: 'nuevo', titulo: nombreEn(g, principal), donde: `Grupo nuevo en ${nombreEn(secObj, principal)}`,
        detalles: platos.length ? [{ texto: `${plural(platos.length, 'plato', 'platos')}: ${listaCorta(platos)}` }] : [{ texto: 'Todavía vacío' }]
      });
    }
    for (const [id, { obj: g, sec, secObj }] of A.grupos) {
      if (B.grupos.has(id) || !B.secciones.has(sec)) continue;   // su sección entera se ha ido: ya contado
      const platos = (g.items ?? []).map((it) => nombreEn(it, principal));
      tarjetas.grupos.lineas.push({
        tipo: 'quitado', titulo: nombreEn(g, principal), donde: `Grupo eliminado de ${nombreEn(secObj, principal)}`,
        detalles: platos.length ? [{ texto: `Se van con él ${plural(platos.length, 'plato', 'platos')}: ${listaCorta(platos)}` }] : []
      });
    }
    for (const [id, { obj: g, sec, secObj }] of B.grupos) {
      const previo = A.grupos.get(id);
      if (!previo) continue;
      const p = previo.obj;
      const detalles = [
        ...cambiosDeTexto(p.nombre, g.nombre, 'Nombre', idiomas, principal),
        previo.sec !== sec ? { texto: `Movido de «${nombreEn(previo.secObj, principal)}» a «${nombreEn(secObj, principal)}»` } : null,
        cambioDeFoto(p.imagen, g.imagen),
        p.imagen && g.imagen && (p.foco || 'centro') !== (g.foco || 'centro')
          ? { campo: 'Zona importante de la foto', antes: rotuloDelFoco(p.foco), despues: rotuloDelFoco(g.foco) } : null,
        cambioDeDestacados(p.alerta ?? p.alertas, g.alerta ?? g.alertas, 'Alerta', principal)
      ].filter(Boolean);
      if (detalles.length) {
        tarjetas.grupos.lineas.push({
          tipo: detalles.length === 1 && previo.sec !== sec ? 'movido' : 'cambiado',
          titulo: nombreEn(g, principal), donde: `Grupo de ${nombreEn(secObj, principal)}`, detalles
        });
      }
    }
    for (const [id, { obj: s }] of B.secciones) {
      const previa = A.secciones.get(id)?.obj;
      if (!previa) continue;
      const idsAntes = (previa.grupos ?? []).map((g) => g.id);
      const idsAhora = (s.grupos ?? []).map((g) => g.id);
      if (cambiaElOrden(idsAntes, idsAhora)) {
        tarjetas.orden.lineas.push({ tipo: 'movido', titulo: 'Orden de los grupos', donde: nombreEn(s, principal), detalles: [] });
      }
    }

    /* ---------- Platos ---------- */
    for (const [id, { obj: it, gru, gruObj, secObj }] of B.items) {
      if (A.items.has(id) || !A.grupos.has(gru)) continue;   // dentro de un grupo nuevo: ya contado
      tarjetas.platosNuevos.lineas.push({
        tipo: 'nuevo', titulo: nombreEn(it, principal), donde: rutaDe(secObj, gruObj),
        detalles: [
          { campo: 'Precio', antes: null, despues: precio(it.precio) },
          it.imagen ? { texto: 'Con foto' } : null
        ].filter(Boolean)
      });
    }
    for (const [id, { obj: it, gru, gruObj, secObj }] of A.items) {
      if (B.items.has(id) || !B.grupos.has(gru)) continue;   // su grupo entero se ha ido: ya contado
      tarjetas.platosFuera.lineas.push({
        tipo: 'quitado', titulo: nombreEn(it, principal), donde: rutaDe(secObj, gruObj),
        detalles: it.imagen ? [{ texto: 'Su foto se borrará' }] : []
      });
    }
    for (const [id, actual] of B.items) {
      const previo = A.items.get(id);
      if (!previo) continue;
      const a = previo.obj, b = actual.obj;
      const puestosAntes = new Set(a.alergenos ?? []), puestosAhora = new Set(b.alergenos ?? []);
      const mas = [...puestosAhora].filter((x) => !puestosAntes.has(x)).map(nombreDelAlergeno);
      const menos = [...puestosAntes].filter((x) => !puestosAhora.has(x)).map(nombreDelAlergeno);
      const movido = previo.gru !== actual.gru;
      const detalles = [
        ...cambiosDeTexto(a.nombre, b.nombre, 'Nombre', idiomas, principal),
        (Number(a.precio) || 0) !== (Number(b.precio) || 0) ? { campo: 'Precio', antes: precio(a.precio), despues: precio(b.precio) } : null,
        ...cambiosDeTexto(a.descripcion, b.descripcion, 'Descripción', idiomas, principal),
        mas.length || menos.length ? { campo: 'Alérgenos', mas, menos } : null,
        cambioDeFoto(a.imagen, b.imagen),
        cambioDeDestacados(a.etiquetas, b.etiquetas, 'Etiquetas', principal),
        movido ? { texto: `Movido de «${rutaDe(previo.secObj, previo.gruObj)}» a «${rutaDe(actual.secObj, actual.gruObj)}»` } : null
      ].filter(Boolean);
      if (detalles.length) {
        tarjetas.platosCambiados.lineas.push({
          tipo: detalles.length === 1 && movido ? 'movido' : 'cambiado',
          titulo: nombreEn(b, principal), donde: rutaDe(actual.secObj, actual.gruObj), detalles
        });
      }
    }
    for (const [id, { obj: g, secObj }] of B.grupos) {
      const previo = A.grupos.get(id)?.obj;
      if (!previo) continue;
      if (cambiaElOrden((previo.items ?? []).map((x) => x.id), (g.items ?? []).map((x) => x.id))) {
        tarjetas.orden.lineas.push({ tipo: 'movido', titulo: 'Orden de los platos', donde: rutaDe(secObj, g), detalles: [] });
      }
    }

    /* ---------- Ventana emergente e idiomas ---------- */
    tarjetas.anuncio.lineas.push(...cambiosDelAnuncio(antes?.anuncio, ahora.anuncio, idiomas, principal));

    const masIdiomas = idiomasAhora.filter((x) => !idiomasAntes.includes(x));
    const menosIdiomas = idiomasAntes.filter((x) => !idiomasAhora.includes(x));
    if (masIdiomas.length || menosIdiomas.length) {
      tarjetas.idiomas.lineas.push({
        tipo: 'cambiado', titulo: 'Idiomas de la carta', donde: '',
        detalles: [{ campo: 'Idiomas', mas: masIdiomas.map(nombreDelIdioma), menos: menosIdiomas.map(nombreDelIdioma) }]
      });
    }

    return Object.values(tarjetas).filter((t) => t.lineas.length);
  }

  /* Un anuncio que solo lleva { activo:true } es lo mismo que no tenerlo. */
  function anuncioConAlgo(a) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
    return Object.keys(a).some((k) => k !== 'activo') ? a : null;
  }

  const TEXTOS_DEL_ANUNCIO = [
    ['titulo', 'Línea pequeña'], ['mensaje', 'Mensaje principal'], ['descripcion', 'Descripción']
  ];

  function cambiosDelAnuncio(antes, ahora, idiomas, principal) {
    const a = anuncioConAlgo(antes), b = anuncioConAlgo(ahora);
    if (!a && !b) return [];
    if (!a) {
      const mensaje = texto(b.mensaje, principal, principal);
      return [{ tipo: 'nuevo', titulo: mensaje || 'Ventana emergente', donde: 'Ventana emergente nueva',
                detalles: [{ texto: b.activo === false ? 'Apagada: no sale todavía' : 'Encendida: sale al abrir la carta' }] }];
    }
    if (!b) return [{ tipo: 'quitado', titulo: texto(a.mensaje, principal, principal) || 'Ventana emergente',
                      donde: 'Ventana emergente borrada', detalles: [] }];
    const detalles = [
      (a.activo !== false) !== (b.activo !== false)
        ? { campo: 'Estado', antes: a.activo !== false ? 'Encendida' : 'Apagada', despues: b.activo !== false ? 'Encendida' : 'Apagada' } : null,
      ...TEXTOS_DEL_ANUNCIO.flatMap(([campo, rotulo]) => cambiosDeTexto(a[campo], b[campo], rotulo, idiomas, principal)),
      cambioDeFoto(a.imagen, b.imagen)
    ].filter(Boolean);
    return detalles.length
      ? [{ tipo: 'cambiado', titulo: texto(b.mensaje, principal, principal) || 'Ventana emergente', donde: 'Ventana emergente', detalles }]
      : [];
  }

  /* =========================================================
     LOS AJUSTES DE LA PÁGINA (apariencia.json)
     «antes» es lo publicado (null si nunca se ha publicado) y
     «ahora», el borrador que está esperando en el navegador.
     ========================================================= */

  /* Los dos se miran con la misma forma, rellenando lo que falte como
     hace «Ajustes de la página» al cargar (aparienciaDeFabrica): así un
     campo que el archivo publicado no traía no sale como cambiado. */
  function normalizarApariencia(a) {
    const id = a?.identidad || {};
    const pie = a?.pie || {};
    return {
      colores: { principal: a?.colores?.principal || '', fondo: a?.colores?.fondo || '', texto: a?.colores?.texto || 'auto' },
      titulo: String(id.titulo || '').trim(),
      eslogan: id.eslogan && typeof id.eslogan === 'object' ? id.eslogan : {},
      logo: id.logo || '', favicon: id.favicon || '',
      fondo: id.fondo?.imagen || '', foco: id.fondo?.foco || 'centro',
      fuentes: { titulo: a?.fuentes?.titulo?.archivo || '', texto: a?.fuentes?.texto?.archivo || '' },
      barra: a?.pagina?.barra === 'superior' ? 'superior' : 'inferior',
      alergenos: a?.pagina?.alergenos === 'arriba' ? 'arriba' : 'abajo',
      bloques: (Array.isArray(pie.bloques) ? pie.bloques : [])
        .map((b) => ({ titulo: String(b?.titulo || '').trim(), texto: String(b?.texto || '').trim() }))
        .filter((b) => b.titulo || b.texto),
      redes: pie.redes && typeof pie.redes === 'object' ? pie.redes : {},
      reparto: pie.reparto && typeof pie.reparto === 'object' ? pie.reparto : {}
    };
  }

  const nombreDeRed = (clave) =>
    (typeof EnlacesDelPie !== 'undefined' && EnlacesDelPie.nombreDe) ? EnlacesDelPie.nombreDe(clave) : clave;
  const nombreDeApp = (clave) =>
    (typeof RepartoDelPie !== 'undefined' && RepartoDelPie.nombreDe) ? RepartoDelPie.nombreDe(clave) : clave;

  /* Un enlace del pie: puesto, quitado o cambiado. */
  function cambioDeEnlace(antes, despues) {
    const a = String(antes || '').trim(), b = String(despues || '').trim();
    if (a === b) return null;
    if (!a) return { campo: 'Enlace', antes: null, despues: b };
    if (!b) return { texto: 'Enlace quitado: deja de salir en la carta' };
    return { campo: 'Enlace', antes: a, despues: b };
  }

  function deLaApariencia(antes, ahora) {
    if (!ahora) return [];
    if (!antes) {
      return [{
        clave: 'pagina-estreno', zona: 'pagina', titulo: 'Ajustes de la carta', icono: 'pincel',
        lineas: [{ tipo: 'nuevo', titulo: 'Primera vez que se publican', donde: '',
                   detalles: [{ texto: 'Se guardan por primera vez los colores, la portada, el pie y los enlaces de tu carta.' }] }]
      }];
    }
    const A = normalizarApariencia(antes), B = normalizarApariencia(ahora);
    const tarjetas = [];
    const tarjeta = (clave, titulo, icono, lineas) => {
      const llenas = lineas.filter((l) => l && l.detalles.length);
      if (llenas.length) tarjetas.push({ clave, zona: 'pagina', titulo, icono, lineas: llenas });
    };
    const linea = (titulo, detalles, tipo = 'cambiado') => ({ tipo, titulo, donde: '', detalles: detalles.filter(Boolean) });

    // Colores
    const color = (campo, a, b) => (a !== b ? { campo, antes: a, despues: b, color: true } : null);
    const colorDelTexto = (v) => (v === 'auto' ? 'Automático' : v);
    tarjeta('pagina-colores', 'Colores', 'gota', [linea('Colores de la carta', [
      color('Color principal', A.colores.principal, B.colores.principal),
      color('Color de fondo', A.colores.fondo, B.colores.fondo),
      A.colores.texto !== B.colores.texto
        ? { campo: 'Color del texto', antes: colorDelTexto(A.colores.texto), despues: colorDelTexto(B.colores.texto),
            color: A.colores.texto !== 'auto' || B.colores.texto !== 'auto' } : null
    ])]);

    // Portada y marca
    const idiomasEslogan = [...new Set([...Object.keys(A.eslogan), ...Object.keys(B.eslogan)])];
    tarjeta('pagina-portada', 'Portada y marca', 'portada', [linea('Portada de la carta', [
      A.titulo !== B.titulo ? { campo: 'Título', antes: A.titulo, despues: B.titulo } : null,
      ...idiomasEslogan
        .filter((L) => String(A.eslogan[L] || '').trim() !== String(B.eslogan[L] || '').trim())
        .map((L) => ({ campo: conIdioma('Eslogan', L, idiomasEslogan), antes: String(A.eslogan[L] || '').trim(), despues: String(B.eslogan[L] || '').trim() })),
      cambioDeFoto(A.logo, B.logo, 'Logotipo', true),
      cambioDeFoto(A.favicon, B.favicon, 'Icono de la pestaña', true),
      cambioDeFoto(A.fondo, B.fondo, 'Foto de portada'),
      A.fondo && B.fondo && A.foco !== B.foco ? { campo: 'Zona importante de la portada', antes: rotuloDelFoco(A.foco), despues: rotuloDelFoco(B.foco) } : null
    ])]);

    // Letras
    const nombreDeArchivo = (ruta) => String(ruta || '').split('?')[0].split('/').pop();
    const cambioDeLetra = (campo, a, b) => {
      if (a === b) return null;
      if (!b) return { campo, antes: nombreDeArchivo(a), despues: 'La de la plantilla' };
      return { campo, antes: a ? nombreDeArchivo(a) : 'La de la plantilla', despues: nombreDeArchivo(b) };
    };
    tarjeta('pagina-letras', 'Letras', 'letra', [linea('Tipos de letra', [
      cambioDeLetra('Letra de los títulos', A.fuentes.titulo, B.fuentes.titulo),
      cambioDeLetra('Letra del texto', A.fuentes.texto, B.fuentes.texto)
    ])]);

    // Disposición
    const sitio = { superior: 'Arriba', inferior: 'Abajo', arriba: 'Arriba', abajo: 'Abajo' };
    tarjeta('pagina-disposicion', 'Disposición', 'disposicion', [linea('Dónde va cada cosa', [
      A.barra !== B.barra ? { campo: 'Barra de secciones', antes: sitio[A.barra], despues: sitio[B.barra] } : null,
      A.alergenos !== B.alergenos ? { campo: 'Filtro de alérgenos', antes: sitio[A.alergenos], despues: sitio[B.alergenos] } : null
    ])]);

    // Pie de la carta: los bloques de texto, por su posición.
    const lineasDePie = [];
    const cuantos = Math.max(A.bloques.length, B.bloques.length);
    for (let i = 0; i < cuantos; i++) {
      const a = A.bloques[i], b = B.bloques[i];
      if (!a) lineasDePie.push(linea(b.titulo || `Mensaje ${i + 1}`, [{ texto: 'Mensaje nuevo en el pie' }], 'nuevo'));
      else if (!b) lineasDePie.push(linea(a.titulo || `Mensaje ${i + 1}`, [{ texto: 'Mensaje quitado del pie' }], 'quitado'));
      else lineasDePie.push(linea(b.titulo || `Mensaje ${i + 1}`, [
        a.titulo !== b.titulo ? { campo: 'Título', antes: a.titulo, despues: b.titulo } : null,
        a.texto !== b.texto ? { campo: 'Texto', antes: a.texto, despues: b.texto } : null
      ]));
    }
    tarjeta('pagina-pie', 'Pie de la carta', 'pie', lineasDePie);

    // Redes sociales
    const redes = [...new Set([...Object.keys(A.redes), ...Object.keys(B.redes)])];
    tarjeta('pagina-redes', 'Redes sociales', 'enlace', redes.map((red) => {
      const a = String(A.redes[red] || '').trim(), b = String(B.redes[red] || '').trim();
      const tipo = !a && b ? 'nuevo' : (a && !b ? 'quitado' : 'cambiado');
      return linea(nombreDeRed(red), [cambioDeEnlace(a, b)], tipo);
    }));

    // Apps de pedidos
    const apps = [...new Set([...Object.keys(A.reparto), ...Object.keys(B.reparto)])];
    tarjeta('pagina-reparto', 'Apps de pedidos', 'bolsa', apps.map((app) => {
      const a = A.reparto[app] || {}, b = B.reparto[app] || {};
      const ea = String(a.enlace || '').trim(), eb = String(b.enlace || '').trim();
      const tipo = !ea && eb ? 'nuevo' : (ea && !eb ? 'quitado' : 'cambiado');
      return linea(nombreDeApp(app), [
        cambioDeEnlace(ea, eb),
        String(a.texto || '').trim() !== String(b.texto || '').trim()
          ? { campo: 'Texto', antes: String(a.texto || '').trim(), despues: String(b.texto || '').trim() } : null,
        cambioDeFoto(a.logo || '', b.logo || '', 'Logotipo', true)
      ], tipo);
    }));

    return tarjetas;
  }

  return { deLaCarta, deLaApariencia };
})();
