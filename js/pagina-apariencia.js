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

/* ---------- Cómo es un apariencia.json recién estrenado ---------- */
function aparienciaDeFabrica(){
  return {
    colores:{ principal:'#E9B44C', fondo:'#12100E', texto:'auto' },
    identidad:{ titulo:'', eslogan:{ es:'', en:'' }, logo:'' },
    fuentes:{ titulo:null, texto:null }
  };
}

const LOGO_LADO_MAX   = 1000;          // px del lado mayor al subirlo
const LOGO_PESO_MAX   = 10*1024*1024;  // 10 MB de archivo original
const FUENTE_PESO_MAX = 10*1024*1024;
const FUENTE_TIPOS    = ['woff2','woff','ttf','otf'];

/* ---------- Memoria de este apartado ---------- */
const apar={
  cargada:false, cargando:false,
  datos:null,             // el apariencia.json que se está editando
  sucio:false,            // ¿hay cambios sin publicar?
  logoPendiente:null,     // {ruta, base64} esperando a subirse
  fuentesPendientes:{},   // clave -> {ruta, base64}
  porBorrar:[],           // archivos del repositorio que ya sobran
  publicado:{ logo:'', fuentes:{ titulo:'', texto:'' } }, // lo que hay ahora en el repo
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
        eslogan:{...base.identidad.eslogan,...(guardada?.identidad?.eslogan||{})}},
      fuentes:{...base.fuentes,...(guardada?.fuentes||{})}
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
    apar.publicado.fuentes.titulo=sinVersion(apar.datos.fuentes.titulo?.archivo);
    apar.publicado.fuentes.texto=sinVersion(apar.datos.fuentes.texto?.archivo);

    apar.cargada=true; apar.sucio=false;
    apar.logoPendiente=null; apar.fuentesPendientes={}; apar.porBorrar=[];
    volcarCampos();
    pintarPrevia();
    pintarEstadoPagina('Al día','bien');
    refrescarBotonPublicar();
  }catch(e){
    pintarEstadoPagina('No se ha podido cargar','falta');
    avisar(`No se han podido traer los ajustes de la página: ${e.message}`,'error');
  }finally{apar.cargando=false;}
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
  pintarLogoCampo();
  pintarFuenteCampo('titulo');
  pintarFuenteCampo('texto');
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
  refrescarBotonPublicar();
}
function pintarEstadoPagina(texto,tipo){
  const e=$('#estadoPagina');
  e.textContent=texto;
  e.className=`apartado__estado${tipo==='bien'?' apartado__estado--bien':tipo==='falta'?' apartado__estado--falta':''}`;
}
function refrescarBotonPublicar(){
  $('#btnPublicarPagina').disabled=!apar.cargada||!apar.sucio||enEsperaPagina();
}

/* =========================================================
   LOGOTIPO
   Se acepta cualquier forma (apaisado, cuadrado, redondo…):
   solo se encoge si es enorme, sin recortarlo ni deformarlo.
   Los PNG, WebP y SVG conservan su transparencia.
   ========================================================= */
async function elegirLogo(archivo){
  if(!archivo)return;
  if(archivo.size>LOGO_PESO_MAX){avisar('Ese archivo pesa demasiado. Prueba con una imagen de menos de 10 MB.','error');return;}
  try{
    const preparado=archivo.type==='image/svg+xml'
      ?{base64:await blobABase64(archivo),extension:'svg'}
      :await encogerLogo(archivo);
    if(apar.previas.logo)URL.revokeObjectURL(apar.previas.logo);
    apar.previas.logo=URL.createObjectURL(base64ABlob(preparado.base64,
      preparado.extension==='svg'?'image/svg+xml':preparado.extension==='png'?'image/png':'image/jpeg'));

    const ruta=`img/logo.${preparado.extension}`;
    apuntarSiSobra(apar.publicado.logo,ruta);
    apar.logoPendiente={ruta,base64:preparado.base64};
    apar.datos.identidad.logo=`${ruta}?v=${marcaDeTiempo()}`;
    pintarLogoCampo(); pintarPrevia(); marcarSucio();
  }catch{avisar('No se ha podido leer esa imagen. Prueba con un PNG, JPG, WebP o SVG.','error');}
}

function encogerLogo(archivo){
  return new Promise((listo,fallo)=>{
    const url=URL.createObjectURL(archivo);
    const imagen=new Image();
    imagen.onload=()=>{
      const escala=Math.min(1,LOGO_LADO_MAX/Math.max(imagen.width,imagen.height));
      const lienzo=document.createElement('canvas');
      lienzo.width=Math.max(1,Math.round(imagen.width*escala));
      lienzo.height=Math.max(1,Math.round(imagen.height*escala));
      lienzo.getContext('2d').drawImage(imagen,0,0,lienzo.width,lienzo.height);
      URL.revokeObjectURL(url);
      // PNG para los formatos con transparencia; JPG para las fotos.
      const conAlfa=/png|webp|gif/.test(archivo.type);
      lienzo.toBlob(async(blob)=>{
        if(!blob){fallo(new Error('sin blob'));return;}
        listo({base64:await blobABase64(blob),extension:conAlfa?'png':'jpg'});
      },conAlfa?'image/png':'image/jpeg',0.85);
    };
    imagen.onerror=()=>{URL.revokeObjectURL(url);fallo(new Error('imagen ilegible'));};
    imagen.src=url;
  });
}

function quitarLogo(){
  apuntarSiSobra(apar.publicado.logo,'');
  apar.logoPendiente=null;
  if(apar.previas.logo){URL.revokeObjectURL(apar.previas.logo);delete apar.previas.logo;}
  apar.datos.identidad.logo='';
  pintarLogoCampo(); pintarPrevia(); marcarSucio();
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
  apar.datos.fuentes[clave]={archivo:`${ruta}?v=${marcaDeTiempo()}`,nombre:archivo.name};
  pintarFuenteCampo(clave);
  previsualizarFuente(clave,archivo);
  marcarSucio();
}
function quitarFuente(clave){
  apuntarSiSobra(apar.publicado.fuentes[clave],'');
  delete apar.fuentesPendientes[clave];
  apar.datos.fuentes[clave]=null;
  pintarFuenteCampo(clave);
  quitarPreviaFuente(clave);
  marcarSucio();
}

/* =========================================================
   PUBLICAR
   Primero los archivos (logo y fuentes), después el
   apariencia.json, y al final se borra lo que sobra. En ese
   orden a propósito: la página nunca queda apuntando a un
   archivo que no exista.
   ========================================================= */
async function subirAlRepo(ruta,base64,mensaje){
  const a=leerAjustes();
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}`;
  const cab={...cabecerasGitHub(),'Content-Type':'application/json'};
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
  if(r.status===409)throw new Error(`${ruta} cambió mientras editabas; vuelve a abrir este apartado.`);
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`GitHub respondió ${r.status}.`);}
}
async function borrarDelRepo(ruta,mensaje){
  const a=leerAjustes();
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}`;
  const cab={...cabecerasGitHub(),'Content-Type':'application/json'};
  const previo=await fetch(`${url}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
  if(previo.status===404)return;
  if(!previo.ok)throw new Error(`GitHub respondió ${previo.status}`);
  const sha=(await previo.json()).sha;
  const r=await fetch(url,{method:'DELETE',headers:cab,
    body:JSON.stringify({message:`${mensaje} (borrar archivo)`,sha,branch:a.rama||'main'})});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`GitHub respondió ${r.status}`);}
}

async function publicarPagina(){
  if(enEsperaPagina()){
    avisar('Aún se está desplegando la publicación anterior. En cuanto acabe la cuenta atrás podrás publicar.','error');
    return;
  }
  const a=leerAjustes();
  if(!a.token){avisar('Hace falta el token de acceso para publicar. Está en el apartado «Conexión con la página».','error');return;}
  if(!apar.cargada)return;

  const mensaje='chore(apariencia): ajustes de la página';
  $('#btnPublicarPagina').disabled=true;
  pintarEstadoPagina('Publicando…');
  try{
    // Lo escrito en los campos, tal cual está, sin espacios de más.
    apar.datos.identidad.titulo=$('#aparTitulo').value.trim();
    apar.datos.identidad.eslogan.es=$('#aparEsloganEs').value.trim();
    apar.datos.identidad.eslogan.en=$('#aparEsloganEn').value.trim();

    // 1) El logotipo, si hay uno nuevo.
    if(apar.logoPendiente){
      avisar('Subiendo el logotipo…');
      await subirAlRepo(apar.logoPendiente.ruta,apar.logoPendiente.base64,`${mensaje} (logotipo)`);
      apar.logoPendiente=null;
    }
    // 2) Las fuentes nuevas.
    for(const clave of Object.keys(apar.fuentesPendientes)){
      avisar(`Subiendo la fuente ${clave==='titulo'?'del título':'del texto'}…`);
      const f=apar.fuentesPendientes[clave];
      await subirAlRepo(f.ruta,f.base64,`${mensaje} (fuente)`);
      delete apar.fuentesPendientes[clave];
    }
    // 3) El propio apariencia.json.
    avisar('Publicando los ajustes de la página…');
    apar.datos.actualizado=new Date().toISOString();
    await subirAlRepo(rutaJunto('apariencia.json'),aBase64(JSON.stringify(apar.datos,null,2)),mensaje);

    // 4) Y lo que ya no usa nadie. Si un borrado falla, no es grave:
    //    queda apuntado y se reintenta en la siguiente publicación.
    const fallos=[];
    for(const ruta of [...apar.porBorrar]){
      try{await borrarDelRepo(ruta,mensaje);apar.porBorrar=apar.porBorrar.filter(x=>x!==ruta);}
      catch{fallos.push(ruta);}
    }

    apar.publicado.logo=sinVersion(apar.datos.identidad.logo);
    apar.publicado.fuentes.titulo=sinVersion(apar.datos.fuentes.titulo?.archivo);
    apar.publicado.fuentes.texto=sinVersion(apar.datos.fuentes.texto?.archivo);
    apar.sucio=fallos.length>0;

    empezarEsperaPagina();
    pintarEstadoPagina('Al día','bien');
    avisar('Publicado. La página se actualiza en un par de minutos; mientras se despliega, publicar queda bloqueado.','bien');
  }catch(e){
    pintarEstadoPagina('Cambios sin publicar','falta');
    if(!enEsperaPagina())refrescarBotonPublicar();
    avisar(`No se ha podido publicar: ${e.message}`,'error');
  }
}

/* =========================================================
   ESPERA COMPARTIDA CON EL EDITOR
   Se usa la misma llave del navegador (CLAVE_ESPERA) que el
   botón de publicar del editor: los dos despliegues no
   pueden pisarse porque los dos botones miran el mismo
   reloj. Publicar aquí bloquea allí, y al revés.
   ========================================================= */
let finEsperaPagina=0, relojEsperaPagina=null;

function enEsperaPagina(){return finEsperaPagina>Date.now();}
function esperaEnMarcha(){
  try{
    const v=Number(localStorage.getItem(CLAVE_ESPERA))||0;
    return (v>Date.now()&&v-Date.now()<=MS_ESPERA)?v:0;
  }catch{return 0;}
}
function empezarEsperaPagina(hasta){
  finEsperaPagina=hasta||Date.now()+MS_ESPERA;
  try{localStorage.setItem(CLAVE_ESPERA,String(finEsperaPagina));}catch{}
  $('#aparEspera').hidden=false;
  refrescarBotonPublicar();
  pintarEsperaPagina();
  clearInterval(relojEsperaPagina);
  relojEsperaPagina=setInterval(pintarEsperaPagina,250);
}
function pintarEsperaPagina(){
  const resta=finEsperaPagina-Date.now();
  if(resta<=0){terminarEsperaPagina();return;}
  const seg=Math.ceil(resta/1000);
  $('#aparEspera').textContent=`Desplegando… ${Math.floor(seg/60)}:${String(seg%60).padStart(2,'0')}`;
}
function terminarEsperaPagina(){
  clearInterval(relojEsperaPagina);relojEsperaPagina=null;finEsperaPagina=0;
  try{localStorage.removeItem(CLAVE_ESPERA);}catch{}
  $('#aparEspera').hidden=true;
  refrescarBotonPublicar();
}
/* Si se publica desde el editor en otra pestaña, aquí también se
   entera y bloquea el botón (y al revés). */
window.addEventListener('storage',(ev)=>{
  if(ev.key!==CLAVE_ESPERA)return;
  const v=esperaEnMarcha();
  if(v)empezarEsperaPagina(v);
});

/* =========================================================
   CONEXIONES CON LA PANTALLA
   ========================================================= */
// Al abrir el apartado por primera vez se trae lo guardado.
$('#apPagina').querySelector('.apartado__cabecera').addEventListener('click',()=>{
  if($('#apPagina').classList.contains('apartado--abierto')&&!apar.cargada&&!apar.cargando)cargarPagina();
});
$('#btnAparRecargar').addEventListener('click',cargarPagina);

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

// Fuentes
$('#aparFuenteTitulo').addEventListener('change',(ev)=>{elegirFuente('titulo',ev.target.files[0]);ev.target.value='';});
$('#aparFuenteTexto').addEventListener('change',(ev)=>{elegirFuente('texto',ev.target.files[0]);ev.target.value='';});
$('#btnAparFuenteTituloQuitar').addEventListener('click',()=>quitarFuente('titulo'));
$('#btnAparFuenteTextoQuitar').addEventListener('click',()=>quitarFuente('texto'));

// Publicar
$('#btnPublicarPagina').addEventListener('click',publicarPagina);

// Si al abrir esta página había una cuenta atrás en marcha, se retoma.
{const pendiente=esperaEnMarcha();if(pendiente)empezarEsperaPagina(pendiente);}

})();
