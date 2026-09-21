/* =========================================================
   ARRANQUE
   Lo último que se ejecuta. Deja la pantalla lista y
   comprueba la versión instalada.
   ========================================================= */

sincronizarBotonTema();
arrancarAnchoPanel();
aplicarNombreGuardado();

// La espera de dos minutos era cosa de GitHub, que tardaba en montar
// la web. Con el servidor de ahora el cambio se ve al momento, así que
// se quitó; si quedara guardada de una versión anterior, se borra.
try{localStorage.removeItem(CLAVE_ESPERA);}catch{}

// La copia de un ítem sobrevive a cerrar la aplicación.
estado.itemCopiado=leerCopiaGuardada();

// Si en una sesión anterior quedaron cambios de «Ajustes de la página»
// sin publicar, se apunta para que el botón de publicar se encienda en
// cuanto se traiga la carta (nunca antes: sin la carta no se puede
// publicar). Ver sincronizarBotonPublicar() en estado.js.
if(typeof hayAparienciaPendiente==='function'){
  hayAparienciaPendiente().then((hay)=>{ if(hay)marcarAparienciaSucia(true); }).catch(()=>{});
}

// Registra el service worker (para instalarse y funcionar sin
// conexión) y enseña las novedades si ha cambiado la versión.
arrancarVersion();