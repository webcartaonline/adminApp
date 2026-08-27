/* =========================================================
   EDITOR
   La columna de la derecha: recuadro de la sección, del
   grupo abierto y la ficha de cada plato.
   ========================================================= */

/* Genera un campo de texto por idioma. */
function camposTexto(attr,valor,etiquetaBase,textarea=false){
  return estado.idiomas.map(L=>{
    const v=escapar(valorTexto(valor,L));
    const etq=`${etiquetaBase}${etiquetaIdioma(L)}`;
    return textarea
      ? `<label class="campo"><span class="campo__etiqueta">${etq}</span>
           <textarea data-ed="${attr}" data-lang="${L}" rows="2">${v}</textarea></label>`
      : `<label class="campo"><span class="campo__etiqueta">${etq}</span>
           <input type="text" data-ed="${attr}" data-lang="${L}" value="${v}"></label>`;
  }).join('');
}

function pintarZona(){
  const zona=$('#zona');
  if(!estado.datos){zona.innerHTML='<p class="vacio">Trae la carta de GitHub o abre un archivo para empezar.</p>';return;}
  const sec=seccionActual();
  if(!sec){zona.innerHTML='<p class="vacio">Elige una sección en la izquierda, o añade una nueva.</p>';return;}
  const gru=grupoActual();

  const pendiente=estado.imagenesPendientes[rutaImagenRepo('seccion',sec.id)];
  const urlPrevia=pendiente?.previa||urlImagenExistente(sec.imagen);
  const datosImagen=pendiente
    ? `<b>Preparada, sin publicar</b><br>${pendiente.ancho}×${pendiente.alto} px · ${Math.round(pendiente.bytes/1024)} KB<br>${escapar(rutaImagenCarta('seccion',sec.id))}`
    : sec.imagen
      ? `<b>Publicada</b><br>${escapar(sinVersion(sec.imagen))}`
      : '';
  const miniatura=urlPrevia
    ? `<div class="miniatura">
         <div class="miniatura__marco">
           <img class="miniatura__img" src="${escapar(urlPrevia)}" alt=""
                onerror="this.closest('.miniatura').remove()">
         </div>
         <div class="miniatura__datos">${datosImagen}</div>
       </div>`
    : '<p class="campo__pista" style="margin-top:10px">Esta sección no tiene imagen. La carta se verá igual que siempre, solo con el título.</p>';

  zona.innerHTML=`
    <div class="bloque">
      <h2 class="bloque__titulo"><span class="etq etq--seccion">Sección</span>
        <span class="bloque__acciones">
          <button class="btn btn--suave" data-imagen-seccion="1" type="button">Imagen</button>
        </span>
      </h2>
      <div class="par-idiomas">${camposTexto('sec-nombre',sec.nombre,'Nombre')}</div>
      ${miniatura}
      <div class="acc">
        <button class="btn btn--peligro" data-borrar-seccion="1" type="button">Eliminar sección</button>
      </div>
    </div>

    ${gru?`
    <div class="bloque">
      <h2 class="bloque__titulo"><span class="etq etq--grupo">Grupo</span></h2>
      <div class="par-idiomas">${camposTexto('gru-nombre',gru.nombre,'Nombre')}</div>
      <div class="acc">
        <button class="btn btn--suave" data-nuevo-item="1" type="button">Añadir ítem</button>
        <button class="btn btn--suave" data-pegar-item="1" type="button"
                ${estado.itemCopiado?'':'disabled'}
                title="${estado.itemCopiado
                  ? 'Pega una copia exacta del ítem copiado, con su foto'
                  : 'Copia antes un ítem con el botón «Copiar» de su ficha'}">${
          estado.itemCopiado?`Pegar «${escapar(recortarRotulo(nombreDeLaCopia()))}»`:'Pegar ítem'}</button>
        <button class="btn btn--peligro" data-borrar-grupo="1" type="button">Eliminar grupo</button>
      </div>
    </div>

    <div id="items">
      ${(gru.items??[]).length
        ? gru.items.map((it,i)=>pintarItem(it,i,gru.items.length)).join('')
        : '<p class="vacio">Este grupo aún no tiene ítems.</p>'}
    </div>`
    :'<p class="vacio">Elige un grupo de esta sección, o añade uno nuevo.</p>'}
  `;
}

function pintarItem(item,indice,total){
  const puestos=new Set(item.alergenos??[]);
  const pendiente=estado.imagenesPendientes[rutaImagenRepo('item',item.id)];
  const urlPrevia=pendiente?.previa||urlImagenExistente(item.imagen);
  const miniatura=urlPrevia
    ? `<div class="miniatura miniatura--cuadrada">
         <div class="miniatura__marco"><img class="miniatura__img" src="${escapar(urlPrevia)}" alt=""
              onerror="this.closest('.miniatura').remove()"></div>
         <div class="miniatura__datos">${
           pendiente
             ? `<b>Preparada, sin publicar</b><br>${pendiente.ancho}×${pendiente.alto} px · ${Math.round(pendiente.bytes/1024)} KB`
             : '<b>Foto publicada</b>'}</div>
       </div>`
    : '';
  return `
  <article class="ficha-item" data-indice="${indice}">
    <div class="ficha-item__cabecera">
      <div class="campo">
        <span class="campo__etiqueta">Precio (€)</span>
        <input type="number" step="0.05" min="0" data-item-precio value="${Number(item.precio)||0}">
      </div>
      <div class="ficha-item__botones">
        <button class="btn btn--suave btn--mini" data-item-imagen type="button">Foto</button>
        <button class="btn btn--suave btn--mini" data-item-copiar type="button"
                title="Copiar este ítem entero para pegarlo en otro grupo o sección">Copiar</button>
        <button class="mover" data-item-subir ${indice===0?'disabled':''}>▲</button>
        <button class="mover" data-item-bajar ${indice===total-1?'disabled':''}>▼</button>
        <button class="btn btn--peligro btn--mini" data-item-borrar type="button">Eliminar</button>
      </div>
    </div>
    ${miniatura}
    <div class="par-idiomas">${camposTexto('item-nombre',item.nombre,'Nombre')}</div>
    <div class="par-idiomas">${camposTexto('item-desc',item.descripcion,'Descripción',true)}</div>
    <div>
      <span class="campo__etiqueta">Alérgenos</span>
      <div class="chips">
        ${ALERGENOS.map(a=>`<button class="chip" type="button" data-item-alergeno="${a}"
          aria-pressed="${puestos.has(a)}">${ETIQUETAS[a]}</button>`).join('')}
      </div>
    </div>
  </article>`;
}
