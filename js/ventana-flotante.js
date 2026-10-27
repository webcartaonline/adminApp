/* =========================================================
   VENTANA FLOTANTE
   El molde de las ventanas que flotan sobre el editor con el
   fondo atenuado: la de «Ajustes de la página» y la de la
   ventana emergente (el anuncio). Las dos tienen la misma
   cabecera, el mismo botón de cerrar y se cierran igual: con
   la X, con Esc o tocando fuera de la caja.

   Quien la usa solo pone lo de dentro, en «lienzo». El aspecto
   está en vista-previa/vista-previa.css (modificador vp--ajustes).

   Se oculta al cerrar, no se destruye: abrirla otra vez no
   pierde lo que hubiera dentro.
   ========================================================= */

/* ¿Hay un cuadro de diálogo abierto encima (la ventana de la foto, por
   ejemplo)? Entonces Esc es para él, no para la ventana de debajo. */
function hayDialogoEncima(){
  return !!document.querySelector('.modal:not([hidden])');
}

function crearVentanaFlotante({titulo,subtitulo,rotuloCerrar,alCerrar}){
  const capa=document.createElement('div');
  capa.className='vp vp--ajustes';
  capa.hidden=true;
  capa.innerHTML=`
    <div class="vp__ventana" role="dialog" aria-modal="true" aria-label="${escapar(titulo)}">
      <div class="vp__barra">
        <div class="vp__marca">
          <span class="vp__punto" aria-hidden="true"></span>
          <div class="vp__rotulos">
            <span class="vp__titulo">${escapar(titulo)}</span>
            <span class="vp__sub">${escapar(subtitulo)}</span>
          </div>
        </div>
        <button class="vp__cerrar" type="button" aria-label="${escapar(rotuloCerrar)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          <span>Cerrar</span>
        </button>
      </div>
      <div class="vp__lienzo"></div>
    </div>`;
  document.body.appendChild(capa);

  const abierta=()=>!capa.hidden;

  function abrir(){
    capa.hidden=false;
    document.documentElement.classList.add('vp-abierta');
  }

  function cerrar(){
    if(!abierta())return;
    capa.hidden=true;                 // se oculta, NO se recarga
    document.documentElement.classList.remove('vp-abierta');
    if(typeof alCerrar==='function')alCerrar();
  }

  capa.querySelector('.vp__cerrar').addEventListener('click',cerrar);
  // Solo cuenta el clic en el propio fondo atenuado, no el de dentro.
  capa.addEventListener('click',(ev)=>{ if(ev.target===capa)cerrar(); });
  // Se escucha en la fase de captura, ANTES que nadie: si hay un cuadro de
  // diálogo encima, ese Esc lo cierra él y esta ventana se queda abierta.
  window.addEventListener('keydown',(ev)=>{
    if(ev.key==='Escape'&&abierta()&&!hayDialogoEncima())cerrar();
  },true);

  return { lienzo:capa.querySelector('.vp__lienzo'), abrir, cerrar, abierta };
}
