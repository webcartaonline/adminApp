/* =========================================================
   AJUSTES DE LA PÁGINA
   La personalización de la carta que ven los clientes del
   negocio: colores, título, eslogan, logotipo y fuentes.

   Todo se guarda en un archivo propio del repositorio,
   apariencia.json, separado de carta.json a propósito: así
   publicar la apariencia y publicar la carta nunca se pisan
   entre sí aunque se haga desde pantallas distintas.

   La espera de dos minutos tras publicar es LA MISMA que la
   del editor (comparten la llave guardada en el navegador):
   publiques donde publiques, los dos botones quedan
   bloqueados hasta que el despliegue anterior termina.

   Va todo dentro de una función envolvente para no dejar
   nombres sueltos que choquen con el resto del programa.
   ========================================================= */
(function(){

/* =========================================================
   BORRADOR PARA LA VISTA PREVIA
   Cada cambio en la apariencia se guarda en el cajón del
   navegador (Almacen), organizado por cliente, para que la
   vista previa del editor pueda enseñar la página con los
   cambios SIN publicar: colores, título, eslogan, pie, redes,
   disposición… y también la portada, el logotipo y las fuentes
   nuevas que todavía no se han subido.

   El JSON (todo lo que no son archivos) se guarda con un
   pequeño retardo, para no escribir en el cajón en cada tecla.
   Los archivos (fotos y fuentes) se guardan cuando se eligen y
   se borran cuando se quitan.

   Si el navegador no tuviera este cajón, todo esto falla en
   silencio: los ajustes siguen funcionando igual y la vista
   previa simplemente mostrará lo último publicado.
   ========================================================= */
function tipoPorExtension(ruta){
  const e=String(ruta||'').split('.').pop().toLowerCase();
  return ({
    jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp',
    svg:'image/svg+xml', gif:'image/gif',
    woff2:'font/woff2', woff:'font/woff', ttf:'font/ttf', otf:'font/otf'
  })[e]||'application/octet-stream';
}

/* Deja los datos listos para guardarse/publicarse, sin tocar lo que el
   cliente está escribiendo: recorta espacios, tira los mensajes de pie
   vacíos y ordena los enlaces de redes. (Antes esto se hacía al publicar;
   ahora se publica desde el editor, así que se hace aquí, sobre una copia.) */
function datosNormalizados(){
  const d=JSON.parse(JSON.stringify(apar.datos));
  d.identidad.titulo=String(d.identidad.titulo||'').trim();
  d.identidad.eslogan.es=String(d.identidad.eslogan.es||'').trim();
  d.identidad.eslogan.en=String(d.identidad.eslogan.en||'').trim();
  d.pie.bloques=(d.pie.bloques||[])
    .map(b=>({titulo:String(b.titulo||'').trim(),texto:String(b.texto||'').trim()}))
    .filter(b=>b.titulo||b.texto);
  for(const clave of Object.keys(d.pie.redes||{})){
    d.pie.redes[clave]=normalizarEnlace(d.pie.redes[clave]);
  }
  return d;
}

let relojBorrador=null;
function guardarBorradorApariencia(){
  clearTimeout(relojBorrador);
  relojBorrador=setTimeout(()=>{
    if(!apar.datos)return;
    try{
      Almacen.guardar('apariencia',{
        cliente:clienteActual(),
        datos:datosNormalizados(),
        porBorrar:apar.porBorrar.slice(),
        fecha:Date.now()
      });
    }catch{/* sin cajón: la vista previa usará lo publicado */}
  },350);
}

/* Un archivo (foto o fuente) pendiente de subir, para que la vista
   previa lo enseñe antes de publicarlo. Se guarda con la misma clave
   (la ruta en el repositorio) que luego busca la vista previa. */
function guardarArchivoBorrador(ruta,base64){
  if(!ruta||!base64)return;
  try{Almacen.guardar('imagenes',{clave:`${clienteActual()}::${ruta}`,base64,tipo:tipoPorExtension(ruta)});}
  catch{/* sin cajón */}
}
function borrarArchivoBorrador(ruta){
  if(!ruta)return;
  try{Almacen.borrar('imagenes',`${clienteActual()}::${ruta}`);}catch{}
}

/* Borra TODOS los archivos pendientes de este cliente. Se usa al cargar
   o al publicar: en ese momento no queda nada sin subir, así que el
   cajón debe quedar limpio para que no enseñe una foto vieja. En este
   cajón solo hay archivos de la apariencia (portada, logo, fuentes);
   las fotos de la carta van por otro sitio, así que esto no las toca. */
async function limpiarArchivosDeCliente(){
  const prefijo=`${clienteActual()}::`;
  try{
    const todos=await Almacen.listar('imagenes');
    await Promise.all((todos||[])
      .filter(x=>String(x.clave).startsWith(prefijo))
      .map(x=>Almacen.borrar('imagenes',x.clave)));
  }catch{/* sin cajón */}
}

/* Deja el borrador como si no hubiera nada sin publicar. */
async function limpiarBorradorApariencia(){
  clearTimeout(relojBorrador);
  try{await Almacen.borrar('apariencia',clienteActual());}catch{}
  await limpiarArchivosDeCliente();
}

/* ---------- Cómo es un apariencia.json recién estrenado ---------- */
function aparienciaDeFabrica(){
  return {
    colores:{ principal:'#E9B44C', fondo:'#12100E', texto:'auto' },
    identidad:{ titulo:'', eslogan:{ es:'', en:'' }, logo:'',
                fondo:{ imagen:'', foco:'centro' } },
    fuentes:{ titulo:null, texto:null },
    // Colocación de la barra de secciones y del filtro de alérgenos.
    pagina:{ barra:'inferior', alergenos:'abajo' },
    pie:{ bloques:[], redes:{ tiktok:'', instagram:'', x:'', youtube:'', facebook:'', snapchat:'' } }
  };
}

/* Las seis redes que puede elegir el negocio, en el orden en que se
   pintan. Los iconos son los mismos que dibuja la carta. */
const REDES_PIE = [
  { clave:'tiktok',    nombre:'TikTok',
    icono:'<path d="M15 4.2c.4 2.3 2 3.9 4.2 4.1"/><path d="M15 4.2v9.3a4.1 4.1 0 1 1-3.4-4.04"/>' },
  { clave:'instagram', nombre:'Instagram',
    icono:'<rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.7" cy="7.3" r=".9" fill="currentColor" stroke="none"/>' },
  { clave:'x',         nombre:'X',
    icono:'<path d="M5.3 4.5h3.5l9.9 15h-3.5Z"/><path d="M10.6 13.4 5 19.5"/><path d="M18.7 4.5 13.3 10.4"/>' },
  { clave:'youtube',   nombre:'YouTube',
    icono:'<rect x="3.5" y="6" width="17" height="12" rx="3.6"/><path d="M10.4 9.5v5l4.4-2.5Z"/>' },
  { clave:'facebook',  nombre:'Facebook',
    icono:'<path d="M15.6 4.5h-1.9a3.5 3.5 0 0 0-3.5 3.5V20"/><path d="M8 11.6h6.6"/>' },
  { clave:'snapchat',  nombre:'Snapchat',
    icono:'<path d="M12 4c2.5 0 4.3 1.9 4.3 4.5v1.6c0 .3.2.5.5.5l1.7.4c-.6 1.3-1.6 2.2-2.9 2.7.9 1.2 2.2 1.9 3.9 2.1-1 1.2-2.4 1.9-4 1.9-.5.8-1.9 1.4-3.5 1.4s-3-.6-3.5-1.4c-1.6 0-3-.7-4-1.9 1.7-.2 3-.9 3.9-2.1-1.3-.5-2.3-1.4-2.9-2.7l1.7-.4c.3 0 .5-.2.5-.5V8.5C7.7 5.9 9.5 4 12 4Z"/>' }
];

/* Los límites del logotipo y de la portada están en config.js:
   LOGO_LADO_MAX, LOGO_PESO_INTACTO, FONDO_LADO_MAX… */
const FUENTE_PESO_MAX = 10*1024*1024;
const FUENTE_TIPOS    = ['woff2','woff','ttf','otf'];

/* ---------- Memoria de este apartado ---------- */
const apar={
  cargada:false, cargando:false,
  datos:null,             // el apariencia.json que se está editando
  sucio:false,            // ¿hay cambios sin publicar?
  logoPendiente:null,     // {ruta, base64} esperando a subirse
  fondoPendiente:null,    // la foto de la portada, esperando a subirse
  fuentesPendientes:{},   // clave -> {ruta, base64}
  porBorrar:[],           // archivos del repositorio que ya sobran
  publicado:{ logo:'', fondo:'', fuentes:{ titulo:'', texto:'' } }, // lo que hay ahora en el repo
  previas:{}              // URLs locales de vista previa, para liberarlas
};

/* =========================================================
   COCINA DE COLORES
   La misma receta que usa la propia carta: de dos o tres
   colores elegidos salen todos los demás. Si cambias algo
   aquí, cámbialo también en carta.js de la página.
   ========================================================= */
function hexANumeros(hex){
  const limpio=String(hex??'').trim().replace('#','');
  const largo=limpio.length===3?limpio.split('').map(c=>c+c).join(''):limpio;
  if(!/^[0-9a-fA-F]{6}$/.test(largo))return null;
  const n=parseInt(largo,16);
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function numerosAHex({r,g,b}){
  const c=x=>Math.round(Math.min(255,Math.max(0,x))).toString(16).padStart(2,'0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mezclaDeHex(hexA,hexB,cuanto){
  const a=hexANumeros(hexA),b=hexANumeros(hexB);
  if(!a||!b)return hexA;
  return numerosAHex({r:a.r+(b.r-a.r)*cuanto,g:a.g+(b.g-a.g)*cuanto,b:a.b+(b.b-a.b)*cuanto});
}
function hexTransparente(hex,alfa){
  const c=hexANumeros(hex);
  return c?`rgba(${c.r},${c.g},${c.b},${alfa})`:hex;
}
function hexEsClaro(hex){
  const c=hexANumeros(hex);
  return c?(0.2126*c.r+0.7152*c.g+0.0722*c.b)/255>0.55:false;
}
function paletaDesde(colores){
  const principal=hexANumeros(colores.principal)?colores.principal:'#E9B44C';
  const fondo=hexANumeros(colores.fondo)?colores.fondo:'#12100E';
  const claro=hexEsClaro(fondo);
  const texto=hexANumeros(colores.texto)?colores.texto:(claro?'#1A1611':'#F4EFE7');
  return {
    acento:principal, fondo, texto,
    textoSuave:mezclaDeHex(texto,fondo,.48),
    borde:mezclaDeHex(fondo,texto,.14),
    halo:hexTransparente(principal,.16)
  };
}

/* =========================================================
   VISTA PREVIA
   Una portada en miniatura que refleja al momento colores,
   título, eslogan, logotipo y fuentes.
   ========================================================= */
function pintarPrevia(){
  const d=apar.datos; if(!d)return;
  const caja=$('#previaCarta');
  const p=paletaDesde(d.colores);
  caja.style.setProperty('--pc-fondo',p.fondo);
  caja.style.setProperty('--pc-acento',p.acento);
  caja.style.setProperty('--pc-texto',p.texto);
  caja.style.setProperty('--pc-texto-suave',p.textoSuave);
  caja.style.setProperty('--pc-borde',p.borde);
  caja.style.setProperty('--pc-halo',p.halo);

  const titulo=d.identidad.titulo.trim();
  const hayLogo=!!d.identidad.logo;
  const nombre=$('#previaNombre');
  nombre.textContent=titulo||(hayLogo?'':'Nombre del negocio');
  nombre.hidden=!nombre.textContent;

  const lema=$('#previaLema');
  lema.textContent=d.identidad.eslogan.es.trim();
  lema.hidden=!lema.textContent;

  const img=$('#previaLogo');
  const origen=apar.previas.logo||(hayLogo?rutaPublica(d.identidad.logo):'');
  if(origen){ if(img.getAttribute('src')!==origen)img.src=origen; img.hidden=false; }
  else{ img.hidden=true; img.removeAttribute('src'); }
  caja.classList.toggle('previa-carta--solo-logo',hayLogo&&!titulo);

  // La foto de fondo, con el mismo encuadre que tendrá en la carta,
  // para que la miniatura no engañe.
  const fondo=$('#previaFondo');
  const origenFondo=urlDelFondo();
  if(origenFondo){
    if(fondo.getAttribute('src')!==origenFondo)fondo.src=origenFondo;
    fondo.style.objectPosition=posicionDelFoco(d.identidad.fondo.foco);
    fondo.hidden=false;
  }else{
    fondo.hidden=true; fondo.removeAttribute('src');
  }
  caja.classList.toggle('previa-carta--con-fondo',!!origenFondo);
}

/* La dirección pública de un archivo del repositorio, para poder
   enseñar en la previa un logo que ya estaba publicado. */
function rutaPublica(ruta){
  const a=leerAjustes();
  if(!a.owner||!a.repo||!ruta)return '';
  return `https://raw.githubusercontent.com/${a.owner}/${a.repo}/${a.rama||'main'}/${ruta}`;
}

/* Una fuente recién elegida se enseña en la previa cargándola desde el
   propio archivo local, sin esperar a publicarla. */
async function previsualizarFuente(clave,archivo){
  try{
    const url=URL.createObjectURL(archivo);
    if(apar.previas[`fuente-${clave}`])URL.revokeObjectURL(apar.previas[`fuente-${clave}`]);
    apar.previas[`fuente-${clave}`]=url;
    const familia=clave==='titulo'?'PreviaFuenteTitulo':'PreviaFuenteTexto';
    const fuente=new FontFace(familia,`url("${url}")`);
    await fuente.load();
    document.fonts.add(fuente);
    $('#previaCarta').style.setProperty(
      clave==='titulo'?'--pc-fuente-titulo':'--pc-fuente-texto',
      `"${familia}", ${clave==='titulo'?'Georgia, serif':'system-ui, sans-serif'}`);
  }catch{avisar('Ese archivo de fuente no se ha podido leer. ¿Seguro que es una fuente válida?','error');}
}
function quitarPreviaFuente(clave){
  $('#previaCarta').style.removeProperty(clave==='titulo'?'--pc-fuente-titulo':'--pc-fuente-texto');
}

/* =========================================================
   CARGA
   Se trae apariencia.json del repositorio (si no existe aún,
   se estrena uno) y carta.json solo para rellenar el título
   y el eslogan con lo que la carta enseña hoy.
   ========================================================= */
function cabecerasGitHub(){
  const a=leerAjustes();
  return {'Accept':'application/vnd.github+json',...(a.token?{'Authorization':`Bearer ${a.token}`}:{})};
}
function rutaJunto(nombre){
  // apariencia.json vive al lado de carta.json, sea cual sea la carpeta.
  const partes=String(leerAjustes().ruta||'carta.json').split('/');
  partes[partes.length-1]=nombre;
  return partes.join('/');
}
async function traerDelRepo(ruta){
  const a=leerAjustes();
  const r=await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}?ref=${a.rama||'main'}`,
    {headers:cabecerasGitHub(),cache:'no-store'});
  if(r.status===404)return null;
  if(r.status===401)throw new Error('El token no es válido o ha caducado.');
  if(!r.ok)throw new Error(`GitHub respondió ${r.status}.`);
  const cuerpo=await r.json();
  return JSON.parse(deBase64(cuerpo.content));
}

async function cargarPagina(){
  const a=leerAjustes();
  if(!a.owner||!a.repo){
    pintarEstadoPagina('Falta la conexión','falta');
    avisar('Antes de personalizar la página, completa la conexión en el primer apartado.','error');
    return;
  }
  apar.cargando=true;
  pintarEstadoPagina('Cargando…');
  try{
    const [guardada,carta]=await Promise.all([
      traerDelRepo(rutaJunto('apariencia.json')),
      traerDelRepo(leerAjustes().ruta||'carta.json').catch(()=>null)
    ]);

    // Lo guardado se vuelca sobre uno de fábrica: si mañana hay campos
    // nuevos, un archivo antiguo no deja huecos sin rellenar.
    const base=aparienciaDeFabrica();
    apar.datos={
      colores:{...base.colores,...(guardada?.colores||{})},
      identidad:{...base.identidad,...(guardada?.identidad||{}),
        eslogan:{...base.identidad.eslogan,...(guardada?.identidad?.eslogan||{})},
        fondo:{...base.identidad.fondo,...(guardada?.identidad?.fondo||{})}},
      fuentes:{...base.fuentes,...(guardada?.fuentes||{})},
      pagina:normalizarPagina(guardada?.pagina),
      pie:{
        bloques:Array.isArray(guardada?.pie?.bloques)?guardada.pie.bloques:[],
        redes:{...base.pie.redes,...(guardada?.pie?.redes||{})}
      }
    };

    /* Primera vez (sin título ni logo configurados): se rellena con lo
       que la carta enseña hoy. Así lo que ves en los campos es
       exactamente lo que hay en la portada, y publicar no cambia nada
       que no hayas tocado. */
    if(guardada===null&&carta?.negocio){
      apar.datos.identidad.titulo=carta.negocio.nombre||'';
      const lema=carta.negocio.lema;
      if(typeof lema==='string')apar.datos.identidad.eslogan.es=lema;
      else if(lema){apar.datos.identidad.eslogan.es=lema.es||'';apar.datos.identidad.eslogan.en=lema.en||'';}
    }

    // Se apunta qué archivos hay publicados ahora, para poder borrar
    // los que sobren si se cambian o se quitan.
    apar.publicado.logo=sinVersion(apar.datos.identidad.logo);
    apar.publicado.fondo=sinVersion(apar.datos.identidad.fondo.imagen);
    apar.publicado.fuentes.titulo=sinVersion(apar.datos.fuentes.titulo?.archivo);
    apar.publicado.fuentes.texto=sinVersion(apar.datos.fuentes.texto?.archivo);

    apar.cargada=true; apar.sucio=false;
    apar.logoPendiente=null; apar.fondoPendiente=null;
    apar.fuentesPendientes={}; apar.porBorrar=[];

    // Si había cambios sin publicar guardados (de esta sesión o de otra
    // anterior), se restauran encima de lo publicado para no perderlos.
    // «Descartar y volver a traer» pone apar.forzarPublicado y los ignora.
    if(!apar.forzarPublicado) await restaurarBorrador(a);
    apar.forzarPublicado=false;

    volcarCampos();
    pintarPrevia();
    pintarEstadoPagina(apar.sucio?'Cambios sin publicar':'Al día', apar.sucio?'falta':'bien');
  }catch(e){
    pintarEstadoPagina('No se ha podido cargar','falta');
    avisar(`No se han podido traer los ajustes de la página: ${e.message}`,'error');
  }finally{apar.cargando=false;}
}

/* ---------- Restaurar cambios sin publicar ----------
   Lee del cajón del navegador lo que se estaba editando y lo vuelve a
   dejar en pantalla: los datos, los archivos que sobran por borrar y las
   vistas de las imágenes y fuentes que aún no se han subido. Así, aunque
   se recargue la app, no se pierde nada y la ventana enseña lo mismo que
   verá la vista previa y lo que publicará el editor. */
async function restaurarBorrador(a){
  let b=null;
  try{ b=await Almacen.leer('apariencia',clienteActual(a)); }catch{}
  if(!b||!b.datos) return;
  apar.datos=b.datos;
  apar.porBorrar=Array.isArray(b.porBorrar)?b.porBorrar.slice():[];
  apar.sucio=true;
  await restaurarImagenPendiente(a,'logo');
  await restaurarImagenPendiente(a,'fondo');
  await restaurarFuentePendiente(a,'titulo');
  await restaurarFuentePendiente(a,'texto');
}
async function restaurarImagenPendiente(a,cual){
  const ruta=cual==='logo'
    ? sinVersion(apar.datos.identidad.logo)
    : sinVersion(apar.datos.identidad.fondo.imagen);
  if(!ruta) return;
  let img=null;
  try{ img=await Almacen.leer('imagenes',`${clienteActual(a)}::${ruta}`); }catch{}
  if(!img||!img.base64) return;               // ya estaba publicada: nada que restaurar
  const url=`data:${img.tipo||'image/jpeg'};base64,${img.base64}`;
  apar.previas[cual]=url;
  if(cual==='logo') apar.logoPendiente={ruta,base64:img.base64};
  else              apar.fondoPendiente={ruta,base64:img.base64};
}
async function restaurarFuentePendiente(a,clave){
  const f=apar.datos.fuentes[clave];
  if(!f||!f.archivo) return;
  const ruta=sinVersion(f.archivo);
  let arch=null;
  try{ arch=await Almacen.leer('imagenes',`${clienteActual(a)}::${ruta}`); }catch{}
  if(!arch||!arch.base64) return;
  apar.fuentesPendientes[clave]={ruta,base64:arch.base64};
}

function sinVersion(ruta){return String(ruta||'').split('?')[0];}
function marcaDeTiempo(){return Date.now().toString(36);}

/* ---------- Los campos enseñan lo que hay guardado ---------- */
function volcarCampos(){
  const d=apar.datos;
  $('#aparColorPrincipal').value=d.colores.principal;
  $('#aparColorFondo').value=d.colores.fondo;
  const manual=d.colores.texto!=='auto'&&hexANumeros(d.colores.texto);
  $('#aparTextoAuto').setAttribute('aria-pressed',String(!manual));
  $('#aparTextoManual').setAttribute('aria-pressed',String(!!manual));
  $('#aparTextoRueda').hidden=!manual;
  if(manual)$('#aparColorTexto').value=d.colores.texto;
  $('#aparTitulo').value=d.identidad.titulo;
  $('#aparEsloganEs').value=d.identidad.eslogan.es;
  $('#aparEsloganEn').value=d.identidad.eslogan.en;
  pintarFondoCampo();
  pintarLogoCampo();
  pintarFuenteCampo('titulo');
  pintarFuenteCampo('texto');
  pintarBloquesPie();
  pintarRedesPie();
  pintarColocacion();
}

/* =========================================================
   DISPOSICIÓN: BARRA Y ALÉRGENOS
   Dos elecciones sencillas, cada una con dos opciones. Se
   guardan en apariencia.json → "pagina" y la carta las lee
   de ahí. Cada opción admite solo dos valores; ante
   cualquier otra cosa, se queda con la de siempre.
   ========================================================= */
function normalizarPagina(p){
  return {
    barra:     p?.barra==='superior' ? 'superior' : 'inferior',
    alergenos: p?.alergenos==='arriba' ? 'arriba' : 'abajo'
  };
}

/* Deja marcada, dentro de un grupo de botones, la opción elegida. */
function marcarSegmento(idGrupo,valor){
  document.querySelectorAll(`#${idGrupo} .chip`).forEach((b)=>{
    b.setAttribute('aria-pressed',String(b.dataset.valor===valor));
  });
}
function pintarColocacion(){
  marcarSegmento('aparBarra',apar.datos.pagina.barra);
  marcarSegmento('aparAlergenos',apar.datos.pagina.alergenos);
}

/* Al pulsar una opción se apunta en los datos y se marca en pantalla. */
$('#aparBarra').addEventListener('click',(ev)=>{
  const b=ev.target.closest('.chip'); if(!b)return;
  apar.datos.pagina.barra=b.dataset.valor==='superior'?'superior':'inferior';
  marcarSegmento('aparBarra',apar.datos.pagina.barra);
  marcarSucio();
});
$('#aparAlergenos').addEventListener('click',(ev)=>{
  const b=ev.target.closest('.chip'); if(!b)return;
  apar.datos.pagina.alergenos=b.dataset.valor==='arriba'?'arriba':'abajo';
  marcarSegmento('aparAlergenos',apar.datos.pagina.alergenos);
  marcarSucio();
});

/* =========================================================
   PIE DE PÁGINA: MENSAJES
   Una lista que crece y encoge: cada mensaje es una
   tarjetita con su título, su texto y su botón de quitar.
   ========================================================= */
function pintarBloquesPie(){
  const bloques=apar.datos.pie.bloques;
  const caja=$('#aparPieBloques');
  caja.innerHTML=bloques.length?bloques.map((b,i)=>`
    <div class="pie-bloque" data-indice="${i}">
      <div class="pie-bloque__cabecera">
        <span class="pie-bloque__numero">Mensaje ${i+1}</span>
        <button class="btn btn--peligro btn--mini" type="button" data-quitar>Quitar</button>
      </div>
      <label class="campo">
        <span class="campo__etiqueta">Título</span>
        <input type="text" data-campo="titulo" value="${escapar(b.titulo||'')}"
               autocomplete="off" placeholder="Horario, Aviso, Gracias…">
      </label>
      <label class="campo">
        <span class="campo__etiqueta">Texto</span>
        <textarea data-campo="texto" rows="3"
          placeholder="Lo que quieras contar a tus clientes.">${escapar(b.texto||'')}</textarea>
      </label>
    </div>`).join('')
    :'<p class="pie-bloques__vacio">Todavía no hay ningún mensaje. Añade el primero con el botón de abajo.</p>';
}

// Escribir dentro de un mensaje: se apunta en su sitio de la lista.
$('#aparPieBloques').addEventListener('input',(ev)=>{
  const tarjeta=ev.target.closest('[data-indice]');
  const campo=ev.target.dataset.campo;
  if(!tarjeta||!campo)return;
  apar.datos.pie.bloques[Number(tarjeta.dataset.indice)][campo]=ev.target.value;
  marcarSucio();
});
// Quitar un mensaje: fuera de la lista y se repinta (los números cambian).
$('#aparPieBloques').addEventListener('click',(ev)=>{
  const boton=ev.target.closest('[data-quitar]');
  if(!boton)return;
  const indice=Number(boton.closest('[data-indice]').dataset.indice);
  apar.datos.pie.bloques.splice(indice,1);
  pintarBloquesPie();
  marcarSucio();
});
$('#btnAparPieAnadir').addEventListener('click',()=>{
  apar.datos.pie.bloques.push({titulo:'',texto:''});
  pintarBloquesPie();
  // El cursor, directo al título del mensaje recién creado.
  const nuevas=$('#aparPieBloques').querySelectorAll('[data-indice]');
  nuevas[nuevas.length-1]?.querySelector('input')?.focus();
  marcarSucio();
});

/* =========================================================
   PIE DE PÁGINA: REDES SOCIALES
   Las seis redes, cada una con su icono y su campo de
   enlace. Con enlace, sale en la carta; en blanco, no.
   ========================================================= */
function pintarRedesPie(){
  const redes=apar.datos.pie.redes;
  $('#aparPieRedes').innerHTML=REDES_PIE.map((r)=>`
    <label class="redes__fila">
      <span class="redes__icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round">${r.icono}</svg>
      </span>
      <span class="redes__datos">
        <span class="campo__etiqueta">${r.nombre}</span>
        <input type="text" inputmode="url" autocomplete="off" spellcheck="false"
               data-red="${r.clave}" value="${escapar(redes[r.clave]||'')}"
               placeholder="https://…">
      </span>
    </label>`).join('');
}
$('#aparPieRedes').addEventListener('input',(ev)=>{
  const red=ev.target.dataset.red;
  if(!red)return;
  apar.datos.pie.redes[red]=ev.target.value;
  marcarSucio();
});

/* Un enlace escrito sin el «https://» delante se arregla solo. */
function normalizarEnlace(url){
  const t=String(url||'').trim();
  if(!t)return '';
  return /^https?:\/\//i.test(t)?t:`https://${t}`;
}

function pintarLogoCampo(){
  const hay=!!apar.datos.identidad.logo;
  const origen=apar.previas.logo||(hay?rutaPublica(apar.datos.identidad.logo):'');
  const img=$('#aparLogoImg');
  if(origen){ img.src=origen; img.hidden=false; }
  else{ img.hidden=true; img.removeAttribute('src'); }
  $('#aparLogoVacio').hidden=!!origen;
  $('#btnAparLogoQuitar').hidden=!hay;
}

function pintarFuenteCampo(clave){
  const f=apar.datos.fuentes[clave];
  const estado=$(clave==='titulo'?'#aparFuenteTituloEstado':'#aparFuenteTextoEstado');
  estado.innerHTML=f?.archivo
    ?`Fuente en uso: <b>${escapar(f.nombre||sinVersion(f.archivo).split('/').pop())}</b>`
    :'Ahora mismo se usa la letra de serie de la carta.';
  $(clave==='titulo'?'#btnAparFuenteTituloQuitar':'#btnAparFuenteTextoQuitar').hidden=!f?.archivo;
}

/* ---------- Cambios sin publicar ---------- */
function marcarSucio(){
  apar.sucio=true;
  pintarEstadoPagina('Cambios sin publicar','falta');
  guardarBorradorApariencia();   // se guarda para la vista previa y para publicar
}
function pintarEstadoPagina(texto,tipo){
  const e=$('#estadoPagina');
  e.textContent=texto;
  e.className=`apartado__estado${tipo==='bien'?' apartado__estado--bien':tipo==='falta'?' apartado__estado--falta':''}`;
}

/* =========================================================
   LOGOTIPO
   Se acepta cualquier forma (apaisado, cuadrado, redondo…)
   y se sube tal cual: ni se recorta, ni se deforma, ni se
   comprime. Solo si es enorme se reduce, y con la calidad
   más alta posible. Los SVG ni se miran: pesan nada y se
   ven perfectos a cualquier tamaño.
   ========================================================= */
const POLITICA_LOGO = {
  ladoMax:LOGO_LADO_MAX,
  pesoIntacto:LOGO_PESO_INTACTO,
  calidad:LOGO_CALIDAD,
  conservarTransparencia:true     // un logo sin fondo debe seguir sin fondo
};

async function elegirLogo(archivo){
  if(!archivo)return;
  if(archivo.size>LOGO_PESO_MAX){
    avisar('Ese archivo pesa demasiado. Prueba con una imagen de menos de 10 MB.','error');return;
  }
  try{
    const preparado=archivo.type==='image/svg+xml'
      ? {blob:archivo,extension:'svg',tocada:false,ancho:0,alto:0}
      : await prepararImagenIntacta(archivo,POLITICA_LOGO);

    await guardarLogoPreparado(preparado);
    avisar(`Logotipo listo. ${resumenDeImagen(preparado)}`,'bien');
  }catch{
    avisar('No se ha podido leer esa imagen. Prueba con un PNG, JPG, WebP o SVG.','error');
  }
}

/* Deja el logotipo preparado para subirse y refresca la pantalla. */
async function guardarLogoPreparado(preparado){
  const ruta=`img/logo.${preparado.extension}`;

  if(apar.previas.logo)URL.revokeObjectURL(apar.previas.logo);
  apar.previas.logo=URL.createObjectURL(preparado.blob);

  apuntarSiSobra(apar.publicado.logo,ruta);
  apar.logoPendiente={ruta,base64:await blobABase64(preparado.blob)};
  guardarArchivoBorrador(ruta,apar.logoPendiente.base64);
  apar.datos.identidad.logo=`${ruta}?v=${marcaDeTiempo()}`;
  pintarLogoCampo(); pintarPrevia(); marcarSucio();
}

function quitarLogo(){
  apuntarSiSobra(apar.publicado.logo,'');
  if(apar.logoPendiente)borrarArchivoBorrador(apar.logoPendiente.ruta);
  apar.logoPendiente=null;
  if(apar.previas.logo){URL.revokeObjectURL(apar.previas.logo);delete apar.previas.logo;}
  apar.datos.identidad.logo='';
  pintarLogoCampo(); pintarPrevia(); marcarSucio();
}

/* =========================================================
   FONDO DE LA PORTADA
   Una foto que ocupa toda la cabecera de la carta, detrás
   del título, el eslogan y el logotipo. Se guarda junto al
   resto de la identidad, en apariencia.json.

   Como la portada cambia de forma según la pantalla (alta y
   estrecha en el móvil, baja y ancha en el ordenador), la
   foto se recorta sola. La cuadrícula de tres por tres dice
   qué parte NO se puede perder: es la misma regla que usan
   las franjas de las secciones y los grupos, y se guarda
   igual, en un campo "foco".

   La foto no se recorta aquí: solo se encoge si viene
   enorme. El encuadre lo hace la carta al pintarla, así la
   misma foto sirve para cualquier pantalla.
   ========================================================= */

/* Las nueve posiciones, traducidas a lo que entiende el CSS.
   Tiene que coincidir con la tabla FOCOS de la carta. */
const FOCO_A_CSS = {
  'arriba-izquierda':'left top',    'arriba':'center top',    'arriba-derecha':'right top',
  'izquierda':'left center',        'centro':'center',        'derecha':'right center',
  'abajo-izquierda':'left bottom',  'abajo':'center bottom',  'abajo-derecha':'right bottom'
};

function focoDelFondo(){
  const v=String(apar.datos?.identidad?.fondo?.foco||'').trim().toLowerCase();
  return FOCO_A_CSS[v]?v:FOCO_DEFECTO;
}
function posicionDelFoco(valor){
  return FOCO_A_CSS[String(valor||'').trim().toLowerCase()]||'center';
}

/* De dónde sale la imagen que se enseña: la recién elegida (todavía sin
   publicar) o la que ya está en el repositorio. */
function urlDelFondo(){
  const ruta=apar.datos?.identidad?.fondo?.imagen;
  return apar.previas.fondo||(ruta?rutaPublica(ruta):'');
}

function pintarFondoCampo(){
  const hay=!!apar.datos.identidad.fondo.imagen;
  const origen=urlDelFondo();
  const img=$('#aparFondoImg');
  if(origen){ img.src=origen; img.style.objectPosition=posicionDelFoco(focoDelFondo()); img.hidden=false; }
  else{ img.hidden=true; img.removeAttribute('src'); }
  $('#aparFondoVacio').hidden=!!origen;
  $('#btnAparFondoQuitar').hidden=!hay;
  $('#aparFondoRejilla').hidden=!origen;

  const elegido=focoDelFondo();
  $('#aparFondoRejilla').querySelectorAll('[data-foco]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.foco===elegido));
  });
  $('#aparFondoFocoRotulo').textContent=hay||origen
    ? `Zona importante: ${FOCOS.find(f=>f.clave===elegido).rotulo.toLowerCase()}`
    : '';
}

/* La cuadrícula se dibuja una sola vez, al arrancar la página. */
function montarRejillaFoco(){
  $('#aparFondoRejilla').innerHTML=FOCOS.map(f=>
    `<button class="foco-casilla" type="button" data-foco="${f.clave}"
             aria-pressed="false" title="${f.rotulo}"><span>${f.rotulo}</span></button>`).join('');
}

/* La portada tampoco se comprime: se sube tal cual mientras no se pase
   de ancho ni de peso. Solo si se pasa se reduce, con calidad muy alta. */
const POLITICA_FONDO = {
  ladoMax:FONDO_LADO_MAX,
  pesoIntacto:FONDO_PESO_INTACTO,
  calidad:FONDO_CALIDAD,
  conservarTransparencia:false    // es una foto de fondo: no hay nada transparente
};

async function elegirFondo(archivo){
  if(!archivo)return;
  if(archivo.size>FONDO_PESO_MAX){
    avisar('Esa foto pesa demasiado. Prueba con una de menos de 15 MB.','error');return;
  }
  try{
    const preparado=await prepararImagenIntacta(archivo,POLITICA_FONDO);
    await guardarFondoPreparado(preparado);
    avisar(`Foto de portada lista. ${resumenDeImagen(preparado)}`,'bien');
  }catch{
    avisar('No se ha podido leer esa imagen. Prueba con un JPG, PNG o WebP.','error');
  }
}

/* Deja la foto de la portada preparada para subirse. La extensión sale
   del propio archivo: si el cliente sube un PNG y se queda tal cual, en
   el repositorio tiene que llamarse portada.png y no portada.jpg. */
async function guardarFondoPreparado(preparado){
  const ruta=`img/portada.${preparado.extension}`;

  if(apar.previas.fondo)URL.revokeObjectURL(apar.previas.fondo);
  apar.previas.fondo=URL.createObjectURL(preparado.blob);

  apuntarSiSobra(apar.publicado.fondo,ruta);
  apar.fondoPendiente={ruta,base64:await blobABase64(preparado.blob)};
  guardarArchivoBorrador(ruta,apar.fondoPendiente.base64);
  apar.datos.identidad.fondo.imagen=`${ruta}?v=${marcaDeTiempo()}`;
  pintarFondoCampo(); pintarPrevia(); marcarSucio();
}

function quitarFondo(){
  apuntarSiSobra(apar.publicado.fondo,'');
  if(apar.fondoPendiente)borrarArchivoBorrador(apar.fondoPendiente.ruta);
  apar.fondoPendiente=null;
  if(apar.previas.fondo){URL.revokeObjectURL(apar.previas.fondo);delete apar.previas.fondo;}
  apar.datos.identidad.fondo={imagen:'',foco:FOCO_DEFECTO};
  pintarFondoCampo(); pintarPrevia(); marcarSucio();
}

/* Si en el repositorio hay un archivo publicado y va a dejar de
   usarse (o va a llamarse distinto), se apunta para borrarlo. */
function apuntarSiSobra(publicada,nueva){
  if(publicada&&publicada!==nueva&&!apar.porBorrar.includes(publicada))apar.porBorrar.push(publicada);
}

/* =========================================================
   FUENTES
   ========================================================= */
async function elegirFuente(clave,archivo){
  if(!archivo)return;
  const extension=archivo.name.split('.').pop().toLowerCase();
  if(!FUENTE_TIPOS.includes(extension)){
    avisar('Ese archivo no parece una fuente. Valen los formatos WOFF2, WOFF, TTF y OTF.','error');return;
  }
  if(archivo.size>FUENTE_PESO_MAX){avisar('Ese archivo de fuente pesa demasiado (más de 10 MB).','error');return;}
  const ruta=`fuentes/${clave}.${extension}`;
  apuntarSiSobra(apar.publicado.fuentes[clave],ruta);
  apar.fuentesPendientes[clave]={ruta,base64:await blobABase64(archivo)};
  guardarArchivoBorrador(ruta,apar.fuentesPendientes[clave].base64);
  apar.datos.fuentes[clave]={archivo:`${ruta}?v=${marcaDeTiempo()}`,nombre:archivo.name};
  pintarFuenteCampo(clave);
  previsualizarFuente(clave,archivo);
  marcarSucio();
}
function quitarFuente(clave){
  apuntarSiSobra(apar.publicado.fuentes[clave],'');
  if(apar.fuentesPendientes[clave])borrarArchivoBorrador(apar.fuentesPendientes[clave].ruta);
  delete apar.fuentesPendientes[clave];
  apar.datos.fuentes[clave]=null;
  pintarFuenteCampo(clave);
  quitarPreviaFuente(clave);
  marcarSucio();
}

/* =========================================================
   PUBLICAR
   Esta ventana ya NO publica por su cuenta. Cada cambio se guarda en el
   cajón del navegador (guardarBorradorApariencia) y es el botón
   «Publicar cambios» del editor el que sube la apariencia junto con la
   carta, de una sola vez. Ver js/publicar-pagina.js y js/github.js.
   ========================================================= */

/* =========================================================
   CONEXIONES CON LA PANTALLA
   ========================================================= */
// «Descartar y volver a traer lo publicado»: tira los cambios sin
// publicar (borra el borrador) y recarga lo que hay en el repositorio.
$('#btnAparRecargar').addEventListener('click',async()=>{
  await limpiarBorradorApariencia();
  apar.forzarPublicado=true;
  cargarPagina();
});

// Colores
$('#aparColorPrincipal').addEventListener('input',()=>{apar.datos.colores.principal=$('#aparColorPrincipal').value;pintarPrevia();marcarSucio();});
$('#aparColorFondo').addEventListener('input',()=>{apar.datos.colores.fondo=$('#aparColorFondo').value;pintarPrevia();marcarSucio();});
$('#aparColorTexto').addEventListener('input',()=>{apar.datos.colores.texto=$('#aparColorTexto').value;pintarPrevia();marcarSucio();});
$('#aparTextoAuto').addEventListener('click',()=>{
  apar.datos.colores.texto='auto';
  $('#aparTextoAuto').setAttribute('aria-pressed','true');
  $('#aparTextoManual').setAttribute('aria-pressed','false');
  $('#aparTextoRueda').hidden=true;
  pintarPrevia();marcarSucio();
});
$('#aparTextoManual').addEventListener('click',()=>{
  apar.datos.colores.texto=$('#aparColorTexto').value;
  $('#aparTextoAuto').setAttribute('aria-pressed','false');
  $('#aparTextoManual').setAttribute('aria-pressed','true');
  $('#aparTextoRueda').hidden=false;
  pintarPrevia();marcarSucio();
});
$('#btnAparColoresOriginales').addEventListener('click',()=>{
  apar.datos.colores=aparienciaDeFabrica().colores;
  volcarCampos();pintarPrevia();marcarSucio();
});

// Título y eslogan (la previa se refresca según se escribe)
[['#aparTitulo','titulo'],['#aparEsloganEs','es'],['#aparEsloganEn','en']].forEach(([selector,campo])=>{
  $(selector).addEventListener('input',()=>{
    if(campo==='titulo')apar.datos.identidad.titulo=$(selector).value;
    else apar.datos.identidad.eslogan[campo]=$(selector).value;
    pintarPrevia();marcarSucio();
  });
});

// Logotipo
$('#aparLogoArchivo').addEventListener('change',(ev)=>{elegirLogo(ev.target.files[0]);ev.target.value='';});
$('#btnAparLogoQuitar').addEventListener('click',quitarLogo);

// Fondo de la portada
montarRejillaFoco();
$('#aparFondoArchivo').addEventListener('change',(ev)=>{elegirFondo(ev.target.files[0]);ev.target.value='';});
$('#btnAparFondoQuitar').addEventListener('click',quitarFondo);
$('#aparFondoRejilla').addEventListener('click',(ev)=>{
  const casilla=ev.target.closest('[data-foco]');
  if(!casilla||!apar.datos)return;
  apar.datos.identidad.fondo.foco=casilla.dataset.foco;
  pintarFondoCampo(); pintarPrevia(); marcarSucio();
});

// Fuentes
$('#aparFuenteTitulo').addEventListener('change',(ev)=>{elegirFuente('titulo',ev.target.files[0]);ev.target.value='';});
$('#aparFuenteTexto').addEventListener('change',(ev)=>{elegirFuente('texto',ev.target.files[0]);ev.target.value='';});
$('#btnAparFuenteTituloQuitar').addEventListener('click',()=>quitarFuente('titulo'));
$('#btnAparFuenteTextoQuitar').addEventListener('click',()=>quitarFuente('texto'));

// La ventana es un documento dedicado: en cuanto carga, trae la
// apariencia (o restaura lo que estabas editando). Si falta la conexión,
// cargarPagina lo avisa por su cuenta.
cargarPagina();

})();