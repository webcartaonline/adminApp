/* =========================================================
   PLANTILLA
   La página que ve el cliente final (la carta) está hecha con
   una PLANTILLA: un diseño con sus propios archivos. Ahora
   mismo solo hay una, "Plantilla 1", pero habrá más.

   La propia página se presenta con un archivo diminuto,
   plantilla.json, que vive al lado de carta.json y dice quién
   es y qué archivos necesita para funcionar. Por ejemplo:

     {
       "id": "plantilla-1",
       "nombre": "Plantilla 1",
       "version": "1.0.0",
       "archivos": ["index.html", "carta.js", "estilos.css"]
     }

   Al pulsar «Traer de GitHub», además de la carta, el editor
   lee esa presentación y se descarga esos archivos, guardando
   una copia en el navegador de este cliente. Esa copia es la
   que usa la vista previa para pintar la página con los
   cambios sin publicar.

   IMPORTANTE (eficiencia): en cada «Traer» se comprueba si los
   archivos han cambiado en GitHub comparando su "huella" (sha).
   Solo se vuelve a descargar lo que de verdad ha cambiado; lo
   demás se reutiliza de la copia guardada. Así, si actualizas
   la plantilla de un cliente, el editor se pone al día solo.
   ========================================================= */

/* El identificador del cliente (cuenta + repositorio + rama) vive en
   ajustes.js, que cargan las dos pantallas: así no se define dos veces.
   Aquí solo se usa: clienteActual(). */

/* Carpeta donde vive carta.json dentro del repo ('' si está en la raíz).
   Los archivos de la plantilla se buscan en esa misma carpeta. */
function carpetaDelManifiesto(ruta) {
  const partes = String(ruta || 'carta.json').split('/');
  partes.pop();
  return partes.join('/');
}

/* La copia de la plantilla que tenemos ahora mismo en memoria.
   { cliente, plantillaId, nombre, version, archivos:{nombre:texto}, shas } */
let plantillaEnMemoria = null;

/* ¿Hay una plantilla lista para pintar la vista previa? */
function hayPlantilla() {
  return !!(plantillaEnMemoria && plantillaEnMemoria.archivos &&
            Object.keys(plantillaEnMemoria.archivos).length);
}

/* Al abrir el editor recuperamos la última copia guardada (si la hay),
   por si el cliente quiere ver la vista previa sin volver a traer. */
async function cargarPlantillaGuardada() {
  try { plantillaEnMemoria = (await Almacen.leer('plantilla', clienteActual())) || null; }
  catch { plantillaEnMemoria = null; }
  return plantillaEnMemoria;
}

/* Sincroniza los archivos de la plantilla con lo que hay en GitHub.
   Se llama desde traer() (github.js) con los mismos ajustes y cabeceras
   que ya se usan para la carta. Devuelve un pequeño parte de lo ocurrido
   y nunca lanza por cosas menores: si algo va mal, la vista previa
   simplemente quedará no disponible, pero la carta se carga igual. */
async function sincronizarPlantilla(a, cab) {
  a = a || leerAjustes();
  const cliente = clienteActual(a);
  const dir = carpetaDelManifiesto(a.ruta);
  const ref = a.rama || 'main';
  const base = `https://api.github.com/repos/${a.owner}/${a.repo}/contents`;
  const enDir = (nombre) => `${base}/${dir ? dir + '/' : ''}${nombre}?ref=${ref}`;

  /* 1) La presentación de la página (plantilla.json). */
  let manifiesto = null;
  try {
    const r = await fetch(enDir('plantilla.json'), { headers: cab, cache: 'no-store' });
    if (r.ok) manifiesto = JSON.parse(deBase64((await r.json()).content));
  } catch { /* la página no se presenta: no hay vista previa */ }

  if (!manifiesto || !Array.isArray(manifiesto.archivos) || !manifiesto.archivos.length) {
    plantillaEnMemoria = null;
    return { estado: 'sin-plantilla' };
  }

  /* 2) Las huellas actuales de todos los archivos de esa carpeta, de una
        sola vez. Con eso sabemos qué ha cambiado sin descargar nada aún. */
  const shaActual = {};
  try {
    const r = await fetch(`${base}/${dir}?ref=${ref}`, { headers: cab, cache: 'no-store' });
    if (r.ok) {
      const lista = await r.json();
      if (Array.isArray(lista)) lista.forEach(f => { shaActual[f.name] = f.sha; });
    }
  } catch { /* si el listado falla, más abajo se descargan igualmente */ }

  /* 3) Lo que ya teníamos guardado, para reutilizar lo que no cambió. */
  let guardada = null;
  try { guardada = await Almacen.leer('plantilla', cliente); } catch { /* sin copia previa */ }
  const archivosPrev = (guardada && guardada.archivos) || {};
  const shasPrev = (guardada && guardada.shas) || {};

  /* 4) Archivo por archivo: si la huella coincide con la guardada, se
        reutiliza; si no, se descarga la versión nueva. */
  const archivos = {};
  const shas = {};
  let descargados = 0;
  for (const nombre of manifiesto.archivos) {
    const sha = shaActual[nombre];
    if (sha && sha === shasPrev[nombre] && archivosPrev[nombre] != null) {
      archivos[nombre] = archivosPrev[nombre];
      shas[nombre] = sha;
      continue;
    }
    const rf = await fetch(enDir(nombre), { headers: cab, cache: 'no-store' });
    if (!rf.ok) throw new Error(`no se ha podido traer «${nombre}» de la plantilla (${rf.status}).`);
    const cf = await rf.json();
    archivos[nombre] = deBase64(cf.content);
    shas[nombre] = cf.sha;
    descargados++;
  }

  const meta = {
    cliente,
    plantillaId: manifiesto.id || '',
    nombre: manifiesto.nombre || '',
    version: manifiesto.version || '',
    archivos, shas,
    fecha: new Date().toISOString()
  };
  try { await Almacen.guardar('plantilla', meta); } catch { /* sin cajón: se usa solo en memoria */ }
  plantillaEnMemoria = meta;

  return { estado: 'ok', descargados, total: manifiesto.archivos.length };
}