/* =========================================================
   ÁRBOL LATERAL
   La lista de secciones con sus grupos dentro.
   Los iconos van escritos aquí en vez de cargarse de fuera,
   para que la aplicación funcione también sin internet.
   Heredan el color del texto, así se ven bien en claro, en
   oscuro y cuando la fila está seleccionada.
   ========================================================= */

const SVG_TRIANGULO=
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 4.6 17.8 12l-9.3 7.4z"/></svg>`;
const trazo=(d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SVG_CARPETA=trazo(`<path d="M3 8.2A2.2 2.2 0 0 1 5.2 6h3.1c.6 0 1.1.2 1.5.7l1.1 1.3h7.9A2.2 2.2 0 0 1 21 10.2v6.6A2.2 2.2 0 0 1 18.8 19H5.2A2.2 2.2 0 0 1 3 16.8Z"/>`);
const SVG_CARPETA_ABIERTA=trazo(
  `<path d="M3 16.8V8.2A2.2 2.2 0 0 1 5.2 6h3.1c.6 0 1.1.2 1.5.7l1.1 1.3h7.9A2.2 2.2 0 0 1 21 10.2v1.1"/>
   <path d="M5 17.4 6.6 12a1.6 1.6 0 0 1 1.55-1.15h12.2a1 1 0 0 1 .96 1.3l-1.5 5.05A2.2 2.2 0 0 1 17.7 19H5.2"/>`);
const SVG_LISTA=trazo(`<path d="M4.5 7h15M4.5 12h15M4.5 17h9.5"/>`);

function pintarArbol(){
  const secciones=estado.datos?.secciones??[];
  $('#arbol').innerHTML=secciones.map((sec,i)=>{
    const activa=sec.id===estado.seccionActiva;
    const abierta=estado.expandidas.has(sec.id);
    const grupos=sec.grupos??[];
    const sid=escapar(sec.id);
    const nombreSec=valorTexto(sec.nombre,estado.idiomas[0])||'(sin nombre)';
    return `
    <li class="rama">
      <div class="fila">
        <button class="desplegar" data-desplegar="${sid}" type="button"
                aria-expanded="${abierta}"
                aria-label="${abierta?'Cerrar':'Abrir'} los grupos de la sección ${escapar(nombreSec)}"
                title="${abierta?'Cerrar los grupos de esta sección':'Abrir los grupos de esta sección'}">${SVG_TRIANGULO}</button>
        <button class="nodo" data-sel-seccion="${sid}" aria-current="${activa}"
                title="${escapar(nombreSec)}">
          <span class="nodo__icono">${abierta?SVG_CARPETA_ABIERTA:SVG_CARPETA}</span>
          <span class="nodo__nombre">${escapar(nombreSec)}</span>
          <span class="nodo__cuenta" title="${grupos.length} grupo${grupos.length===1?'':'s'}">${grupos.length}</span>
        </button>
        <div style="display:flex;flex-direction:column;gap:2px">
          <button class="mover" data-sec-subir="${i}" ${i===0?'disabled':''}>▲</button>
          <button class="mover" data-sec-bajar="${i}" ${i===secciones.length-1?'disabled':''}>▼</button>
        </div>
      </div>
      ${abierta?`
        <ul class="subarbol">
          ${grupos.map((g,j)=>{
            const nombreGru=valorTexto(g.nombre,estado.idiomas[0])||'(sin nombre)';
            const cuantos=(g.items??[]).length;
            return `
            <li class="fila">
              <button class="nodo nodo--grupo" data-sel-grupo="${escapar(g.id)}" data-de-seccion="${sid}"
                      aria-current="${g.id===estado.grupoActivo&&activa}" title="${escapar(nombreGru)}">
                <span class="nodo__icono">${SVG_LISTA}</span>
                <span class="nodo__nombre">${escapar(nombreGru)}</span>
                <span class="nodo__cuenta" title="${cuantos} ítem${cuantos===1?'':'s'}">${cuantos}</span>
              </button>
              <div style="display:flex;flex-direction:column;gap:2px">
                <button class="mover" data-gru-subir="${j}" data-gru-sec="${sid}" ${j===0?'disabled':''}>▲</button>
                <button class="mover" data-gru-bajar="${j}" data-gru-sec="${sid}" ${j===grupos.length-1?'disabled':''}>▼</button>
              </div>
            </li>`;}).join('')}
          <li class="subarbol__accion"><button class="btn btn--suave btn--mini" data-nuevo-grupo="${sid}"
                type="button" style="width:100%">Añadir grupo</button></li>
        </ul>`:''}
    </li>`;
  }).join('');
  // La barrita del móvil dice en qué sección y grupo estamos: se refresca
  // aquí, que es por donde pasan tanto los cambios de selección como los
  // cambios de nombre.
  refrescarMigas();
}