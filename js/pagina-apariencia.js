/* =========================================================
   AJUSTES DE LA PÁGINA
   La personalización de la carta que ven los clientes del
   negocio: colores, título, eslogan, logotipo y fuentes.

   Todo se guarda en un archivo propio del negocio,
   apariencia.json, separado de carta.json a propósito: así
   publicar la apariencia y publicar la carta nunca se pisan
   entre sí aunque se haga desde pantallas distintas.

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
    svg:'image/svg+xml', gif:'image/gif', ico:'image/x-icon',
    woff2:'font/woff2', woff:'font/woff', ttf:'font/ttf', otf:'font/otf'
  })[e]||'application/octet-stream';
}

/* Deja los datos listos para guardarse/publicarse, sin tocar lo que el
   cliente está escribiendo: recorta espacios, tira los mensajes de pie
   vacíos y ordena los enlaces de las redes y de las apps de pedidos.
   (Antes esto se hacía al publicar; ahora se publica desde el editor,
   así que se hace aquí, sobre una copia.) */
function datosNormalizados(){
  const d=JSON.parse(JSON.stringify(apar.datos));
  d.identidad.titulo=String(d.identidad.titulo||'').trim();
  const eslogan=d.identidad.eslogan;
  Object.keys(eslogan).forEach(idioma=>{eslogan[idioma]=String(eslogan[idioma]||'').trim();});
  d.pie.bloques=(d.pie.bloques||[])
    .map(b=>({titulo:String(b.titulo||'').trim(),texto:String(b.texto||'').trim()}))
    .filter(b=>b.titulo||b.texto);
  for(const red of Object.keys(d.pie.redes)){
    d.pie.redes[red]=EnlacesDelPie.normalizar(d.pie.redes[red]);
  }
  d.pie.reparto=RepartoDelPie.normalizado(d.pie.reparto);
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

/* ---------- Cómo es un apariencia.json recién estrenado ----------
   El eslogan lleva un hueco por cada idioma de la carta. */
function aparienciaDeFabrica(idiomas=['es']){
  return {
    colores:{ principal:'#E9B44C', fondo:'#12100E', texto:'auto' },
    identidad:{ titulo:'', eslogan:Object.fromEntries(idiomas.map(idioma=>[idioma,''])), logo:'', favicon:'',
                fondo:{ imagen:'', foco:'centro' } },
    fuentes:{ titulo:null, texto:null },
    // Colocación de la barra de secciones y del filtro de alérgenos.
    pagina:{ barra:'inferior', alergenos:'abajo' },
    pie:completarEnlacesPie({ bloques:[] })
  };
}

/* Pone en blanco lo que falte de las redes (pagina-enlaces.js) y de las
   apps de pedidos (pagina-reparto.js). Así un apariencia.json (o un
   borrador del navegador) de antes de que existieran no deja huecos. */
function completarEnlacesPie(pie){
  pie.redes=EnlacesDelPie.completar(pie.redes);
  pie.reparto=RepartoDelPie.completar(pie.reparto);
  return pie;
}

/* Los límites del logotipo y de la portada están en config.js:
   LOGO_LADO_MAX, LOGO_PESO_INTACTO, FONDO_LADO_MAX… */
const FUENTE_PESO_MAX = 10*1024*1024;
const FUENTE_TIPOS    = ['woff2','woff','ttf','otf'];

/* ---------- Memoria de este apartado ---------- */
const apar={
  cargada:false, cargando:false,
  datos:null,             // el apariencia.json que se está editando
  idiomas:['es'],         // los idiomas de la carta: una casilla de eslogan por cada uno
  sucio:false,            // ¿hay cambios sin publicar?
  logoPendiente:null,     // {ruta, base64} esperando a subirse
  faviconPendiente:null,  // el icono de la pestaña, esperando a subirse
  fondoPendiente:null,    // la foto de la portada, esperando a subirse
  fuentesPendientes:{},   // clave -> {ruta, base64}
  porBorrar:[],           // archivos del repositorio que ya sobran
  publicado:{ logo:'', favicon:'', fondo:'', fuentes:{ titulo:'', texto:'' }, reparto:{} }, // lo que hay ahora en el repo
  permisos:{},            // lo que deja hacer el plan, según el portero
  previas:{}              // URLs locales de las miniaturas de los campos, para liberarlas
};

/* =========================================================
   COLORES
   Solo hace falta saber si un color escrito es válido. Cómo
   se ve en la carta se comprueba con la «Vista previa» del
   editor, que pinta la página entera.
   ========================================================= */
function hexANumeros(hex){
  const limpio=String(hex??'').trim().replace('#','');
  const largo=limpio.length===3?limpio.split('').map(c=>c+c).join(''):limpio;
  if(!/^[0-9a-fA-F]{6}$/.test(largo))return null;
  const n=parseInt(largo,16);
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}

/* Los ajustes que solo tienen sentido en algunas plantillas. Hoy, la
   barra de secciones: ni la Plantilla 2 ni la 3 la dejan mover. Solo se
   esconde el control; lo guardado en apariencia.json no se toca. */
function mostrarAjustesDeLaPlantilla(){
  if(typeof perfilDePlantilla!=='function')return;
  $('#bloqueBarra').hidden=perfilDePlantilla().barraMovible===false;
}
if(typeof cargarPlantillaGuardada==='function'){
  cargarPlantillaGuardada().finally(mostrarAjustesDeLaPlantilla);
}

/* La dirección pública de un archivo ya publicado, para poder enseñar
   en su campo un logo que el negocio subió otro día. La calcula
   nube.js, que es quien sabe dónde viven las fotos. */
function rutaPublica(ruta){
  return ruta?urlPublica(ruta):'';
}

/* =========================================================
   CARGA
   Se trae la apariencia publicada (si no existe aún, se
   estrena una) y la carta solo para rellenar el título y el
   eslogan con lo que enseña hoy. Las dos las pide nube.js.
   ========================================================= */

/* Esconde los apartados que el plan de este negocio no incluye. Un solo
   sitio decide esto, y usa los MISMOS nombres de permiso que el
   servidor, así que nunca se queda un botón suelto que el servidor
   vaya a rechazar.

     imagenMarca          -> el logotipo y el iconito del navegador
     imagenesDecorativas  -> el fondo de la portada y las fuentes propias */
const APARTADOS_POR_PERMISO={
  imagenMarca:['#bloqueLogo','#bloqueFavicon'],
  imagenesDecorativas:['#bloqueFondoPortada','#bloqueFuentes']
};

function aplicarPermisosDeLaPagina(permisos){
  for(const [permiso,selectores] of Object.entries(APARTADOS_POR_PERMISO)){
    const permitido=permisos[permiso]===true;
    for(const selector of selectores){
      const apartado=$(selector);
      if(apartado)apartado.hidden=!permitido;
    }
  }
}

async function cargarPagina(){
  if(!nubeConfigurada()){
    pintarEstadoPagina('Falta la conexión','falta');
    avisar('Antes de personalizar la página, completa la conexión en el primer apartado.','error');
    return;
  }
  const a=leerAjustes();   // <-- arreglo: 'a' hacía falta más abajo (restaurarBorrador) y ya no se definía
  apar.cargando=true;
  pintarEstadoPagina('Cargando…');
  try{
    const [guardada,carta,licencia]=await Promise.all([
      leerApariencia(),
      leerCarta().catch(()=>null),
      leerEstadoDeLicencia()
    ]);

    // Los idiomas de la carta, contados como las plantillas. Si no se ha
    // podido leer la carta, solo el español.
    apar.idiomas=detectarIdiomas(carta);

    // Lo guardado se vuelca sobre uno de fábrica: si mañana hay campos
    // nuevos, un archivo antiguo no deja huecos sin rellenar. Los
    // eslóganes de idiomas que la carta ya no tiene se conservan.
    const base=aparienciaDeFabrica(apar.idiomas);
    apar.datos={
      colores:{...base.colores,...(guardada?.colores||{})},
      identidad:{...base.identidad,...(guardada?.identidad||{}),
        eslogan:{...base.identidad.eslogan,...(guardada?.identidad?.eslogan||{})},
        fondo:{...base.identidad.fondo,...(guardada?.identidad?.fondo||{})}},
      fuentes:{...base.fuentes,...(guardada?.fuentes||{})},
      pagina:normalizarPagina(guardada?.pagina),
      pie:completarEnlacesPie({
        bloques:Array.isArray(guardada?.pie?.bloques)?guardada.pie.bloques:[],
        redes:guardada?.pie?.redes,
        reparto:guardada?.pie?.reparto
      })
    };

    /* Qué puede tocar este negocio lo dice el SERVIDOR, no la carta: así
       nadie se da permisos a sí mismo. Si la respuesta viniera vacía, no
       se enseña nada de esto (más vale quedarse corto que de más). */
    apar.permisos=licencia?.permisos||{};
    aplicarPermisosDeLaPagina(apar.permisos);

    /* Primera vez (sin título ni logo configurados): se rellena con lo
       que la carta enseña hoy. Así lo que ves en los campos es
       exactamente lo que hay en la portada, y publicar no cambia nada
       que no hayas tocado. */
    if(guardada===null&&carta?.negocio){
      apar.datos.identidad.titulo=carta.negocio.nombre||'';
      const lema=carta.negocio.lema;
      apar.idiomas.forEach((idioma,i)=>{
        apar.datos.identidad.eslogan[idioma]=typeof lema==='string'?(i?'':lema):(lema?.[idioma]||'');
      });
    }

    // Se apunta qué archivos hay publicados ahora, para poder borrar
    // los que sobren si se cambian o se quitan.
    apar.publicado.logo=sinVersion(apar.datos.identidad.logo);
    apar.publicado.favicon=sinVersion(apar.datos.identidad.favicon);
    apar.publicado.fondo=sinVersion(apar.datos.identidad.fondo.imagen);
    apar.publicado.fuentes.titulo=sinVersion(apar.datos.fuentes.titulo?.archivo);
    apar.publicado.fuentes.texto=sinVersion(apar.datos.fuentes.texto?.archivo);
    apar.publicado.reparto=Object.fromEntries(Object.entries(apar.datos.pie.reparto)
      .map(([clave,app])=>[clave,sinVersion(app.logo)]));

    apar.cargada=true; apar.sucio=false;
    apar.logoPendiente=null; apar.faviconPendiente=null; apar.fondoPendiente=null;
    apar.fuentesPendientes={}; apar.porBorrar=[];

    // Si había cambios sin publicar guardados (de esta sesión o de otra
    // anterior), se restauran encima de lo publicado para no perderlos.
    // «Descartar y volver a traer» pone apar.forzarPublicado y los ignora.
    if(!apar.forzarPublicado) await restaurarBorrador(a);
    apar.forzarPublicado=false;

    volcarCampos();
    pintarEstadoPagina(apar.sucio?'Cambios sin publicar':'Al día', apar.sucio?'falta':'bien');
    avisarAlPadre(apar.sucio);   // que el editor sepa si hay cambios que publicar
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
  completarEnlacesPie(apar.datos.pie);   // un borrador de antes de las apps de pedidos no las trae
  apar.porBorrar=Array.isArray(b.porBorrar)?b.porBorrar.slice():[];
  apar.sucio=true;
  await restaurarImagenPendiente(a,'logo');
  await restaurarImagenPendiente(a,'favicon');
  await restaurarImagenPendiente(a,'fondo');
  await restaurarFuentePendiente(a,'titulo');
  await restaurarFuentePendiente(a,'texto');
  await restaurarLogosDeApps(a);
}
async function restaurarImagenPendiente(a,cual){
  const ruta=cual==='logo'    ? sinVersion(apar.datos.identidad.logo)
            :cual==='favicon' ? sinVersion(apar.datos.identidad.favicon)
            :                   sinVersion(apar.datos.identidad.fondo.imagen);
  if(!ruta) return;
  let img=null;
  try{ img=await Almacen.leer('imagenes',`${clienteActual(a)}::${ruta}`); }catch{}
  if(!img||!img.base64) return;               // ya estaba publicada: nada que restaurar
  const url=`data:${img.tipo||'image/jpeg'};base64,${img.base64}`;
  apar.previas[cual]=url;
  if(cual==='logo')         apar.logoPendiente={ruta,base64:img.base64};
  else if(cual==='favicon') apar.faviconPendiente={ruta,base64:img.base64};
  else                      apar.fondoPendiente={ruta,base64:img.base64};
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

/* Las miniaturas de los logotipos de las apps que aún no se han subido. */
async function restaurarLogosDeApps(a){
  for(const [clave,app] of Object.entries(apar.datos.pie.reparto)){
    const ruta=sinVersion(app.logo);
    if(!ruta) continue;
    let img=null;
    try{ img=await Almacen.leer('imagenes',`${clienteActual(a)}::${ruta}`); }catch{}
    if(img&&img.base64) apar.previas[`reparto-${clave}`]=`data:${img.tipo||'image/png'};base64,${img.base64}`;
  }
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
  pintarCasillasEslogan();
  pintarFondoCampo();
  pintarLogoCampo();
  pintarFaviconCampo();
  pintarFuenteCampo('titulo');
  pintarFuenteCampo('texto');
  pintarBloquesPie();
  pintarEnlacesPie();
  pintarColocacion();
}

/* Una casilla de eslogan por cada idioma de la carta: la del idioma
   principal y las demás, opcionales. */
function pintarCasillasEslogan(){
  const eslogan=apar.datos.identidad.eslogan;
  $('#aparEslogan').innerHTML=apar.idiomas.map((idioma,i)=>campoDeTexto({
    etiqueta:`Eslogan (${nombreDeIdioma(idioma)}${i?', opcional':''})`,
    valor:eslogan[idioma]||'',
    atributos:`data-eslogan="${escapar(idioma)}" autocomplete="off"`
  })).join('');
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
   PIE DE PÁGINA: REDES SOCIALES Y PEDIDOS POR APP
   Cada lista en su bloque: las redes las pinta pagina-enlaces.js
   y las apps de pedidos, pagina-reparto.js. Con enlace, salen en
   la carta; en blanco, no.

   El logotipo de cada app lo sube el propio local (ver «Saber
   más» en pagina.html). Va a img/reparto/<app>.<extensión>, que
   el portero guarda con el permiso «imagenesDecorativas»: sin
   él no se ofrece subirlo y en la carta sale el texto.
   ========================================================= */
const puedeSubirLogosDeApps=()=>apar.permisos.imagenesDecorativas===true;

function pintarEnlacesPie(){
  EnlacesDelPie.pintar($('#aparPieRedes'),apar.datos.pie.redes);
  RepartoDelPie.pintar($('#aparPieReparto'),apar.datos.pie.reparto,{
    imagenDe:(clave)=>apar.previas[`reparto-${clave}`]||rutaPublica(apar.datos.pie.reparto[clave].logo),
    puedeSubir:puedeSubirLogosDeApps()
  });
  $('#repartoSinLogos').hidden=puedeSubirLogosDeApps();
}
EnlacesDelPie.escuchar($('#aparPieRedes'),()=>apar.datos.pie.redes,marcarSucio);
RepartoDelPie.escuchar($('#aparPieReparto'),{
  leerValores:()=>apar.datos.pie.reparto,
  alCambiar:marcarSucio,
  alElegirLogo:elegirLogoDeApp,
  alQuitarLogo:quitarLogoDeApp
});
RepartoDelPie.prepararSaberMas($('#btnRepartoSaberMas'),$('#repartoSaberMas'));

/* El logotipo de una app se sube tal cual (como el del local), solo
   encogido si es enorme: en la carta sale a unos 40 px de alto. */
const POLITICA_LOGO_APP = {
  ladoMax:LOGO_APP_LADO_MAX,
  pesoIntacto:LOGO_APP_PESO_INTACTO,
  calidad:LOGO_CALIDAD,
  conservarTransparencia:true
};

async function elegirLogoDeApp(clave,archivo){
  const nombre=RepartoDelPie.nombreDe(clave);
  if(!RepartoDelPie.TIPOS_DE_LOGO.includes(archivo.type)){
    avisar('Ese archivo no es un logotipo que se pueda usar. Valen PNG, JPG, WebP o SVG.','error');return;
  }
  if(archivo.size>LOGO_PESO_MAX){
    avisar('Ese archivo pesa demasiado. Prueba con una imagen de menos de 10 MB.','error');return;
  }
  try{
    const preparado=archivo.type==='image/svg+xml'
      ? {blob:archivo,extension:'svg',tocada:false,ancho:0,alto:0}
      : await prepararImagenIntacta(archivo,POLITICA_LOGO_APP);
    const app=apar.datos.pie.reparto[clave];
    const ruta=`img/reparto/${clave}.${preparado.extension}`;
    const anterior=sinVersion(app.logo);
    if(anterior&&anterior!==ruta)borrarArchivoBorrador(anterior);   // otro sin subir que ya no vale

    apuntarSiSobra(apar.publicado.reparto[clave],ruta);
    guardarArchivoBorrador(ruta,await blobABase64(preparado.blob));
    soltarPreviaDeApp(clave);
    apar.previas[`reparto-${clave}`]=URL.createObjectURL(preparado.blob);
    app.logo=`${ruta}?v=${marcaDeTiempo()}`;
    pintarEnlacesPie(); marcarSucio();
    avisar(`Logotipo de ${nombre} listo. ${resumenDeImagen(preparado)}`,'bien');
  }catch{
    avisar('No se ha podido leer esa imagen. Prueba con un PNG, JPG, WebP o SVG.','error');
  }
}

function quitarLogoDeApp(clave){
  const app=apar.datos.pie.reparto[clave];
  borrarArchivoBorrador(sinVersion(app.logo));
  apuntarSiSobra(apar.publicado.reparto[clave],'');
  soltarPreviaDeApp(clave);
  app.logo='';
  pintarEnlacesPie(); marcarSucio();
}

function soltarPreviaDeApp(clave){
  const previa=apar.previas[`reparto-${clave}`];
  if(previa?.startsWith('blob:'))URL.revokeObjectURL(previa);
  delete apar.previas[`reparto-${clave}`];
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

function pintarFaviconCampo(){
  const hay=!!apar.datos.identidad.favicon;
  const origen=apar.previas.favicon||(hay?rutaPublica(apar.datos.identidad.favicon):'');
  const img=$('#aparFaviconImg');
  if(origen){ img.src=origen; img.hidden=false; }
  else{ img.hidden=true; img.removeAttribute('src'); }
  $('#aparFaviconVacio').hidden=!!origen;
  $('#btnAparFaviconQuitar').hidden=!hay;
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
  avisarAlPadre(true);           // que el editor encienda «Publicar cambios»
}

/* Esta ventana vive en un marco aparte, dentro del editor. El botón
   «Publicar cambios» está FUERA, en el editor, así que la única forma de
   decirle si aquí hay cambios sin publicar es mandarle un mensaje. */
function avisarAlPadre(hayCambios){
  try{ window.parent.postMessage({fuente:'ajustes-pagina',sucio:!!hayCambios},'*'); }
  catch{/* si por lo que sea no se puede, el editor lo detecta al arrancar */}
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
  pintarLogoCampo(); marcarSucio();
}

function quitarLogo(){
  apuntarSiSobra(apar.publicado.logo,'');
  if(apar.logoPendiente)borrarArchivoBorrador(apar.logoPendiente.ruta);
  apar.logoPendiente=null;
  if(apar.previas.logo){URL.revokeObjectURL(apar.previas.logo);delete apar.previas.logo;}
  apar.datos.identidad.logo='';
  pintarLogoCampo(); marcarSucio();
}

/* =========================================================
   ICONO DEL NAVEGADOR (FAVICON)
   El iconito de la pestaña. Funciona igual que el logotipo:
   se acepta cualquier imagen y se sube tal cual mientras no
   sea enorme; solo se encoge si se pasa de tamaño. Los SVG y
   los ICO ni se miran, se suben tal cual. No aparece en la
   miniatura de esta ventana porque el icono solo se ve en la
   pestaña del navegador, y eso solo pasa una vez publicado.
   ========================================================= */
const POLITICA_FAVICON = {
  ladoMax:FAVICON_LADO_MAX,
  pesoIntacto:FAVICON_PESO_INTACTO,
  calidad:FAVICON_CALIDAD,
  conservarTransparencia:true     // casi todos los iconos llevan fondo transparente
};

/* ¿Es un formato que se sube tal cual, sin abrirlo ni tocarlo? */
function faviconTalCual(archivo){
  return archivo.type==='image/svg+xml'
      || archivo.type==='image/x-icon'
      || archivo.type==='image/vnd.microsoft.icon'
      || /\.ico$/i.test(archivo.name);
}
function extensionFaviconTalCual(archivo){
  return archivo.type==='image/svg+xml' ? 'svg' : 'ico';
}

async function elegirFavicon(archivo){
  if(!archivo)return;
  if(archivo.size>FAVICON_PESO_MAX){
    avisar('Ese archivo pesa demasiado. Prueba con una imagen de menos de 5 MB.','error');return;
  }
  try{
    const preparado=faviconTalCual(archivo)
      ? {blob:archivo,extension:extensionFaviconTalCual(archivo),tocada:false,ancho:0,alto:0}
      : await prepararImagenIntacta(archivo,POLITICA_FAVICON);

    await guardarFaviconPreparado(preparado);
    avisar(`Icono listo. ${resumenDeImagen(preparado)}`,'bien');
  }catch{
    avisar('No se ha podido leer esa imagen. Prueba con un PNG, SVG, ICO, JPG o WebP.','error');
  }
}

/* Deja el icono preparado para subirse y refresca la pantalla. */
async function guardarFaviconPreparado(preparado){
  const ruta=`img/favicon.${preparado.extension}`;

  if(apar.previas.favicon)URL.revokeObjectURL(apar.previas.favicon);
  apar.previas.favicon=URL.createObjectURL(preparado.blob);

  apuntarSiSobra(apar.publicado.favicon,ruta);
  apar.faviconPendiente={ruta,base64:await blobABase64(preparado.blob)};
  guardarArchivoBorrador(ruta,apar.faviconPendiente.base64);
  apar.datos.identidad.favicon=`${ruta}?v=${marcaDeTiempo()}`;
  pintarFaviconCampo(); marcarSucio();
}

function quitarFavicon(){
  apuntarSiSobra(apar.publicado.favicon,'');
  if(apar.faviconPendiente)borrarArchivoBorrador(apar.faviconPendiente.ruta);
  apar.faviconPendiente=null;
  if(apar.previas.favicon){URL.revokeObjectURL(apar.previas.favicon);delete apar.previas.favicon;}
  apar.datos.identidad.favicon='';
  pintarFaviconCampo(); marcarSucio();
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
  pintarFondoCampo(); marcarSucio();
}

function quitarFondo(){
  apuntarSiSobra(apar.publicado.fondo,'');
  if(apar.fondoPendiente)borrarArchivoBorrador(apar.fondoPendiente.ruta);
  apar.fondoPendiente=null;
  if(apar.previas.fondo){URL.revokeObjectURL(apar.previas.fondo);delete apar.previas.fondo;}
  apar.datos.identidad.fondo={imagen:'',foco:FOCO_DEFECTO};
  pintarFondoCampo(); marcarSucio();
}

/* Si en el repositorio hay un archivo publicado y va a dejar de
   usarse (o va a llamarse distinto), se apunta para borrarlo. */
function apuntarSiSobra(publicada,nueva){
  // Lo que se vuelve a usar ya no sobra: si se quitó un archivo y luego
  // se pone otro con el mismo nombre, no se puede borrar tras subirlo.
  if(nueva)apar.porBorrar=apar.porBorrar.filter((ruta)=>ruta!==nueva);
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
  marcarSucio();
}
function quitarFuente(clave){
  apuntarSiSobra(apar.publicado.fuentes[clave],'');
  if(apar.fuentesPendientes[clave])borrarArchivoBorrador(apar.fuentesPendientes[clave].ruta);
  delete apar.fuentesPendientes[clave];
  apar.datos.fuentes[clave]=null;
  pintarFuenteCampo(clave);
  marcarSucio();
}

/* =========================================================
   PUBLICAR
   Esta ventana ya NO publica por su cuenta. Cada cambio se guarda en el
   cajón del navegador (guardarBorradorApariencia) y es el botón
   «Publicar cambios» del editor el que sube la apariencia junto con la
   carta, de una sola vez. Ver js/publicar-pagina.js y js/publicar.js.
   ========================================================= */

/* =========================================================
   CONEXIONES CON LA PANTALLA
   ========================================================= */
// «Descartar y volver a traer lo publicado»: tira los cambios sin
// publicar (borra el borrador) y recarga lo que hay en el repositorio.
$('#btnAparRecargar').addEventListener('click',async()=>{
  await limpiarBorradorApariencia();
  avisarAlPadre(false);          // ya no queda apariencia sin publicar
  apar.forzarPublicado=true;
  cargarPagina();
});

// Colores
$('#aparColorPrincipal').addEventListener('input',()=>{apar.datos.colores.principal=$('#aparColorPrincipal').value;marcarSucio();});
$('#aparColorFondo').addEventListener('input',()=>{apar.datos.colores.fondo=$('#aparColorFondo').value;marcarSucio();});
$('#aparColorTexto').addEventListener('input',()=>{apar.datos.colores.texto=$('#aparColorTexto').value;marcarSucio();});
$('#aparTextoAuto').addEventListener('click',()=>{
  apar.datos.colores.texto='auto';
  $('#aparTextoAuto').setAttribute('aria-pressed','true');
  $('#aparTextoManual').setAttribute('aria-pressed','false');
  $('#aparTextoRueda').hidden=true;
  marcarSucio();
});
$('#aparTextoManual').addEventListener('click',()=>{
  apar.datos.colores.texto=$('#aparColorTexto').value;
  $('#aparTextoAuto').setAttribute('aria-pressed','false');
  $('#aparTextoManual').setAttribute('aria-pressed','true');
  $('#aparTextoRueda').hidden=false;
  marcarSucio();
});
$('#btnAparColoresOriginales').addEventListener('click',()=>{
  apar.datos.colores=aparienciaDeFabrica().colores;
  volcarCampos();marcarSucio();
});

// Título y eslogan
$('#aparTitulo').addEventListener('input',()=>{
  apar.datos.identidad.titulo=$('#aparTitulo').value;
  marcarSucio();
});
$('#aparEslogan').addEventListener('input',(ev)=>{
  const idioma=ev.target.dataset.eslogan; if(!idioma)return;
  apar.datos.identidad.eslogan[idioma]=ev.target.value;
  marcarSucio();
});

// Logotipo
$('#aparLogoArchivo').addEventListener('change',(ev)=>{elegirLogo(ev.target.files[0]);ev.target.value='';});
$('#btnAparLogoQuitar').addEventListener('click',quitarLogo);

// Icono del navegador (favicon)
$('#aparFaviconArchivo').addEventListener('change',(ev)=>{elegirFavicon(ev.target.files[0]);ev.target.value='';});
$('#btnAparFaviconQuitar').addEventListener('click',quitarFavicon);

// Fondo de la portada
montarRejillaFoco();
$('#aparFondoArchivo').addEventListener('change',(ev)=>{elegirFondo(ev.target.files[0]);ev.target.value='';});
$('#btnAparFondoQuitar').addEventListener('click',quitarFondo);
$('#aparFondoRejilla').addEventListener('click',(ev)=>{
  const casilla=ev.target.closest('[data-foco]');
  if(!casilla||!apar.datos)return;
  apar.datos.identidad.fondo.foco=casilla.dataset.foco;
  pintarFondoCampo(); marcarSucio();
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