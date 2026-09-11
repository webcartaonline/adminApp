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

/* El botón «Publicar cambios» se enciende SOLO si se cumplen tres cosas:
   no estamos en la espera de después de publicar, la carta está cargada
   (sin ella no hay nada que publicar y publicar daría error) y hay algo
   pendiente, sea de la carta o de «Ajustes de la página». Un único sitio
   decide esto para que los dos estados nunca se descuadren. */
function sincronizarBotonPublicar(){
  if(enEspera())return;   // durante la espera manda espera.js: el botón queda bloqueado
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