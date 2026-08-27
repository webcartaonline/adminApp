/* =========================================================
   ARRANQUE
   Lo último que se ejecuta. Deja la pantalla lista y pone
   en marcha la comprobación de actualizaciones.
   ========================================================= */

sincronizarBotonTema();
aplicarAjustes();

// Si al cerrar quedaba cuenta atrás de publicación, se retoma.
{const pendiente=leerEsperaGuardada();if(pendiente)empezarEspera(pendiente);}

// La copia de un ítem sobrevive a cerrar la aplicación.
estado.itemCopiado=leerCopiaGuardada();

// Comprobación de versión nueva, en segundo plano y sin molestar.
arrancarActualizaciones();
