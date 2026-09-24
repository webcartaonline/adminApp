/* =========================================================
   IMÁGENES (rutas y papelera)
   Aquí no se dibuja nada: solo se calcula dónde vive cada
   foto y se lleva la cuenta de cuáles hay que subir,
   cuáles se pueden recuperar y cuáles hay que borrar.
   ========================================================= */

/* ---------- ¿Esta carta puede llevar fotos? ----------
   Lo decide la LICENCIA, no la carta: si el plan incluye algún tipo de
   foto, el editor enseña los botones de foto. Cada botón sigue
   preguntando además por su permiso concreto (licencia.js), así que
   nadie ve un botón que su plan no incluya.

   Antes lo decía el campo negocio.imagenes de la carta. Ese campo se
   mantiene solo porque las plantillas lo leen para saber si pintar las
   fotos (la carta pública no ve la licencia), pero ya no lo escribe
   nadie a mano: el editor lo copia de la licencia al cargar y al
   publicar (anotarImagenesEnLaCarta). */
function imagenesSegunLicencia(){
  return puedeImagenItem()||puedeImagenesDecorativas()||puedeImagenMarca();
}

/* Deja la carta en memoria diciendo lo mismo que la licencia, para que
   al publicar la plantilla pinte (o no) las fotos según el plan. */
function anotarImagenesEnLaCarta(){
  estado.imagenes=imagenesSegunLicencia();
  if(!estado.datos)return;
  estado.datos.negocio={...(estado.datos.negocio||{}),imagenes:estado.imagenes};
}

/* Atajo para preguntarlo desde cualquier sitio. */
function hayImagenes(){ return estado.imagenes===true; }

/* Nombre de archivo a partir del id, saneado por si el JSON viene
   de fuera con ids raros. Siempre .jpg. */
function nombreArchivoImagen(id){
  const limpio=String(id||'x').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'x';
  return `${limpio}.jpg`;
}

/* Ruta que se guarda en carta.json (relativa al index.html de la carta). */
function rutaImagenCarta(tipo,id){
  return `${IMG_TIPOS[tipo].carpeta}/${nombreArchivoImagen(id)}`;
}

/* Ruta con la que se sube al servidor. Es la MISMA que se guarda en la
   carta: el servidor ya mete cada archivo en la carpeta de su negocio,
   así que aquí no se pone ningún prefijo. */
function rutaImagenRepo(tipo,id){
  return rutaImagenCarta(tipo,id);
}

/* El campo "foco" dice qué casilla de la cuadrícula de tres por tres es
   la importante. Se tolera cualquier cosa rara que venga de un JSON
   escrito a mano: si no se reconoce, se toma el centro. */
function normalizarFoco(valor){
  const v=String(valor||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[\s_]+/g,'-');
  return FOCOS.some(f=>f.clave===v)?v:FOCO_DEFECTO;
}

/* Nombre en cristiano de la casilla elegida. */
function rotuloFoco(valor){
  return FOCOS.find(f=>f.clave===normalizarFoco(valor)).rotulo;
}

/* Cuadrícula diminuta con la casilla elegida encendida. Se usa en la
   vista general para saber de un vistazo cuál está puesta, sin tener
   que abrir la ventana de la foto. */
function iconoFoco(valor){
  const elegida=normalizarFoco(valor);
  const celdas=FOCOS.map((f,n)=>{
    const x=1+(n%3)*7, y=1+Math.floor(n/3)*7;
    const clase=f.clave===elegida?'foco-icono__on':'foco-icono__off';
    return `<rect x="${x}" y="${y}" width="6" height="6" rx="1.4" class="${clase}"/>`;
  }).join('');
  return `<svg class="foco-icono" viewBox="0 0 21 21" aria-hidden="true">${celdas}</svg>`;
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
   Quitar una foto la borra de la carta Y del servidor al publicar: en
   la nube no se queda nada ocupando sitio «por si acaso». Lo que sí se
   guarda es una copia en ESTE navegador (más abajo), para poder
   deshacer el despiste mientras el editor siga abierto. */

/* Apunta que este archivo hay que borrarlo del servidor al publicar. */
function apuntarParaBorrar(ruta){
  if(ruta&&!estado.imagenesPorBorrar.includes(ruta))estado.imagenesPorBorrar.push(ruta);
}

/* Se borra el plato (o el grupo, o la sección) entero: su foto ya no la
   va a reclamar nadie, porque los ids llevan un trozo aleatorio y
   ninguno nuevo va a reutilizar ese nombre. */
function marcarImagenParaBorrar(tipo,id,obj){
  const ruta=rutaImagenRepo(tipo,id);
  olvidarPendiente(tipo,id);
  // Solo tiene sentido pedir el borrado si hay algo publicado que borrar.
  if(obj?.imagen)apuntarParaBorrar(ruta);
}

/* Saca una ruta de la papelera (al recuperar una imagen o al pegar un
   ítem que va a ocupar ese mismo nombre de archivo). */
function rescatarDeLaPapelera(ruta){
  estado.imagenesPorBorrar=estado.imagenesPorBorrar.filter(x=>x!==ruta);
}

/* ---------- La copia de las fotos quitadas ----------
   Vive en la memoria de esta pestaña (sessionStorage): no viaja a
   ningún servidor y desaparece al cerrar el editor. Sirve para una sola
   cosa, recuperar una foto quitada por error mientras se sigue
   trabajando. Cada negocio tiene las suyas, y si el navegador no
   dejara guardar nada, todo sigue funcionando: simplemente no habrá
   copia que recuperar. */
const claveDeFotoQuitada=(ruta)=>`${CLAVE_FOTOS_QUITADAS}::${clienteActual()}::${ruta}`;

/* Las copias que hay ahora mismo, de la más vieja a la más nueva. */
function fotosQuitadasGuardadas(){
  const lista=[];
  try{
    for(let i=0;i<sessionStorage.length;i++){
      const clave=sessionStorage.key(i);
      if(!clave||!clave.startsWith(CLAVE_FOTOS_QUITADAS))continue;
      let cuando=0;
      try{cuando=JSON.parse(sessionStorage.getItem(clave))?.cuando||0;}catch{}
      lista.push({clave,cuando});
    }
  }catch{}
  return lista.sort((a,b)=>a.cuando-b.cuando);
}

function tirarLaMasVieja(){
  const lista=fotosQuitadasGuardadas();
  if(!lista.length)return false;
  try{sessionStorage.removeItem(lista[0].clave);}catch{return false;}
  return true;
}

function podarFotosQuitadas(){
  const lista=fotosQuitadasGuardadas();
  for(let i=0;i<lista.length-MAX_FOTOS_QUITADAS;i++){
    try{sessionStorage.removeItem(lista[i].clave);}catch{}
  }
}

/* Guarda la copia. Si el navegador dice que no cabe, se tira la más
   vieja y se vuelve a intentar. Devuelve si se ha podido guardar, que
   es lo que decide qué se le cuenta al cliente. */
function guardarFotoQuitada(ruta,copia){
  const dato=JSON.stringify({...copia,cuando:Date.now()});
  for(let intento=0;intento<=MAX_FOTOS_QUITADAS;intento++){
    try{
      sessionStorage.setItem(claveDeFotoQuitada(ruta),dato);
      podarFotosQuitadas();
      return true;
    }catch{
      if(!tirarLaMasVieja())return false;
    }
  }
  return false;
}

function fotoQuitada(ruta){
  try{return JSON.parse(sessionStorage.getItem(claveDeFotoQuitada(ruta))||'null');}catch{return null;}
}

function olvidarFotoQuitada(ruta){
  try{sessionStorage.removeItem(claveDeFotoQuitada(ruta));}catch{}
}

/* Al borrar una sección o un grupo, también sobran las fotos de sus platos. */
function tirarImagenesDe(seccionOGrupo,esSeccion){
  const grupos=esSeccion?(seccionOGrupo.grupos??[]):[seccionOGrupo];
  grupos.forEach(g=>{
    (g.items??[]).forEach(it=>marcarImagenParaBorrar('item',it.id,it));
    marcarImagenParaBorrar('grupo',g.id,g);
  });
  if(esSeccion)marcarImagenParaBorrar('seccion',seccionOGrupo.id,seccionOGrupo);
}

/* Cuenta cuántas fotos se llevará por delante borrar esto, para avisar.
   Con el interruptor apagado se devuelve 0: los archivos sobrantes se
   siguen limpiando por dentro, pero no se le habla de fotos a quien no
   tiene fotos. */
function contarImagenesDe(seccionOGrupo,esSeccion){
  if(!hayImagenes())return 0;
  const grupos=esSeccion?(seccionOGrupo.grupos??[]):[seccionOGrupo];
  let n=grupos.reduce((s,g)=>s+(g.items??[]).filter(it=>it.imagen).length+(g.imagen?1:0),0);
  if(esSeccion&&seccionOGrupo.imagen)n++;
  return n;
}

/* Frase que se añade a los avisos de borrado, para que quede claro que
   las fotos también se van. */
function avisoFotos(n){
  if(!n)return '';
  return n===1
    ? '\n\nSu foto se borrará al publicar los cambios.'
    : `\n\nSus ${n} fotos se borrarán al publicar los cambios.`;
}

/* Dirección pública para ver una foto que ya está publicada. La calcula
   nube.js, que es quien sabe dónde viven las fotos. */
function urlImagenExistente(rutaEnCarta){
  if(!rutaEnCarta)return '';
  return urlPublica(sinVersion(rutaEnCarta));
}

/* Busca el objeto (sección, grupo o ítem) al que pertenece una imagen. */
function objetoDeImagen(tipo,id){
  const secciones=estado.datos?.secciones??[];
  if(tipo==='seccion')return secciones.find(s=>s.id===id);
  if(tipo==='grupo'){
    for(const s of secciones){
      const g=(s.grupos??[]).find(x=>x.id===id);
      if(g)return g;
    }
    return null;
  }
  for(const s of secciones)
    for(const g of (s.grupos??[])){
      const it=(g.items??[]).find(x=>x.id===id);
      if(it)return it;
    }
  return null;
}