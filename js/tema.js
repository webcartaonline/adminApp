/* =========================================================
   TEMA Y NOMBRE DEL EDITOR
   El color (claro/oscuro) y el rótulo "Editor de …" que
   sirve para saber en qué local estás.
   ========================================================= */

function aplicarNombreEditor(nombre){
  const n=(nombre||'').trim()||'la carta';
  $('#marcaNombre').textContent=n;
  document.title=`Editor de ${n}`;
}

function sincronizarBotonTema(){
  const oscuro=document.documentElement.getAttribute('data-tema')==='oscuro';
  const b=$('#btnTema');
  b.textContent=oscuro?'Modo claro':'Modo oscuro';
  b.setAttribute('aria-pressed',String(oscuro));
}

$('#btnTema').addEventListener('click',()=>{
  const ahora=document.documentElement.getAttribute('data-tema')==='oscuro'?'claro':'oscuro';
  try{localStorage.setItem(CLAVE_TEMA,ahora);}catch{}
  document.documentElement.setAttribute('data-tema',ahora);
  sincronizarBotonTema();
});
