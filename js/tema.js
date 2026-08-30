/* =========================================================
   TEMA Y NOMBRE DEL EDITOR
   El color (claro/oscuro) y el rótulo "Editor de …" que
   sirve para saber en qué local estás.

   Lo usan las dos páginas: el botón de claro/oscuro está en
   la barra de arriba de las dos, para tenerlo siempre a mano.
   ========================================================= */

/* El nombre se escribe en todos los huecos marcados con
   data-nombre-editor, que en cada página están en un sitio: en el
   editor es el título de la barra; en los ajustes, el subtítulo. */
function aplicarNombreEditor(nombre){
  const n=(nombre||'').trim()||'la carta';
  document.querySelectorAll('[data-nombre-editor]').forEach(e=>{e.textContent=n;});
  document.title=document.body.dataset.pagina==='ajustes'
    ? `Ajustes · Editor de ${n}`
    : `Editor de ${n}`;
}

function sincronizarBotonTema(){
  const oscuro=document.documentElement.getAttribute('data-tema')==='oscuro';
  const b=$('#btnTema');
  if(!b)return;
  b.textContent=oscuro?'Modo claro':'Modo oscuro';
  b.setAttribute('aria-pressed',String(oscuro));
}

$('#btnTema')?.addEventListener('click',()=>{
  const ahora=document.documentElement.getAttribute('data-tema')==='oscuro'?'claro':'oscuro';
  try{localStorage.setItem(CLAVE_TEMA,ahora);}catch{}
  document.documentElement.setAttribute('data-tema',ahora);
  sincronizarBotonTema();
});
