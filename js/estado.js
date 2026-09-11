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
  sha:null,                  // "huella" del archivo en GitHub, para no pisar cambios ajenos
  idiomas:['es'],
  imagenes:false,           // ¿esta carta lleva fotos? lo dice negocio.imagenes
  estadisticas:null,
  vista:'editor',            // 'editor' | 'estadisticas'
  seccionActiva:null, grupoActivo:null,
  sucio:false,               // ¿hay cambios sin publicar?
  aparienciaSucia:false,     // ¿hay cambios de «Ajustes de la página» sin publicar?
  imagenesPendientes:{},     // ruta en el repo -> {base64, bytes, ancho, alto, previa}
  imagenesPorBorrar:[],      // rutas en el repo que hay que borrar al publicar
  imagenesHuerfanas:new Set(),// rutas que siguen en el repo pero la carta ya no usa
  expandidas:new Set(),      // ids de secciones abiertas en el árbol de la izquierda
  itemCopiado:null           // copia de un ítem, lista para pegar en otro grupo
};

/* Marca que hay cambios pendientes y desbloquea el botón de publicar
   (salvo que estemos dentro de los 2 minutos de espera). */
function marcarSucio(){
  estado.sucio=true;
  if(!enEspera())$('#btnPublicar').disabled=false;
}

/* Lo mismo, pero para los cambios de «Ajustes de la página». Esa ventana
   vive en un marco aparte y avisa por mensajes cuando tiene (o deja de
   tener) cambios sin publicar. El botón de publicar se enciende si hay
   cambios EN CUALQUIERA de los dos sitios: la carta o la apariencia. */
function marcarAparienciaSucia(sucia){
  estado.aparienciaSucia=!!sucia;
  if(enEspera())return;                 // la espera manda; ya lo gestiona espera.js
  $('#btnPublicar').disabled=!(estado.sucio||estado.aparienciaSucia);
}

/* ---------- Accesores ---------- */
function seccionActual(){return (estado.datos?.secciones??[]).find(s=>s.id===estado.seccionActiva);}
function grupoActual(){const s=seccionActual();return (s?.grupos??[]).find(g=>g.id===estado.grupoActivo);}