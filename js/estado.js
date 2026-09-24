/* =========================================================
   ESTADO
   Todo lo que la aplicación tiene "en la cabeza" mientras
   está abierta: la carta cargada, qué sección se está
   editando, qué fotos esperan a subirse…
   Nada de esto se guarda solo: se pierde al cerrar si no se
   ha publicado.
   ========================================================= */

const estado = {
  datos:null,                // la carta entera, tal cual está en carta.json
  licencia:null,             // plan y permisos, tal y como los manda el servidor
  vista:'editor',
  idiomas:['es'],
  imagenes:false,           // ¿su plan incluye fotos? lo dice la licencia (imagenes.js)
  seccionActiva:null, grupoActivo:null,
  sucio:false,               // ¿hay cambios sin publicar?
  aparienciaSucia:false,     // ¿hay cambios de «Ajustes de la página» sin publicar?
  imagenesPendientes:{},     // ruta de la foto -> {base64, bytes, ancho, alto, previa}
  imagenesPorBorrar:[],      // rutas de fotos que hay que borrar al publicar
  expandidas:new Set(),      // ids de secciones abiertas en el árbol de la izquierda
  itemCopiado:null           // copia de un ítem, lista para pegar en otro grupo
};

/* El botón «Publicar cambios» se enciende SOLO si se cumplen dos cosas:
   que la carta esté cargada (sin ella no hay nada que publicar) y que
   haya algo pendiente, sea de la carta o de «Ajustes de la página». Un
   único sitio decide esto para que los dos estados nunca se descuadren. */
function sincronizarBotonPublicar(){
  const hayCambios=estado.sucio||estado.aparienciaSucia;
  $('#btnPublicar').disabled=!(estado.datos&&hayCambios);
}

/* Marca que hay cambios de la carta sin publicar y refresca el botón. */
function marcarSucio(){
  estado.sucio=true;
  sincronizarBotonPublicar();
}

/* Lo mismo, pero para los cambios de «Ajustes de la página». Esa ventana
   vive en un marco aparte y avisa por mensajes cuando tiene (o deja de
   tener) cambios sin publicar. El botón se enciende si hay cambios en
   CUALQUIERA de los dos sitios, pero nunca antes de traer la carta. */
function marcarAparienciaSucia(sucia){
  estado.aparienciaSucia=!!sucia;
  sincronizarBotonPublicar();
}

/* ---------- Accesores ---------- */
function seccionActual(){return (estado.datos?.secciones??[]).find(s=>s.id===estado.seccionActiva);}
function grupoActual(){const s=seccionActual();return (s?.grupos??[]).find(g=>g.id===estado.grupoActivo);}