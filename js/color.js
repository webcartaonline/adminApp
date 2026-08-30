/* =========================================================
   COLOR PRINCIPAL
   Deja que cada local elija el color de la aplicación: el
   fondo de la barra de arriba, los botones de acción, la
   sección marcada, el foco de las casillas…

   Se puede elegir un color único o un degradado de dos.
   Lo elegido se guarda en este navegador y se vuelve a
   aplicar al abrir, aunque se actualice la aplicación.

   Aquí están las cuentas y el guardado, que usan las dos
   páginas. La pantalla donde se elige está en ajustes.html
   y la maneja js/color-ui.js.

   Todo se hace moviendo variables de CSS: no toca ni el
   funcionamiento ni los datos de la carta.
   ========================================================= */

/* Los mismos valores que trae de fábrica css/base.css. Sirven
   para la vista previa y para el botón «Restaurar». */
const COLOR_DE_FABRICA = { modo:'degradado', c1:'#7A5CFB', c2:'#4C86FF' };

/* Variables que gobierna el color principal. Se apuntan aquí
   para poder quitarlas todas de golpe al restaurar. */
const COLOR_VARIABLES = ['--acento-1','--acento-2','--grad','--grad-barra','--barra-texto',
  '--acento-tenue','--glow','--sobre-acento','--acento-texto','--grad-texto',
  '--barra-velo','--barra-velo-mas','--barra-borde','--barra-borde-mas','--barra-sub',
  '--sobre-acento-velo','--acento-borde'];

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

  /* Si el color elegido es claro, la barra queda clara: entonces las
     veladuras y los bordes de dentro tienen que ser OSCUROS, porque en
     blanco sobre blanco no se vería nada (ni el subtítulo, ni el borde
     de los botones). */
  const barraClara=textoLegibleSobre(barMedio)!=='#FFFFFF';
  const velo=(x)=>barraClara?`rgba(0,0,0,${x})`:`rgba(255,255,255,${x})`;
  const sobreAcentoClaro=textoLegibleSobre(medio)==='#FFFFFF';

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
    '--grad-texto':'linear-gradient(135deg,'+textoAcento1+','+textoAcento+')',
    /* Veladuras y bordes de dentro de la barra, ya adaptados. */
    '--barra-velo':velo(barraClara?.05:.08),
    '--barra-velo-mas':velo(barraClara?.10:.18),
    '--barra-borde':velo(barraClara?.16:.22),
    '--barra-borde-mas':velo(barraClara?.30:.42),
    '--barra-sub':barraClara?'rgba(20,24,36,.62)':'rgba(243,245,255,.72)',
    '--sobre-acento-velo':sobreAcentoClaro?'rgba(255,255,255,.22)':'rgba(0,0,0,.14)',
    /* Filo del botón principal: imprescindible si el acento es casi
       blanco, porque si no se funde con el fondo. */
    '--acento-borde':componentesAColor(mezclarColor(medio,[10,14,26],.14))
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

/* Al cambiar de claro a oscuro hay que recalcular: la barra se
   hunde más en oscuro. Se vigila el atributo del tema para no
   tener que tocar tema.js. */
new MutationObserver(()=>{
  const g=leerColorGuardado();
  if(g)aplicarColor(g);
}).observe(document.documentElement,{attributes:true,attributeFilter:['data-tema']});
