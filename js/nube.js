/* =========================================================
   NUBE
   El ÚNICO archivo que sabe dónde vive el servidor.

   Antes, cada parte del editor se montaba sus propias
   direcciones de api.github.com a mano: diez archivos
   distintos hablando con GitHub cada uno a su manera.
   Ahora todos preguntan aquí.

   Si algún día cambia el servidor, se toca este archivo y
   ningún otro.
   ========================================================= */

/* ---------- Dónde está todo ----------
   Esto NO lo escribe el cliente: va fijo en el código. El cliente
   solo pone su nombre de negocio y su clave en «Ajustes». */
const NUBE = {

  /* El portero. Lee y escribe los datos del cliente, y es lo único
     que puede tocar los almacenes. Sabe de qué negocio viene cada
     petición por la clave, así que no depende de ningún dominio. */
  portero: 'https://webcarta-publicar.webcartaonline.workers.dev',

  /* De dónde se MIRAN las fotos que ya están publicadas, para las
     vistas previas del editor. Tienen que ser direcciones públicas y
     sin clave, porque una etiqueta <img> no sabe enviar claves.

     Mientras no haya dominio: las sirve el Worker de las cartas, de
     la carpeta que va subida con la página.
     El día del dominio: cambiar a 'https://fotos.webcartaonline.com'
     y poner porCliente en true. Nada más. */
  fotos: 'https://webcarta.webcartaonline.workers.dev',
  fotosPorCliente: false
};

/* ---------- Errores con mensaje en claro ----------
   El portero contesta con un código y un motivo. Aquí se traducen a
   algo que el dueño de un bar entienda, en vez de "403". */
const MOTIVOS_DE_LA_NUBE = {
  401: 'La clave no es correcta. Revísala en «Ajustes».',
  402: 'Tu licencia ha caducado. Renueva para poder seguir editando.',
  403: 'Tu plan no incluye esto.',
  404: 'No se ha encontrado.',
  413: 'El archivo es demasiado grande.',
  415: 'Ese tipo de archivo no se admite.'
};

class ErrorDeLaNube extends Error {
  constructor(estado, motivo) {
    super(motivo || MOTIVOS_DE_LA_NUBE[estado] || `El servidor respondió ${estado}.`);
    this.estado = estado;
    this.esDeLaNube = true;
  }
}

/* ¿Se puede hablar con el servidor? Falta la clave o el negocio. */
function nubeConfigurada() {
  const a = leerAjustes();
  return !!(String(a.cliente || '').trim() && String(a.clave || '').trim());
}

/* ---------- La llamada, en un solo sitio ---------- */

async function llamarAlPortero(camino, opciones = {}) {
  const a = leerAjustes();
  const cliente = String(a.cliente || '').trim();
  const clave = String(a.clave || '').trim();

  if (!cliente || !clave) {
    throw new ErrorDeLaNube(0, 'Faltan el negocio o la clave. Entra en «Ajustes» y complétalos.');
  }

  let respuesta;
  try {
    respuesta = await fetch(`${NUBE.portero}${camino}`, {
      ...opciones,
      cache: 'no-store',
      headers: {
        'X-Cliente': cliente,
        Authorization: `Bearer ${clave}`,
        ...(opciones.headers || {})
      }
    });
  } catch {
    // Ni siquiera se ha llegado al servidor: sin red, o el portero caído.
    throw new ErrorDeLaNube(0, 'No hay conexión con el servidor. Comprueba tu internet.');
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new ErrorDeLaNube(respuesta.status, cuerpo.motivo);
  }

  return respuesta;
}

/* ---------- Lo que el editor necesita ---------- */

/* El plan del cliente y qué le deja hacer. Es la única verdad sobre
   los permisos: ya no se sacan del carta.json, que es un archivo que
   el propio cliente sube y podría retocar. */
async function leerEstadoDeLicencia() {
  const r = await llamarAlPortero('/estado');
  return r.json();
}

/* Lee carta.json o apariencia.json. Devuelve null si el negocio
   todavía no tiene ese archivo, que es normal la primera vez. */
async function leerDeLaNube(archivo) {
  try {
    const r = await llamarAlPortero(`/datos/${archivo}`);
    return await r.json();
  } catch (fallo) {
    if (fallo.estado === 404) return null;
    throw fallo;
  }
}

const leerCarta      = () => leerDeLaNube('carta.json');
const leerApariencia = () => leerDeLaNube('apariencia.json');

/* Guarda carta.json o apariencia.json. El portero valida que sea un
   JSON correcto antes de aceptarlo, así que una carta rota nunca
   llega a la web del cliente. */
async function guardarEnLaNube(archivo, datos) {
  await llamarAlPortero(`/datos/${archivo}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos, null, 2)
  });
}

const guardarCarta      = (datos) => guardarEnLaNube('carta.json', datos);
const guardarApariencia = (datos) => guardarEnLaNube('apariencia.json', datos);

/* Sube una foto o una fuente. Se manda el archivo tal cual, sin
   convertirlo a base64: GitHub lo exigía, el portero no. Eso ahorra un
   tercio del peso en cada subida. */
async function subirArchivo(ruta, blob) {
  await llamarAlPortero(`/archivos/${ruta}`, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob
  });
}

/* Borra un archivo. Si ya no estaba, no pasa nada: el resultado es el
   mismo, el archivo no existe. */
async function borrarArchivo(ruta) {
  try {
    await llamarAlPortero(`/archivos/${ruta}`, { method: 'DELETE' });
  } catch (fallo) {
    if (fallo.estado !== 404) throw fallo;
  }
}

/* ---------- Ver un archivo ya publicado ----------
   Devuelve una dirección pública, para meterla en un <img src="…"> o en
   un @font-face. No lleva clave, y no hace falta: son los mismos
   archivos que cualquiera ve en la carta del bar.

   El ?v= del final lo pone el editor para saltarse la caché del
   navegador cuando una foto se acaba de cambiar; aquí se respeta. */
function urlPublica(rutaEnCarta) {
  const ruta = String(rutaEnCarta || '').trim();
  if (!ruta) return '';
  const carpeta = NUBE.fotosPorCliente
    ? `${String(leerAjustes().cliente || '').trim()}/`
    : '';
  return `${NUBE.fotos}/${carpeta}${ruta.replace(/^\/+/, '')}`;
}

/* ---------- Archivos de la plantilla ----------
   Los que hacen falta para la vista previa dentro del editor
   (index.html, carta.js, estilos.css). No son datos de ningún
   cliente: son iguales para todos, así que se bajan sin clave del
   Worker de las cartas. */
async function leerArchivoDePlantilla(nombre) {
  const r = await fetch(`${NUBE.fotos}/${nombre}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`No se ha podido traer ${nombre} (${r.status}).`);
  return r.text();
}
