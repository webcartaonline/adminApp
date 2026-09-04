/* =========================================================
   PUENTE DE LA VISTA PREVIA
   Este archivo NO forma parte del editor ni de la plantilla:
   se cuela dentro del marco aislado (el iframe) donde se pinta
   la vista previa, y se ejecuta ANTES que el carta.js de la
   plantilla.

   Su único trabajo es engañar amablemente a la plantilla para
   que, en lugar de bajarse la carta y la apariencia publicadas
   de internet, use los datos que el cliente está editando en
   este momento (que el editor ha dejado preparados en
   window.__VP__). Así la plantilla no se toca de ninguna
   manera: funciona igual que en la web real, pero con los
   cambios sin publicar.

   También silencia el envío de estadísticas: mirar la vista
   previa no debe contar como una visita real.
   ========================================================= */
(function () {
  const VP = window.__VP__ || {};
  const datos = VP.datos || null;
  const apariencia = VP.apariencia || null;

  function respuestaJson(objeto, ok) {
    return new Response(JSON.stringify(objeto), {
      status: ok ? 200 : 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /* Interceptamos las descargas de la plantilla. Solo nos interesan
     dos: la carta y la apariencia. Cualquier otra (por ejemplo el
     envío de estadísticas a un Worker) se responde en vacío, porque
     en una vista previa no tiene sentido salir a internet. */
  window.fetch = function (recurso) {
    let url = '';
    try { url = String((recurso && recurso.url) || recurso || ''); } catch (e) { url = ''; }

    if (/carta\.json(\?|$)/.test(url)) {
      return Promise.resolve(respuestaJson(datos, !!datos));
    }
    if (/apariencia\.json(\?|$)/.test(url)) {
      return Promise.resolve(respuestaJson(apariencia || {}, !!apariencia));
    }
    return Promise.resolve(new Response(null, { status: 204 }));
  };

  /* Las estadísticas suelen mandarse con sendBeacon; lo anulamos. */
  if (navigator.sendBeacon) {
    navigator.sendBeacon = function () { return true; };
  }
})();