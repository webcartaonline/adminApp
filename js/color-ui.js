/* =========================================================
   SELECTOR DE COLOR (pantalla)
   La parte visible de elegir el color principal. Antes era
   una ventana emergente sobre el editor; ahora vive dentro
   del apartado «Personalización» de la página de ajustes.

   Las cuentas de color están en js/color.js.
   ========================================================= */

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

/* Deja los mandos como está el color guardado ahora mismo. Se llama
   al abrir la página y al desplegar el apartado, para que nunca
   enseñe una elección a medias de la vez anterior. */
function sincronizarColorUI(){
  const guardado=leerColorGuardado();
  colorEnEdicion=guardado
    ? {modo:guardado.modo,c1:guardado.c1,c2:guardado.c2}
    : {modo:COLOR_DE_FABRICA.modo,c1:COLOR_DE_FABRICA.c1,c2:COLOR_DE_FABRICA.c2};
  pintarVistaPreviaColor();
}

$('#colorModoSolido').addEventListener('click',()=>{colorEnEdicion.modo='solido';pintarVistaPreviaColor();});
$('#colorModoDegradado').addEventListener('click',()=>{colorEnEdicion.modo='degradado';pintarVistaPreviaColor();});
$('#colorC1').addEventListener('input',(ev)=>{colorEnEdicion.c1=ev.target.value;pintarVistaPreviaColor();});
$('#colorC2').addEventListener('input',(ev)=>{colorEnEdicion.c2=ev.target.value;pintarVistaPreviaColor();});

/* Combinaciones hechas, para quien no quiera pelearse con la rueda. */
$('#colorSugerencias').addEventListener('click',(ev)=>{
  const s=ev.target.closest('[data-color-1]');
  if(!s)return;
  /* Ojo: cuando detrás del guion va un número, dataset no sirve
     (data-color-1 NO es s.dataset.color1). Se leen a mano. */
  const uno=s.getAttribute('data-color-1');
  const dos=s.getAttribute('data-color-2');
  colorEnEdicion={modo:dos?'degradado':'solido',c1:uno,c2:dos||uno};
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
  avisar('Color principal guardado.','bien');
});

/* Si se cambia de claro a oscuro con el selector delante, la vista
   previa tiene que rehacerse: la barra se hunde más en oscuro. */
new MutationObserver(pintarVistaPreviaColor)
  .observe(document.documentElement,{attributes:true,attributeFilter:['data-tema']});
