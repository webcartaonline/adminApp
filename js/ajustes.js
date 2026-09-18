/* =========================================================
   AJUSTES (lo compartido)
   Los datos de conexión se guardan en el navegador de cada
   cliente, no en los archivos de la aplicación. Por eso
   todos los clientes pueden compartir la misma dirección
   web sin mezclarse.

   Ahora hacen falta solo DOS datos: el nombre del negocio y
   su clave. El resto (dónde está el servidor, en qué
   carpeta vive cada cosa) lo sabe nube.js y va fijo en el
   código.

   Aquí solo está lo que necesitan las DOS páginas: leer y
   escribir esos datos. La pantalla donde se rellenan vive
   en ajustes.html y la maneja js/pagina-ajustes.js.
   ========================================================= */

/* ---------- Puente temporal ----------
   La pantalla de Ajustes todavía es la de GitHub: pide «Servicio»,
   «Cliente», «Rama», «Ruta» y «Token». Mientras se rehaga, el nombre
   del negocio se lee del campo «Cliente» y la clave del campo «Token».
   Así el editor ya funciona contra el servidor nuevo sin tocar esa
   pantalla. Cuando se rehaga, se borra esta tabla y sus dos usos. */
const CAMPOS_ANTIGUOS={cliente:'repo',clave:'token'};

/* Los dos datos de arriba se calculan al leer y NO se guardan, para
   que «Olvidar el token» siga borrando la clave de verdad. */
const CAMPOS_DERIVADOS=Object.keys(CAMPOS_ANTIGUOS);

function leerAjustesGuardados(){
  try{return JSON.parse(localStorage.getItem(CLAVE_AJUSTES))||{};}catch{return{};}
}

function leerAjustes(){
  const guardado=leerAjustesGuardados();
  const derivados={};
  for(const [nuevo,antiguo] of Object.entries(CAMPOS_ANTIGUOS)){
    derivados[nuevo]=String(guardado[nuevo]||guardado[antiguo]||'').trim();
  }
  return {...guardado,...derivados};
}

function guardarAjustes(a){
  const limpio={...a};
  for(const campo of CAMPOS_DERIVADOS)delete limpio[campo];
  try{localStorage.setItem(CLAVE_AJUSTES,JSON.stringify(limpio));}catch{}
}

/* Datos de la web que se publica: nombre y dirección. Se guardan
   aparte porque el usuario puede escribirlos a mano. */
function leerSitio(){try{return JSON.parse(localStorage.getItem(CLAVE_SITIO))||{};}catch{return{};}}
function guardarSitio(s){try{localStorage.setItem(CLAVE_SITIO,JSON.stringify(s));}catch{}}

/* Pone el rótulo «Editor de …» con el nombre guardado. En las
   páginas que no tienen ese rótulo, solo cambia el título. */
function aplicarNombreGuardado(){aplicarNombreEditor(leerAjustes().nombre);}

/* Identificador del cliente. Sirve para que la copia de la plantilla y
   los borradores de la vista previa de un local nunca se mezclen con
   los de otro. Ahora es el propio nombre del negocio, que es lo que lo
   identifica en el servidor. Lo usan las DOS páginas (el editor y los
   ajustes), por eso vive aquí, en lo compartido. */
function clienteActual(a){
  a=a||leerAjustes();
  return a.cliente||'';
}
