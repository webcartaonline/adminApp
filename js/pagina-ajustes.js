/* =========================================================
   PÁGINA DE AJUSTES
   Todo lo que se configura, junto y fuera del editor. Cada
   apartado se despliega al pulsar su cabecera; solo hay uno
   abierto a la vez para que la pantalla no se llene.

   Aquí no se toca la carta: solo cosas de este navegador
   (la conexión, el aspecto) y la ficha informativa de la app.
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

/* ---------- Conexión con la carta ----------
   Dos datos y nada más: el nombre del negocio y su clave. Con eso el
   editor ya sabe con qué carta habla, porque dónde vive el servidor
   va fijo en el código (ver nube.js). */

/* El nombre del negocio tal y como lo entiende el servidor: en
   minúsculas, sin acentos y con guiones en lugar de espacios. Se
   limpia aquí para que nadie se quede fuera por escribir «Fusión
   Café» en vez de «fusion-cafe». */
function limpiarNegocio(texto){
  return String(texto||'').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

function volcarConexion(){
  const a=leerAjustes();
  $('#cfgNegocio').value=a.cliente||'';
  $('#cfgClave').value=a.clave||'';
  pintarEstadoConexion();
}

/* Un semáforo corto en la cabecera del apartado, para saber de un
   vistazo si falta algo sin tener que desplegarlo. */
function pintarEstadoConexion(){
  const a=leerAjustes();
  const completo=!!(a.cliente&&a.clave);
  const e=$('#estadoConexion');
  e.textContent=completo?'Configurada':'Falta por completar';
  e.className=`apartado__estado ${completo?'apartado__estado--bien':'apartado__estado--falta'}`;
}

/* Guarda lo que hay escrito en los dos campos. Lo usan el botón de
   guardar y el de probar: probar sin guardar antes comprobaría los
   datos viejos, que es justo lo que despista a quien acaba de
   escribir los nuevos. */
function guardarConexionDeLosCampos(){
  const a=leerAjustes();
  a.cliente=limpiarNegocio($('#cfgNegocio').value);
  a.clave=$('#cfgClave').value.trim();
  guardarAjustes(a);
  /* La dirección de la carta sale del negocio, así que se pone al día
     sola en cuanto se guarda. */
  guardarSitio({nombre:leerSitio().nombre||'',url:a.cliente?direccionDeLaCarta():''});
  refrescarPantallaAjustes();
}

$('#btnGuardarCfg').addEventListener('click',()=>{
  guardarConexionDeLosCampos();
  avisar('Conexión guardada en este navegador.','bien');
});

$('#btnOlvidarClave').addEventListener('click',()=>{
  const a=leerAjustes();
  a.clave='';
  guardarAjustes(a);
  $('#cfgClave').value='';
  $('#fichaLicencia').hidden=true;
  pintarEstadoConexion();
  sincronizarChipToken();
  avisar('Clave borrada de este navegador.','bien');
});

/* La clave se escribe a ciegas; poder mirarla evita medio susto. */
$('#btnVerClave').addEventListener('click',()=>{
  const campo=$('#cfgClave');
  const oculto=campo.type==='password';
  campo.type=oculto?'text':'password';
  $('#btnVerClave').textContent=oculto?'Ocultar':'Ver';
  $('#btnVerClave').setAttribute('aria-pressed',String(oculto));
});

/* ---------- Probar la conexión ----------
   Le pregunta al servidor por la licencia de este negocio. Es la
   forma de saber, sin salir de esta pantalla, si el negocio y la
   clave son los buenos y qué incluye el plan contratado. */
function filaFicha(rotulo,valor){
  return `<div class="ficha__fila"><dt>${escapar(rotulo)}</dt><dd>${escapar(valor)}</dd></div>`;
}

const ROTULO_PERMISO={
  etiquetas:'Notas y alertas',
  imagenesDecorativas:'Fondo, bandas y fuentes',
  imagenMarca:'Logotipo e iconito',
  imagenItem:'Fotos de los platos',
  idiomaExtra:'Idioma extra',
  publicar:'Publicar cambios'
};

function pintarFichaLicencia(estadoLicencia){
  const permisos=estadoLicencia.permisos||{};
  const incluye=Object.entries(ROTULO_PERMISO)
    .filter(([clave])=>permisos[clave]===true)
    .map(([,rotulo])=>rotulo);

  let html='';
  html+=filaFicha('Negocio',estadoLicencia.negocio||'Sin nombre');
  html+=filaFicha('Plan',estadoLicencia.plan||'Sin plan');
  html+=filaFicha('Caduca',String(estadoLicencia.caduca||'').slice(0,10)||'Sin fecha');
  const dias=Number(estadoLicencia.diasRestantes);
  if(Number.isFinite(dias)){
    html+=filaFicha('Quedan',dias===1?'1 día':`${dias} días`);
  }
  html+=filaFicha('Incluye',incluye.length?incluye.join(' · '):'Nada todavía');

  const ficha=$('#fichaLicencia');
  ficha.innerHTML=html;
  ficha.hidden=false;
}

$('#btnProbarCfg').addEventListener('click',async()=>{
  const boton=$('#btnProbarCfg');
  const rotulo=boton.textContent;
  guardarConexionDeLosCampos();   // se prueba lo que está escrito, no lo de antes
  boton.disabled=true;
  boton.textContent='Probando…';
  try{
    const estadoLicencia=await leerEstadoDeLicencia();
    pintarFichaLicencia(estadoLicencia);
    avisar('Conexión correcta y guardada. Ya puedes volver al editor y traer la carta.','bien');
  }catch(e){
    $('#fichaLicencia').hidden=true;
    avisar(`No se ha podido conectar: ${e.message}`,'error');
  }finally{
    boton.disabled=false;
    boton.textContent=rotulo;
  }
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
   Ya no hay nada que averiguar: cada negocio entra por su propio
   subdominio, así que la dirección se calcula a partir del nombre del
   negocio (ver direccionDeLaCarta en nube.js). Aquí solo se guarda un
   nombre para reconocerla de un vistazo. */
$('#btnGuardarSitio').addEventListener('click',()=>{
  const a=leerAjustes();
  guardarSitio({nombre:$('#sitioNombre').value.trim(),url:a.cliente?direccionDeLaCarta():''});
  pintarFichaSitio();
  avisar('Datos de la web guardados.','bien');
});

function pintarFichaSitio(){
  const a=leerAjustes();
  const s=leerSitio();
  const url=a.cliente?direccionDeLaCarta():'';
  $('#fichaSitioNombre').textContent=s.nombre||'Sin nombre';
  const enlace=$('#fichaSitioUrl');
  if(url){
    enlace.textContent=url;
    enlace.href=url;
    enlace.removeAttribute('aria-disabled');
  }else{
    enlace.textContent='Falta el negocio en la conexión';
    enlace.removeAttribute('href');
    enlace.setAttribute('aria-disabled','true');
  }
}

function pintarFichaConexion(){
  $('#fichaNegocio').textContent=leerAjustes().cliente||'Sin configurar';
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

/* ---------- Repintar la pantalla entera ----------
   Deja todos los mandos y todas las fichas como están los datos
   guardados ahora mismo. Se usa al abrir la página y también después
   de importar unos ajustes de un archivo, que cambia todo de golpe. */
function refrescarPantallaAjustes(){
  sincronizarBotonTema();
  volcarConexion();
  $('#cfgNombre').value=leerAjustes().nombre||'';
  aplicarNombreGuardado();
  pintarNombreEjemplo();
  sincronizarColorUI();

  $('#sitioNombre').value=leerSitio().nombre||'';
  pintarFichaSitio();
  pintarFichaConexion();
}

/* ---------- Arranque ---------- */
refrescarPantallaAjustes();
pintarInfoApp();

/* Registra el vigilante (para que esta página también funcione sin
   conexión) y, cuando llegue version.json, rellena la ficha. */
arrancarVersion().then(pintarInfoApp);

/* Si aún no hay conexión configurada, se abre ese apartado: es lo
   primero que hay que hacer y no tiene sentido esconderlo. */
{
  const a=leerAjustes();
  if(!(a.cliente&&a.clave))abrirApartado($('#apConexion'),true);
}
