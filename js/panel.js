/* =========================================================
   PANEL LATERAL
   Aquí vive todo lo que tiene que ver con tener el panel de
   secciones siempre a mano:

   1. El ancho (la rayita que se arrastra), solo en pantalla
      ancha.
   2. Que el panel se quede pegado bajo la barra superior en
      pantalla ancha, para no tener que subir del todo para
      cambiar de grupo.
   3. En el móvil, donde el panel va arriba de la página, una
      barrita fija que dice en qué sección y grupo estás y que
      sube a la lista al pulsarla.

   ---------------------------------------------------------
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

/* =========================================================
   ALTO DE LA BARRA SUPERIOR
   La barra de arriba va pegada y su alto cambia solo: en el
   móvil los botones se reparten en varias filas y, cuando hay
   cuenta atrás, crece un poco más. Lo medimos y lo dejamos en
   una variable de CSS, que es lo que usan el panel pegado y la
   barrita de «dónde estoy» para colocarse justo debajo.
   ========================================================= */
let altoBarra=0;

function medirBarra(){
  const barra=document.querySelector('.barra');
  if(!barra)return;
  altoBarra=Math.round(barra.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--alto-barra',altoBarra+'px');
}

medirBarra();
if(window.ResizeObserver){
  new ResizeObserver(()=>{medirBarra();repasarMigas();})
    .observe(document.querySelector('.barra'));
}

/* =========================================================
   BARRITA DE «DÓNDE ESTOY» (SOLO MÓVIL)
   Aparece cuando el panel de secciones se queda por encima de
   la pantalla y desaparece en cuanto se vuelve a ver.

   Se ha elegido «subir a la lista» en vez de desplegar la lista
   encima del contenido: al desplegarla haría falta sacarla del
   sitio, tapar el editor y controlar cuándo se cierra, y en el
   móvil eso da problemas (saltos de la página, listas que se
   desplazan dentro de otra lista, la barra del navegador que
   aparece y desaparece). Subir a la lista son los mismos dos
   toques y no puede fallar. Para compensar, al elegir sección o
   grupo se baja solo al editor: así no hay que pasar cada vez
   por encima de toda la lista.
   ========================================================= */
const MOV_SUAVE = (window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)
  ? 'auto' : 'smooth';

/* Escribe los nombres de la sección y el grupo en la barrita. Se llama
   cada vez que se repinta el árbol (también al cambiar un nombre). */
function refrescarMigas(){
  const barrita=$('#migas');
  if(!barrita)return;
  const nombreDe=(o)=>valorTexto(o.nombre,estado.idiomas[0])||'(sin nombre)';
  const sec=seccionActual(), gru=grupoActual();
  $('#migasSeccion').textContent = sec?nombreDe(sec):'';
  const eGrupo=$('#migasGrupo');
  eGrupo.textContent = gru?nombreDe(gru):'';
  eGrupo.hidden = !gru;
  repasarMigas();
}

/* Decide si la barrita se ve o no. Se mira dónde acaba el panel: si su
   final ha quedado por encima de la barra superior, es que ya no se ve. */
function repasarMigas(){
  const barrita=$('#migas');
  if(!barrita)return;
  const panel=$('#panelLateral');
  let fuera=true;
  if(!hayPanelLateral() && !panel.hidden && estado.seccionActiva){
    fuera = panel.getBoundingClientRect().bottom > altoBarra+4;
  }
  barrita.toggleAttribute('data-fuera',fuera);
  barrita.setAttribute('aria-hidden',String(fuera));
  barrita.tabIndex = fuera?-1:0;
}

/* Al desplazar la página se repasa una sola vez por fotograma: así no se
   nota ni en móviles justitos. */
let repasoPedido=false;
window.addEventListener('scroll',()=>{
  if(repasoPedido)return;
  repasoPedido=true;
  requestAnimationFrame(()=>{repasoPedido=false;repasarMigas();});
},{passive:true});

window.addEventListener('resize',()=>{medirBarra();repasarMigas();});

/* Pulsar la barrita: arriba del todo, donde está la lista. */
$('#migas').addEventListener('click',()=>{
  window.scrollTo({top:0,behavior:MOV_SUAVE});
});

/* Y al elegir sección o grupo en el móvil, se baja al editor.
   Se espera a que la pantalla esté repintada para medir bien. */
document.addEventListener('click',(ev)=>{
  if(hayPanelLateral())return;
  if(!ev.target.closest('.nodo'))return;
  requestAnimationFrame(()=>requestAnimationFrame(bajarAlEditor));
});

function bajarAlEditor(){
  const zona=$('#zona');
  if(!zona)return;
  const altoBarrita=$('#migas').offsetHeight||0;
  const destino=zona.getBoundingClientRect().top+window.scrollY-(altoBarra+altoBarrita+10);
  window.scrollTo({top:Math.max(0,destino),behavior:MOV_SUAVE});
}