/* =========================================================
   GITHUB
   Traer la carta del repositorio y volver a subirla, junto
   con las fotos nuevas y el borrado de las que sobran.
   ========================================================= */

/* estadisticas.json vive al lado de carta.json, sea cual sea la carpeta. */
function rutaEstadisticas(ruta){
  const partes=String(ruta||'carta.json').split('/');
  partes[partes.length-1]='estadisticas.json';
  return partes.join('/');
}

async function traer(){
  const a=leerAjustes();
  if(!a.owner||!a.repo||!a.ruta){avisar('Faltan datos de conexión. Entra en «Ajustes» y complétalos.','error');return;}
  avisar('Trayendo la carta de GitHub…');
  const cab={'Accept':'application/vnd.github+json',...(a.token?{'Authorization':`Bearer ${a.token}`}:{})};
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${a.ruta}?ref=${a.rama||'main'}`;
  try{
    const r=await fetch(url,{headers:cab,cache:'no-store'});
    if(r.status===404)throw new Error('No existe ese archivo. Revisa la ruta y la rama.');
    if(r.status===401)throw new Error('El token no es válido o ha caducado.');
    if(r.status===403)throw new Error('El token no tiene permiso sobre este repositorio.');
    if(!r.ok)throw new Error(`GitHub respondió ${r.status}.`);
    const cuerpo=await r.json();
    cargarDatos(JSON.parse(deBase64(cuerpo.content)));
    estado.sha=cuerpo.sha;
    avisar('Carta cargada. Ya puedes editarla.','bien');

    // Estadísticas: solo si el archivo existe en el repo.
    estado.estadisticas=null;
    try{
      const re=await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${rutaEstadisticas(a.ruta)}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
      if(re.ok){
        const ce=await re.json();
        estado.estadisticas=JSON.parse(deBase64(ce.content));
      }
    }catch{/* sin estadísticas: no pasa nada */}
    refrescarBotonEstadisticas();

    // Además de la carta, ponemos al día los archivos de la plantilla
    // (los que hacen falta para la vista previa). Solo se descarga lo que
    // ha cambiado. Si algo falla aquí, la carta ya está cargada: la vista
    // previa quedará no disponible, pero no se estropea nada.
    try{ await sincronizarPlantilla(a,cab); }
    catch(e){ console.warn('Vista previa no disponible:',e.message); }
    if(typeof refrescarBotonVistaPrevia==='function')refrescarBotonVistaPrevia();
  }catch(e){avisar(`No se ha podido traer la carta: ${e.message}`,'error');}
}

function cargarDatos(datos){
  estado.datos=datos;
  estado.sucio=false;
  liberarImagenesPendientes();
  estado.imagenesPorBorrar=[];
  estado.imagenesHuerfanas=new Set();
  estado.expandidas=new Set();
  // Cartas antiguas sin secciones: se envuelven en una sección "General".
  if(!estado.datos.secciones&&estado.datos.grupos){
    estado.datos.secciones=[{id:nuevoId('s','general'),nombre:'General',grupos:estado.datos.grupos}];
    delete estado.datos.grupos;
  }
  estado.datos.secciones=estado.datos.secciones||[];
  estado.idiomas=detectarIdiomas(estado.datos);
  estado.imagenes=detectarImagenes(estado.datos);
  estado.seccionActiva=estado.datos.secciones[0]?.id??null;
  if(estado.seccionActiva)estado.expandidas.add(estado.seccionActiva);
  estado.grupoActivo=null;
  estado.vista='editor';
  $('#btnPublicar').disabled=true;
  pintarTodo();
}

function refrescarBotonEstadisticas(){
  const hay=!!estado.estadisticas;
  $('#btnEstadisticas').hidden=!hay;
  if(!hay&&estado.vista==='estadisticas'){estado.vista='editor';pintarTodo();}
}

/* Sube (o reemplaza) una imagen en el repositorio. Si el archivo ya
   existe hay que mandar su sha, o GitHub rechaza la escritura. */
async function subirImagen(a,cab,ruta,base64,mensaje){
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}`;
  let sha=null;
  try{
    const previo=await fetch(`${url}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
    if(previo.ok)sha=(await previo.json()).sha;
  }catch{/* si no existe, se crea */}
  const r=await fetch(url,{method:'PUT',headers:cab,body:JSON.stringify({
    message:`${mensaje} (imagen)`,content:base64,
    branch:a.rama||'main',...(sha?{sha}:{})
  })});
  if(r.status===401)throw new Error('El token no es válido o ha caducado.');
  if(r.status===403)throw new Error('El token no tiene permiso de escritura.');
  if(!r.ok){
    const d=await r.json().catch(()=>({}));
    throw new Error(`no se ha podido subir ${ruta}: ${d.message||r.status}`);
  }
}

/* Borra un archivo del repositorio. GitHub exige el sha del archivo,
   así que primero hay que preguntarle cuál es. Si ya no existe, no
   pasa nada: se da por hecho. */
async function borrarImagenDelRepo(a,cab,ruta,mensaje){
  const url=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${ruta}`;
  const previo=await fetch(`${url}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
  if(previo.status===404)return 'no-existia';
  if(!previo.ok)throw new Error(`GitHub respondió ${previo.status}`);
  const sha=(await previo.json()).sha;
  const r=await fetch(url,{method:'DELETE',headers:cab,body:JSON.stringify({
    message:`${mensaje} (borrar imagen)`,sha,branch:a.rama||'main'
  })});
  if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`GitHub respondió ${r.status}`);}
  return 'borrada';
}

async function publicar(){
  if(enEspera()){
    const seg=Math.ceil((finEspera-Date.now())/1000);
    avisar(`Aún se está desplegando la publicación anterior. Podrás volver a publicar en ${Math.floor(seg/60)}:${String(seg%60).padStart(2,'0')}.`,'error');
    return;
  }
  const a=leerAjustes();
  if(!a.token){avisar('Hace falta un token para publicar. Entra en «Ajustes» y añádelo.','error');return;}
  if(!estado.datos){avisar('No hay ninguna carta cargada.','error');return;}
  const mensaje=prompt('¿Qué has cambiado?','chore(carta): actualizar precios');
  if(mensaje===null)return;
  $('#btnPublicar').disabled=true;avisar('Publicando…');
  const base=`https://api.github.com/repos/${a.owner}/${a.repo}/contents/${a.ruta}`;
  const cab={'Accept':'application/vnd.github+json','Authorization':`Bearer ${a.token}`,'Content-Type':'application/json'};
  try{
    // 1) Primero las imágenes. Si alguna falla, no se toca el JSON:
    //    así la carta nunca queda apuntando a una foto inexistente.
    const pendientes=Object.entries(estado.imagenesPendientes);
    if(pendientes.length&&(!a.owner||!a.repo)){
      throw new Error('faltan la cuenta o el repositorio en los ajustes, y sin eso no se pueden subir las imágenes.');
    }
    for(let i=0;i<pendientes.length;i++){
      const [ruta,img]=pendientes[i];
      avisar(`Subiendo imagen ${i+1} de ${pendientes.length}…`);
      await subirImagen(a,cab,ruta,img.base64,mensaje);
      if(img.previa)URL.revokeObjectURL(img.previa);
      delete estado.imagenesPendientes[ruta];
    }
    if(pendientes.length)avisar('Imágenes subidas. Publicando la carta…');

    // 2) Después, el JSON de la carta.
    const previo=await fetch(`${base}?ref=${a.rama||'main'}`,{headers:cab,cache:'no-store'});
    if(previo.ok)estado.sha=(await previo.json()).sha;
    estado.datos.negocio=estado.datos.negocio||{};
    estado.datos.negocio.actualizado=new Date().toISOString();
    const r=await fetch(base,{method:'PUT',headers:cab,body:JSON.stringify({
      message:mensaje,content:aBase64(JSON.stringify(estado.datos,null,2)),
      branch:a.rama||'main',...(estado.sha?{sha:estado.sha}:{})
    })});
    if(r.status===401)throw new Error('El token no es válido o ha caducado.');
    if(r.status===403)throw new Error('El token no tiene permiso de escritura.');
    if(r.status===409)throw new Error('El archivo cambió mientras editabas. Vuelve a traerlo de GitHub.');
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.message||`GitHub respondió ${r.status}.`);}
    estado.sha=(await r.json()).content.sha;estado.sucio=false;

    // 3) Y por último, las fotos que ya no reclama nadie. Van al final a
    //    propósito: así la carta publicada nunca apunta a un archivo que
    //    acabamos de borrar.
    let borradas=0;const fallos=[];
    for(const ruta of [...estado.imagenesPorBorrar]){
      try{
        if(await borrarImagenDelRepo(a,cab,ruta,mensaje)==='borrada')borradas++;
        rescatarDeLaPapelera(ruta);
      }catch{fallos.push(ruta);}
    }
    // 3.5) Los ajustes de la página sin publicar (colores, portada, pie,
    //      fuentes…) se suben en la misma tanda, si los hay. Si fallan, la
    //      carta ya está publicada igualmente: el borrador se guarda y se
    //      reintenta en la siguiente publicación.
    let aparPublicada=false, aparFallo='';
    try{
      const res=await publicarApariencia(a,cab,mensaje,(t)=>avisar(t));
      aparPublicada=res.publicado;
    }catch(e){ aparFallo=e.message; }

    empezarEspera();
    if(typeof refrescarBotonVistaPrevia==='function')refrescarBotonVistaPrevia();
    const extra=borradas?` Se han borrado ${borradas} foto${borradas===1?'':'s'} que ya no se usaba${borradas===1?'':'n'}.`:'';
    const extraApar=aparPublicada?' También se han actualizado los ajustes de la página.':'';
    const avisoApar=aparFallo?` Los ajustes de la página no se han podido publicar (${aparFallo}); se reintentarán la próxima vez.`:'';
    if(fallos.length){
      estado.sucio=true;   // para poder reintentar el borrado en la siguiente publicación
      avisar(`Publicado.${extra}${extraApar} No se han podido borrar ${fallos.length} foto${fallos.length===1?'':'s'} sobrante${fallos.length===1?'':'s'}; se reintentará la próxima vez que publiques.${avisoApar}`,'bien');
    }else{
      avisar(`Publicado.${extra}${extraApar} La carta se actualiza en un par de minutos. Mientras se despliega, el botón de publicar queda bloqueado.${avisoApar}`,'bien');
    }
  }catch(e){if(!enEspera())$('#btnPublicar').disabled=false;avisar(`No se ha podido publicar: ${e.message}`,'error');}
}

$('#btnCargar').addEventListener('click',traer);
$('#btnPublicar').addEventListener('click',publicar);