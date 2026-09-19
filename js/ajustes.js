/* =========================================================
   AJUSTES (lo compartido)
   Los datos de conexión se guardan en el navegador de cada
   cliente, no en los archivos de la aplicación. Por eso
   todos los clientes pueden compartir la misma dirección
   web sin mezclarse.

   Hacen falta solo DOS datos: el nombre del negocio y su
   clave. El resto (dónde está el servidor, en qué carpeta
   vive cada cosa) lo sabe nube.js y va fijo en el código.

   Aquí solo está lo que necesitan las DOS páginas: leer y
   escribir esos datos. La pantalla donde se rellenan vive
   en ajustes.html y la maneja js/pagina-ajustes.js.
   ========================================================= */

/* ---------- Los dos datos de la conexión ----------
   Antes esta pantalla era la de GitHub y pedía «Servicio», «Cliente»,
   «Rama», «Ruta» y «Token». Quien venga de aquella época todavía tiene
   guardados aquellos nombres: el negocio donde ponía «Cliente» y la
   clave donde ponía «Token». Se siguen leyendo para que nadie tenga
   que volver a escribirlos, y en cuanto se guarda algo se quedan con
   su nombre de ahora. Lo de GitHub no se guarda nunca más. */
const CAMPOS_ANTIGUOS={cliente:'repo',clave:'token'};

/* Lo que fue de GitHub y ya no pinta nada. */
const CAMPOS_DE_GITHUB=['owner','repo','rama','ruta','token'];

function leerAjustesGuardados(){
  try{return JSON.parse(localStorage.getItem(CLAVE_AJUSTES))||{};}catch{return{};}
}

function leerAjustes(){
  const guardado=leerAjustesGuardados();
  const dosDatos={};
  for(const [nuevo,antiguo] of Object.entries(CAMPOS_ANTIGUOS)){
    dosDatos[nuevo]=String(guardado[nuevo]||guardado[antiguo]||'').trim();
  }
  return {...guardado,...dosDatos};
}

function guardarAjustes(a){
  const limpio={...a};
  for(const campo of CAMPOS_DE_GITHUB)delete limpio[campo];
  /* Un campo vacío se borra en vez de guardarse en blanco: así
     «Olvidar la clave» la quita de verdad. */
  for(const campo of Object.keys(CAMPOS_ANTIGUOS)){
    if(!String(limpio[campo]||'').trim())delete limpio[campo];
  }
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
