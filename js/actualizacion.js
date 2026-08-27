/* =========================================================
   ACTUALIZACIONES
   Cómo funciona, en corto:
   1. sw.js (el "vigilante") se queda instalado en el
      navegador del cliente con una copia de la aplicación.
   2. Cuando subes una versión nueva a GitHub, el navegador
      nota que sw.js ha cambiado, se descarga la aplicación
      nueva por detrás y la deja EN ESPERA. La que se está
      usando no se toca.
   3. Aquí decidimos CUÁNDO ofrecerle el cambio al cliente.
      Nunca en mitad de una edición: solo al abrir, o justo
      después de publicar. Si llega mientras trabaja, se
      queda una chincheta discreta en la barra de arriba.
   4. Si acepta, se le dice al vigilante que tome el relevo
      y se recarga la página. Es instantáneo: la versión
      nueva ya estaba descargada.
   ========================================================= */

const MS_REVISION = 30*60*1000;   // vuelve a mirar si hay novedades cada media hora

const actualizacion = {
  registro:null,        // el vigilante instalado
  esperando:null,       // la versión nueva, ya descargada y en espera
  notas:null,           // lo que dice version.json
  instalada:null,       // versión que se está usando ahora mismo
  pospuesta:false,      // el cliente ha dicho "ahora no"
  recargando:false      // hemos pedido el relevo: la recarga es cosa nuestra
};

/* ---------- Arranque ---------- */
async function arrancarActualizaciones(){
  if(!('serviceWorker' in navigator)){
    // Pasa si se abre el archivo a pelo (file://) o sin https.
    $('#cfgVersion').textContent='Versión: no instalada como aplicación';
    return;
  }
  try{
    const registro=await navigator.serviceWorker.register('./sw.js');
    actualizacion.registro=registro;

    preguntarVersionInstalada();

    // ¿Ya había una versión nueva esperando de una visita anterior?
    if(registro.waiting&&navigator.serviceWorker.controller)hayNovedad(registro.waiting);

    // Aviso de que se está descargando una versión nueva ahora mismo.
    registro.addEventListener('updatefound',()=>{
      const nueva=registro.installing;
      if(!nueva)return;
      nueva.addEventListener('statechange',()=>{
        // 'installed' + ya había un vigilante = es un relevo, no la primera instalación.
        if(nueva.state==='installed'&&navigator.serviceWorker.controller)hayNovedad(nueva);
      });
    });

    // El relevo ya se ha hecho: recargamos para estrenar la versión nueva.
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(actualizacion.recargando){location.reload();return;}
      preguntarVersionInstalada();   // primera instalación: solo refrescamos el rótulo
    });

    revisarSiHayNovedades();
    setInterval(revisarSiHayNovedades,MS_REVISION);
    // Al volver a la pestaña después de un rato, se vuelve a mirar.
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){revisarSiHayNovedades();intentarAvisar();}
    });
  }catch(e){
    $('#cfgVersion').textContent='Versión: no se ha podido comprobar';
  }
}

/* Le pregunta al vigilante en activo qué versión está sirviendo. */
function preguntarVersionInstalada(){
  const activo=navigator.serviceWorker.controller;
  if(!activo){$('#cfgVersion').textContent='Versión: preparando la instalación…';return;}
  const canal=new MessageChannel();
  canal.port1.onmessage=(ev)=>{
    actualizacion.instalada=ev.data?.version||null;
    $('#cfgVersion').textContent=`Versión ${actualizacion.instalada||'—'}`;
  };
  activo.postMessage({tipo:'que-version'},[canal.port2]);
}

/* Pide al navegador que compruebe si sw.js ha cambiado en el servidor. */
function revisarSiHayNovedades(){
  actualizacion.registro?.update().catch(()=>{});
}

/* ---------- Hay una versión nueva lista ---------- */
async function hayNovedad(worker){
  actualizacion.esperando=worker;
  await leerNotas();
  intentarAvisar();
}

/* version.json cuenta, en cristiano, qué trae la versión nueva.
   Se pide siempre a la red: es un archivo diminuto y tiene que estar
   al día sí o sí. */
async function leerNotas(){
  try{
    const r=await fetch(`version.json?b=${Date.now().toString(36)}`,{cache:'no-store'});
    if(r.ok)actualizacion.notas=await r.json();
  }catch{/* sin notas, la ventana sale con un texto genérico */}
}

/* ---------- ¿Es buen momento para interrumpir? ---------- */
function momentoBueno(){
  return !trabajoSinGuardar()
      && $('#modalImagen').hidden
      && $('#modalActualizacion').hidden
      && !document.hidden;
}

function intentarAvisar(){
  if(!actualizacion.esperando)return;
  if(!actualizacion.pospuesta&&momentoBueno()){abrirVentanaActualizacion();return;}
  mostrarChincheta();
}

/* La llama publicar() cuando todo ha salido bien. Es el otro momento
   tranquilo del día: el cliente acaba de terminar. */
function trasPublicar(){
  revisarSiHayNovedades();
  actualizacion.pospuesta=false;   // ahora sí conviene volver a ofrecerlo
  setTimeout(intentarAvisar,1500); // deja leer antes el aviso de "Publicado"
}

function mostrarChincheta(){
  if(!actualizacion.esperando)return;
  $('#chincheta').hidden=false;
}

/* ---------- La ventana ---------- */
function abrirVentanaActualizacion(){
  if(!actualizacion.esperando)return;
  const n=actualizacion.notas||{};

  $('#actTitulo').textContent=n.titulo||'Hay una versión nueva del editor';

  $('#actSalto').innerHTML=
    (actualizacion.instalada&&n.version)
      ? `<span>${escapar(actualizacion.instalada)}</span> → <b>${escapar(n.version)}</b>`
      : n.version?`<b>${escapar(n.version)}</b>`:'';
  $('#actSalto').hidden=!$('#actSalto').innerHTML;

  const cambios=Array.isArray(n.cambios)?n.cambios:[];
  $('#actNovedades').innerHTML=cambios.length
    ? cambios.map(c=>`<li>${escapar(c)}</li>`).join('')
    : '<li>Mejoras y correcciones internas.</li>';

  $('#actAviso').hidden=!trabajoSinGuardar();
  $('#btnActualizarAhora').disabled=trabajoSinGuardar();

  $('#modalActualizacion').hidden=false;
}

function cerrarVentanaActualizacion(posponer){
  $('#modalActualizacion').hidden=true;
  if(posponer){actualizacion.pospuesta=true;mostrarChincheta();}
}

/* Le dice al vigilante nuevo que tome el relevo. Cuando lo hace, salta
   'controllerchange' y recargamos. */
function aplicarActualizacion(){
  if(!actualizacion.esperando)return;
  if(trabajoSinGuardar()){
    avisar('Publica primero los cambios que tienes pendientes; después podrás actualizar.','error');
    return;
  }
  actualizacion.recargando=true;
  $('#btnActualizarAhora').disabled=true;
  $('#btnActualizarAhora').textContent='Actualizando…';
  actualizacion.esperando.postMessage({tipo:'toma-el-relevo'});
  // Red de seguridad: si el relevo no llega, recargamos igual.
  setTimeout(()=>{if(actualizacion.recargando)location.reload();},5000);
}

/* ---------- Botones ---------- */
$('#chincheta').addEventListener('click',()=>{actualizacion.pospuesta=false;abrirVentanaActualizacion();});
$('#btnActualizarAhora').addEventListener('click',aplicarActualizacion);
$('#btnActualizarLuego').addEventListener('click',()=>cerrarVentanaActualizacion(true));
$('#modalActualizacion').addEventListener('click',(ev)=>{
  if(ev.target.id==='modalActualizacion')cerrarVentanaActualizacion(true);
});
document.addEventListener('keydown',(ev)=>{
  if(ev.key==='Escape'&&!$('#modalActualizacion').hidden)cerrarVentanaActualizacion(true);
});
