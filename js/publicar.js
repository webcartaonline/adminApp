/* =========================================================
   PUBLICAR
   Traer la carta del servidor y volver a guardarla, junto
   con las fotos nuevas y el borrado de las que sobran.

   Sustituye al antiguo github.js. Toda la conversación con
   el servidor pasa por nube.js: aquí no hay ni una
   dirección escrita a mano.

   El orden al publicar es deliberado y NO debe cambiarse:
     1. las fotos nuevas,
     2. la carta,
     3. las fotos que ya no se usan.
   Así la carta publicada nunca apunta a una foto que no
   existe todavía, ni a una que acabamos de borrar.
   ========================================================= */

/* ---------- Cargar ---------- */

async function traer(){
  if(!nubeConfigurada()){
    avisar('Faltan el negocio o la clave. Entra en «Ajustes» y complétalos.','error');
    return;
  }
  avisar('Cargando la carta…');
  try{
    // La licencia es lo PRIMERO. Manda el servidor, no el carta.json:
    // así el cliente no puede darse permisos retocando su archivo.
    const licencia=await leerEstadoDeLicencia();
    estado.licencia={
      plan:licencia.plan,
      permisos:licencia.permisos||{},
      caduca:licencia.caduca,
      diasRestantes:licencia.diasRestantes
    };

    const datos=await leerCarta();
    if(!datos){
      avisar('Este negocio todavía no tiene carta publicada. Contacta con WebCartaOnline.','error');
      return;
    }
    cargarDatos(datos);
    avisar(mensajeDeBienvenida(licencia),'bien');

    // Las estadísticas están aparcadas: el botón se queda escondido.
    estado.estadisticas=null;
    refrescarBotonEstadisticas();

    // Los archivos de la plantilla (los que hacen falta para la vista
    // previa) se ponen al día aparte. Si falla, la carta ya está
    // cargada: solo se queda sin vista previa, no se estropea nada.
    // OJO: plantilla.js todavía habla con GitHub; se adapta en la
    // siguiente tanda y hasta entonces este intento fallará sin ruido.
    try{ await sincronizarPlantilla(); }
    catch(e){ console.warn('Vista previa no disponible:',e.message); }
    if(typeof refrescarBotonVistaPrevia==='function')refrescarBotonVistaPrevia();
  }catch(e){
    avisar(`No se ha podido traer la carta: ${e.message}`,'error');
  }
}

/* Si a la licencia le queda poco, se avisa al cargar: es el momento en
   que el cliente está delante y puede hacer algo al respecto. */
function mensajeDeBienvenida(licencia){
  const dias=Number(licencia.diasRestantes);
  if(Number.isFinite(dias)&&dias<=30){
    return `Carta cargada. Atención: tu licencia caduca en ${dias} día${dias===1?'':'s'}.`;
  }
  return 'Carta cargada. Ya puedes editarla.';
}

/* Deja la carta descargada lista para editar. Los permisos ya están
   puestos en estado.licencia antes de llegar aquí. */
function cargarDatos(datos){
  estado.datos=datos;
  estado.sucio=false;
  liberarImagenesPendientes();
  estado.imagenesPorBorrar=[];
  estado.imagenesHuerfanas=new Set();
  estado.expandidas=new Set();
  // Cartas antiguas sin secciones: se envuelven en una sección "General".
  if(!estado.datos.secciones&&estado.datos.grupos){
    estado.datos.secciones=[{id:nuevoId('s','general'),nombre:'General',grupos:estado.datos.grupos}];
    delete estado.datos.grupos;
  }
  estado.datos.secciones=estado.datos.secciones||[];
  estado.idiomas=detectarIdiomas(estado.datos);
  estado.imagenes=detectarImagenes(estado.datos);
  estado.seccionActiva=estado.datos.secciones[0]?.id??null;
  if(estado.seccionActiva)estado.expandidas.add(estado.seccionActiva);
  estado.grupoActivo=null;
  estado.vista='editor';
  sincronizarBotonPublicar();
  pintarTodo();
  return true;
}

function refrescarBotonEstadisticas(){
  const hay=!!estado.estadisticas;
  $('#btnEstadisticas').hidden=!hay;
  if(!hay&&estado.vista==='estadisticas'){estado.vista='editor';pintarTodo();}
}

/* ---------- Fotos pendientes ----------
   El editor las prepara en base64 porque GitHub lo exigía. El servidor
   nuevo quiere el archivo tal cual, que pesa un tercio menos, así que
   aquí se deshace esa conversión. Cuando la ventana de la foto se
   adapte (siguiente tanda), esta traducción sobrará. */

const TIPO_POR_EXTENSION={
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
  webp:'image/webp', svg:'image/svg+xml', ico:'image/x-icon',
  woff2:'font/woff2', woff:'font/woff', ttf:'font/ttf', otf:'font/otf'
};

function tipoDeArchivo(ruta){
  const ext=String(ruta).split('.').pop().toLowerCase();
  return TIPO_POR_EXTENSION[ext]||'application/octet-stream';
}

function blobDesdeBase64(base64,tipo){
  const binario=atob(base64);
  const bytes=new Uint8Array(binario.length);
  for(let i=0;i<binario.length;i++)bytes[i]=binario.charCodeAt(i);
  return new Blob([bytes],{type:tipo});
}

/* ---------- Publicar ---------- */

async function publicar(){
  if(estado.datos&&!puedePublicar()){
    avisar('Tu plan no permite publicar cambios.','error');
    return;
  }
  if(!nubeConfigurada()){
    avisar('Faltan el negocio o la clave. Entra en «Ajustes» y complétalos.','error');
    return;
  }
  if(!estado.datos){
    avisar('No hay ninguna carta cargada.','error');
    return;
  }

  $('#btnPublicar').disabled=true;
  avisar('Publicando…');

  try{
    // 1) Las fotos nuevas, una a una y contando en voz alta. Si alguna
    //    falla, se corta aquí y la carta no se toca.
    const pendientes=Object.entries(estado.imagenesPendientes);
    for(let i=0;i<pendientes.length;i++){
      const [ruta,img]=pendientes[i];
      avisar(`Subiendo imagen ${i+1} de ${pendientes.length}…`);
      await subirArchivo(ruta,blobDesdeBase64(img.base64,tipoDeArchivo(ruta)));
      if(img.previa)URL.revokeObjectURL(img.previa);
      delete estado.imagenesPendientes[ruta];
    }
    if(pendientes.length)avisar('Imágenes subidas. Publicando la carta…');

    // 2) La carta. El servidor guarda una copia de seguridad con fecha
    //    antes de pisar la anterior, y rechaza el archivo si viniera
    //    roto, así que una carta estropeada nunca llega al público.
    estado.datos.negocio=estado.datos.negocio||{};
    estado.datos.negocio.actualizado=new Date().toISOString();
    await guardarCarta(estado.datos);
    estado.sucio=false;

    // 3) Las fotos que ya no reclama nadie. Al final a propósito.
    const {borradas,fallos}=await borrarFotosSobrantes();

    // 3.5) Los ajustes de la página sin publicar (colores, portada,
    //      logotipo, fuentes…) viajan en la misma tanda.
    //      OJO: publicar-pagina.js todavía habla con GitHub; se adapta
    //      en la siguiente tanda. Hasta entonces esto avisará de que no
    //      se han podido publicar, y el borrador se queda guardado.
    const apariencia=await publicarAparienciaSiHay();

    if(typeof refrescarBotonVistaPrevia==='function')refrescarBotonVistaPrevia();
    avisar(resumenDePublicacion(borradas,fallos,apariencia),'bien');
    if(fallos.length)estado.sucio=true;   // para reintentar el borrado
    sincronizarBotonPublicar();
  }catch(e){
    $('#btnPublicar').disabled=false;
    avisar(`No se ha podido publicar: ${e.message}`,'error');
  }
}

/* Borra del servidor las fotos que la carta ya no usa. Un fallo aquí no
   estropea nada publicado: solo deja basura que se reintenta la próxima
   vez, así que se anota y se sigue. */
async function borrarFotosSobrantes(){
  let borradas=0;
  const fallos=[];
  for(const ruta of [...estado.imagenesPorBorrar]){
    try{
      await borrarArchivo(ruta);
      borradas++;
      rescatarDeLaPapelera(ruta);
    }catch{
      fallos.push(ruta);
    }
  }
  return {borradas,fallos};
}

/* Devuelve { publicada, fallo } sin lanzar nunca: la carta ya está
   publicada a estas alturas y un problema con la apariencia no debe
   parecer que ha fallado todo. */
async function publicarAparienciaSiHay(){
  try{
    const res=await publicarApariencia((t)=>avisar(t));
    if(res.publicado)estado.aparienciaSucia=false;
    return {publicada:!!res.publicado,fallo:''};
  }catch(e){
    return {publicada:false,fallo:e.message};
  }
}

/* Un solo sitio donde se decide qué se le cuenta al cliente. */
function resumenDePublicacion(borradas,fallos,apariencia){
  const partes=['Publicado. Los cambios ya están en la carta.'];
  if(borradas){
    partes.push(`Se ${borradas===1?'ha':'han'} borrado ${borradas} foto${borradas===1?'':'s'} que ya no se ${borradas===1?'usaba':'usaban'}.`);
  }
  if(apariencia.publicada){
    partes.push('También se han actualizado los ajustes de la página.');
  }
  if(apariencia.fallo){
    partes.push(`Los ajustes de la página no se han podido publicar (${apariencia.fallo}); se reintentarán la próxima vez.`);
  }
  if(fallos.length){
    partes.push(`No se ${fallos.length===1?'ha':'han'} podido borrar ${fallos.length} foto${fallos.length===1?'':'s'} sobrante${fallos.length===1?'':'s'}; se reintentará al publicar de nuevo.`);
  }
  return partes.join(' ');
}

$('#btnCargar').addEventListener('click',traer);
$('#btnPublicar').addEventListener('click',publicar);
