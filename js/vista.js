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
  // En estadísticas no hay panel de secciones, así que la barrita del
  // móvil también sobra: refrescarMigas() la apaga sola al ver el panel
  // escondido. En el editor ya se encarga pintarArbol().
  if(enEstadisticas){pintarEstadisticas();refrescarMigas();}
  else{pintarArbol();pintarZona();}
}

$('#btnEstadisticas').addEventListener('click',()=>{
  estado.vista=estado.vista==='estadisticas'?'editor':'estadisticas';
  pintarTodo();
});