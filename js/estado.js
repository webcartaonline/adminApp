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

/* ---------- Accesores ---------- */
function seccionActual(){return (estado.datos?.secciones??[]).find(s=>s.id===estado.seccionActiva);}
function grupoActual(){const s=seccionActual();return (s?.grupos??[]).find(g=>g.id===estado.grupoActivo);}