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
    mostrarNovedadesSiToca();
  }catch{ /* sin conexión: la versión se queda sin saber, y ya está */ }
}

/* Compara con la última versión que este navegador ya vio (se guarda
   en el propio navegador). Si coincide, no hay nada que contar.
   La ventana solo existe en el editor: en la página de ajustes no
   hay nada que enseñar y se sale sin hacer ruido. */
function mostrarNovedadesSiToca(){
  if(!notaVersion?.version)return;
  if(!$('#modalActualizacion'))return;
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


/* ---------- Actualizar ----------
   La ventana de novedades no se puede cerrar: solo se sale
   pulsando «Actualizar». Se puede hacer sin miedo porque la
   ventana sale al abrir la aplicación, antes de tocar nada,
   así que no hay trabajo a medias que perder.

   Recargar es necesario de verdad: el "vigilante" guarda una
   copia de los archivos, y la pantalla que se está viendo
   sigue usando la copia vieja hasta que se vuelve a cargar. */
async function actualizarAhora(){
  const boton=$('#btnActualizarAhora');
  boton.disabled=true;
  boton.textContent='Actualizando…';

  /* Se le pide al vigilante que busque la versión nueva y tome
     el mando. Si tarda, se recarga igualmente: como mucho hará
     falta abrir otra vez, pero no se queda colgado. */
  if('serviceWorker' in navigator){
    try{
      const registro=await navigator.serviceWorker.getRegistration();
      if(registro){
        await registro.update();
        if(!navigator.serviceWorker.controller||registro.waiting||registro.installing){
          await new Promise(listo=>{
            let hecho=false;
            const acabar=()=>{if(!hecho){hecho=true;listo();}};
            navigator.serviceWorker.addEventListener('controllerchange',acabar,{once:true});
            setTimeout(acabar,2500);
          });
        }
      }
    }catch{ /* si falla, se recarga igual */ }
  }

  /* Se apunta la versión ya vista para que la ventana no vuelva
     a salir en cuanto se recargue. */
  if(notaVersion?.version){
    try{localStorage.setItem(CLAVE_VERSION_VISTA,notaVersion.version);}catch{}
  }
  location.reload();
}

$('#btnActualizarAhora')?.addEventListener('click',actualizarAhora);
