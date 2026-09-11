/* =========================================================
   ARRANQUE
   Lo último que se ejecuta. Deja la pantalla lista y
   comprueba la versión instalada.
   ========================================================= */

sincronizarBotonTema();
arrancarAnchoPanel();
aplicarNombreGuardado();

// Si al cerrar quedaba cuenta atrás de publicación, se retoma.
{const pendiente=leerEsperaGuardada();if(pendiente)empezarEspera(pendiente);}

// La copia de un ítem sobrevive a cerrar la aplicación.
estado.itemCopiado=leerCopiaGuardada();

// Si en una sesión anterior quedaron cambios de «Ajustes de la página»
// sin publicar, el botón de publicar debe salir ya encendido, sin tener
// que abrir la ventana de ajustes.
if(typeof hayAparienciaPendiente==='function'){
  hayAparienciaPendiente().then((hay)=>{ if(hay)marcarAparienciaSucia(true); }).catch(()=>{});
}

// Registra el service worker (para instalarse y funcionar sin
// conexión) y enseña las novedades si ha cambiado la versión.
arrancarVersion();