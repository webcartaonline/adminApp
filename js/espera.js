/* =========================================================
   ESPERA ENTRE PUBLICACIONES
   GitHub tarda un rato en desplegar la web. Si se publica
   otra vez antes de que termine, los dos despliegues se
   pisan. Así que tras publicar bien, el botón queda
   bloqueado 2 minutos y se enseña una cuenta atrás.
   El momento en que acaba se guarda en el navegador, para
   que recargar la página no salte la espera.
   ========================================================= */

let finEspera=0, relojEspera=null;

function enEspera(){return finEspera>Date.now();}

function leerEsperaGuardada(){
  try{const v=Number(localStorage.getItem(CLAVE_ESPERA))||0;
      return (v>Date.now()&&v-Date.now()<=MS_ESPERA)?v:0;}catch{return 0;}
}

function empezarEspera(hasta){
  finEspera=hasta||Date.now()+MS_ESPERA;
  try{localStorage.setItem(CLAVE_ESPERA,String(finEspera));}catch{}
  $('#espera').hidden=false;
  $('#btnPublicar').disabled=true;
  pintarEspera();
  clearInterval(relojEspera);
  relojEspera=setInterval(pintarEspera,250);
}

function pintarEspera(){
  const resta=finEspera-Date.now();
  if(resta<=0){terminarEspera();return;}
  const seg=Math.ceil(resta/1000);
  $('#esperaReloj').textContent=`${Math.floor(seg/60)}:${String(seg%60).padStart(2,'0')}`;
  $('#btnPublicar').title='Espera a que termine el despliegue anterior.';
}

function terminarEspera(){
  clearInterval(relojEspera);relojEspera=null;finEspera=0;
  try{localStorage.removeItem(CLAVE_ESPERA);}catch{}
  $('#espera').hidden=true;
  $('#esperaGlobo').hidden=true;
  $('#btnEsperaAyuda').setAttribute('aria-expanded','false');
  $('#btnPublicar').title='';
  if(estado.sucio)$('#btnPublicar').disabled=false;
}

/* Globo de ayuda "¿por qué hay que esperar?" */
function alternarGloboEspera(abrir){
  const g=$('#esperaGlobo');
  const ver=abrir??g.hidden;
  g.hidden=!ver;
  $('#btnEsperaAyuda').setAttribute('aria-expanded',String(ver));
}

$('#btnEsperaAyuda').addEventListener('click',(ev)=>{ev.stopPropagation();alternarGloboEspera();});
$('#btnEsperaCerrar').addEventListener('click',()=>alternarGloboEspera(false));
document.addEventListener('click',(ev)=>{
  if(!$('#esperaGlobo').hidden&&!ev.target.closest('#espera'))alternarGloboEspera(false);
});
document.addEventListener('keydown',(ev)=>{
  if(ev.key==='Escape'&&!$('#esperaGlobo').hidden)alternarGloboEspera(false);
});
