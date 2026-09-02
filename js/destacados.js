/* =========================================================
   ETIQUETAS Y ALERTAS
   Las dos formas que tiene el negocio de destacar algo en
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

   Las dos guardan lo mismo en carta.json:
     { "texto":{"es":"…","en":"…"}, "fondo":"…", "color":"…" }
   y la etiqueta añade "posicion": "arriba" o "abajo".

   El fondo puede ser "principal" (el color de la marca),
   "secundario" (el tono del fondo de la carta) o un color
   escrito a mano. La letra puede ir en "auto" y entonces se
   elige sola, clara u oscura, según lo que se lea mejor.
   ========================================================= */

/* ---------- Cómo nace un destacado ---------- */
function crearAlerta(){
  return { texto:crearTexto(''), fondo:'principal', color:'auto' };
}
function crearEtiqueta(){
  return { texto:crearTexto(''), posicion:'arriba', fondo:'principal', color:'auto' };
}

/* Las etiquetas de un plato, siempre como lista aunque el plato
   todavía no tenga ninguna. */
function etiquetasDe(item){
  if(!Array.isArray(item.etiquetas))item.etiquetas=[];
  return item.etiquetas;
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
   LOS COLORES DE LA CARTA
   Para que la vista previa no mienta hace falta saber con
   qué colores se pinta la carta de verdad. Los guarda
   apariencia.json, al lado de carta.json.

   Se piden una sola vez, al abrir el editor. Si no se
   pueden traer (sin conexión, sin token, archivo que aún no
   existe), se usan los de fábrica: la vista previa se
   parecerá un poco menos, pero nada deja de funcionar.
   ========================================================= */

const CARTA_COLORES_FABRICA = { principal:'#E9B44C', fondo:'#12100E', texto:'auto' };

const coloresCarta = { principal:'#E9B44C', fondo:'#12100E', texto:'#F4EFE7',
                       superficie:'#1A1613', pedidos:false };

async function traerColoresDeLaCarta(){
  if(coloresCarta.pedidos)return;
  coloresCarta.pedidos=true;

  const a=leerAjustes();
  if(!a.owner||!a.repo)return;

  // apariencia.json vive en la misma carpeta que carta.json.
  const partes=String(a.ruta||'carta.json').split('/');
  partes[partes.length-1]='apariencia.json';

  try{
    const r=await fetch(
      `https://api.github.com/repos/${a.owner}/${a.repo}/contents/${partes.join('/')}?ref=${a.rama||'main'}`,
      { headers:{'Accept':'application/vnd.github+json',
                 ...(a.token?{'Authorization':`Bearer ${a.token}`}:{})}, cache:'no-store' });
    if(!r.ok)return;                       // 404 incluido: aún no lo han personalizado
    const guardados=JSON.parse(deBase64((await r.json()).content))?.colores;
    if(!guardados)return;
    asentarColoresDeLaCarta(guardados);
    if(estado.datos&&estado.vista==='editor')pintarZona();   // las previas ya pueden ser fieles
  }catch{ /* la vista previa se queda con los colores de fábrica */ }
}

/* Traduce los dos o tres colores que elige el negocio a los cuatro que
   necesita la vista previa. Es la misma cocina que hace carta.js: si
   allí cambia, aquí también. */
function asentarColoresDeLaCarta(elegidos){
  const c={...CARTA_COLORES_FABRICA,...elegidos};
  const principal=esHexValido(c.principal)?c.principal:CARTA_COLORES_FABRICA.principal;
  const fondo=esHexValido(c.fondo)?c.fondo:CARTA_COLORES_FABRICA.fondo;
  const texto=esHexValido(c.texto)?c.texto:(hexEsClaroEnLaCarta(fondo)?'#1A1611':'#F4EFE7');
  coloresCarta.principal=principal;
  coloresCarta.fondo=fondo;
  coloresCarta.texto=texto;
  coloresCarta.superficie=mezclaHex(fondo,texto,0.05);
}

/* ---------- Cuentas de color ----------
   Copian a propósito las de carta.js, incluida la de «¿es claro?»,
   que allí usa una media sencilla y no la fórmula de accesibilidad.
   Si las dos no coinciden, la vista previa enseñaría un color y la
   carta pintaría otro. */
function esHexValido(valor){
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(valor??'').trim());
}
function mezclaHex(a,b,cuanto){
  return componentesAColor(mezclarColor(colorAComponentes(a),colorAComponentes(b),cuanto));
}
function hexEsClaroEnLaCarta(hex){
  const [r,g,b]=colorAComponentes(hex);
  return (0.2126*r+0.7152*g+0.0722*b)/255>0.55;
}

/* ---------- Los colores de UN destacado ---------- */
function fondoDeDestacado(d){
  const elegido=String(d?.fondo??'principal').trim();
  if(elegido==='secundario')return coloresCarta.superficie;
  if(esHexValido(elegido))return elegido;
  return coloresCarta.principal;
}
function letraDeDestacado(d,fondo){
  const elegido=String(d?.color??'auto').trim();
  if(esHexValido(elegido))return elegido;
  return hexEsClaroEnLaCarta(fondo)?'#17140F':'#FFF8EC';
}

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
   grupo y para las etiquetas de los platos.
   ========================================================= */

/* Los dos juegos de botones de color, con su rueda escondida hasta que
   se elige «a mano», y la muestra de cómo quedará en la carta. */
function bloqueColores(d){
  const fondo=fondoDeDestacado(d), letra=letraDeDestacado(d,fondo);
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

/* La muestra: se ve tal cual saldrá en la carta, sobre el mismo fondo. */
function bloquePrevia(d,forma){
  const fondo=fondoDeDestacado(d), letra=letraDeDestacado(d,fondo);
  return `
    <div class="previa-destacado" style="background:${coloresCarta.fondo}">
      <span class="previa-destacado__pieza previa-destacado__pieza--${forma}"
            data-des-previa
            style="background:${fondo};color:${letra}">${escapar(textoDePrevia(d))}</span>
    </div>`;
}

function textoDePrevia(d){
  return valorTexto(d?.texto,estado.idiomas[0]).trim()||'Sin texto';
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
      <div class="destacado" data-destacado="alerta">
        <div class="par-idiomas">${camposTexto('alerta-texto',alerta.texto,'Texto de la alerta')}</div>
        <p class="campo__pista">Cuanto más corta, mejor: comparte línea con el título del grupo.</p>
        ${bloqueColores(alerta)}
        ${bloquePrevia(alerta,'alerta')}
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
      ${bloquePrevia(e,'etiqueta')}
    </div>`).join('');

  return `
    <div class="destacados">
      <div class="destacados__cabecera">
        <span class="campo__etiqueta">Etiquetas</span>
        <button class="btn btn--suave btn--mini" data-etq-anadir type="button">Añadir etiqueta</button>
      </div>
      <p class="campo__pista">Palabras cortas que se ven destacadas junto al plato: «250 g», «Nuevo», «Picante». Se escriben en mayúsculas solas y puedes poner las que quieras.</p>
      ${fichas}
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

  const ficha=caja.closest('.ficha-item');
  const g=grupoActual();
  if(!ficha||!g)return null;
  const item=g.items?.[Number(ficha.dataset.indice)];
  if(!item)return null;
  const lista=etiquetasDe(item);
  const i=Number(caja.dataset.indice);
  return lista[i]?{caja,objeto:lista[i],lista,indice:i}:null;
}

/* Repinta SOLO esta tarjeta: los botones marcados, la rueda escondida
   o a la vista y la muestra. Se hace así, y no repintando el editor
   entero, para no perder el cursor mientras se escribe. */
function refrescarDestacado(caja,objeto){
  const modoF=modoDelFondo(objeto), modoL=modoDeLaLetra(objeto);
  const fondo=fondoDeDestacado(objeto), letra=letraDeDestacado(objeto,fondo);

  caja.querySelectorAll('[data-des-fondo]').forEach(b=>
    b.setAttribute('aria-pressed',String(b.dataset.desFondo===modoF)));
  caja.querySelectorAll('[data-des-letra]').forEach(b=>
    b.setAttribute('aria-pressed',String(b.dataset.desLetra===modoL)));

  const ruedaFondo=caja.querySelector('[data-des-fondo-color]');
  ruedaFondo.hidden=modoF!=='manual';
  ruedaFondo.value=fondo;

  const ruedaLetra=caja.querySelector('[data-des-letra-color]');
  ruedaLetra.hidden=modoL!=='manual';
  ruedaLetra.value=letra;

  const pieza=caja.querySelector('[data-des-previa]');
  pieza.style.background=fondo;
  pieza.style.color=letra;
  pieza.textContent=textoDePrevia(objeto);
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

  /* ---------- Colores (vale para alerta y etiqueta) ---------- */
  const botonFondo=t.closest('[data-des-fondo]');
  if(botonFondo){
    const d=destacadoDesde(botonFondo);if(!d)return;
    const modo=botonFondo.dataset.desFondo;
    // Al pasar a «a mi gusto» se arranca del color que ya se veía, para
    // que la rueda no se abra en un color que no tiene nada que ver.
    d.objeto.fondo=modo==='manual'?fondoDeDestacado(d.objeto):modo;
    refrescarDestacado(d.caja,d.objeto);marcarSucio();return;
  }

  const botonLetra=t.closest('[data-des-letra]');
  if(botonLetra){
    const d=destacadoDesde(botonLetra);if(!d)return;
    const modo=botonLetra.dataset.desLetra;
    d.objeto.color=modo==='manual'
      ? letraDeDestacado(d.objeto,fondoDeDestacado(d.objeto))
      : 'auto';
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
  if(ed!=='alerta-texto'&&ed!=='etq-texto')return;
  const d=destacadoDesde(t);if(!d)return;
  asignarTexto(d.objeto,'texto',t.dataset.lang,t.value);
  // La muestra se refresca sola, pero sin repintar: se está escribiendo.
  if(t.dataset.lang===estado.idiomas[0]){
    d.caja.querySelector('[data-des-previa]').textContent=textoDePrevia(d.objeto);
  }
  marcarSucio();
});

/* Los colores de la carta se piden en cuanto abre el editor, así la
   primera vista previa ya sale con los colores buenos. */
traerColoresDeLaCarta();
