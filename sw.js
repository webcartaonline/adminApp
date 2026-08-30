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

const VERSION = '4.1';
const CACHE   = `editor-carta-${VERSION}`;

/* Todo lo que hace falta para que la aplicación funcione sin internet.
   Si añades un archivo css, js o una página html, apúntalo también
   aquí (y si es una página, en el apartado de navegación de abajo). */
const ARCHIVOS = [
  './',
  './ajustes',
  './manifest.json',
  './css/base.css',
  './css/botones.css',
  './css/formularios.css',
  './css/barra.css',
  './css/ajustes.css',
  './css/arbol.css',
  './css/editor.css',
  './css/estadisticas.css',
  './css/imagenes.css',
  './css/color.css',
  './css/version.css',
  './js/config.js',
  './js/utiles.js',
  './js/estado.js',
  './js/tema.js',
  './js/color.js',
  './js/color-ui.js',
  './js/panel.js',
  './js/ajustes.js',
  './js/pagina-ajustes.js',
  './js/idiomas.js',
  './js/espera.js',
  './js/imagenes.js',
  './js/imagen-recorte.js',
  './js/github.js',
  './js/vista.js',
  './js/vista-arbol.js',
  './js/vista-editor.js',
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

/* ---------- Instalación ----------
   Se descarga la versión nueva entera y se pone en marcha
   sin esperar el visto bueno de nadie. */
self.addEventListener('install',(ev)=>{
  ev.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ARCHIVOS)).then(()=>self.skipWaiting())
  );
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

  // Al abrir la aplicación se sirve la copia guardada de la página
  // que toca. Ojo con las direcciones: Cloudflare quita el '.html' del
  // final y manda a la dirección corta ('/index.html' va a '/', y
  // '/ajustes.html' va a '/ajustes'). Una copia guardada que venga de
  // ese desvío hace que el navegador se niegue a abrirla, así que aquí
  // se piden y se guardan SIEMPRE las direcciones cortas: './' y
  // './ajustes'.
  // Aun así se atiende la forma larga por si queda algún enlace o
  // acceso directo viejo apuntando a '/ajustes.html'.
  if(pet.mode==='navigate'){
    ev.respondWith((async()=>{
      const ruta=url.pathname;
      const esAjustes=ruta.endsWith('/ajustes')||ruta.endsWith('/ajustes.html');
      const destino=esAjustes?'./ajustes':'./';
      const guardada=await caches.match(destino);
      if(guardada)return guardada;
      try{return await fetch(pet);}
      catch(e){return (await caches.match('./'))||new Response('Sin conexión',{status:503});}
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