/* =========================================================
   ANCHO DEL PANEL LATERAL
   La rayita que separa el panel de la zona de trabajo se
   puede arrastrar para darle más o menos sitio a la lista
   de secciones. Lo que se elija se guarda en este navegador.

   Solo funciona en pantalla ancha: por debajo de 840 px el
   panel se coloca arriba del todo, en una sola columna, y
   estirarlo no significaría nada. Ahí el divisor se esconde
   (lo hace el CSS) y estas funciones no hacen nada.

   Es un ajuste de aspecto: no toca los datos de la carta.
   ========================================================= */

const PANEL_MIN = 210;   // por debajo, los nombres no se leen
const PANEL_MAX = 560;   // por encima, la zona de trabajo se queda sin sitio
const PANEL_ANCHO_MINIMO_PANTALLA = 841;  // igual que el @media del CSS

/* ¿Estamos en una pantalla donde el panel va al lado? */
function hayPanelLateral(){
  return window.matchMedia(`(min-width:${PANEL_ANCHO_MINIMO_PANTALLA}px)`).matches;
}

/* El máximo real depende de la ventana: en una pantalla pequeña no
   dejamos que el panel se coma la zona de trabajo. */
function topeDelPanel(){
  return Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.round(window.innerWidth*0.45)));
}
function encajarAncho(px){
  return Math.round(Math.max(PANEL_MIN, Math.min(topeDelPanel(), px)));
}

function leerAnchoPanelGuardado(){
  try{
    const v=parseInt(localStorage.getItem(CLAVE_PANEL_ANCHO),10);
    return Number.isFinite(v)?v:null;
  }catch{return null;}
}

/* Pone el ancho. Sin argumento vuelve al de por defecto (el que
   manda el CSS según el tamaño de la pantalla). */
function aplicarAnchoPanel(px){
  const raiz=document.documentElement;
  if(px==null){raiz.style.removeProperty('--panel-usuario');return;}
  raiz.style.setProperty('--panel-usuario',encajarAncho(px)+'px');
}

function guardarAnchoPanel(px){
  const ancho=encajarAncho(px);
  try{localStorage.setItem(CLAVE_PANEL_ANCHO,String(ancho));}catch{}
  aplicarAnchoPanel(ancho);
  sincronizarSeparador(ancho);
}

/* Para quien navegue con el teclado o con lector de pantalla. */
function sincronizarSeparador(ancho){
  const s=$('#separador');
  s.setAttribute('aria-valuenow',String(Math.round(ancho)));
  s.setAttribute('aria-valuemin',String(PANEL_MIN));
  s.setAttribute('aria-valuemax',String(topeDelPanel()));
}

function anchoActualDelPanel(){
  return $('#panelLateral').getBoundingClientRect().width;
}

/* ---------- Arrastrar ----------
   Con eventos de puntero: vale igual para ratón, lápiz o dedo. */
let arrastreDesdeX=0, arrastreAnchoInicial=0;

function alMoverElSeparador(ev){
  const nuevo=arrastreAnchoInicial+(ev.clientX-arrastreDesdeX);
  aplicarAnchoPanel(nuevo);
  sincronizarSeparador(encajarAncho(nuevo));
}

function alSoltarElSeparador(ev){
  const s=$('#separador');
  s.removeAttribute('data-arrastrando');
  document.body.removeAttribute('data-redimensionando');
  window.removeEventListener('pointermove',alMoverElSeparador);
  window.removeEventListener('pointerup',alSoltarElSeparador);
  window.removeEventListener('pointercancel',alSoltarElSeparador);
  try{s.releasePointerCapture(ev.pointerId);}catch{}
  guardarAnchoPanel(anchoActualDelPanel());
}

$('#separador').addEventListener('pointerdown',(ev)=>{
  if(!hayPanelLateral())return;
  ev.preventDefault();
  const s=$('#separador');
  arrastreDesdeX=ev.clientX;
  arrastreAnchoInicial=anchoActualDelPanel();
  s.setAttribute('data-arrastrando','');
  document.body.setAttribute('data-redimensionando','');
  try{s.setPointerCapture(ev.pointerId);}catch{}
  window.addEventListener('pointermove',alMoverElSeparador);
  window.addEventListener('pointerup',alSoltarElSeparador);
  window.addEventListener('pointercancel',alSoltarElSeparador);
});

/* Flechas del teclado, y doble clic para dejarlo como estaba. */
$('#separador').addEventListener('keydown',(ev)=>{
  if(!hayPanelLateral())return;
  const salto=ev.shiftKey?40:10;
  if(ev.key==='ArrowLeft'){ev.preventDefault();guardarAnchoPanel(anchoActualDelPanel()-salto);}
  else if(ev.key==='ArrowRight'){ev.preventDefault();guardarAnchoPanel(anchoActualDelPanel()+salto);}
  else if(ev.key==='Home'){ev.preventDefault();guardarAnchoPanel(PANEL_MIN);}
  else if(ev.key==='End'){ev.preventDefault();guardarAnchoPanel(topeDelPanel());}
});
$('#separador').addEventListener('dblclick',()=>{
  if(!hayPanelLateral())return;
  try{localStorage.removeItem(CLAVE_PANEL_ANCHO);}catch{}
  aplicarAnchoPanel(null);
  sincronizarSeparador(anchoActualDelPanel());
});

/* Si la ventana se hace pequeña, el ancho guardado puede quedarse
   fuera de rango: se vuelve a encajar (sin perder lo guardado). */
window.addEventListener('resize',()=>{
  if(!hayPanelLateral())return;
  const guardado=leerAnchoPanelGuardado();
  if(guardado==null)return;
  aplicarAnchoPanel(guardado);
  sincronizarSeparador(encajarAncho(guardado));
});

/* Al arrancar: se recupera lo guardado (si lo hay). */
function arrancarAnchoPanel(){
  const guardado=leerAnchoPanelGuardado();
  if(guardado!=null)aplicarAnchoPanel(guardado);
  sincronizarSeparador(anchoActualDelPanel());
}
