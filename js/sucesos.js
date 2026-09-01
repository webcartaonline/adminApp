/* =========================================================
   SUCESOS
   Un único oyente de clics y otro de escritura para toda la
   página. Como los formularios se redibujan enteros, esto
   es más fiable que poner un oyente en cada botón.
   ========================================================= */

document.addEventListener('click',(ev)=>{
  const t=ev.target;

  // Abrir/cerrar los grupos de una sección, sin cambiar de sección.
  const desp=t.closest('[data-desplegar]');
  if(desp){
    const id=desp.dataset.desplegar;
    estado.expandidas.has(id)?estado.expandidas.delete(id):estado.expandidas.add(id);
    pintarArbol();return;
  }

  // Elegir sección: la abre, y las que ya estaban abiertas siguen abiertas.
  const selSec=t.closest('[data-sel-seccion]');
  if(selSec){
    estado.seccionActiva=selSec.dataset.selSeccion;
    estado.expandidas.add(estado.seccionActiva);
    estado.grupoActivo=null;pintarTodo();return;
  }

  // Elegir grupo: puede estar en una sección distinta de la activa, así
  // que primero saltamos a su sección.
  const selGru=t.closest('[data-sel-grupo]');
  if(selGru){
    const suSeccion=selGru.dataset.deSeccion;
    if(suSeccion&&suSeccion!==estado.seccionActiva)estado.seccionActiva=suSeccion;
    estado.grupoActivo=selGru.dataset.selGrupo;pintarTodo();return;
  }

  if(t.dataset.secSubir!==undefined||t.dataset.secBajar!==undefined){
    const i=Number(t.dataset.secSubir??t.dataset.secBajar);
    const d=t.dataset.secSubir!==undefined?i-1:i+1;
    const ss=estado.datos.secciones;[ss[i],ss[d]]=[ss[d],ss[i]];
    marcarSucio();pintarTodo();return;
  }
  if(t.dataset.gruSubir!==undefined||t.dataset.gruBajar!==undefined){
    const i=Number(t.dataset.gruSubir??t.dataset.gruBajar);
    const d=t.dataset.gruSubir!==undefined?i-1:i+1;
    // El grupo puede estar en una sección abierta que no es la activa.
    const suSec=(estado.datos?.secciones??[]).find(s=>s.id===t.dataset.gruSec)||seccionActual();
    const gg=suSec?.grupos;if(!gg||!gg[d])return;
    [gg[i],gg[d]]=[gg[d],gg[i]];
    marcarSucio();pintarTodo();return;
  }

  if(t.id==='btnNuevaSeccion'){
    if(!estado.datos){estado.datos={negocio:{},secciones:[]};estado.idiomas=detectarIdiomas(estado.datos);}
    estado.datos.secciones=estado.datos.secciones??[];
    const s={id:nuevoId('s','seccion'),nombre:crearTexto('NUEVA SECCIÓN'),grupos:[]};
    estado.datos.secciones.push(s);
    estado.seccionActiva=s.id;estado.grupoActivo=null;
    marcarSucio();pintarTodo();return;
  }
  if(t.dataset.nuevoGrupo!==undefined){
    // «Añadir grupo» sale dentro de cada sección abierta, así que el
    // grupo nuevo va a esa sección, no necesariamente a la activa.
    const s=(estado.datos?.secciones??[]).find(x=>x.id===t.dataset.nuevoGrupo)||seccionActual();
    if(!s)return;
    s.grupos=s.grupos??[];
    const g={id:nuevoId('g','grupo'),nombre:crearTexto('Nuevo grupo'),items:[]};
    s.grupos.push(g);
    estado.seccionActiva=s.id;estado.expandidas.add(s.id);estado.grupoActivo=g.id;
    marcarSucio();pintarTodo();return;
  }
  if(t.dataset.imagenSeccion!==undefined){abrirModalImagen('seccion',estado.seccionActiva);return;}
  if(t.dataset.imagenGrupo!==undefined){abrirModalImagen('grupo',estado.grupoActivo);return;}

  if(t.dataset.borrarSeccion!==undefined){
    const s=seccionActual();
    const fotos=contarImagenesDe(s,true);
    if(!confirm(`¿Eliminar la sección "${valorTexto(s.nombre,estado.idiomas[0])}" con sus ${(s.grupos??[]).length} grupos?${avisoFotos(fotos)}`))return;
    // Sus fotos ya no las va a reclamar nadie: a la papelera.
    tirarImagenesDe(s,true);
    estado.datos.secciones=estado.datos.secciones.filter(x=>x.id!==s.id);
    estado.expandidas.delete(s.id);
    estado.seccionActiva=estado.datos.secciones[0]?.id??null;estado.grupoActivo=null;
    if(estado.seccionActiva)estado.expandidas.add(estado.seccionActiva);
    marcarSucio();pintarTodo();return;
  }
  if(t.dataset.borrarGrupo!==undefined){
    const s=seccionActual(),g=grupoActual();
    const fotos=contarImagenesDe(g,false);
    if(!confirm(`¿Eliminar el grupo "${valorTexto(g.nombre,estado.idiomas[0])}" con sus ${(g.items??[]).length} ítems?${avisoFotos(fotos)}`))return;
    tirarImagenesDe(g,false);
    s.grupos=s.grupos.filter(x=>x.id!==g.id);estado.grupoActivo=null;
    marcarSucio();pintarTodo();return;
  }
  if(t.dataset.nuevoItem!==undefined){
    const g=grupoActual();g.items=g.items??[];
    g.items.unshift({id:nuevoId('i','item'),nombre:crearTexto('Nuevo ítem'),descripcion:crearTexto(''),precio:0,alergenos:[]});
    marcarSucio();pintarZona();return;
  }
  if(t.dataset.pegarItem!==undefined){pegarItem();return;}

  const ficha=t.closest('.ficha-item');if(!ficha)return;
  const g=grupoActual();const i=Number(ficha.dataset.indice);
  if(t.dataset.itemImagen!==undefined){abrirModalImagen('item',g.items[i].id);return;}
  if(t.dataset.itemCopiar!==undefined){copiarItem(g.items[i]);return;}
  if(t.dataset.itemBorrar!==undefined){
    const it=g.items[i];
    const fotos=it.imagen?1:0;
    if(!confirm(`¿Eliminar "${valorTexto(it.nombre,estado.idiomas[0])}"?${avisoFotos(fotos)}`))return;
    marcarImagenParaBorrar('item',it.id,it);
    g.items.splice(i,1);marcarSucio();pintarTodo();return;
  }
  if(t.dataset.itemSubir!==undefined||t.dataset.itemBajar!==undefined){
    const d=t.dataset.itemSubir!==undefined?i-1:i+1;
    [g.items[i],g.items[d]]=[g.items[d],g.items[i]];marcarSucio();pintarZona();return;
  }
  if(t.dataset.itemAlergeno!==undefined){
    const clave=t.dataset.itemAlergeno;const lista=g.items[i].alergenos=g.items[i].alergenos??[];
    const p=lista.indexOf(clave);p===-1?lista.push(clave):lista.splice(p,1);
    t.setAttribute('aria-pressed',p===-1);marcarSucio();return;
  }
});

/* ---------- Escritura en campos ---------- */
document.addEventListener('input',(ev)=>{
  const t=ev.target;const sec=seccionActual();if(!sec)return;
  const ed=t.dataset.ed,L=t.dataset.lang;

  if(ed==='sec-nombre'){asignarTexto(sec,'nombre',L,t.value);marcarSucio();if(L===estado.idiomas[0])pintarArbol();return;}

  const g=grupoActual();
  if(ed==='gru-nombre'&&g){asignarTexto(g,'nombre',L,t.value);marcarSucio();if(L===estado.idiomas[0])pintarArbol();return;}

  const ficha=t.closest('.ficha-item');if(!ficha||!g)return;
  const it=g.items[Number(ficha.dataset.indice)];
  if(ed==='item-nombre'){asignarTexto(it,'nombre',L,t.value);marcarSucio();return;}
  if(ed==='item-desc'){asignarTexto(it,'descripcion',L,t.value);marcarSucio();return;}
  if(t.dataset.itemPrecio!==undefined){it.precio=Number(t.value)||0;marcarSucio();}
});

/* Aviso del navegador si se cierra con cambios sin publicar. */
window.addEventListener('beforeunload',(ev)=>{if(estado.sucio){ev.preventDefault();ev.returnValue='';}});