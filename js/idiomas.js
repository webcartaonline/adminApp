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

/* El nombre de un idioma en su propio idioma («Français»), sacado de
   NOMBRE_IDIOMA (config.js). Si no se conoce, sus letras. */
function nombreDeIdioma(codigo){
  return NOMBRE_IDIOMA[codigo]||String(codigo).toUpperCase();
}

/* " (EN)" al lado de la etiqueta, solo si hay más de un idioma. */
function etiquetaIdioma(lang){
  return estado.idiomas.length>1?` (${lang.toUpperCase()})`:'';
}

/* ---------- Idiomas extra por elegir ----------
   Cuántos idiomas puede tener la carta además del principal lo dice la
   LICENCIA (idiomasExtra), y el portero no deja publicar más. Si la
   carta tiene menos de los contratados, esta ventana le pregunta al
   cliente cuáles quiere. Al elegirlos pasan a negocio.idiomas (que es
   lo que leen las plantillas).

   Las licencias anteriores a ese número solo dicen sí o no. Para ellas
   vale lo de siempre: la carta nace preparada con
   negocio.idiomasExtra: ["pendiente", …], un "pendiente" por cada
   idioma contratado, y se pregunta por esos. Al elegirlos, los
   "pendiente" desaparecen.

   Si pulsa «Ahora no», la carta sigue en su idioma principal y se lo
   volvemos a preguntar la próxima vez que la cargue. Tampoco se
   pregunta nada si su licencia ya no incluye idiomas extra. */
const IDIOMA_PENDIENTE='pendiente';

function idiomasPorElegir(){
  if(!permisoActual('idiomaExtra'))return 0;
  const contratados=estado.licencia?.idiomasExtra;
  if(Number.isInteger(contratados))return Math.max(0,contratados-(estado.idiomas.length-1));
  const extra=estado.datos?.negocio?.idiomasExtra;
  return Array.isArray(extra)?extra.filter(x=>x===IDIOMA_PENDIENTE).length:0;
}

/* Los idiomas que se pueden elegir: los que el editor conoce, menos
   los que la carta ya tiene. */
function idiomasDisponibles(){
  return Object.keys(NOMBRE_IDIOMA).filter(codigo=>!estado.idiomas.includes(codigo));
}

function desplegableDeIdioma(numero,disponibles){
  const opciones=disponibles
    .map(codigo=>`<option value="${codigo}">${escapar(nombreDeIdioma(codigo))}</option>`)
    .join('');
  return `<label class="campo">
    <span class="campo__etiqueta">Idioma extra ${numero}</span>
    <select data-idioma-extra><option value="">Elige un idioma…</option>${opciones}</select>
  </label>`;
}

function preguntarIdiomasSiToca(){
  const disponibles=idiomasDisponibles();
  // Nunca más casillas que idiomas para elegir: no se podrían rellenar.
  const cuantos=Math.min(idiomasPorElegir(),disponibles.length);
  if(!cuantos||!$('#modalIdiomas'))return;
  $('#idiomasPista').textContent=cuantos===1
    ? 'Tu plan te deja añadir un idioma más a tu carta. Elige cuál quieres.'
    : `Tu plan te deja añadir ${cuantos} idiomas más a tu carta. Elige cuáles quieres.`;
  $('#idiomasCampos').innerHTML=Array.from({length:cuantos},(_,i)=>desplegableDeIdioma(i+1,disponibles)).join('');
  $('#modalIdiomas').hidden=false;
}

/* Lo elegido, sin huecos. Devuelve null (y avisa) si falta alguno o
   se repite. */
function idiomasElegidos(){
  const elegidos=[...document.querySelectorAll('[data-idioma-extra]')].map(s=>s.value);
  if(elegidos.some(v=>!v)){avisar('Elige un idioma en cada casilla.','error');return null;}
  if(new Set(elegidos).size!==elegidos.length){avisar('Has elegido el mismo idioma dos veces.','error');return null;}
  return elegidos;
}

/* Los idiomas elegidos pasan a ser idiomas de verdad de la carta. Queda
   como cambio sin publicar, igual que cualquier otro. */
function fijarIdiomasExtra(elegidos){
  const negocio=estado.datos.negocio;
  negocio.idiomas=[...estado.idiomas,...elegidos];
  delete negocio.idiomasExtra;
  estado.idiomas=detectarIdiomas(estado.datos);
  marcarSucio();
  pintarTodo();
}

if($('#modalIdiomas')){
  $('#btnIdiomasGuardar').addEventListener('click',()=>{
    const elegidos=idiomasElegidos();
    if(!elegidos)return;
    fijarIdiomasExtra(elegidos);
    $('#modalIdiomas').hidden=true;
    avisar('Idiomas elegidos. Pulsa «Publicar cambios» para guardarlos en tu carta.','bien');
  });
  $('#btnIdiomasLuego').addEventListener('click',()=>{
    $('#modalIdiomas').hidden=true;
    avisar('De acuerdo. Te lo volveremos a preguntar la próxima vez que cargues la carta.');
  });
}
