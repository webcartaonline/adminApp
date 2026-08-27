/* =========================================================
   ESTADÍSTICAS
   Lee estadisticas.json (el que escribe el Worker de
   Cloudflare) y lo convierte en cifras y barras.
   Si ese archivo no existe en el repositorio, el botón de
   estadísticas ni siquiera aparece.
   ========================================================= */

/* Traduce un id (s-bebidas-a1b2) al nombre que ve el cliente. */
function nombreDe(tipo,id){
  const primero=estado.idiomas[0];
  if(tipo==='seccion'){
    const s=(estado.datos?.secciones??[]).find(x=>x.id===id);
    return s?valorTexto(s.nombre,primero)||id:id;
  }
  if(tipo==='grupo'){
    for(const s of (estado.datos?.secciones??[])){
      const g=(s.grupos??[]).find(x=>x.id===id);
      if(g)return valorTexto(g.nombre,primero)||id;
    }
    return id;
  }
  if(tipo==='alergeno')return ETIQUETAS[id]||id;
  return id;
}

function ordenar(mapa){
  return Object.entries(mapa||{}).sort((a,b)=>b[1]-a[1]);
}

function filaBarra(nombre,valor,maximo,variante=''){
  const pct=maximo>0?Math.max(4,Math.round((valor/maximo)*100)):0;
  return `
    <div class="barra-fila ${variante}">
      <span class="barra-fila__nombre">${escapar(nombre)}</span>
      <span class="barra-fila__pista"><span class="barra-fila__relleno" style="width:${pct}%"></span></span>
      <span class="barra-fila__num">${valor}</span>
    </div>`;
}

function pintarEstadisticas(){
  const e=estado.estadisticas||{};
  const vistas=ordenar(e.vistas);
  const totalVistas=vistas.reduce((s,[,v])=>s+v,0);
  const idiomas=ordenar(e.idiomas);
  const totalIdiomas=idiomas.reduce((s,[,v])=>s+v,0);
  const secciones=ordenar(e.secciones);
  const maxSec=Math.max(1,...secciones.map(([,v])=>v));
  const grupos=ordenar(e.grupos);
  const maxGru=Math.max(1,...grupos.map(([,v])=>v));
  const alergenos=ordenar(e.alergenos);
  const maxAle=Math.max(1,...alergenos.map(([,v])=>v));
  const ultimoDia=Object.keys(e.vistas||{}).sort().pop();

  $('#zona').innerHTML=`
    <div class="resumen">
      <div class="resumen__caja">
        <div class="resumen__cifra">${totalVistas}</div>
        <div class="resumen__etq">Visitas totales</div>
      </div>
      <div class="resumen__caja">
        <div class="resumen__cifra">${ultimoDia?(e.vistas[ultimoDia]??0):0}</div>
        <div class="resumen__etq">Visitas el ${ultimoDia??'—'}</div>
      </div>
      <div class="resumen__caja">
        <div class="resumen__cifra">${secciones.length}</div>
        <div class="resumen__etq">Secciones con actividad</div>
      </div>
    </div>

    ${estado.idiomas.length>1&&totalIdiomas>0?`
    <div class="bloque-est">
      <h2 class="bloque-est__titulo">Idioma</h2>
      <p class="bloque-est__sub">Reparto de las visitas por idioma elegido.</p>
      <div class="idioma-comparativa">
        ${idiomas.map(([L,v],i)=>{
          const pct=Math.round((v/totalIdiomas)*100);
          return `<div class="c${i%3}" style="flex:${Math.max(pct,1)}">${pct}% ${escapar(L.toUpperCase())}</div>`;
        }).join('')}
      </div>
      <p class="bloque-est__sub">${idiomas.map(([L,v])=>`${v} en ${NOMBRE_IDIOMA[L]||L.toUpperCase()}`).join(' · ')}</p>
    </div>`:''}

    <div class="est-rejilla">
      <div class="bloque-est">
        <h2 class="bloque-est__titulo">Secciones más abiertas</h2>
        <p class="bloque-est__sub">Cuántas veces se ha desplegado cada sección de la carta.</p>
        <div class="barras">
          ${secciones.length?secciones.map(([id,v])=>filaBarra(nombreDe('seccion',id),v,maxSec)).join('')
            :'<p class="vacio">Todavía no hay datos.</p>'}
        </div>
      </div>

      <div class="bloque-est">
        <h2 class="bloque-est__titulo">Grupos más abiertos</h2>
        <p class="bloque-est__sub">Dentro de cada sección, qué grupos despiertan más curiosidad.</p>
        <div class="barras">
          ${grupos.length?grupos.map(([id,v])=>filaBarra(nombreDe('grupo',id),v,maxGru,'barra-fila--verde')).join('')
            :'<p class="vacio">Todavía no hay datos.</p>'}
        </div>
      </div>

      <div class="bloque-est">
        <h2 class="bloque-est__titulo">Alérgenos más evitados</h2>
        <p class="bloque-est__sub">Los que los clientes marcan para que se les avise en cada plato.</p>
        <div class="barras">
          ${alergenos.length?alergenos.map(([id,v])=>filaBarra(nombreDe('alergeno',id),v,maxAle,'barra-fila--aviso')).join('')
            :'<p class="vacio">Todavía no hay datos.</p>'}
        </div>
      </div>
    </div>
  `;
}
