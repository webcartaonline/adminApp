/* =========================================================
   VISTA
   Reparte el trabajo de repintar la pantalla: o el editor
   (árbol + formularios) o las estadísticas.
   ========================================================= */

function pintarTodo(){
  const enEstadisticas=estado.vista==='estadisticas';
  $('#panelLateral').hidden=enEstadisticas;
  document.querySelector('.taller').classList.toggle('taller--ancho',enEstadisticas);
  $('#btnEstadisticas').textContent=enEstadisticas?'Volver al editor':'Estadísticas';
  if(enEstadisticas){pintarEstadisticas();}
  else{pintarArbol();pintarZona();}
}

$('#btnEstadisticas').addEventListener('click',()=>{
  estado.vista=estado.vista==='estadisticas'?'editor':'estadisticas';
  pintarTodo();
});
