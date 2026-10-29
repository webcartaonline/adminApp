/* =========================================================
   REVISIÓN · QUÉ FALTA O CONVIENE MIRAR
   Repasa la carta entera (no solo lo cambiado) y apunta los
   datos que faltan: nombres en blanco, traducciones sin
   hacer, precios a cero, alérgenos sin marcar, platos sin
   foto… Lo usa la ventana «Revisar antes de publicar»
   (revision-ventana.js), que deja arreglarlos ahí mismo.

   Aquí no se pinta nada: solo se calcula. Devuelve una lista
   de AVISOS, ya en el orden en que se enseñan:

     aviso  { clave, nivel:'falta'|'revisa'|'idea', titulo,
              explicacion, casos:[…] }
     caso   { tipo:'seccion'|'grupo'|'item'|'anuncio', id,
              nombre, donde, … lo propio de cada aviso }

   Ningún aviso impide publicar: hay platos que de verdad no
   llevan alérgenos y precios que van a cero a propósito. Solo
   se avisa para que nada se escape sin querer.

   Lo de las fotos depende del plan: solo se avisa si el plan
   incluye fotos de los platos («fotosDePlatos»). A quien no
   puede ponerlas no se le habla de fotos.
   ========================================================= */
const AvisosDeLaCarta = (() => {

  function texto(valor, idioma, principal) {
    if (valor == null) return '';
    if (typeof valor === 'string') return idioma === principal ? valor.trim() : '';
    if (typeof valor === 'object' && !Array.isArray(valor)) return String(valor[idioma] ?? '').trim();
    return '';
  }

  const nombreDelIdioma = (codigo) => (typeof idiomaEnEspanol === 'function' ? idiomaEnEspanol(codigo) : codigo);

  /* Recorre la carta y llama a «visitar» con cada pieza y dónde está. */
  function recorrer(datos, principal, visitar) {
    const nombre = (obj) => texto(obj?.nombre, principal, principal);
    (datos?.secciones ?? []).forEach((s) => {
      visitar({ tipo: 'seccion', obj: s, id: s.id, nombre: nombre(s), donde: 'Sección' });
      (s.grupos ?? []).forEach((g) => {
        visitar({ tipo: 'grupo', obj: g, id: g.id, nombre: nombre(g), donde: nombre(s) || 'Sección sin nombre', seccion: s.id });
        (g.items ?? []).forEach((it) => {
          visitar({ tipo: 'item', obj: it, id: it.id, nombre: nombre(it),
                    donde: `${nombre(s) || 'Sección sin nombre'} › ${nombre(g) || 'Grupo sin nombre'}`,
                    seccion: s.id, grupo: g.id });
        });
      });
    });
  }

  const QUE = { seccion: 'Sección', grupo: 'Grupo', item: 'Plato' };

  /* Los textos del anuncio que se pueden traducir, con su rótulo. */
  const TEXTOS_DEL_ANUNCIO = [
    ['titulo', 'Línea pequeña'], ['mensaje', 'Mensaje principal'], ['descripcion', 'Descripción']
  ];

  /* opciones:
       idiomas         los de la carta, el principal primero
       fotosDePlatos   ¿el plan incluye fotos de los platos (y la carta las enseña)?
       anuncioVacio    ¿la ventana emergente está encendida pero sin nada? */
  function deLaCarta(datos, { idiomas = ['es'], fotosDePlatos = false, anuncioVacio = false } = {}) {
    if (!datos) return [];
    const principal = idiomas[0];
    const extra = idiomas.slice(1);

    const sinNombre = [], precios = [], alergenos = [], fotos = [], vacios = [];
    const traducciones = Object.fromEntries(extra.map((L) => [L, []]));

    recorrer(datos, principal, (pieza) => {
      const { tipo, obj } = pieza;
      const base = { tipo, id: pieza.id, nombre: pieza.nombre, donde: pieza.donde,
                     seccion: pieza.seccion, grupo: pieza.grupo };

      if (!pieza.nombre) sinNombre.push({ ...base, que: QUE[tipo] });

      // Traducciones: el nombre siempre; la descripción, si la tiene en
      // el idioma principal (si no la tiene, no hay nada que traducir).
      for (const L of extra) {
        if (pieza.nombre && !texto(obj.nombre, L, principal)) {
          traducciones[L].push({ ...base, campo: 'nombre', rotulo: 'Nombre', idioma: L, referencia: pieza.nombre });
        }
        const desc = texto(obj.descripcion, principal, principal);
        if (tipo === 'item' && desc && !texto(obj.descripcion, L, principal)) {
          traducciones[L].push({ ...base, campo: 'descripcion', rotulo: 'Descripción', idioma: L, referencia: desc, largo: true });
        }
      }

      if (tipo === 'seccion' && !(obj.grupos ?? []).length) vacios.push({ ...base, motivo: 'No tiene grupos' });
      if (tipo === 'grupo' && !(obj.items ?? []).length) vacios.push({ ...base, motivo: 'No tiene platos' });

      if (tipo !== 'item') return;
      if (!(Number(obj.precio) > 0)) precios.push({ ...base, precio: Number(obj.precio) || 0 });
      if (!(obj.alergenos ?? []).length) alergenos.push({ ...base, alergenos: [] });
      if (fotosDePlatos && !obj.imagen) fotos.push(base);
    });

    // La ventana emergente encendida: sus textos también se traducen.
    const anuncio = datos.anuncio;
    if (anuncio && typeof anuncio === 'object' && anuncio.activo !== false) {
      for (const L of extra) {
        for (const [campo, rotulo] of TEXTOS_DEL_ANUNCIO) {
          const original = texto(anuncio[campo], principal, principal);
          if (original && !texto(anuncio[campo], L, principal)) {
            traducciones[L].push({ tipo: 'anuncio', id: 'anuncio', nombre: rotulo, donde: 'Ventana emergente',
                                   campo, rotulo, idioma: L, referencia: original, largo: campo === 'descripcion' });
          }
        }
      }
    }

    const avisos = [];
    const poner = (aviso) => { if (aviso.casos.length) avisos.push(aviso); };
    const enPrincipal = nombreDelIdioma(principal);

    poner({ clave: 'nombres', nivel: 'falta', titulo: 'Sin nombre', casos: sinNombre,
            explicacion: 'En la carta saldrían con el título en blanco. Escríbelo aquí mismo.' });
    for (const L of extra) {
      poner({ clave: 'traducciones', idioma: L, nivel: 'revisa', casos: traducciones[L],
              titulo: `Falta en ${nombreDelIdioma(L)}`,
              explicacion: `Quien lea tu carta en ${nombreDelIdioma(L)} verá estos textos en ${enPrincipal}. Debajo de cada uno tienes el original.` });
    }
    poner({ clave: 'alergenos', nivel: 'revisa', titulo: 'Alérgenos sin marcar', casos: alergenos,
            explicacion: 'Estos platos no tienen ningún alérgeno marcado. Informar de ellos es obligatorio: márcalos aquí. Si un plato de verdad no lleva ninguno, déjalo así.' });
    poner({ clave: 'precios', nivel: 'revisa', titulo: 'Precio a cero', casos: precios,
            explicacion: 'Saldrán en la carta con precio 0,00 €. Si es a propósito, déjalo así.' });
    poner({ clave: 'fotos', nivel: 'idea', titulo: 'Platos sin foto', casos: fotos,
            explicacion: 'Tu plan incluye fotos de los platos y estos aún no tienen. Es opcional, pero un plato con foto se pide más.' });
    poner({ clave: 'vacios', nivel: 'idea', titulo: 'Sin contenido', casos: vacios,
            explicacion: 'En la carta saldrá solo su título. Llénalos desde el editor, o elimínalos si sobran.' });
    if (anuncioVacio) {
      poner({ clave: 'anuncio', nivel: 'idea', titulo: 'Ventana emergente vacía',
              casos: [{ tipo: 'anuncio', id: 'anuncio', nombre: 'Ventana emergente', donde: 'Encendida, pero sin nada escrito' }],
              explicacion: 'Está encendida pero no tiene ni textos ni foto, así que no saldrá. Rellénala o apágala.' });
    }
    return avisos;
  }

  return { deLaCarta };
})();
