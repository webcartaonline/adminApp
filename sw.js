/* =========================================================
   EL VIGILANTE (service worker)
   Guarda una copia de la aplicación en el navegador del
   cliente. Gracias a él la aplicación abre al instante,
   funciona sin internet y se puede instalar como una app.

   ⚠️ PARA PUBLICAR UNA VERSIÓN NUEVA:
   cambia el número de VERSION aquí abajo y escribe las
   novedades en version.json. Nada más.
   Si no cambias VERSION, el navegador de los clientes no se
   entera de que hay algo nuevo.

   Las versiones se instalan solas, sin pedir nada al
   cliente: la próxima vez que abra el editor verá
   automáticamente la ventana con lo que ha cambiado.
   ========================================================= */

const VERSION = '6.8.5';
const CACHE   = `editor-carta-${VERSION}`;

/* Todo lo que hace falta para que la aplicación funcione sin internet.
   Si añades un archivo css o js, apúntalo también aquí.
   Las páginas html NO van en esta lista: van en PAGINAS, más abajo. */
const ARCHIVOS = [
  './manifest.json',
  './css/base.css',
  './css/botones.css',
  './css/formularios.css',
  './css/barra.css',
  './css/ajustes.css',
  './css/arbol.css',
  './css/editor.css',
  './css/destacados.css',
  './css/estadisticas.css',
  './css/imagenes.css',
  './css/color.css',
  './css/version.css',
  './css/apariencia.css',
  './js/config.js',
  './js/utiles.js',
  './js/imagen-comprimir.js',
  './js/estado.js',
  './js/tema.js',
  './js/color.js',
  './js/color-ui.js',
  './js/panel.js',
  './js/ajustes.js',
  './js/pagina-ajustes.js',
  './js/pagina-apariencia.js',
  './js/copia-ajustes.js',
  './js/idiomas.js',
  './js/espera.js',
  './js/imagenes.js',
  './js/imagen-recorte.js',
  './js/github.js',
  './js/vista.js',
  './js/vista-arbol.js',
  './js/vista-editor.js',
  './js/destacados.js',
  './js/vista-estadisticas.js',
  './js/portapapeles.js',
  './js/sucesos.js',
  './js/version.js',
  './js/app.js',
  './img/icono-192.png',
  './img/icono-512.png',
  './img/icono-180.png',
  './img/icono-mascara-512.png'
];

/* ---------- Las dos páginas ----------
   Van aparte del resto de archivos porque su dirección no es la misma
   en todos los sitios donde se puede abrir la aplicación:

     · Al probar en el ordenador (Live Server y compañía) solo existe
       el nombre real del archivo: '/index.html' y '/ajustes.html'.
     · GitHub Pages entiende los dos, el largo y el corto.
     · Cloudflare quita el '.html' y manda a la dirección corta.

   Además, una copia guardada que venga de un desvío no sirve: el
   navegador se niega a abrirla. Por eso se prueban las formas en
   orden, se guarda la primera que conteste sin desviar, y siempre
   bajo el mismo nombre corto, que es el que busca luego el apartado
   de navegación. Si ninguna contesta, no se guarda y esa página se
   pedirá a la red: es preferible a que falle la instalación entera y
   la aplicación se quede sin funcionar sin conexión. */
const PAGINAS = [
  { clave:'./',         formas:['./'] },
  { clave:'./ajustes',  formas:['./ajustes','./ajustes.html'] }
];

async function guardarPaginas(cache){
  for(const pagina of PAGINAS){
    for(const forma of pagina.formas){
      try{
        const r=await fetch(forma,{cache:'no-store'});
        if(r.ok&&!r.redirected){ await cache.put(pagina.clave,r); break; }
      }catch(e){ /* se prueba la forma siguiente */ }
    }
  }
}

/* ---------- Instalación ----------
   Se descarga la versión nueva entera y se pone en marcha
   sin esperar el visto bueno de nadie. */
self.addEventListener('install',(ev)=>{
  ev.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(ARCHIVOS);
    await guardarPaginas(cache);
    await self.skipWaiting();
  })());
});

/* ---------- Activación ----------
   Ya somos la versión buena: se tiran las copias viejas y se
   toma el control de las pestañas que ya estaban abiertas. */
self.addEventListener('activate',(ev)=>{
  ev.waitUntil((async()=>{
    const nombres=await caches.keys();
    await Promise.all(nombres.filter(n=>n!==CACHE).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

/* ---------- Peticiones ---------- */
self.addEventListener('fetch',(ev)=>{
  const pet=ev.request;
  if(pet.method!=='GET')return;

  const url=new URL(pet.url);

  // Fuera de nuestra carpeta no nos metemos: GitHub, las fotos del
  // repositorio y las fuentes van siempre directas a la red.
  if(url.origin!==self.location.origin)return;

  // version.json siempre fresco: es lo que cuenta las novedades.
  if(url.pathname.endsWith('/version.json')){
    ev.respondWith(fetch(pet).catch(()=>caches.match(pet)));
    return;
  }

  // Al abrir una página se sirve la copia guardada de la que toca.
  // Se atienden las dos formas de escribir la dirección de los
  // ajustes, la corta y la larga, porque según el servidor vale una u
  // otra (y puede quedar por ahí algún acceso directo con la otra).
  // Las copias están guardadas con el nombre corto: ver PAGINAS.
  if(pet.mode==='navigate'){
    ev.respondWith((async()=>{
      const ruta=url.pathname;
      const esAjustes=ruta.endsWith('/ajustes')||ruta.endsWith('/ajustes.html');
      const destino=esAjustes?'./ajustes':'./';
      const guardada=await caches.match(destino);
      if(guardada)return guardada;
      try{return await fetch(pet);}
      catch(e){return new Response('Sin conexión',{status:503,statusText:'Sin conexión'});}
    })());
    return;
  }

  // El resto: primero la copia guardada; si no está, la red (y se guarda).
  ev.respondWith((async()=>{
    const guardada=await caches.match(pet);
    if(guardada)return guardada;
    try{
      const respuesta=await fetch(pet);
      if(respuesta.ok&&respuesta.type==='basic'){
        const copia=respuesta.clone();
        caches.open(CACHE).then(c=>c.put(pet,copia));
      }
      return respuesta;
    }catch(e){
      return new Response('Sin conexión',{status:503,statusText:'Sin conexión'});
    }
  })());
});