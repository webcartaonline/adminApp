/* =========================================================
   ALMACÉN
   Un cajón guardado en el navegador para lo que no cabe (ni
   conviene) en localStorage: los archivos de la plantilla que
   se descargan al vincular la página, y las fotos que aún no
   se han publicado pero hay que poder enseñar en la vista
   previa.

   Es el mismo cajón para las dos pantallas del editor (la de
   editar la carta y la de los ajustes de la página), así que
   los cambios hechos en una se ven en la vista previa de la
   otra. Se organiza por CLIENTE (cuenta + repositorio + rama)
   para que nunca se mezclen dos locales distintos.

   Todo aquí es asíncrono (devuelve promesas). Si el navegador
   fuera muy viejo y no tuviera este cajón, las llamadas fallan
   sin más y quien llama lo recoge: nada se rompe.
   ========================================================= */

const Almacen = (function () {
  const NOMBRE = 'vistaPrevia';
  const VERSION = 1;

  /* Los tres apartados del cajón:
       plantilla  -> los archivos de la página vinculada (html, js, css)
       apariencia -> el borrador de colores/portada/pie sin publicar
       imagenes   -> fotos sin publicar (portada y logo), en base64 */
  const APARTADOS = ['plantilla', 'apariencia', 'imagenes'];

  let promesaDb = null;

  function abrir() {
    if (promesaDb) return promesaDb;
    promesaDb = new Promise((resolver, rechazar) => {
      let sol;
      try { sol = indexedDB.open(NOMBRE, VERSION); }
      catch (e) { rechazar(e); return; }
      sol.onupgradeneeded = () => {
        const db = sol.result;
        if (!db.objectStoreNames.contains('plantilla'))
          db.createObjectStore('plantilla', { keyPath: 'cliente' });
        if (!db.objectStoreNames.contains('apariencia'))
          db.createObjectStore('apariencia', { keyPath: 'cliente' });
        if (!db.objectStoreNames.contains('imagenes'))
          db.createObjectStore('imagenes', { keyPath: 'clave' });
      };
      sol.onsuccess = () => resolver(sol.result);
      sol.onerror = () => rechazar(sol.error);
    });
    return promesaDb;
  }

  /* Una operación suelta sobre un apartado. Se resuelve cuando la
     transacción termina de verdad, no solo cuando responde la petición:
     así al guardar tenemos la certeza de que quedó escrito. */
  async function operar(apartado, modo, hacer) {
    if (!APARTADOS.includes(apartado)) throw new Error(`apartado desconocido: ${apartado}`);
    const db = await abrir();
    return new Promise((resolver, rechazar) => {
      const tx = db.transaction(apartado, modo);
      const almacen = tx.objectStore(apartado);
      let peticion;
      try { peticion = hacer(almacen); }
      catch (e) { rechazar(e); return; }
      tx.oncomplete = () => resolver(peticion ? peticion.result : undefined);
      tx.onerror = () => rechazar(tx.error);
      tx.onabort = () => rechazar(tx.error);
    });
  }

  return {
    leer:    (apartado, clave) => operar(apartado, 'readonly',  st => st.get(clave)),
    guardar: (apartado, valor) => operar(apartado, 'readwrite', st => st.put(valor)),
    borrar:  (apartado, clave) => operar(apartado, 'readwrite', st => st.delete(clave)),
    listar:  (apartado)        => operar(apartado, 'readonly',  st => st.getAll())
  };
})();