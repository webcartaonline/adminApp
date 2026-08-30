/* =========================================================
   VENTANA DE LA FOTO
   Flujo: el cliente elige una foto -> la encuadra en un
   marco con la misma forma que tendrá en la carta -> al
   guardar, la foto se recorta y se comprime aquí mismo, en
   el navegador, y queda "pendiente". Al publicar, primero
   se suben las imágenes y después el JSON, para que la
   carta nunca apunte a una foto que no existe.
   El mismo código sirve para los dos formatos: lo que
   cambia (forma, tamaño, carpeta) sale de IMG_TIPOS.
   ========================================================= */

const recorte = { mapa:null, zoom:1, tx:0, ty:0, tipo:'seccion', id:null,
                  arrastrando:false, ultX:0, ultY:0, rescate:0 };

/* Alto del marco de vista previa, según la forma del tipo de imagen. */
function previaAlto(){
  const c=IMG_TIPOS[recorte.tipo];
  return Math.round(PREVIA_ANCHO*c.relB/c.relA);
}

function errorImagen(txt){
  const p=$('#imgError');
  if(!txt){p.hidden=true;p.textContent='';return;}
  p.textContent=txt;p.hidden=false;
}

function abrirModalImagen(tipo,id){
  const obj=objetoDeImagen(tipo,id);
  if(!obj)return;
  const conf=IMG_TIPOS[tipo];
  recorte.mapa=null; recorte.zoom=1; recorte.tx=0; recorte.ty=0;
  recorte.tipo=tipo; recorte.id=id;

  // El lienzo adopta la forma del tipo: franjas para secciones y grupos,
  // cuadrado para platos.
  const lienzo=$('#imgLienzo');
  lienzo.width=PREVIA_ANCHO; lienzo.height=previaAlto();
  lienzo.style.aspectRatio=`${conf.relA}/${conf.relB}`;
  lienzo.style.maxWidth=tipo==='item'?'320px':'';   // un cuadrado a 700px sería enorme

  $('#imgArchivo').value='';
  $('#imgZoom').value=1;
  $('#recorte').hidden=true;
  $('#btnGuardarImagen').disabled=true;
  errorImagen('');

  const pendiente=estado.imagenesPendientes[rutaImagenRepo(tipo,id)];
  const nombre=valorTexto(obj.nombre,estado.idiomas[0])||'(sin nombre)';
  $('#modalImagenTitulo').textContent=conf.titulo;
  $('#modalImagenPista').textContent=
    pendiente
      ? `${conf.rotulo} "${nombre}". Hay una imagen preparada sin publicar; si eliges otra foto, la sustituirá.`
      : obj.imagen
        ? `${conf.rotulo} "${nombre}". Ya tiene imagen publicada; si eliges otra foto, la sustituirá.`
        : `${conf.rotulo} "${nombre}". Se guardará como ${rutaImagenCarta(tipo,id)}.`;

  $('#btnQuitarImagen').hidden=!(obj.imagen||pendiente);
  $('#btnRecuperarImagen').hidden=true;
  $('#modalImagen').hidden=false;

  // Si ahora mismo no tiene foto, miramos si quedó una guardada en el repo.
  if(!obj.imagen&&!pendiente){
    recorte.rescate=(recorte.rescate||0)+1;
    buscarImagenGuardada(tipo,id,recorte.rescate);
  }
}

/* Comprueba si sigue habiendo una foto de este plato/sección en el
   repositorio. Como el nombre del archivo sale del id, siempre sabemos
   dónde mirar: basta con intentar cargarla. */
function buscarImagenGuardada(tipo,id,ficha){
  const a=leerAjustes();
  if(!a.owner||!a.repo)return;
  const rutaEnCarta=rutaImagenCarta(tipo,id);
  const url=urlImagenExistente(rutaEnCarta);
  if(!url)return;
  const prueba=new Image();
  prueba.onload=()=>{
    apuntarHuerfana(tipo,id);   // confirmado: el archivo está ahí
    // Puede haber cambiado de ventana mientras se comprobaba.
    if(ficha!==recorte.rescate||$('#modalImagen').hidden)return;
    $('#btnRecuperarImagen').hidden=false;
    $('#modalImagenPista').textContent+=
      ' Queda una foto guardada de la última vez: puedes recuperarla sin volver a subirla.';
  };
  prueba.onerror=()=>{};
  prueba.src=`${url}?b=${Date.now().toString(36)}`;
}

/* Vuelve a apuntar a la foto que ya estaba en el repositorio. */
function recuperarImagen(){
  const obj=objetoDeImagen(recorte.tipo,recorte.id);
  if(!obj)return;
  const ruta=rutaImagenRepo(recorte.tipo,recorte.id);
  rescatarDeLaPapelera(ruta);
  estado.imagenesHuerfanas.delete(ruta);   // vuelve a estar en uso
  obj.imagen=`${rutaImagenCarta(recorte.tipo,recorte.id)}?v=${Date.now().toString(36)}`;
  marcarSucio();
  cerrarModalImagen();
  pintarZona();
  avisar('Imagen recuperada. Publica los cambios para que vuelva a verse en la carta.','bien');
}

function cerrarModalImagen(){
  $('#modalImagen').hidden=true;
  if(recorte.mapa)recorte.mapa.close?.();
  recorte.mapa=null;
}

/* Carga el archivo comprobando formato, peso y tamaño en píxeles. */
async function leerArchivoImagen(archivo){
  if(!/^image\/(jpeg|png|webp)$/.test(archivo.type)){
    const pista=/heic|heif/i.test(archivo.type+archivo.name)
      ? ' Las fotos HEIC del iPhone no se pueden leer aquí: en el móvil, en Ajustes › Cámara › Formatos, elige "Más compatible", o comparte la foto como JPG.'
      : '';
    throw new Error(`Ese archivo no es una imagen JPG, PNG o WEBP.${pista}`);
  }
  if(archivo.size>IMG_ENTRADA_MAX){
    throw new Error(`La foto pesa ${(archivo.size/1024/1024).toFixed(1)} MB y el máximo son 25 MB. Haz una captura o redúcela antes.`);
  }
  let mapa;
  try{
    // 'from-image' respeta la orientación con la que se hizo la foto.
    mapa=await createImageBitmap(archivo,{imageOrientation:'from-image'});
  }catch{
    throw new Error('No se ha podido abrir esa foto. Puede estar dañada o en un formato que el navegador no entiende.');
  }
  const megapixeles=(mapa.width*mapa.height)/1e6;
  if(megapixeles>IMG_MEGAPIXELES_MAX){
    mapa.close?.();
    throw new Error(`La foto es demasiado grande (${Math.round(megapixeles)} millones de píxeles). Usa una más pequeña.`);
  }
  const minimo=IMG_TIPOS[recorte.tipo].anchoMin/2;
  if(mapa.width<minimo||mapa.height<minimo){
    mapa.close?.();
    throw new Error(`La foto es demasiado pequeña y se vería borrosa. Usa una de al menos ${IMG_TIPOS[recorte.tipo].anchoMin} píxeles.`);
  }
  return mapa;
}

/* Escala mínima para que la foto cubra el marco por completo. */
function escalaBase(){
  if(!recorte.mapa)return 1;
  return Math.max(PREVIA_ANCHO/recorte.mapa.width, previaAlto()/recorte.mapa.height);
}

/* Impide que queden huecos vacíos dentro del marco. */
function ajustarLimites(){
  const s=escalaBase()*recorte.zoom;
  const ancho=recorte.mapa.width*s, alto=recorte.mapa.height*s;
  recorte.tx=Math.min(0,Math.max(PREVIA_ANCHO-ancho,recorte.tx));
  recorte.ty=Math.min(0,Math.max(previaAlto()-alto,recorte.ty));
}

/* Zona de la foto original que queda dentro del marco. */
function zonaRecortada(){
  const s=escalaBase()*recorte.zoom;
  return { sx:-recorte.tx/s, sy:-recorte.ty/s, sw:PREVIA_ANCHO/s, sh:previaAlto()/s };
}

function pintarRecorte(){
  const lienzo=$('#imgLienzo'), ctx=lienzo.getContext('2d');
  const alto=previaAlto();
  ctx.clearRect(0,0,PREVIA_ANCHO,alto);
  if(!recorte.mapa)return;
  ajustarLimites();
  const z=zonaRecortada();
  ctx.drawImage(recorte.mapa,z.sx,z.sy,z.sw,z.sh,0,0,PREVIA_ANCHO,alto);
}

/* Recorta y comprime hasta que el archivo pese poco, bajando primero
   la calidad y, si aún así no basta, también el tamaño. */
async function generarJpg(){
  const conf=IMG_TIPOS[recorte.tipo];
  const z=zonaRecortada();
  let ancho=Math.min(conf.anchoMax,Math.max(conf.anchoMin,Math.round(z.sw)));
  for(let intento=0;intento<6;intento++){
    const alto=Math.round(ancho*conf.relB/conf.relA);
    const lienzo=document.createElement('canvas');
    lienzo.width=ancho; lienzo.height=alto;
    const ctx=lienzo.getContext('2d');
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(recorte.mapa,z.sx,z.sy,z.sw,z.sh,0,0,ancho,alto);
    for(const calidad of [0.82,0.72,0.62]){
      const blob=await new Promise(r=>lienzo.toBlob(r,'image/jpeg',calidad));
      if(!blob)throw new Error('El navegador no ha podido preparar la imagen.');
      if(blob.size<=conf.peso||(ancho<=conf.anchoMin&&calidad===0.62)){
        return {blob,ancho,alto};
      }
    }
    ancho=Math.max(conf.anchoMin,Math.round(ancho*0.85));
  }
  throw new Error('No se ha podido reducir la foto lo suficiente. Prueba con otra imagen.');
}

async function guardarImagenRecortada(){
  const obj=objetoDeImagen(recorte.tipo,recorte.id);
  if(!obj||!recorte.mapa)return;
  const btn=$('#btnGuardarImagen');
  btn.disabled=true; errorImagen('');
  const textoPrevio=btn.textContent; btn.textContent='Preparando…';
  try{
    const {blob,ancho,alto}=await generarJpg();
    const base64=await blobABase64(blob);
    const ruta=rutaImagenRepo(recorte.tipo,recorte.id);
    const anterior=estado.imagenesPendientes[ruta];
    if(anterior?.previa)URL.revokeObjectURL(anterior.previa);
    // Esa ruta vuelve a estar ocupada: ni se borra ni está huérfana.
    rescatarDeLaPapelera(ruta);
    estado.imagenesHuerfanas.delete(ruta);
    estado.imagenesPendientes[ruta]={
      base64, bytes:blob.size, ancho, alto, previa:URL.createObjectURL(blob)
    };
    // El ?v= obliga al navegador del cliente a recargar la foto nueva.
    obj.imagen=`${rutaImagenCarta(recorte.tipo,recorte.id)}?v=${Date.now().toString(36)}`;
    marcarSucio();
    cerrarModalImagen();
    pintarZona();
    avisar(`Imagen preparada (${Math.round(blob.size/1024)} KB). Se subirá al publicar los cambios.`,'bien');
  }catch(e){
    errorImagen(e.message);
    btn.disabled=false;
  }finally{
    btn.textContent=textoPrevio;
  }
}

function quitarImagen(){
  const obj=objetoDeImagen(recorte.tipo,recorte.id);
  if(!obj)return;
  const que=IMG_TIPOS[recorte.tipo].demostrativo;
  if(!confirm(`¿Quitar la imagen de ${que}? La carta dejará de mostrarla, pero el archivo se queda en el repositorio: podrás recuperarlo desde esta misma ventana con el botón «Recuperar la guardada», sin volver a subirlo.`))return;
  olvidarPendiente(recorte.tipo,recorte.id);
  if(obj.imagen)apuntarHuerfana(recorte.tipo,recorte.id);   // el archivo se queda, y lo sabemos
  delete obj.imagen;
  marcarSucio();
  cerrarModalImagen();
  pintarZona();
  avisar('Imagen quitada. Publica los cambios para que se note en la carta.','bien');
}

/* ---------- Sucesos de la ventana ---------- */
$('#imgArchivo').addEventListener('change',async(ev)=>{
  const archivo=ev.target.files[0];
  if(!archivo)return;
  errorImagen('');
  $('#btnGuardarImagen').disabled=true;
  try{
    if(recorte.mapa)recorte.mapa.close?.();
    recorte.mapa=await leerArchivoImagen(archivo);
    recorte.zoom=1;
    // Empieza centrada: lo normal es que interese la parte del medio.
    const s=escalaBase();
    recorte.tx=(PREVIA_ANCHO-recorte.mapa.width*s)/2;
    recorte.ty=(previaAlto()-recorte.mapa.height*s)/2;
    $('#imgZoom').value=1;
    $('#recorte').hidden=false;
    pintarRecorte();
    $('#btnGuardarImagen').disabled=false;
  }catch(e){
    recorte.mapa=null;
    $('#recorte').hidden=true;
    errorImagen(e.message);
  }
});

$('#imgZoom').addEventListener('input',(ev)=>{
  if(!recorte.mapa)return;
  const previo=recorte.zoom;
  recorte.zoom=Number(ev.target.value)||1;
  // Mantiene el centro del marco al acercar o alejar.
  const factor=recorte.zoom/previo, alto=previaAlto();
  recorte.tx=PREVIA_ANCHO/2-(PREVIA_ANCHO/2-recorte.tx)*factor;
  recorte.ty=alto/2-(alto/2-recorte.ty)*factor;
  pintarRecorte();
});

(function arrastrarRecorte(){
  const lienzo=$('#imgLienzo');
  const aLienzo=(ev)=>{
    const r=lienzo.getBoundingClientRect();
    return {x:ev.clientX*PREVIA_ANCHO/r.width, y:ev.clientY*previaAlto()/r.height};
  };
  lienzo.addEventListener('pointerdown',(ev)=>{
    if(!recorte.mapa)return;
    recorte.arrastrando=true;
    const p=aLienzo(ev); recorte.ultX=p.x; recorte.ultY=p.y;
    lienzo.setPointerCapture(ev.pointerId);
  });
  lienzo.addEventListener('pointermove',(ev)=>{
    if(!recorte.arrastrando)return;
    const p=aLienzo(ev);
    recorte.tx+=p.x-recorte.ultX; recorte.ty+=p.y-recorte.ultY;
    recorte.ultX=p.x; recorte.ultY=p.y;
    pintarRecorte();
  });
  const soltar=(ev)=>{
    if(!recorte.arrastrando)return;
    recorte.arrastrando=false;
    try{lienzo.releasePointerCapture(ev.pointerId);}catch{}
  };
  lienzo.addEventListener('pointerup',soltar);
  lienzo.addEventListener('pointercancel',soltar);
})();

$('#btnGuardarImagen').addEventListener('click',guardarImagenRecortada);
$('#btnQuitarImagen').addEventListener('click',quitarImagen);
$('#btnRecuperarImagen').addEventListener('click',recuperarImagen);
$('#btnCerrarImagen').addEventListener('click',cerrarModalImagen);
$('#modalImagen').addEventListener('click',(ev)=>{if(ev.target.id==='modalImagen')cerrarModalImagen();});
document.addEventListener('keydown',(ev)=>{if(ev.key==='Escape'&&!$('#modalImagen').hidden)cerrarModalImagen();});