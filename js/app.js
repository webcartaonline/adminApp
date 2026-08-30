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

// Registra el service worker (para instalarse y funcionar sin
// conexión) y enseña las novedades si ha cambiado la versión.
arrancarVersion();
