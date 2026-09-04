/* =========================================================
   AJUSTES (lo compartido)
   Los datos de conexión (cuenta, repositorio, rama, ruta y
   token) se guardan en el navegador de cada cliente, no en
   los archivos de la aplicación. Por eso todos los clientes
   pueden compartir la misma dirección web sin mezclarse.

   Aquí solo está lo que necesitan las DOS páginas: leer y
   escribir esos datos. La pantalla donde se rellenan vive
   en ajustes.html y la maneja js/pagina-ajustes.js.
   ========================================================= */

function leerAjustes(){try{return JSON.parse(localStorage.getItem(CLAVE_AJUSTES))||{};}catch{return{};}}

function guardarAjustes(a){
  try{localStorage.setItem(CLAVE_AJUSTES,JSON.stringify(a));}catch{}
}

/* Datos de la web que se publica: nombre y dirección. Se guardan
   aparte porque una parte se averigua sola desde GitHub y la otra
   la puede escribir el usuario a mano. */
function leerSitio(){try{return JSON.parse(localStorage.getItem(CLAVE_SITIO))||{};}catch{return{};}}
function guardarSitio(s){try{localStorage.setItem(CLAVE_SITIO,JSON.stringify(s));}catch{}}

/* Pone el rótulo «Editor de …» con el nombre guardado. En las
   páginas que no tienen ese rótulo, solo cambia el título. */
function aplicarNombreGuardado(){aplicarNombreEditor(leerAjustes().nombre);}

/* Identificador del cliente: cuenta + repositorio + rama. Sirve para
   que la copia de la plantilla y los borradores de la vista previa de
   un local nunca se mezclen con los de otro. Lo usan las DOS páginas
   (el editor y los ajustes), por eso vive aquí, en lo compartido. */
function clienteActual(a){
  a=a||leerAjustes();
  return `${a.owner||''}/${a.repo||''}/${a.rama||'main'}`;
}