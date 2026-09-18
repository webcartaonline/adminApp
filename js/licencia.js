/* =========================================================
   LICENCIA
   El plan que ha contratado el cliente decide qué puede
   tocar dentro del editor.

   Los permisos de verdad los manda el SERVIDOR: al cargar
   la carta, el editor se los pregunta y los guarda en
   estado.licencia (ver publicar.js). Así el cliente no
   puede darse permisos a sí mismo tocando su carta, y el
   servidor rechaza de todos modos lo que no le toca.

   La tabla de abajo se conserva porque la ventana de
   «Ajustes de la página» todavía deduce el plan por su
   cuenta, y como referencia de qué lleva cada plan. Tiene
   que decir LO MISMO que el archivo de licencia guardado en
   el servidor.

   Si algún día cambia un plan, o nace uno nuevo, se toca
   aquí y en el servidor: el resto del editor solo pregunta
   «¿puedo enseñar esto?».
   ========================================================= */

/* Los códigos que identifican cada plan. Tienen que coincidir
   EXACTAMENTE (sin espacios de más) con lo que traiga el campo
   negocio.licencia del carta.json. */
const CODIGO_PLAN = {
  '5-20-211-2193-16'    : 'estatico',
  '21-2093-16'          : 'basico',
  '3-16-13-17-125-21-16': 'completo'
};

/* Qué deja ver y hacer cada plan dentro del editor:

     etiquetas          -> las notas del plato y la alerta del grupo
     imagenesDecorativas-> fondo de portada, bandas de sección y de
                           grupo, y las fuentes propias
     imagenMarca        -> el logotipo de la portada y el iconito de la
                           pestaña (img/logo.* e img/favicon.*)
     imagenItem         -> la foto que acompaña a cada plato
     idiomaExtra        -> un idioma además del principal (informativo:
                           los idiomas los declara el propio carta.json)
     publicar           -> puede aplicar de verdad los cambios en la web

   Regla del negocio: el ÚNICO plan que recorta cosas del editor es
   el Básico, que no lleva notas y alertas, ni fondos decorativos, ni
   idiomas extra; su propia marca (logotipo e iconito) sí la puede
   cambiar. Completo y Estático enseñan todas las opciones; el
   Estático, eso sí, no puede publicar: sirve como demostración para
   animar a subir de plan. */
const PERMISOS_PLAN = {
  estatico: { etiquetas:true,  imagenesDecorativas:true,  imagenMarca:true, imagenItem:true, idiomaExtra:true,  publicar:false },
  basico:   { etiquetas:false, imagenesDecorativas:false, imagenMarca:true, imagenItem:true, idiomaExtra:false, publicar:true  },
  completo: { etiquetas:true,  imagenesDecorativas:true,  imagenMarca:true, imagenItem:true, idiomaExtra:true,  publicar:true  }
};

/* El nombre del plan a partir de su código, o null si el código no
   lo reconocemos (mal escrito, vacío o ausente). */
function planDeLicencia(codigo){
  return CODIGO_PLAN[String(codigo ?? '').trim()] || null;
}

/* Los permisos de un plan concreto. Si el plan no existe, no se
   permite nada: mejor quedarse corto que enseñar de más. */
function permisosDePlan(plan){
  return PERMISOS_PLAN[plan] || {
    etiquetas:false, imagenesDecorativas:false, imagenMarca:false,
    imagenItem:false, idiomaExtra:false, publicar:false
  };
}

/* ¿Trae la carta una licencia que reconozcamos? Es lo que se
   comprueba ANTES de cargar nada: sin licencia válida, la carta
   no se abre. */
function licenciaValida(datos){
  return planDeLicencia(datos?.negocio?.licencia) !== null;
}

/* Resuelve la licencia de una carta ya descargada. Lo que devuelve
   se guarda en estado.licencia y el resto del editor lo consulta a
   través de los atajos de más abajo. */
function resolverLicencia(datos){
  const plan = planDeLicencia(datos?.negocio?.licencia);
  return { plan, permisos: permisosDePlan(plan) };
}

/* ---------- Atajos para el editor ----------
   Preguntan por la licencia que hay cargada ahora mismo. Se
   protegen por si se llaman desde un sitio donde no existe el
   estado (por ejemplo, el marco de «Ajustes de la página», que
   calcula el plan por su cuenta): en ese caso no enseñan nada. */
function permisoActual(nombre){
  if (typeof estado === 'undefined' || !estado || !estado.licencia) return false;
  return !!estado.licencia.permisos?.[nombre];
}
function puedeEtiquetas(){           return permisoActual('etiquetas'); }
function puedeImagenesDecorativas(){ return permisoActual('imagenesDecorativas'); }
function puedeImagenMarca(){         return permisoActual('imagenMarca'); }
function puedeImagenItem(){          return permisoActual('imagenItem'); }
function puedePublicar(){            return permisoActual('publicar'); }