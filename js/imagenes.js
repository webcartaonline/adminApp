/* =========================================================
   IMÁGENES (rutas y papelera)
   Aquí no se dibuja nada: solo se calcula dónde vive cada
   foto y se lleva la cuenta de cuáles hay que subir,
   cuáles se pueden recuperar y cuáles hay que borrar.
   ========================================================= */

/* Nombre de archivo a partir del id, saneado por si el JSON viene
   de fuera con ids raros. Siempre .jpg. */
function nombreArchivoImagen(id){
  const limpio=String(id||'x').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'x';
  return `${limpio}.jpg`;
}

/* Carpeta donde vive carta.json dentro del repo ('' si está en la raíz). */
function carpetaDeLaCarta(ruta){
  const partes=String(ruta||'carta.json').split('/');
  partes.pop();
  return partes.length?partes.join('/')+'/':'';
}

/* Ruta que se guarda en carta.json (relativa al index.html de la carta). */
function rutaImagenCarta(tipo,id){
  return `${IMG_TIPOS[tipo].carpeta}/${nombreArchivoImagen(id)}`;
}

/* Ruta dentro del repositorio (para subir por la API de GitHub). */
function rutaImagenRepo(tipo,id){
  const a=leerAjustes();
  return `${carpetaDeLaCarta(a.ruta)}${rutaImagenCarta(tipo,id)}`;
}

/* Quita el ?v=… que usamos para forzar que el navegador recargue la foto. */
function sinVersion(ruta){ return String(ruta||'').split('?')[0]; }

function liberarImagenesPendientes(){
  Object.values(estado.imagenesPendientes).forEach(x=>{
    if(x.previa)URL.revokeObjectURL(x.previa);
  });
  estado.imagenesPendientes={};
}

/* Descarta la imagen preparada de un objeto que se va a borrar. */
function olvidarPendiente(tipo,id){
  const ruta=rutaImagenRepo(tipo,id);
  if(estado.imagenesPendientes[ruta]?.previa)URL.revokeObjectURL(estado.imagenesPendientes[ruta].previa);
  delete estado.imagenesPendientes[ruta];
}

/* ---------- Papelera de imágenes ----------
   Quitar una imagen de un plato NO borra el archivo: se queda en el
   repositorio y se puede recuperar. Pero si se borra el plato entero,
   el archivo ya no lo va a reclamar nadie (los ids llevan un trozo
   aleatorio, así que ningún plato nuevo reutilizará ese nombre), y por
   eso se apunta aquí para borrarlo del repositorio al publicar. */
function marcarImagenParaBorrar(tipo,id,obj){
  const ruta=rutaImagenRepo(tipo,id);
  olvidarPendiente(tipo,id);
  // Solo tiene sentido pedir el borrado si sabemos que hay archivo: o la
  // carta lo está usando, o lo quitamos antes y sigue guardado. Así no
  // gastamos peticiones a GitHub preguntando por fotos que no existen.
  const hayArchivo=!!obj?.imagen||estado.imagenesHuerfanas.has(ruta);
  if(hayArchivo&&!estado.imagenesPorBorrar.includes(ruta))estado.imagenesPorBorrar.push(ruta);
  estado.imagenesHuerfanas.delete(ruta);
}

/* Apunta que en el repositorio hay un archivo que la carta ya no usa
   (porque se quitó la imagen, o porque lo hemos encontrado al abrir la
   ventana de la foto). Sirve para saber que se puede recuperar, y para
   borrarlo si luego se elimina el plato entero. */
function apuntarHuerfana(tipo,id){
  estado.imagenesHuerfanas.add(rutaImagenRepo(tipo,id));
}

/* Saca una ruta de la papelera (al recuperar una imagen o al pegar un
   ítem que va a ocupar ese mismo nombre de archivo). */
function rescatarDeLaPapelera(ruta){
  estado.imagenesPorBorrar=estado.imagenesPorBorrar.filter(x=>x!==ruta);
}

/* Al borrar una sección o un grupo, también sobran las fotos de sus platos. */
function tirarImagenesDe(seccionOGrupo,esSeccion){
  const grupos=esSeccion?(seccionOGrupo.grupos??[]):[seccionOGrupo];
  grupos.forEach(g=>(g.items??[]).forEach(it=>marcarImagenParaBorrar('item',it.id,it)));
  if(esSeccion)marcarImagenParaBorrar('seccion',seccionOGrupo.id,seccionOGrupo);
}

/* Cuenta cuántas fotos se llevará por delante borrar esto, para avisar. */
function contarImagenesDe(seccionOGrupo,esSeccion){
  const grupos=esSeccion?(seccionOGrupo.grupos??[]):[seccionOGrupo];
  let n=grupos.reduce((s,g)=>s+(g.items??[]).filter(it=>it.imagen).length,0);
  if(esSeccion&&seccionOGrupo.imagen)n++;
  return n;
}

/* Frase que se añade a los avisos de borrado, para que quede claro que
   las fotos también se van. */
function avisoFotos(n){
  if(!n)return '';
  return n===1
    ? '\n\nSu foto se borrará del repositorio al publicar los cambios.'
    : `\n\nSus ${n} fotos se borrarán del repositorio al publicar los cambios.`;
}

/* Dirección pública para ver una foto que ya está en el repo. */
function urlImagenExistente(rutaEnCarta){
  const a=leerAjustes();
  if(!a.owner||!a.repo||!rutaEnCarta)return '';
  return `https://raw.githubusercontent.com/${a.owner}/${a.repo}/${a.rama||'main'}/${carpetaDeLaCarta(a.ruta)}${sinVersion(rutaEnCarta)}`;
}

/* Busca el objeto (sección o ítem) al que pertenece una imagen. */
function objetoDeImagen(tipo,id){
  if(tipo==='seccion')return (estado.datos?.secciones??[]).find(s=>s.id===id);
  for(const s of (estado.datos?.secciones??[]))
    for(const g of (s.grupos??[])){
      const it=(g.items??[]).find(x=>x.id===id);
      if(it)return it;
    }
  return null;
}
