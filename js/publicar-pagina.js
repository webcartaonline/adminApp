/* =========================================================
   PUBLICAR LOS AJUSTES DE LA PÁGINA
   La ventana de «Ajustes de la página» no publica por su
   cuenta: guarda cada cambio en el cajón del navegador. Este
   archivo es lo que usa el botón «Publicar cambios» del
   editor para subir esa apariencia sin publicar JUNTO con la
   carta, en la misma tanda.

   Lee del cajón:
     · 'apariencia' -> el apariencia.json a subir + qué archivos sobran.
     · 'imagenes'   -> las fotos y fuentes sin subir (portada, logo…).

   Sube primero los archivos, luego el apariencia.json y por
   último borra lo que sobra. Ese orden no debe cambiarse: así
   la página nunca apunta a un archivo que todavía no existe,
   ni a uno que acabamos de borrar. Al terminar, limpia el
   cajón.

   Quien habla con el servidor es nube.js; aquí no hay ni una
   dirección escrita a mano.
   ========================================================= */

/* ¿Hay ajustes de la página sin publicar esperando? */
async function hayAparienciaPendiente(){
  try{ const b=await Almacen.leer('apariencia',clienteActual()); return !!(b&&b.datos); }
  catch{ return false; }
}

/* Publica los ajustes de la página desde el borrador. Devuelve si había
   algo que publicar. Si algo falla, NO limpia el cajón: así se puede
   reintentar en la siguiente publicación sin perder nada. */
async function publicarApariencia(avisarPaso){
  const cliente=clienteActual();
  let borrador=null;
  try{ borrador=await Almacen.leer('apariencia',cliente); }catch{}
  if(!borrador||!borrador.datos) return {publicado:false};

  const datos=borrador.datos;
  const porBorrar=Array.isArray(borrador.porBorrar)?borrador.porBorrar:[];
  const archivos=await archivosSinSubir(cliente);

  // 1) Los archivos sin subir (portada, logo, iconito, fuentes).
  for(let i=0;i<archivos.length;i++){
    const ruta=rutaDelArchivoGuardado(archivos[i],cliente);
    if(avisarPaso)avisarPaso(`Subiendo archivos de la página (${i+1} de ${archivos.length})…`);
    await subirArchivo(ruta,blobDesdeBase64(archivos[i].base64,tipoDeArchivo(ruta)));
  }

  // 2) El propio apariencia.json.
  if(avisarPaso)avisarPaso('Publicando los ajustes de la página…');
  datos.actualizado=new Date().toISOString();
  await guardarApariencia(datos);

  // 3) Lo que ya no usa nadie. Un borrado fallido no es grave: solo
  //    deja un archivo suelto que nadie mira.
  for(const ruta of porBorrar){
    try{ await borrarArchivo(ruta); }catch{}
  }

  // 4) Todo publicado: se vacía el borrador de este cliente.
  try{ await Almacen.borrar('apariencia',cliente); }catch{}
  for(const f of archivos){ try{ await Almacen.borrar('imagenes',f.clave); }catch{} }

  return {publicado:true};
}

/* Los archivos que este cliente dejó preparados. En el cajón van todos
   los clientes juntos, cada clave con su nombre delante. */
async function archivosSinSubir(cliente){
  try{
    const todos=await Almacen.listar('imagenes');
    return (todos||[]).filter(x=>String(x.clave).startsWith(cliente+'::'));
  }catch{
    return [];
  }
}

function rutaDelArchivoGuardado(archivo,cliente){
  return String(archivo.clave).slice((cliente+'::').length);
}