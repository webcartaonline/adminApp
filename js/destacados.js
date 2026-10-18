/* =========================================================
   ETIQUETAS, ALERTAS Y NOTAS
   Las tres formas que tiene el negocio de destacar algo en
   la carta, y que se escriben aquí a mano:

   - ETIQUETA (de un plato): una palabra corta y en
     mayúsculas pegada al plato: «250 g», «Nuevo»,
     «Picante». Cada una elige si va encima o debajo de la
     descripción, así que en un mismo plato puede haber de
     las dos, y tantas como haga falta.
   - ALERTA (de un grupo): una frase que vale para todos
     los platos del grupo: «También en media ración». Va
     junto al título del grupo, así que solo se admite UNA:
     dos romperían esa línea.
   - NOTA (de una sección): un recuadro con una barrita de
     color entre la portada de la sección y el primer grupo:
     «Tipos de pan», «Disponible en zona azul». Se pueden
     poner varias y se colocan solas, una a cada lado.

   Las tres guardan lo mismo en carta.json:
     { "texto":{"es":"…","en":"…"}, "fondo":"…", "color":"…" }
   y la etiqueta añade "posicion": "arriba" o "abajo".

   El fondo puede ser "principal" (el color de la marca),
   "secundario" (el tono del fondo de la carta) o un color
   escrito a mano. La letra puede ir en "auto" y entonces se
   elige sola, clara u oscura, según lo que se lea mejor.

   Cómo se ven en la carta depende de la plantilla del local:
   se mira con la «Vista previa» del editor.
   ========================================================= */

/* ---------- Cómo nace un destacado ---------- */
function crearAlerta(){
  return { texto:crearTexto(''), fondo:'principal', color:'auto' };
}
function crearEtiqueta(){
  return { texto:crearTexto(''), posicion:'arriba', fondo:'principal', color:'auto' };
}
function crearNotaDeSeccion(){
  return { texto:crearTexto(''), fondo:'principal', color:'auto' };
}

/* Las etiquetas de un plato, siempre como lista aunque el plato
   todavía no tenga ninguna. */
function etiquetasDe(item){
  if(!Array.isArray(item.etiquetas))item.etiquetas=[];
  return item.etiquetas;
}

/* Las notas de una sección, siempre como lista. Se admite que venga
   escrita una sola y suelta (en el campo "nota"), que es la otra forma
   que entiende la carta: aquí se convierte en lista de una. */
function notasDeSeccion(seccion){
  if(!Array.isArray(seccion.notas)){
    const suelta=seccion.notas||seccion.nota;
    seccion.notas=suelta?[suelta]:[];
  }
  delete seccion.nota;
  return seccion.notas;
}

/* La alerta admite venir escrita como lista (cartas de antes de que
   se limitara a una). Se queda con la primera y se olvida del resto,
   igual que hace la carta al pintarla. */
function alertaDe(grupo){
  if(Array.isArray(grupo.alerta)){
    const primera=grupo.alerta[0];
    if(primera)grupo.alerta=primera; else delete grupo.alerta;
  }
  if(Array.isArray(grupo.alertas)){
    const primera=grupo.alertas[0];
    if(primera&&!grupo.alerta)grupo.alerta=primera;
    delete grupo.alertas;   // la carta ya solo admite una
  }
  return grupo.alerta||null;
}

/* =========================================================
   LOS COLORES DE UN DESTACADO
   Aquí solo se elige el color. Cómo queda de verdad en la
   carta se mira con la «Vista previa» del editor, que pinta
   la página entera con la plantilla del local: así no hay que
   mantener una muestra pequeña por cada plantilla.
   ========================================================= */

/* De dónde arranca la rueda al pasar a «A mi gusto», si todavía no
   había ningún color escrito a mano: el principal de fábrica de la
   carta y una letra oscura que se lee bien encima. */
const COLOR_DE_PARTIDA = { fondo:'#E9B44C', letra:'#17140F' };

function esHexValido(valor){
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(valor??'').trim());
}

/* El color que enseña cada rueda: el elegido a mano o el de partida. */
function colorDeLaRueda(valor,partida){
  const elegido=String(valor??'').trim();
  return esHexValido(elegido)?elegido:partida;
}
function ruedaDelFondo(d){ return colorDeLaRueda(d?.fondo,COLOR_DE_PARTIDA.fondo); }
function ruedaDeLaLetra(d){ return colorDeLaRueda(d?.color,COLOR_DE_PARTIDA.letra); }

/* Qué botón sale marcado: los dos colores fijos por su nombre y
   cualquier otra cosa cuenta como color escrito a mano. */
function modoDelFondo(d){
  const v=String(d?.fondo??'principal').trim();
  return (v==='principal'||v==='secundario')?v:'manual';
}
function modoDeLaLetra(d){
  return String(d?.color??'auto').trim()==='auto'?'auto':'manual';
}

/* =========================================================
   COMPONENTES
   Trozos de pantalla que se arman igual para la alerta del
   grupo, las notas de la sección y las etiquetas de los platos.
   ========================================================= */

/* Los dos juegos de botones de color, con su rueda escondida hasta que
   se elige «a mano». */
function bloqueColores(d){
  const fondo=ruedaDelFondo(d), letra=ruedaDeLaLetra(d);
  const modoF=modoDelFondo(d), modoL=modoDeLaLetra(d);
  const marca=(activo,valor)=>`aria-pressed="${activo===valor}"`;

  return `
    <div class="colorines">
      <div class="colorines__juego">
        <span class="campo__etiqueta">Fondo</span>
        <div class="chips">
          <button class="chip" type="button" data-des-fondo="principal" ${marca(modoF,'principal')}>Principal</button>
          <button class="chip" type="button" data-des-fondo="secundario" ${marca(modoF,'secundario')}>Secundario</button>
          <button class="chip" type="button" data-des-fondo="manual" ${marca(modoF,'manual')}>A mi gusto</button>
          <input class="rueda" type="color" data-des-fondo-color
                 value="${escapar(fondo)}" ${modoF==='manual'?'':'hidden'}
                 aria-label="Color del fondo">
        </div>
      </div>
      <div class="colorines__juego">
        <span class="campo__etiqueta">Letra</span>
        <div class="chips">
          <button class="chip" type="button" data-des-letra="auto" ${marca(modoL,'auto')}>Automática</button>
          <button class="chip" type="button" data-des-letra="manual" ${marca(modoL,'manual')}>A mi gusto</button>
          <input class="rueda" type="color" data-des-letra-color
                 value="${escapar(letra)}" ${modoL==='manual'?'':'hidden'}
                 aria-label="Color de la letra">
        </div>
      </div>
    </div>`;
}

/* ---------- Las notas de la sección ----------
   Un solo campo por nota y por idioma: la PRIMERA LÍNEA es el título y
   lo que va debajo es el cuerpo. Se escribe el título, se pulsa intro y
   se sigue escribiendo.

   El lado de la barrita no se elige: la primera nota va a la izquierda,
   la segunda a la derecha, y así. Lo decide la carta por el orden. */
function bloqueNotasDeSeccion(seccion){
  const lista=notasDeSeccion(seccion);

  const fichas=lista.map((n,i)=>`
    <div class="destacado" data-destacado="nota-seccion" data-indice="${i}">
      <div class="destacado__cabecera">
        <span class="campo__etiqueta">${i%2===0?'A la izquierda':'A la derecha'}</span>
        <div class="destacado__botones">
          <button class="mover" type="button" data-nota-subir ${i===0?'disabled':''}>▲</button>
          <button class="mover" type="button" data-nota-bajar ${i===lista.length-1?'disabled':''}>▼</button>
          <button class="btn btn--peligro btn--mini" type="button" data-nota-borrar>Eliminar</button>
        </div>
      </div>
      <div class="par-idiomas">${camposTexto('nota-texto',n.texto,'Texto',true)}</div>
      <p class="campo__pista">La primera línea es el título. Pulsa intro y sigue escribiendo para el resto.</p>
      ${bloqueColores(n)}
    </div>`).join('');

  return `
    <div class="destacados">
      <div class="destacados__cabecera">
        <span class="campo__etiqueta">Notas de la sección</span>
        <button class="btn btn--suave btn--mini" data-nota-anadir type="button">Añadir nota</button>
      </div>
      <p class="campo__pista">Recuadros que salen entre la portada de la sección y su primer grupo: «Tipos de pan», «Disponible en zona azul». Se colocan solos, uno a cada lado.</p>
      ${fichas?`<div class="destacados__lista">${fichas}</div>`:''}
    </div>`;
}

/* ---------- La alerta del grupo ---------- */
function bloqueAlerta(grupo){
  const alerta=alertaDe(grupo);

  if(!alerta){
    return `
      <div class="destacados">
        <div class="destacados__cabecera">
          <span class="campo__etiqueta">Alerta del grupo</span>
          <button class="btn btn--suave btn--mini" data-alerta-anadir type="button">Añadir alerta</button>
        </div>
        <p class="campo__pista">Un aviso que vale para todos los platos del grupo, como «También en media ración». Se ve junto al título del grupo en la carta.</p>
      </div>`;
  }

  return `
    <div class="destacados">
      <div class="destacados__cabecera">
        <span class="campo__etiqueta">Alerta del grupo</span>
        <button class="btn btn--peligro btn--mini" data-alerta-quitar type="button">Quitar alerta</button>
      </div>
      <div class="destacado destacado--alerta" data-destacado="alerta">
        <div class="par-idiomas">${camposTexto('alerta-texto',alerta.texto,'Texto de la alerta')}</div>
        <p class="campo__pista">Cuanto más corta, mejor: comparte línea con el título del grupo.</p>
        ${bloqueColores(alerta)}
      </div>
    </div>`;
}

/* ---------- Las etiquetas de un plato ---------- */
function bloqueEtiquetas(item){
  const lista=etiquetasDe(item);

  const fichas=lista.map((e,i)=>`
    <div class="destacado" data-destacado="etiqueta" data-indice="${i}">
      <div class="destacado__cabecera">
        <div class="chips">
          <button class="chip" type="button" data-etq-pos="arriba"
                  aria-pressed="${posicionDeEtiqueta(e)==='arriba'}">Encima de la descripción</button>
          <button class="chip" type="button" data-etq-pos="abajo"
                  aria-pressed="${posicionDeEtiqueta(e)==='abajo'}">Debajo</button>
        </div>
        <div class="destacado__botones">
          <button class="mover" type="button" data-etq-subir ${i===0?'disabled':''}>▲</button>
          <button class="mover" type="button" data-etq-bajar ${i===lista.length-1?'disabled':''}>▼</button>
          <button class="btn btn--peligro btn--mini" type="button" data-etq-borrar>Eliminar</button>
        </div>
      </div>
      <div class="par-idiomas">${camposTexto('etq-texto',e.texto,'Texto')}</div>
      ${bloqueColores(e)}
    </div>`).join('');

  return `
    <div class="destacados">
      <div class="destacados__cabecera">
        <span class="campo__etiqueta">Etiquetas</span>
        <button class="btn btn--suave btn--mini" data-etq-anadir type="button">Añadir etiqueta</button>
      </div>
      <p class="campo__pista">Palabras cortas que se ven destacadas junto al plato: «250 g», «Nuevo», «Picante». Se escriben en mayúsculas solas y puedes poner las que quieras.</p>
      ${fichas?`<div class="destacados__lista">${fichas}</div>`:''}
    </div>`;
}

function posicionDeEtiqueta(e){
  return String(e?.posicion??'').trim()==='abajo'?'abajo':'arriba';
}

/* =========================================================
   QUÉ SE ESTÁ TOCANDO
   Del botón pulsado se sube hasta su tarjeta y de ahí se
   averigua a qué alerta o etiqueta pertenece.
   ========================================================= */
function destacadoDesde(elemento){
  const caja=elemento.closest('[data-destacado]');
  if(!caja)return null;

  if(caja.dataset.destacado==='alerta'){
    const g=grupoActual();
    const alerta=g?alertaDe(g):null;
    return alerta?{caja,objeto:alerta}:null;
  }

  if(caja.dataset.destacado==='nota-seccion'){
    const s=seccionActual();
    const lista=s?notasDeSeccion(s):null;
    const i=Number(caja.dataset.indice);
    return lista&&lista[i]?{caja,objeto:lista[i],lista,indice:i}:null;
  }

  const ficha=caja.closest('.ficha-item');
  const g=grupoActual();
  if(!ficha||!g)return null;
  const item=g.items?.[Number(ficha.dataset.indice)];
  if(!item)return null;
  const lista=etiquetasDe(item);
  const i=Number(caja.dataset.indice);
  return lista[i]?{caja,objeto:lista[i],lista,indice:i}:null;
}

/* Repinta SOLO esta tarjeta: los botones marcados y la rueda escondida
   o a la vista. Se hace así, y no repintando el editor entero, para no
   perder el cursor mientras se escribe. */
function refrescarDestacado(caja,objeto){
  const modoF=modoDelFondo(objeto), modoL=modoDeLaLetra(objeto);

  caja.querySelectorAll('[data-des-fondo]').forEach(b=>
    b.setAttribute('aria-pressed',String(b.dataset.desFondo===modoF)));
  caja.querySelectorAll('[data-des-letra]').forEach(b=>
    b.setAttribute('aria-pressed',String(b.dataset.desLetra===modoL)));

  const ruedaFondo=caja.querySelector('[data-des-fondo-color]');
  ruedaFondo.hidden=modoF!=='manual';
  ruedaFondo.value=ruedaDelFondo(objeto);

  const ruedaLetra=caja.querySelector('[data-des-letra-color]');
  ruedaLetra.hidden=modoL!=='manual';
  ruedaLetra.value=ruedaDeLaLetra(objeto);
}

/* =========================================================
   BOTONES Y ESCRITURA
   Un oyente para toda la página, como en el resto de la
   aplicación: los formularios se redibujan enteros y poner
   un oyente en cada botón no aguantaría.
   ========================================================= */
document.addEventListener('click',(ev)=>{
  const t=ev.target;

  /* ---------- Alerta del grupo ---------- */
  if(t.closest('[data-alerta-anadir]')){
    const g=grupoActual();if(!g)return;
    g.alerta=crearAlerta();
    marcarSucio();pintarZona();return;
  }
  if(t.closest('[data-alerta-quitar]')){
    const g=grupoActual();if(!g)return;
    if(!confirm('¿Quitar la alerta de este grupo?'))return;
    delete g.alerta;delete g.alertas;
    marcarSucio();pintarZona();return;
  }

  /* ---------- Notas de la sección ---------- */
  if(t.closest('[data-nota-anadir]')){
    const s=seccionActual();if(!s)return;
    notasDeSeccion(s).push(crearNotaDeSeccion());
    marcarSucio();pintarZona();return;
  }
  if(t.closest('[data-nota-subir]')||t.closest('[data-nota-bajar]')){
    const d=destacadoDesde(t);if(!d||!d.lista)return;
    const destino=t.closest('[data-nota-subir]')?d.indice-1:d.indice+1;
    if(!d.lista[destino])return;
    [d.lista[d.indice],d.lista[destino]]=[d.lista[destino],d.lista[d.indice]];
    marcarSucio();pintarZona();return;
  }
  if(t.closest('[data-nota-borrar]')){
    const d=destacadoDesde(t);if(!d||!d.lista)return;
    if(!confirm('¿Quitar esta nota de la sección?'))return;
    d.lista.splice(d.indice,1);
    marcarSucio();pintarZona();return;
  }

  /* ---------- Etiquetas del plato ---------- */
  if(t.closest('[data-etq-anadir]')){
    const ficha=t.closest('.ficha-item');
    const g=grupoActual();if(!ficha||!g)return;
    const item=g.items?.[Number(ficha.dataset.indice)];if(!item)return;
    etiquetasDe(item).push(crearEtiqueta());
    marcarSucio();pintarZona();return;
  }

  const botonPos=t.closest('[data-etq-pos]');
  if(botonPos){
    const d=destacadoDesde(botonPos);if(!d)return;
    d.objeto.posicion=botonPos.dataset.etqPos;
    d.caja.querySelectorAll('[data-etq-pos]').forEach(b=>
      b.setAttribute('aria-pressed',String(b.dataset.etqPos===d.objeto.posicion)));
    marcarSucio();return;
  }

  if(t.closest('[data-etq-subir]')||t.closest('[data-etq-bajar]')){
    const d=destacadoDesde(t);if(!d||!d.lista)return;
    const destino=t.closest('[data-etq-subir]')?d.indice-1:d.indice+1;
    if(!d.lista[destino])return;
    [d.lista[d.indice],d.lista[destino]]=[d.lista[destino],d.lista[d.indice]];
    marcarSucio();pintarZona();return;
  }

  if(t.closest('[data-etq-borrar]')){
    const d=destacadoDesde(t);if(!d||!d.lista)return;
    d.lista.splice(d.indice,1);
    marcarSucio();pintarZona();return;
  }

  /* ---------- Colores (vale para alerta, nota y etiqueta) ---------- */
  const botonFondo=t.closest('[data-des-fondo]');
  if(botonFondo){
    const d=destacadoDesde(botonFondo);if(!d)return;
    const modo=botonFondo.dataset.desFondo;
    // Al pasar a «a mi gusto» la rueda arranca del color que ya enseñaba.
    d.objeto.fondo=modo==='manual'?ruedaDelFondo(d.objeto):modo;
    refrescarDestacado(d.caja,d.objeto);marcarSucio();return;
  }

  const botonLetra=t.closest('[data-des-letra]');
  if(botonLetra){
    const d=destacadoDesde(botonLetra);if(!d)return;
    const modo=botonLetra.dataset.desLetra;
    d.objeto.color=modo==='manual'?ruedaDeLaLetra(d.objeto):'auto';
    refrescarDestacado(d.caja,d.objeto);marcarSucio();return;
  }
});

document.addEventListener('input',(ev)=>{
  const t=ev.target;

  if(t.dataset.desFondoColor!==undefined||t.dataset.desLetraColor!==undefined){
    const d=destacadoDesde(t);if(!d)return;
    if(t.dataset.desFondoColor!==undefined)d.objeto.fondo=t.value;
    else d.objeto.color=t.value;
    refrescarDestacado(d.caja,d.objeto);marcarSucio();return;
  }

  const ed=t.dataset.ed;
  if(ed!=='alerta-texto'&&ed!=='etq-texto'&&ed!=='nota-texto')return;
  const d=destacadoDesde(t);if(!d)return;
  asignarTexto(d.objeto,'texto',t.dataset.lang,t.value);
  marcarSucio();
});

/* Cuando se sabe (o cambia) la plantilla del local, se repinta el
   editor: según la plantilla se ofrecen o no las notas de la sección.
   Lo avisa plantilla.js. */
document.addEventListener('plantilla-lista',()=>{
  if(estado.datos&&estado.vista==='editor')pintarZona();
});
