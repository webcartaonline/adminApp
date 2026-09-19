/* =========================================================
   PLANTILLA
   La página que ve el cliente final (la carta) está hecha con
   una PLANTILLA: un diseño con sus propios archivos. Ahora
   mismo solo hay una, "Plantilla 1", pero habrá más.

   La plantilla se presenta con un archivo diminuto,
   plantilla.json, que dice quién es y qué archivos necesita
   para funcionar. Por ejemplo:

     {
       "id": "plantilla-1",
       "nombre": "Plantilla 1",
       "version": "1.0.0",
       "archivos": ["index.html", "carta.js", "estilos.css"]
     }

   Al pulsar «Cargar carta», además de la carta, el editor lee
   esa presentación y se descarga esos archivos, guardando una
   copia en el navegador de este cliente. Esa copia es la que
   usa la vista previa para pintar la página con los cambios
   sin publicar.

   Estos archivos NO son datos de ningún negocio: son iguales
   para todos, los sirve el Worker de las cartas y se bajan sin
   clave (ver leerArchivoDePlantilla en nube.js).

   EFICIENCIA: no se vuelve a descargar nada si la plantilla no
   ha cambiado. Antes eso se sabía comparando la "huella" de
   cada archivo, que era cosa de GitHub; ahora se compara el
   número de VERSIÓN de la presentación, que consigue lo mismo
   con una sola comprobación. Por eso, al cambiar los archivos
   de una plantilla hay que subirle también la versión: si no,
   los editores seguirán usando su copia guardada.
   ========================================================= */

/* El identificador del cliente vive en ajustes.js, que cargan las dos
   pantallas: así no se define dos veces. Aquí solo se usa:
   clienteActual(). */

/* Con qué quedarse si la plantilla no se presenta (no hay
   plantilla.json, o no se pudo leer). Son los archivos de la
   Plantilla 1, la única que hay hoy. Sin versión a propósito: así no
   se reutiliza una copia guardada y siempre se baja lo último, que es
   lo prudente cuando no sabemos qué versión corre. */
const PRESENTACION_DE_RESPALDO = {
  id: 'plantilla-1',
  nombre: 'Plantilla 1',
  version: '',
  archivos: ['index.html', 'carta.js', 'estilos.css']
};

/* La copia de la plantilla que tenemos ahora mismo en memoria.
   { cliente, plantillaId, nombre, version, archivos:{nombre:texto} } */
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

/* La presentación de la plantilla, o null si no se pudo leer. */
async function leerPresentacionDeLaPlantilla() {
  try {
    const presentacion = JSON.parse(await leerArchivoDePlantilla('plantilla.json'));
    const tieneArchivos = Array.isArray(presentacion.archivos) && presentacion.archivos.length;
    return tieneArchivos ? presentacion : null;
  } catch {
    return null;   // no se presenta: más abajo se usa el respaldo
  }
}

/* ¿Sirve la copia guardada, o hay que volver a descargar? Solo sirve si
   es de la MISMA versión y no le falta ningún archivo. */
function copiaAlDia(guardada, presentacion) {
  if (!guardada || !guardada.archivos) return false;
  if (!presentacion.version || guardada.version !== presentacion.version) return false;
  return presentacion.archivos.every((nombre) => guardada.archivos[nombre] != null);
}

/* Pone al día los archivos de la plantilla. Se llama desde traer()
   (publicar.js). Devuelve un pequeño parte de lo ocurrido. Si algo va
   mal, la vista previa se queda con la copia anterior (o sin ella) pero
   la carta se carga igual: quien llama recoge el fallo sin ruido. */
async function sincronizarPlantilla() {
  const cliente = clienteActual();

  let guardada = null;
  try { guardada = await Almacen.leer('plantilla', cliente); } catch { /* sin copia previa */ }

  // Si algo falla más abajo, mejor quedarse con la copia de antes que
  // sin vista previa ninguna.
  plantillaEnMemoria = guardada || null;

  const presentacion = (await leerPresentacionDeLaPlantilla()) || PRESENTACION_DE_RESPALDO;

  if (copiaAlDia(guardada, presentacion)) {
    return { estado: 'ok', descargados: 0, total: presentacion.archivos.length };
  }

  const archivos = {};
  for (const nombre of presentacion.archivos) {
    archivos[nombre] = await leerArchivoDePlantilla(nombre);
  }

  const copia = {
    cliente,
    plantillaId: presentacion.id || '',
    nombre: presentacion.nombre || '',
    version: presentacion.version || '',
    archivos,
    fecha: new Date().toISOString()
  };

  try { await Almacen.guardar('plantilla', copia); } catch { /* sin cajón: se usa solo en memoria */ }
  plantillaEnMemoria = copia;

  return { estado: 'ok', descargados: presentacion.archivos.length, total: presentacion.archivos.length };
}
