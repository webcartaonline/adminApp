/* =========================================================
   EXPORTAR E IMPORTAR LOS AJUSTES
   Los ajustes viven en el navegador de cada uno, así que se
   pierden al cambiar de ordenador, al borrar los datos del
   navegador o al reinstalar. Aquí se pueden meter todos en
   un archivo y volver a soltarlos donde haga falta.

   Lo que viaja son los AJUSTES, no la carta: la carta está
   en el repositorio y se trae desde el editor.
   ========================================================= */

/* Sello para reconocer los archivos nuestros y no tragarse un
   JSON cualquiera. El número de formato sirve por si algún día
   cambia la forma del archivo. */
const COPIA_MARCA   = 'editor-carta-universal';
const COPIA_FORMATO = 1;

/* Lo que se ha leído del archivo elegido y está esperando el visto
   bueno. Mientras sea null, el botón de importar está apagado. */
let copiaEnEspera = null;

/* ---------- Reunir lo que hay guardado ---------- */
function reunirAjustes(conToken){
  const a=leerAjustes();
  const s=leerSitio();
  const c=leerColorGuardado();
  let tema=null, ancho=0;
  try{tema=localStorage.getItem(CLAVE_TEMA);}catch{}
  try{ancho=parseInt(localStorage.getItem(CLAVE_PANEL_ANCHO),10)||0;}catch{}

  return {
    aplicacion:COPIA_MARCA,
    tipo:'ajustes',
    formato:COPIA_FORMATO,
    exportado:new Date().toISOString(),
    creadoCon:notaVersion?.version||null,
    conexion:{
      owner:a.owner||'', repo:a.repo||'',
      rama:a.rama||'main', ruta:a.ruta||'carta.json',
      /* El token solo va si se ha pedido a propósito. */
      ...(conToken&&a.token?{token:a.token}:{})
    },
    sitio:{ nombre:s.nombre||'', url:s.url||'' },
    personalizacion:{
      nombre:a.nombre||'',
      tema:(tema==='claro'||tema==='oscuro')?tema:null,
      /* Del color se guarda la elección, no las variables ya
         calculadas: al importar se vuelven a calcular, y así un
         archivo viejo sigue valiendo si cambian las cuentas. */
      color:c?{modo:c.modo||'degradado',c1:c.c1,c2:c.c2||c.c1}:null,
      panelAncho:ancho>0?ancho:null
    }
  };
}

/* ---------- Exportar ---------- */

/* El botón de incluir el token solo tiene sentido si hay token. */
function sincronizarChipToken(){
  const hay=!!leerAjustes().token;
  const chip=$('#btnIncluirToken');
  chip.disabled=!hay;
  chip.title=hay?'':'No hay ningún token guardado en este navegador.';
  if(!hay)chip.setAttribute('aria-pressed','false');
  pintarAvisoToken();
}
function tokenIncluido(){return $('#btnIncluirToken').getAttribute('aria-pressed')==='true';}
function pintarAvisoToken(){
  const aviso=$('#copiaAvisoToken');
  aviso.hidden=!tokenIncluido();
}

$('#btnIncluirToken').addEventListener('click',()=>{
  $('#btnIncluirToken').setAttribute('aria-pressed',String(!tokenIncluido()));
  pintarAvisoToken();
});

/* Un nombre de archivo que se entienda al verlo en la carpeta de
   descargas dentro de seis meses. */
function nombreArchivoCopia(){
  const a=leerAjustes();
  const base=String(a.nombre||a.repo||'carta').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'').slice(0,32)||'carta';
  const hoy=new Date().toISOString().slice(0,10);
  return `ajustes-editor-${base}-${hoy}.json`;
}

$('#btnExportar').addEventListener('click',()=>{
  const datos=reunirAjustes(tokenIncluido());
  const blob=new Blob([JSON.stringify(datos,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const enlace=document.createElement('a');
  enlace.href=url;
  enlace.download=nombreArchivoCopia();
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  /* El navegador necesita un momento para empezar la descarga antes
     de que se tire el enlace temporal. */
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  avisar(tokenIncluido()
    ? 'Archivo de ajustes descargado. Lleva el token dentro: guárdalo donde nadie más lo vea.'
    : 'Archivo de ajustes descargado.','bien');
});

/* ---------- Importar ---------- */

/* ¿Esto es una copia nuestra? Se mira el sello, no el nombre del
   archivo, que cualquiera puede cambiar. */
function esCopiaNuestra(c){
  return !!c&&typeof c==='object'&&!Array.isArray(c)
    &&c.aplicacion===COPIA_MARCA&&c.tipo==='ajustes';
}

/* Antes de tocar nada se enseña qué trae el archivo. Así nadie
   sobrescribe su configuración sin saber por qué la cambia. */
function resumirCopia(c){
  const cn=c.conexion||{}, s=c.sitio||{}, p=c.personalizacion||{};
  const fila=(rotulo,valor)=>
    `<div class="ficha__fila"><dt>${escapar(rotulo)}</dt><dd>${escapar(valor)}</dd></div>`;
  const color=p.color?.c1
    ? (p.color.modo==='solido'?`Un color (${p.color.c1})`:`Degradado (${p.color.c1} → ${p.color.c2||p.color.c1})`)
    : 'Sin guardar';

  let html='';
  html+=fila('Repositorio',cn.owner&&cn.repo?`${cn.owner}/${cn.repo}`:'Sin datos');
  html+=fila('Archivo',`${cn.ruta||'carta.json'} · rama ${cn.rama||'main'}`);
  html+=fila('Token',cn.token?'Incluido en el archivo':'No incluido');
  html+=fila('Web',s.url||'Sin datos');
  html+=fila('Editor',p.nombre||'Sin nombre');
  html+=fila('Color',color);
  html+=fila('Modo',p.tema==='oscuro'?'Oscuro':(p.tema==='claro'?'Claro':'Sin guardar'));
  if(c.exportado)html+=fila('Exportado el',String(c.exportado).slice(0,10));

  $('#importFicha').innerHTML=html;
  $('#importFicha').hidden=false;
  /* Un archivo de una versión más nueva puede traer cosas que aquí
     todavía no se entienden: se avisa, pero se deja importar lo
     que sí se reconoce. */
  $('#importFuturo').hidden=!(Number(c.formato)>COPIA_FORMATO);
}

function olvidarCopia(){
  copiaEnEspera=null;
  $('#importFicha').hidden=true;
  $('#importFicha').innerHTML='';
  $('#importFuturo').hidden=true;
  $('#btnImportar').disabled=true;
}

$('#importArchivo').addEventListener('change',async(ev)=>{
  const archivo=ev.target.files&&ev.target.files[0];
  olvidarCopia();
  if(!archivo)return;
  try{
    const texto=await archivo.text();
    const c=JSON.parse(texto);
    if(!esCopiaNuestra(c)){
      avisar('Ese archivo no es una copia de los ajustes de esta aplicación.','error');
      return;
    }
    copiaEnEspera=c;
    resumirCopia(c);
    $('#btnImportar').disabled=false;
    avisar('Archivo leído. Comprueba lo que trae y pulsa «Importar estos ajustes».');
  }catch{
    avisar('No se ha podido leer el archivo: no parece un JSON válido.','error');
  }
});

/* Se aplica campo a campo y solo lo que venga: si el archivo no trae
   color, el color de aquí se queda como está en vez de borrarse. */
function aplicarCopia(c){
  const cn=c.conexion||{}, s=c.sitio||{}, p=c.personalizacion||{};

  const a=leerAjustes();
  if(typeof cn.owner==='string')a.owner=cn.owner.trim();
  if(typeof cn.repo==='string') a.repo=cn.repo.trim();
  if(typeof cn.rama==='string') a.rama=cn.rama.trim()||'main';
  if(typeof cn.ruta==='string') a.ruta=cn.ruta.trim()||'carta.json';
  if(typeof cn.token==='string'&&cn.token.trim())a.token=cn.token.trim();
  if(typeof p.nombre==='string')a.nombre=p.nombre.trim();
  guardarAjustes(a);

  if(typeof s.url==='string'||typeof s.nombre==='string'){
    guardarSitio({nombre:s.nombre||'',url:s.url||''});
  }

  /* El tema, antes que el color: la barra se hunde más en oscuro,
     así que el color se calcula sobre el tema ya puesto. */
  if(p.tema==='claro'||p.tema==='oscuro'){
    try{localStorage.setItem(CLAVE_TEMA,p.tema);}catch{}
    document.documentElement.setAttribute('data-tema',p.tema);
  }
  if(p.color&&p.color.c1){
    guardarColor({modo:p.color.modo==='solido'?'solido':'degradado',
      c1:p.color.c1,c2:p.color.c2||p.color.c1});
  }
  const ancho=parseInt(p.panelAncho,10);
  if(ancho>0){
    try{localStorage.setItem(CLAVE_PANEL_ANCHO,String(ancho));}catch{}
    document.documentElement.style.setProperty('--panel-usuario',`${ancho}px`);
  }
}

$('#btnImportar').addEventListener('click',()=>{
  if(!copiaEnEspera)return;
  aplicarCopia(copiaEnEspera);
  olvidarCopia();
  $('#importArchivo').value='';
  refrescarPantallaAjustes();
  sincronizarChipToken();
  /* Se mira si hay token DESPUÉS de importar, no si venía en el
     archivo: un archivo sin token no borra el que ya hubiera aquí. */
  avisar(leerAjustes().token
    ? 'Ajustes importados. Ya puedes volver al editor y traer la carta.'
    : 'Ajustes importados. Falta el token: escríbelo en «Conexión» para poder publicar.','bien');
});

$('#btnImportarCancelar').addEventListener('click',()=>{
  olvidarCopia();
  $('#importArchivo').value='';
});

/* ---------- Arranque ---------- */
sincronizarChipToken();
olvidarCopia();
