/* =========================================================
   PUBLICAR LOS AJUSTES DE LA PÁGINA
   La ventana de «Ajustes de la página» ya no publica por su
   cuenta: guarda cada cambio en el cajón del navegador. Este
   archivo es lo que usa el botón «Publicar cambios» del editor
   para subir esa apariencia sin publicar JUNTO con la carta,
   en la misma tanda.

   Lee del cajón:
     · 'apariencia' -> el apariencia.json a subir + qué archivos sobran.
     · 'imagenes'   -> las fotos y fuentes sin subir (portada, logo…).
   Sube primero los archivos, luego el apariencia.json y por último
   borra lo que sobra (mismo orden cuidadoso de siempre: la página nunca
   apunta a un archivo que no exista). Al terminar, limpia el cajón.
   ========================================================= */

/* ¿Hay ajustes de la página sin publicar esperando? */
async function hayAparienciaPendiente(){
  try{ const b=await Almacen.leer('apariencia',clienteActual()); return !!(b&&b.datos); }
  catch{ return false; }
}

/* Sube un archivo cualquiera al repositorio (crea o reemplaza). */
async function subirArchivoRepo(a,cab,ruta,base64,mensaje){
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}`;
  let sha=null;
  try{
    const previo=await fetch(`${url}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
    if(previo.ok)sha=(await previo.json()).sha;
  }catch{/* si no existe, se crea */}
  const r=await fetch(url,{method:'PUT',headers:cab,body:JSON.stringify({
    message:mensaje,content:base64,branch:a.rama||'main',...(sha?{sha}:{})
  })});
  if(r.status===401)throw new Error('El token no es válido o ha caducado.');
  if(r.status===403)throw new Error('El token no tiene permiso de escritura.');
  if(r.status===409)throw new Error(`${ruta} cambió mientras editabas; vuelve a cargar la carta.`);
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`Servidor respondió ${r.status}.`);}
}
async function borrarArchivoRepo(a,cab,ruta,mensaje){
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}`;
  const previo=await fetch(`${url}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
  if(previo.status===404)return;
  if(!previo.ok)throw new Error(`Servidor respondió ${previo.status}`);
  const sha=(await previo.json()).sha;
  const r=await fetch(url,{method:'DELETE',headers:cab,
    body:JSON.stringify({message:`${mensaje} (borrar archivo)`,sha,branch:a.rama||'main'})});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`Servidor respondió ${r.status}`);}
}

/* apariencia.json vive en la misma carpeta que carta.json. */
function rutaAparienciaJson(a){
  const dir=carpetaDelManifiesto(a.ruta);
  return (dir?dir+'/':'')+'apariencia.json';
}

/* Publica los ajustes de la página desde el borrador. Devuelve si había
   algo que publicar. Si algo falla, NO limpia el cajón: así se puede
   reintentar en la siguiente publicación sin perder nada. */
async function publicarApariencia(a,cab,mensaje,avisarPaso){
  const cliente=clienteActual(a);
  let borrador=null;
  try{ borrador=await Almacen.leer('apariencia',cliente); }catch{}
  if(!borrador||!borrador.datos) return {publicado:false};

  const datos=borrador.datos;
  const porBorrar=Array.isArray(borrador.porBorrar)?borrador.porBorrar:[];

  // 1) Archivos sin subir (portada, logo, fuentes).
  let archivos=[];
  try{
    const todos=await Almacen.listar('imagenes');
    archivos=(todos||[]).filter(x=>String(x.clave).startsWith(cliente+'::'));
  }catch{}
  for(const f of archivos){
    const ruta=String(f.clave).slice((cliente+'::').length);
    if(avisarPaso)avisarPaso('Subiendo archivos de la página…');
    await subirArchivoRepo(a,cab,ruta,f.base64,`${mensaje} (apariencia)`);
  }

  // 2) El propio apariencia.json.
  if(avisarPaso)avisarPaso('Publicando los ajustes de la página…');
  datos.actualizado=new Date().toISOString();
  await subirArchivoRepo(a,cab,rutaAparienciaJson(a),aBase64(JSON.stringify(datos,null,2)),`${mensaje} (apariencia)`);

  // 3) Lo que ya no usa nadie (si un borrado falla, no es grave).
  for(const ruta of porBorrar){ try{ await borrarArchivoRepo(a,cab,ruta,`${mensaje} (apariencia)`); }catch{} }

  // 4) Todo publicado: se vacía el borrador de este cliente.
  try{ await Almacen.borrar('apariencia',cliente); }catch{}
  for(const f of archivos){ try{ await Almacen.borrar('imagenes',f.clave); }catch{} }

  return {publicado:true};
}