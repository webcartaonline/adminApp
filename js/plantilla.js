/* =========================================================
   PLANTILLA
   La página que ve el cliente final (la carta) está hecha con
   una PLANTILLA: un diseño con sus propios archivos. Ahora
   mismo hay dos, "Plantilla 1" y "Plantilla 2", y habrá más.

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
   Plantilla 1, la primera que hubo. Sin versión a propósito: así no
   se reutiliza una copia guardada y siempre se baja lo último, que es
   lo prudente cuando no sabemos qué versión corre. */
const PRESENTACION_DE_RESPALDO = {
  id: 'plantilla-1',
  nombre: 'Plantilla 1',
  version: '',
  archivos: ['index.html', 'carta.js', 'estilos.css']
};

/* ---------- Perfil de cada plantilla ----------
   En qué se diferencian las plantillas a la hora de pintar. Hoy las
   dos comparten casi todo; lo que cambia es cómo se ve cada GRUPO:

     · Plantilla 1: el grupo es un PANEL, una tarjeta con marco y
       esquinas redondeadas, un tono más clara que el fondo. Los platos
       y la alerta se leen encima de ese tono. La banda con la foto del
       grupo es más baja: 5 a 1.
     · Plantilla 2: el grupo va ABIERTO, sin marco ni tarjeta: los
       platos y la alerta se leen directamente sobre el fondo de la
       carta. La banda de la foto es 4 a 1. Es además la única que
       pinta las notas de la sección con sus saltos de línea: la
       primera línea es el título y el resto va debajo. En la
       Plantilla 1 la nota sale seguida, en una sola línea.

   Si mañana llega una Plantilla 3, se añade aquí con los mismos
   campos y el editor la entiende sin tocar nada más. */
const PERFILES_DE_PLANTILLA = {
  'plantilla-1': { id: 'plantilla-1', nombre: 'Plantilla 1', grupo: 'panel',   bandaGrupo: [5, 1], notasDeSeccion: false, notaConSaltos: false },
  'plantilla-2': { id: 'plantilla-2', nombre: 'Plantilla 2', grupo: 'abierto', bandaGrupo: [4, 1], notasDeSeccion: true,  notaConSaltos: true }
};

/* El perfil de la plantilla de este local. Si todavía no se sabe
   (nunca se ha cargado la carta) o es una que el editor no conoce,
   se usa el de la Plantilla 1, la misma que el respaldo de arriba. */
function perfilDePlantilla() {
  const id = plantillaEnMemoria && plantillaEnMemoria.plantillaId;
  return PERFILES_DE_PLANTILLA[id] || PERFILES_DE_PLANTILLA[PRESENTACION_DE_RESPALDO.id];
}

/* Deja el editor preparado para la plantilla de este local:
     · marca la página con data-plantilla, por si algún estilo
       necesita distinguirlas;
     · ajusta la forma de la banda de los grupos, para que el marco
       donde se encuadra la foto (y su miniatura en el editor) tenga la
       misma forma que en la carta;
     · y avisa a quien esté escuchando (el editor repinta sus
       miniaturas). */
function aplicarPerfilDePlantilla() {
  const perfil = perfilDePlantilla();
  document.documentElement.dataset.plantilla = perfil.id;
  document.documentElement.style.setProperty('--banda-grupo', perfil.bandaGrupo.join('/'));
  if (typeof IMG_TIPOS !== 'undefined' && IMG_TIPOS.grupo) {
    IMG_TIPOS.grupo.relA = perfil.bandaGrupo[0];
    IMG_TIPOS.grupo.relB = perfil.bandaGrupo[1];
  }
  document.dispatchEvent(new CustomEvent('plantilla-lista', { detail: perfil }));
  return perfil;
}

/* La copia de la plantilla que tenemos ahora mismo en memoria.
   { cliente, plantillaId, nombre, version, archivos:{nombre:texto} } */
let plantillaEnMemoria = null;

/* El identificador de la plantilla que usa este negocio ("plantilla-1",
   "plantilla-2"…), o cadena vacía si todavía no se ha traído ninguna. */
function plantillaEnUso(){
  return plantillaEnMemoria?.plantillaId || '';
}

/* ¿La plantilla de este negocio pinta las notas de la sección? Lo dice
   su perfil (hoy, solo la Plantilla 2). El editor lo usa para no ofrecer
   un adorno que luego no se vería. Mientras no se sepa qué plantilla es,
   no se ofrecen. */
function plantillaConNotasDeSeccion(){
  return !!plantillaEnUso() && perfilDePlantilla().notasDeSeccion === true;
}

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
  aplicarPerfilDePlantilla();
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
   es de la MISMA plantilla, de la MISMA versión y no le falta ningún
   archivo. Lo de «la misma plantilla» importa: si un local pasa de la
   Plantilla 1 a la 2 y las dos van por la misma versión, sin esta
   comprobación la vista previa seguiría enseñando la plantilla vieja. */
function copiaAlDia(guardada, presentacion) {
  if (!guardada || !guardada.archivos) return false;
  if ((guardada.plantillaId || '') !== (presentacion.id || '')) return false;
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
    aplicarPerfilDePlantilla();
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
  aplicarPerfilDePlantilla();

  return { estado: 'ok', descargados: presentacion.archivos.length, total: presentacion.archivos.length };
}
