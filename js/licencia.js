/* =========================================================
   LICENCIA
   El plan que ha contratado el cliente decide qué puede
   tocar dentro del editor.

   Los permisos de verdad los manda el SERVIDOR: al cargar
   la carta, el editor se los pregunta y los guarda en
   estado.licencia (ver publicar.js). Así el cliente no
   puede darse permisos a sí mismo tocando su carta, y el
   servidor rechaza de todos modos lo que no le toca.

   Qué lleva cada plan está escrito en un solo sitio: el
   archivo de licencia de ese negocio, en el servidor. Aquí
   solo quedan los atajos con los que el editor pregunta
   «¿puedo enseñar esto?». Los permisos se llaman:

     etiquetas           -> las notas del plato y la alerta del grupo
     imagenesDecorativas -> fondo de portada, bandas y fuentes propias
     imagenMarca         -> el logotipo y el iconito de la pestaña
     imagenItem          -> la foto de cada plato
     idiomaExtra         -> un idioma además del principal
     publicar            -> puede aplicar de verdad los cambios
   ========================================================= */

/* ---------- Atajos para el editor ----------
   Preguntan por la licencia que hay cargada ahora mismo. Se
   protegen por si se llaman desde un sitio donde no existe el
   estado (por ejemplo, el marco de «Ajustes de la página», que
   pregunta sus permisos por su cuenta): allí no enseñan nada. */
function permisoActual(nombre){
  if (typeof estado === 'undefined' || !estado || !estado.licencia) return false;
  return !!estado.licencia.permisos?.[nombre];
}
function puedeEtiquetas(){           return permisoActual('etiquetas'); }
function puedeImagenesDecorativas(){ return permisoActual('imagenesDecorativas'); }
function puedeImagenMarca(){         return permisoActual('imagenMarca'); }
function puedeImagenItem(){          return permisoActual('imagenItem'); }
function puedePublicar(){            return permisoActual('publicar'); }