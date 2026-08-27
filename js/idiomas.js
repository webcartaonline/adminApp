/* =========================================================
   IDIOMAS
   Los idiomas los declara el propio carta.json en
   negocio.idiomas. Si no vienen declarados, se deducen de
   la forma de los textos.
   Con un solo idioma, los textos se guardan como texto
   plano: "Croquetas".
   Con varios, como objeto: {"es":"Croquetas","en":"Croquettes"}.
   ========================================================= */

function detectarIdiomas(datos){
  const declarados=datos?.negocio?.idiomas;
  if(Array.isArray(declarados)&&declarados.length){
    return declarados.map(x=>String(x).toLowerCase());
  }
  const claves=new Set();
  const mirar=(v)=>{if(v&&typeof v==='object'&&!Array.isArray(v))Object.keys(v).forEach(k=>claves.add(k));};
  mirar(datos?.negocio?.lema);
  (datos?.secciones??[]).forEach(s=>{
    mirar(s.nombre);
    (s.grupos??[]).forEach(g=>{
      mirar(g.nombre);
      (g.items??[]).forEach(it=>{mirar(it.nombre);mirar(it.descripcion);});
    });
  });
  const lista=[...claves];
  lista.sort((a,b)=>(a==='es'?-1:b==='es'?1:a.localeCompare(b)));
  return lista.length?lista:['es'];
}

/* Lee el texto de un campo para un idioma dado. Tolera texto plano. */
function valorTexto(v,lang){
  if(v==null)return '';
  if(typeof v==='string')return lang===estado.idiomas[0]?v:'';
  return v[lang]||'';
}

/* Escribe el texto de un campo para un idioma, respetando el formato. */
function asignarTexto(objeto,campo,lang,valor){
  const actual=objeto[campo];
  if(estado.idiomas.length===1){
    if(actual&&typeof actual==='object'&&!Array.isArray(actual)){actual[lang]=valor;}
    else{objeto[campo]=valor;}
    return;
  }
  if(!actual||typeof actual!=='object'||Array.isArray(actual)){
    objeto[campo]={[estado.idiomas[0]]:typeof actual==='string'?actual:''};
  }
  objeto[campo][lang]=valor;
}

/* Crea un campo de texto nuevo en el formato que toque. */
function crearTexto(texto){
  if(estado.idiomas.length===1)return texto;
  const obj={};
  estado.idiomas.forEach((L,i)=>{obj[L]=i===0?texto:'';});
  return obj;
}

/* " (EN)" al lado de la etiqueta, solo si hay más de un idioma. */
function etiquetaIdioma(lang){
  return estado.idiomas.length>1?` (${lang.toUpperCase()})`:'';
}
