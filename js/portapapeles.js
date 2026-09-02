/* =========================================================
   PORTAPAPELES DE PLATOS
   Para no tener que rehacer a mano un plato que ya existe.
   Se copia uno y se pega donde haga falta: se lleva el
   nombre, la descripción, el precio, los alérgenos, las
   etiquetas y la foto.

   La copia sobrevive a cerrar la aplicación, así que se
   puede copiar hoy y pegar mañana. Se guarda en este
   navegador y ocupa muy poco: solo el plato, sin la foto.

   ---------------------------------------------------------
   LA FOTO
   El nombre del archivo de una foto sale del id del plato,
   así que copiar un plato con foto tiene dos caminos:

   1. Si el plato original ya no está (se copió, se borró y
      se pega en otro sitio), su id queda libre. Se reutiliza
      y la foto sigue siendo suya sin mover un archivo. Solo
      hay que sacarla de la papelera, porque al borrar el
      plato se apuntó para borrarla al publicar.

   2. Si el original sigue estando, son dos platos distintos
      y hacen falta dos archivos. Al pegado se le da un id
      nuevo y se prepara una copia de la foto, que se subirá
      con el resto al publicar.

   Si la foto no se puede conseguir (sin conexión, o era una
   foto preparada de una sesión que ya se cerró), el plato se
   pega igual y se avisa de que ha ido sin ella.
   ========================================================= */

/* ---------- Guardar y recuperar la copia ---------- */

function guardarCopia(copia){
  try{ localStorage.setItem(CLAVE_COPIA,JSON.stringify(copia)); }catch{}
}

function leerCopiaGuardada(){
  try{
    const c=JSON.parse(localStorage.getItem(CLAVE_COPIA));
    return c&&c.item ? c : null;
  }catch{ return null; }
}

/* Copia de verdad, no un atajo al mismo objeto: si no, tocar el plato
   pegado cambiaría también el original. Se hace por JSON porque la
   carta es JSON puro y así funciona en cualquier navegador. */
function clonarPlato(plato){ return JSON.parse(JSON.stringify(plato)); }

/* El nombre que se enseña en el botón de pegar. */
function nombreDeLaCopia(){
  return valorTexto(estado.itemCopiado?.item?.nombre,estado.idiomas[0])||'(sin nombre)';
}

/* ---------- Copiar ---------- */

function copiarItem(item){
  estado.itemCopiado={
    item:clonarPlato(item),
    origen:item.id            // de dónde salió, para saber dónde vive su foto
  };
  guardarCopia(estado.itemCopiado);
  avisar(`«${nombreDeLaCopia()}» copiado. Abre el grupo donde lo quieras y pulsa «Pegar».`,'bien');
  pintarZona();               // el botón de pegar ya puede activarse
}

/* ---------- Pegar ---------- */

/* ¿Sigue habiendo un plato con este id en la carta? De eso depende que
   el pegado pueda quedarse con el id (y con la foto) o necesite uno nuevo. */
function idDePlatoOcupado(id){
  return (estado.datos?.secciones??[]).some(s=>
    (s.grupos??[]).some(g=>
      (g.items??[]).some(it=>it.id===id)));
}

async function pegarItem(){
  const copia=estado.itemCopiado;
  const grupo=grupoActual();
  if(!copia||!grupo)return;

  const plato=clonarPlato(copia.item);
  const heredaElId=copia.origen&&!idDePlatoOcupado(copia.origen);
  plato.id=heredaElId
    ? copia.origen
    : nuevoId('i',valorTexto(plato.nombre,estado.idiomas[0])||'item');

  grupo.items=grupo.items??[];
  grupo.items.unshift(plato);
  marcarSucio();
  pintarZona();

  const aviso=await colocarLaFoto(plato,copia.origen,heredaElId);
  pintarZona();
  avisar(`«${nombreDeLaCopia()}» pegado en «${valorTexto(grupo.nombre,estado.idiomas[0])}».${aviso}`,'bien');
}

/* Deja la foto del plato pegado en su sitio. Devuelve la frase que se
   añade al aviso final (vacía si no había nada que contar). */
async function colocarLaFoto(plato,idOrigen,heredaElId){
  if(!plato.imagen)return '';

  // Caso 1: se ha quedado con el id, así que la foto ya es suya. Solo
  // hay que rescatarla si estaba apuntada para borrarse al publicar.
  if(heredaElId){
    rescatarDeLaPapelera(rutaImagenRepo('item',plato.id));
    return ' Conserva su foto.';
  }

  // Caso 2: id nuevo, así que hace falta una copia del archivo.
  try{
    const foto=await conseguirLaFoto(plato,idOrigen);
    if(!foto)throw new Error('sin origen');

    const ruta=rutaImagenRepo('item',plato.id);
    if(estado.imagenesPendientes[ruta]?.previa)URL.revokeObjectURL(estado.imagenesPendientes[ruta].previa);
    rescatarDeLaPapelera(ruta);
    estado.imagenesHuerfanas.delete(ruta);
    estado.imagenesPendientes[ruta]=foto;

    // El ?v= obliga al navegador del cliente a recargar la foto nueva.
    plato.imagen=`${rutaImagenCarta('item',plato.id)}?v=${Date.now().toString(36)}`;
    return ' Su foto se subirá al publicar.';
  }catch{
    // Sin foto, pero el plato se queda: es lo importante. Se quita la
    // ruta para que la carta no apunte a un archivo que no existe.
    delete plato.imagen;
    return ' No se ha podido copiar la foto; el plato se ha pegado sin ella.';
  }
}

/* La foto del plato original, lista para subir. Primero se mira si está
   preparada en esta misma sesión (no hace falta internet) y, si no, se
   trae del repositorio. */
async function conseguirLaFoto(plato,idOrigen){
  const preparada=idOrigen?estado.imagenesPendientes[rutaImagenRepo('item',idOrigen)]:null;
  if(preparada){
    return {
      base64:preparada.base64, bytes:preparada.bytes,
      ancho:preparada.ancho, alto:preparada.alto,
      previa:URL.createObjectURL(base64ABlob(preparada.base64))
    };
  }

  const url=urlImagenExistente(plato.imagen);
  if(!url)return null;
  const r=await fetch(url,{cache:'no-store'});
  if(!r.ok)return null;
  const blob=await r.blob();
  const previa=URL.createObjectURL(blob);
  const {ancho,alto}=await medirImagen(previa);
  return { base64:await blobABase64(blob), bytes:blob.size, ancho, alto, previa };
}

/* El tamaño de la foto, solo para poder enseñarlo bajo la miniatura. */
function medirImagen(url){
  return new Promise((listo)=>{
    const img=new Image();
    img.onload=()=>listo({ancho:img.naturalWidth,alto:img.naturalHeight});
    img.onerror=()=>listo({ancho:0,alto:0});
    img.src=url;
  });
}