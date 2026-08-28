/* =========================================================
   COLOR PRINCIPAL
   Deja que cada local elija el color de la aplicación: el
   fondo de la barra de arriba, los botones de acción, la
   sección marcada, el foco de las casillas…

   Se puede elegir un color único o un degradado de dos.
   Lo elegido se guarda en este navegador y se vuelve a
   aplicar al abrir, aunque se actualice la aplicación.

   Todo se hace moviendo variables de CSS: no toca ni el
   funcionamiento ni los datos de la carta.
   ========================================================= */

/* Los mismos valores que trae de fábrica css/base.css. Sirven
   para la vista previa y para el botón «Restaurar». */
const COLOR_DE_FABRICA = { modo:'degradado', c1:'#7A5CFB', c2:'#4C86FF' };

/* Variables que gobierna el color principal. Se apuntan aquí
   para poder quitarlas todas de golpe al restaurar. */
const COLOR_VARIABLES = ['--acento-1','--acento-2','--grad','--grad-barra','--barra-texto',
  '--acento-tenue','--glow','--sobre-acento','--acento-texto','--grad-texto'];

/* ---------- Cuentas de color ---------- */
function colorAComponentes(hex){
  let h=String(hex||'').trim().replace('#','');
  if(h.length===3)h=h.split('').map(c=>c+c).join('');
  if(!/^[0-9a-fA-F]{6}$/.test(h))h='7A5CFB';
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function componentesAColor(c){
  return '#'+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
/* Mezcla dos colores: 0 = todo el primero, 1 = todo el segundo. */
function mezclarColor(a,b,cuanto){return a.map((v,i)=>v+(b[i]-v)*cuanto);}

/* Luminosidad percibida (la fórmula estándar de accesibilidad). */
function luzDe(c){
  const s=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
  return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];
}
function contrasteEntre(a,b){
  const x=luzDe(a),y=luzDe(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
/* Blanco o casi negro encima del color dado. Se prefiere el blanco
   (es el aspecto de siempre) y solo se cambia a texto oscuro cuando
   el color es tan claro que el blanco dejaría de leerse. */
function textoLegibleSobre(c){
  return contrasteEntre(c,[255,255,255])>=3.3?"#FFFFFF":"#12151F";
}
/* Acerca el color al negro o al blanco hasta que se lea bien
   sobre el fondo de la aplicación (para usarlo COMO texto). */
function colorLegibleComoTexto(c,oscuro){
  const fondo=oscuro?[14,18,30]:[248,249,253];
  const hacia=oscuro?[255,255,255]:[10,14,26];
  let elegido=c;
  for(let paso=0;paso<=20;paso++){
    elegido=mezclarColor(c,hacia,paso/20);
    if(contrasteEntre(elegido,fondo)>=4.6)break;
  }
  return elegido;
}

/* ---------- De la elección a las variables de CSS ---------- */
function calcularVariablesColor(c1,c2,tema){
  const oscuro=tema==='oscuro';
  const a=colorAComponentes(c1), b=colorAComponentes(c2);
  const medio=mezclarColor(a,b,.5);
  const enteros=(c)=>c.map(v=>Math.round(v)).join(',');

  /* La barra de arriba se apoya en el color elegido; en el tema
     oscuro se hunde bastante para que no deslumbre. */
  const hondo=[8,11,20];
  const barA=mezclarColor(a,hondo,oscuro?.58:.10);
  const barB=mezclarColor(b,hondo,oscuro?.50:.04);
  const barMedio=mezclarColor(barA,barB,.5);

  const textoAcento=componentesAColor(colorLegibleComoTexto(medio,oscuro));
  const textoAcento1=componentesAColor(colorLegibleComoTexto(a,oscuro));

  return {
    '--acento-1':componentesAColor(a),
    '--acento-2':componentesAColor(b),
    '--grad':'linear-gradient(135deg,'+componentesAColor(a)+','+componentesAColor(b)+')',
    '--grad-barra':'linear-gradient(100deg,'+componentesAColor(barA)+' 0%,'+componentesAColor(barB)+' 100%)',
    '--barra-texto':textoLegibleSobre(barMedio)==='#FFFFFF'?'#F5F7FF':'#141824',
    '--acento-tenue':'rgba('+enteros(medio)+','+(oscuro?.20:.13)+')',
    '--glow':'0 10px 30px rgba('+enteros(medio)+','+(oscuro?.34:.32)+')',
    '--sobre-acento':textoLegibleSobre(medio),
    '--acento-texto':textoAcento,
    '--grad-texto':'linear-gradient(135deg,'+textoAcento1+','+textoAcento+')'
  };
}

/* ---------- Guardar y recuperar ---------- */
function leerColorGuardado(){
  try{
    const crudo=localStorage.getItem(CLAVE_COLOR);
    if(!crudo)return null;
    const v=JSON.parse(crudo);
    if(!v||!v.c1)return null;
    return v;
  }catch{return null;}
}

/* Aplica unos colores a la página. Sin argumentos vuelve a los
   de fábrica quitando las variables que hubiera puestas. */
function aplicarColor(cfg){
  const raiz=document.documentElement;
  if(!cfg){COLOR_VARIABLES.forEach(v=>raiz.style.removeProperty(v));return;}
  const tema=raiz.getAttribute('data-tema')==='oscuro'?'oscuro':'claro';
  const c2=cfg.modo==='solido'?cfg.c1:cfg.c2;
  const vars=calcularVariablesColor(cfg.c1,c2,tema);
  Object.keys(vars).forEach(k=>raiz.style.setProperty(k,vars[k]));
}

/* Guarda la elección y la deja aplicada. Se guardan también las
   variables ya calculadas de los dos temas: así el arranque las
   pinta al instante, sin parpadeo. */
function guardarColor(cfg){
  const c2=cfg.modo==='solido'?cfg.c1:cfg.c2;
  const paquete={modo:cfg.modo,c1:cfg.c1,c2:c2,
    vars:{claro:calcularVariablesColor(cfg.c1,c2,'claro'),
          oscuro:calcularVariablesColor(cfg.c1,c2,'oscuro')}};
  try{localStorage.setItem(CLAVE_COLOR,JSON.stringify(paquete));}catch{}
  aplicarColor(paquete);
}
function olvidarColor(){
  try{localStorage.removeItem(CLAVE_COLOR);}catch{}
  aplicarColor(null);
}

/* ---------- La ventana de elegir color ---------- */
let colorEnEdicion={modo:COLOR_DE_FABRICA.modo,c1:COLOR_DE_FABRICA.c1,c2:COLOR_DE_FABRICA.c2};

function pintarVistaPreviaColor(){
  const c2=colorEnEdicion.modo==='solido'?colorEnEdicion.c1:colorEnEdicion.c2;
  const vars=calcularVariablesColor(colorEnEdicion.c1,c2,
    document.documentElement.getAttribute('data-tema')==='oscuro'?'oscuro':'claro');

  const muestra=$('#colorPrevia');
  muestra.style.background=vars['--grad-barra'];
  muestra.style.color=vars['--barra-texto'];
  const boton=$('#colorPreviaBoton');
  boton.style.background=vars['--grad'];
  boton.style.color=vars['--sobre-acento'];
  boton.style.boxShadow=vars['--glow'];

  $('#colorC1').value=colorEnEdicion.c1;
  $('#colorC2').value=c2;
  $('#colorSegundo').hidden=colorEnEdicion.modo==='solido';
  $('#colorModoSolido').setAttribute('aria-pressed',String(colorEnEdicion.modo==='solido'));
  $('#colorModoDegradado').setAttribute('aria-pressed',String(colorEnEdicion.modo==='degradado'));
}

function abrirColor(){
  const guardado=leerColorGuardado();
  colorEnEdicion=guardado
    ? {modo:guardado.modo,c1:guardado.c1,c2:guardado.c2}
    : {modo:COLOR_DE_FABRICA.modo,c1:COLOR_DE_FABRICA.c1,c2:COLOR_DE_FABRICA.c2};
  pintarVistaPreviaColor();
  $('#modalColor').hidden=false;
}
function cerrarColor(){$('#modalColor').hidden=true;}

$('#btnColor').addEventListener('click',abrirColor);
$('#btnColorCerrar').addEventListener('click',cerrarColor);
$('#modalColor').addEventListener('click',(ev)=>{if(ev.target===$('#modalColor'))cerrarColor();});
document.addEventListener('keydown',(ev)=>{
  if(ev.key==='Escape'&&!$('#modalColor').hidden)cerrarColor();
});

$('#colorModoSolido').addEventListener('click',()=>{colorEnEdicion.modo='solido';pintarVistaPreviaColor();});
$('#colorModoDegradado').addEventListener('click',()=>{colorEnEdicion.modo='degradado';pintarVistaPreviaColor();});
$('#colorC1').addEventListener('input',(ev)=>{colorEnEdicion.c1=ev.target.value;pintarVistaPreviaColor();});
$('#colorC2').addEventListener('input',(ev)=>{colorEnEdicion.c2=ev.target.value;pintarVistaPreviaColor();});

/* Combinaciones hechas, para quien no quiera pelearse con la rueda. */
$('#colorSugerencias').addEventListener('click',(ev)=>{
  const s=ev.target.closest('[data-color-1]');
  if(!s)return;
  colorEnEdicion={modo:s.dataset.color2?'degradado':'solido',
    c1:s.dataset.color1,c2:s.dataset.color2||s.dataset.color1};
  pintarVistaPreviaColor();
});

$('#btnColorRestaurar').addEventListener('click',()=>{
  colorEnEdicion={modo:COLOR_DE_FABRICA.modo,c1:COLOR_DE_FABRICA.c1,c2:COLOR_DE_FABRICA.c2};
  olvidarColor();
  pintarVistaPreviaColor();
  avisar('Color original restaurado.','bien');
});
$('#btnColorGuardar').addEventListener('click',()=>{
  guardarColor(colorEnEdicion);
  cerrarColor();
  avisar('Color principal guardado.','bien');
});

/* Al cambiar de claro a oscuro hay que recalcular: la barra se
   hunde más en oscuro. Se vigila el atributo del tema para no
   tener que tocar tema.js. */
new MutationObserver(()=>{
  const g=leerColorGuardado();
  if(g)aplicarColor(g);
}).observe(document.documentElement,{attributes:true,attributeFilter:['data-tema']});
