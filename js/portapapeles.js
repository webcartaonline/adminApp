/* =========================================================
   COPIAR Y PEGAR UN ÍTEM
   La copia sobrevive a cerrar la aplicación, porque se
   guarda en el navegador. Al pegar, el ítem nuevo recibe un
   id propio, y su foto se duplica con el nombre nuevo.
   ========================================================= */

function nombreDeLaCopia(){
  if(!estado.itemCopiado)return '';
  return valorTexto(estado.itemCopiado.nombre,estado.idiomas[0])||'(sin nombre)';
}

function guardarCopia(item){
  estado.itemCopiado=item;
  try{
    item?localStorage.setItem(CLAVE_COPIA,JSON.stringify(item))
        :localStorage.removeItem(CLAVE_COPIA);
  }catch{/* si el navegador no deja guardar, la copia dura la sesión */}
}

function leerCopiaGuardada(){
  try{
    const txt=localStorage.getItem(CLAVE_COPIA);
    if(!txt)return null;
    const it=JSON.parse(txt);
    return it&&typeof it==='object'?it:null;
  }catch{return null;}
}

function copiarItem(item){
  guardarCopia(JSON.parse(JSON.stringify(item)));
  pintarZona();
  avisar(`"${nombreDeLaCopia()}" copiado. Ve al grupo que quieras y pulsa «Pegar».`,'bien');
}

function medirImagenBase64(base64){
  return new Promise((res)=>{
    const im=new Image();
    im.onload=()=>res({ancho:im.naturalWidth,alto:im.naturalHeight});
    im.onerror=()=>res({ancho:0,alto:0});
    im.src=`data:image/jpeg;base64,${base64}`;
  });
}

/* Consigue la foto del ítem original: o la que está preparada sin
   publicar, o la que ya está subida al repositorio. */
async function fotoDelItem(origen){
  const pend=estado.imagenesPendientes[rutaImagenRepo('item',origen.id)];
  if(pend)return {base64:pend.base64,bytes:pend.bytes,ancho:pend.ancho,alto:pend.alto};
  if(!origen.imagen)return null;
  const url=urlImagenExistente(origen.imagen);
  if(!url)return null;
  const r=await fetch(`${url}?b=${Date.now().toString(36)}`,{cache:'no-store'});
  if(!r.ok)throw new Error(`GitHub respondió ${r.status}`);
  const blob=await r.blob();
  const base64=await blobABase64(blob);
  const {ancho,alto}=await medirImagenBase64(base64);
  return {base64,bytes:blob.size,ancho,alto};
}

/* Pega la copia en el grupo abierto. El ítem nuevo es idéntico salvo en
   el id, que tiene que ser propio: de él sale el nombre del archivo de
   su foto, así que la foto se duplica también con el nombre nuevo. */
async function pegarItem(){
  const g=grupoActual();
  if(!g||!estado.itemCopiado){avisar('No hay ningún ítem copiado.','error');return;}
  const origen=estado.itemCopiado;
  const rotulo=nombreDeLaCopia();

  const nuevo=JSON.parse(JSON.stringify(origen));
  nuevo.id=nuevoId('i',rotulo);
  delete nuevo.imagen;               // se pone abajo, si logramos duplicar la foto
  g.items=g.items??[];
  g.items.unshift(nuevo);
  marcarSucio();pintarZona();

  const teniaFoto=!!origen.imagen||!!estado.imagenesPendientes[rutaImagenRepo('item',origen.id)];
  if(!teniaFoto){avisar(`"${rotulo}" pegado en este grupo.`,'bien');return;}

  avisar(`"${rotulo}" pegado. Duplicando su foto…`);
  try{
    const foto=await fotoDelItem(origen);
    if(!foto)throw new Error('no se ha encontrado el archivo');
    const rutaDestino=rutaImagenRepo('item',nuevo.id);
    rescatarDeLaPapelera(rutaDestino);
    estado.imagenesHuerfanas.delete(rutaDestino);
    estado.imagenesPendientes[rutaDestino]={
      base64:foto.base64, bytes:foto.bytes, ancho:foto.ancho, alto:foto.alto,
      previa:URL.createObjectURL(base64ABlob(foto.base64))
    };
    nuevo.imagen=`${rutaImagenCarta('item',nuevo.id)}?v=${Date.now().toString(36)}`;
    marcarSucio();pintarZona();
    avisar(`"${rotulo}" pegado con su foto. La foto se subirá al publicar los cambios.`,'bien');
  }catch(e){
    pintarZona();
    avisar(`"${rotulo}" pegado, pero no se ha podido duplicar su foto (${e.message}). Ponle una con el botón «Foto».`,'error');
  }
}
