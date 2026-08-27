/* =========================================================
   AJUSTES
   Los datos de conexión (cuenta, repositorio, rama, ruta y
   token) se guardan en el navegador de cada cliente, no en
   los archivos de la aplicación. Por eso todos los clientes
   pueden compartir la misma dirección web sin mezclarse.
   ========================================================= */

function leerAjustes(){try{return JSON.parse(localStorage.getItem(CLAVE_AJUSTES))||{};}catch{return{};}}

function aplicarAjustes(){
  const a=leerAjustes();
  $('#cfgNombre').value=a.nombre||'';
  $('#cfgOwner').value=a.owner||''; $('#cfgRepo').value=a.repo||'';
  $('#cfgRama').value=a.rama||''; $('#cfgRuta').value=a.ruta||'carta.json';
  $('#cfgToken').value=a.token||'';
  aplicarNombreEditor(a.nombre);
  if(a.owner&&a.repo&&a.token)$('#ajustes').hidden=true;
}

$('#btnGuardarCfg').addEventListener('click',()=>{
  const nombre=$('#cfgNombre').value.trim();
  localStorage.setItem(CLAVE_AJUSTES,JSON.stringify({
    nombre,
    owner:$('#cfgOwner').value.trim(),repo:$('#cfgRepo').value.trim(),
    rama:$('#cfgRama').value.trim()||'main',ruta:$('#cfgRuta').value.trim()||'carta.json',
    token:$('#cfgToken').value.trim()
  }));
  aplicarNombreEditor(nombre);
  avisar('Ajustes guardados en este navegador.','bien');
});

$('#btnOlvidarToken').addEventListener('click',()=>{
  const a=leerAjustes();delete a.token;localStorage.setItem(CLAVE_AJUSTES,JSON.stringify(a));
  $('#cfgToken').value='';avisar('Token borrado de este navegador.','bien');
});

$('#btnAjustes').addEventListener('click',()=>{$('#ajustes').hidden=!$('#ajustes').hidden;});
