/* =========================================================
   PÁGINA DE AJUSTES
   Todo lo que se configura, junto y fuera del editor. Cada
   apartado se despliega al pulsar su cabecera; solo hay uno
   abierto a la vez para que la pantalla no se llene.

   Aquí no se toca la carta: solo cosas de este navegador
   (conexión, aspecto) y la ficha informativa de la app.
   ========================================================= */

/* ---------- Desplegables ---------- */
const APARTADOS = [...document.querySelectorAll('.apartado')];

function abrirApartado(art,abrir){
  const cabecera=art.querySelector('.apartado__cabecera');
  art.classList.toggle('apartado--abierto',abrir);
  cabecera.setAttribute('aria-expanded',String(abrir));
  art.querySelector('.apartado__cuerpo').hidden=!abrir;
  /* El selector de color enseña lo que hay guardado ahora mismo,
     no lo que se dejó a medias la vez anterior. */
  if(abrir&&art.id==='apPersonalizacion')sincronizarColorUI();
}

APARTADOS.forEach(art=>{
  art.querySelector('.apartado__cabecera').addEventListener('click',()=>{
    const abierto=art.classList.contains('apartado--abierto');
    APARTADOS.forEach(o=>abrirApartado(o,false));
    if(!abierto){
      abrirApartado(art,true);
      /* En el móvil la cabecera se puede quedar por encima de la
         pantalla al desplegar; así siempre queda a la vista. */
      art.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  });
});

/* ---------- Conexión con GitHub ---------- */
function volcarConexion(){
  const a=leerAjustes();
  $('#cfgOwner').value=a.owner||'';
  $('#cfgRepo').value=a.repo||'';
  $('#cfgRama').value=a.rama||'';
  $('#cfgRuta').value=a.ruta||'carta.json';
  $('#cfgToken').value=a.token||'';
  pintarEstadoConexion();
}

/* Un semáforo corto en la cabecera del apartado, para saber de un
   vistazo si falta algo sin tener que desplegarlo. */
function pintarEstadoConexion(){
  const a=leerAjustes();
  const completo=!!(a.owner&&a.repo&&a.token);
  const e=$('#estadoConexion');
  e.textContent=completo?'Configurada':'Falta por completar';
  e.className=`apartado__estado ${completo?'apartado__estado--bien':'apartado__estado--falta'}`;
}

$('#btnGuardarCfg').addEventListener('click',()=>{
  const a=leerAjustes();
  a.owner=$('#cfgOwner').value.trim();
  a.repo=$('#cfgRepo').value.trim();
  a.rama=$('#cfgRama').value.trim()||'main';
  a.ruta=$('#cfgRuta').value.trim()||'carta.json';
  a.token=$('#cfgToken').value.trim();
  guardarAjustes(a);
  volcarConexion();
  pintarFichaConexion();
  avisar('Datos de conexión guardados en este navegador.','bien');
});

$('#btnOlvidarToken').addEventListener('click',()=>{
  const a=leerAjustes();
  delete a.token;
  guardarAjustes(a);
  $('#cfgToken').value='';
  pintarEstadoConexion();
  avisar('Token borrado de este navegador.','bien');
});

/* El token se escribe a ciegas; poder mirarlo evita medio susto. */
$('#btnVerToken').addEventListener('click',()=>{
  const campo=$('#cfgToken');
  const oculto=campo.type==='password';
  campo.type=oculto?'text':'password';
  $('#btnVerToken').textContent=oculto?'Ocultar':'Ver';
  $('#btnVerToken').setAttribute('aria-pressed',String(oculto));
});

/* ---------- Personalización ---------- */
$('#btnGuardarNombre').addEventListener('click',()=>{
  const a=leerAjustes();
  a.nombre=$('#cfgNombre').value.trim();
  guardarAjustes(a);
  aplicarNombreEditor(a.nombre);
  pintarNombreEjemplo();
  avisar('Nombre del editor guardado.','bien');
});

function pintarNombreEjemplo(){
  const n=$('#cfgNombre').value.trim()||'la carta';
  $('#nombreEjemplo').textContent=`Editor de ${n}`;
}
$('#cfgNombre').addEventListener('input',pintarNombreEjemplo);

/* ---------- La web con la que conecta ----------
   Se intenta averiguar sola. GitHub lo cuenta de dos maneras y no
   siempre están las dos disponibles, así que se prueban en orden:
     1. La ficha de GitHub Pages: es la buena, pero un token de
        permisos limitados normalmente no puede leerla.
     2. El campo «Website» del repositorio: GitHub lo rellena solo
        cuando se activa Pages.
     3. Y si nada de eso responde, se deduce de la cuenta y el
        repositorio, que es como monta GitHub las direcciones.
   El usuario siempre puede escribirla a mano: lo que escriba manda. */
function direccionDeducida(owner,repo){
  if(!owner||!repo)return '';
  return repo.toLowerCase()===`${owner.toLowerCase()}.github.io`
    ? `https://${owner.toLowerCase()}.github.io/`
    : `https://${owner.toLowerCase()}.github.io/${repo}/`;
}

function normalizarDireccion(url){
  const t=String(url||'').trim();
  if(!t)return '';
  return /^https?:\/\//i.test(t)?t:`https://${t}`;
}

async function detectarSitio(){
  const a=leerAjustes();
  if(!a.owner||!a.repo){
    avisar('Primero completa la cuenta y el repositorio en «Conexión con GitHub».','error');
    return;
  }
  const boton=$('#btnDetectarSitio');
  const rotulo=boton.textContent;
  boton.disabled=true;
  boton.textContent='Buscando…';
  const cab={'Accept':'application/vnd.github+json',...(a.token?{'Authorization':`Bearer ${a.token}`}:{})};
  let url='', nombre='', de='';

  try{
    const r=await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}/pages`,{headers:cab,cache:'no-store'});
    if(r.ok){
      const p=await r.json();
      if(p.html_url){url=p.html_url;de='la ficha de GitHub Pages';}
    }
  }catch{/* se sigue probando por otro lado */}

  try{
    const r=await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}`,{headers:cab,cache:'no-store'});
    if(r.ok){
      const repo=await r.json();
      nombre=repo.description||repo.name||'';
      if(!url&&repo.homepage){url=repo.homepage;de='el campo «Website» del repositorio';}
    }
  }catch{/* se sigue probando por otro lado */}

  if(!url){url=direccionDeducida(a.owner,a.repo);de='la cuenta y el repositorio';}

  $('#sitioUrl').value=url;
  if(nombre&&!$('#sitioNombre').value.trim())$('#sitioNombre').value=nombre;
  guardarSitio({nombre:$('#sitioNombre').value.trim(),url});
  pintarFichaSitio();
  boton.disabled=false;
  boton.textContent=rotulo;
  avisar(`Dirección averiguada a partir de ${de}. Si no es esa, cámbiala a mano.`,'bien');
}

$('#btnDetectarSitio').addEventListener('click',detectarSitio);

$('#btnGuardarSitio').addEventListener('click',()=>{
  const url=normalizarDireccion($('#sitioUrl').value);
  $('#sitioUrl').value=url;
  guardarSitio({nombre:$('#sitioNombre').value.trim(),url});
  pintarFichaSitio();
  avisar('Datos de la web guardados.','bien');
});

function pintarFichaSitio(){
  const s=leerSitio();
  $('#fichaSitioNombre').textContent=s.nombre||'Sin nombre';
  const enlace=$('#fichaSitioUrl');
  if(s.url){
    enlace.textContent=s.url;
    enlace.href=s.url;
    enlace.removeAttribute('aria-disabled');
  }else{
    enlace.textContent='Sin averiguar todavía';
    enlace.removeAttribute('href');
    enlace.setAttribute('aria-disabled','true');
  }
}

function pintarFichaConexion(){
  const a=leerAjustes();
  $('#fichaRepo').textContent=a.owner&&a.repo?`${a.owner}/${a.repo}`:'Sin configurar';
}

/* ---------- Información de la aplicación ---------- */
function pintarInfoApp(){
  const n=notaVersion;
  $('#infoVersion').textContent=n?.version?`Versión ${n.version}`:'Versión —';
  $('#estadoVersion').textContent=n?.version||'—';
  $('#infoFecha').textContent=n?.fecha?`Publicada el ${n.fecha}`:'Fecha de publicación desconocida';
  $('#infoTitulo').textContent=n?.titulo||'Novedades del editor';
  const cambios=Array.isArray(n?.cambios)?n.cambios:[];
  $('#infoCambios').innerHTML=cambios.length
    ? cambios.map(c=>`<li>${escapar(c)}</li>`).join('')
    : '<li>Mejoras y correcciones internas.</li>';
}

/* ---------- Arranque ---------- */
sincronizarBotonTema();
volcarConexion();
$('#cfgNombre').value=leerAjustes().nombre||'';
aplicarNombreGuardado();
pintarNombreEjemplo();
sincronizarColorUI();

{
  const s=leerSitio();
  $('#sitioNombre').value=s.nombre||'';
  $('#sitioUrl').value=s.url||'';
}
pintarFichaSitio();
pintarFichaConexion();
pintarInfoApp();

/* Registra el vigilante (para que esta página también funcione sin
   conexión) y, cuando llegue version.json, rellena la ficha. */
arrancarVersion().then(pintarInfoApp);

/* Si aún no hay conexión configurada, se abre ese apartado: es lo
   primero que hay que hacer y no tiene sentido esconderlo. */
{
  const a=leerAjustes();
  if(!(a.owner&&a.repo&&a.token))abrirApartado($('#apConexion'),true);
}