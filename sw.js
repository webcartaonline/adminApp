/* =========================================================
   EL VIGILANTE (service worker)
   Guarda una copia de la aplicación en el navegador del
   cliente. Gracias a él la aplicación abre al instante,
   funciona sin internet y se puede actualizar de golpe.

   ⚠️ PARA PUBLICAR UNA VERSIÓN NUEVA:
   cambia el número de VERSION aquí abajo y escribe las
   novedades en version.json. Nada más.
   Si no cambias VERSION, el navegador de los clientes no se
   entera de que hay algo nuevo.
   ========================================================= */

const VERSION = '1.2.2';
const CACHE   = `editor-carta-${VERSION}`;

/* Todo lo que hace falta para que la aplicación funcione sin internet.
   Si añades un archivo css o js, apúntalo también aquí. */
const ARCHIVOS = [
  './',
  './index.html',
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
  './css/actualizacion.css',
  './js/config.js',
  './js/utiles.js',
  './js/estado.js',
  './js/tema.js',
  './js/ajustes.js',
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
  './js/actualizacion.js',
  './js/app.js',
  './img/icono-192.png',
  './img/icono-512.png',
  './img/icono-180.png',
  './img/icono-mascara-512.png'
];

/* ---------- Instalación ----------
   Se descarga la versión nueva entera y se guarda aparte.
   NO se activa sola: se queda esperando a que el cliente
   diga que sí desde la ventana de novedades. */
self.addEventListener('install',(ev)=>{
  ev.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ARCHIVOS))
  );
});

/* ---------- Activación ----------
   Ya somos la versión buena: se tiran las copias viejas. */
self.addEventListener('activate',(ev)=>{
  ev.waitUntil((async()=>{
    const nombres=await caches.keys();
    await Promise.all(nombres.filter(n=>n!==CACHE).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

/* ---------- Mensajes desde la aplicación ---------- */
self.addEventListener('message',(ev)=>{
  const tipo=ev.data?.tipo;
  if(tipo==='toma-el-relevo'){self.skipWaiting();return;}
  if(tipo==='que-version'){ev.ports[0]?.postMessage({version:VERSION});return;}
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

  // Al abrir la aplicación se sirve la copia guardada del index.
  if(pet.mode==='navigate'){
    ev.respondWith(
      caches.match('./index.html').then(r=>r||fetch(pet))
    );
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
