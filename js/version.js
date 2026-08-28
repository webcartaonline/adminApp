/* =========================================================
   VERSIÓN
   Registra el "vigilante" (sw.js) para que la aplicación se
   pueda instalar y funcione sin conexión. Las versiones
   nuevas se instalan solas, sin pedir permiso a nadie: aquí
   solo se enseña, al abrir, una ventana con lo que ha
   cambiado desde la última vez — y solo si de verdad hay
   algo nuevo que contar.
   ========================================================= */

let notaVersion=null;   // lo que dice version.json ahora mismo

async function arrancarVersion(){
  if('serviceWorker' in navigator){
    try{ await navigator.serviceWorker.register('./sw.js'); }
    catch{ /* si falla, la aplicación funciona igual, solo sin instalación ni caché */ }
  }
  await leerNotas();
}

/* version.json se pide siempre a la red: es un archivo diminuto y
   tiene que reflejar la versión publicada más reciente. */
async function leerNotas(){
  try{
    const r=await fetch(`version.json?b=${Date.now().toString(36)}`,{cache:'no-store'});
    if(!r.ok)return;
    notaVersion=await r.json();
    $('#cfgVersion').textContent=`Versión ${notaVersion.version||'—'}`;
    mostrarNovedadesSiToca();
  }catch{
    $('#cfgVersion').textContent='Versión —';
  }
}

/* Compara con la última versión que este navegador ya vio (se guarda
   en el propio navegador). Si coincide, no hay nada que contar. */
function mostrarNovedadesSiToca(){
  if(!notaVersion?.version)return;
  let vista=null;
  try{vista=localStorage.getItem(CLAVE_VERSION_VISTA);}catch{}
  if(vista===notaVersion.version)return;

  $('#actTitulo').textContent=notaVersion.titulo||'Novedades del editor';
  $('#actSalto').innerHTML=vista
    ? `<span>${escapar(vista)}</span> → <b>${escapar(notaVersion.version)}</b>`
    : `<b>${escapar(notaVersion.version)}</b>`;
  $('#actSalto').hidden=false;

  const cambios=Array.isArray(notaVersion.cambios)?notaVersion.cambios:[];
  $('#actNovedades').innerHTML=cambios.length
    ? cambios.map(c=>`<li>${escapar(c)}</li>`).join('')
    : '<li>Mejoras y correcciones internas.</li>';

  $('#modalActualizacion').hidden=false;
}

function cerrarVentanaNovedades(){
  $('#modalActualizacion').hidden=true;
  if(notaVersion?.version){
    try{localStorage.setItem(CLAVE_VERSION_VISTA,notaVersion.version);}catch{}
  }
}

$('#btnCerrarNovedades').addEventListener('click',cerrarVentanaNovedades);
$('#modalActualizacion').addEventListener('click',(ev)=>{
  if(ev.target.id==='modalActualizacion')cerrarVentanaNovedades();
});
document.addEventListener('keydown',(ev)=>{
  if(ev.key==='Escape'&&!$('#modalActualizacion').hidden)cerrarVentanaNovedades();
});
