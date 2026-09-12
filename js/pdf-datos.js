/* =========================================================
   PDF DE LA CARTA · DATOS
   Trae la carta TAL Y COMO ESTÁ PUBLICADA en internet (no lo
   que el cliente tenga a medias en el navegador) y prepara lo
   necesario para dibujarla en papel:
     · la carta y la apariencia publicadas,
     · las fotos convertidas a un formato que se pueda meter
       dentro del PDF sin depender de internet,
     · los colores ya «cocinados» a partir de los dos o tres
       que eligió el negocio, igual que hace la carta real.
   ========================================================= */

/* Dirección «en crudo» de un archivo publicado en el repositorio. */
function pdfUrlPublicada(a, nombre) {
  return `https://raw.githubusercontent.com/${a.owner}/${a.repo}/${a.rama || 'main'}/${carpetaDeLaCarta(a.ruta)}${nombre}`;
}

/* ---------- Cocina de colores ----------
   Copiada de la carta pública para que el papel salga con los
   mismos tonos derivados (bordes, textos apagados…). Devuelve un
   mapa de variables de CSS; NO toca la página del editor. */
const PDF_COLORES_DEFECTO = { principal: '#E9B44C', fondo: '#12100E', texto: 'auto' };

function pdfHexARgb(hex) {
  const limpio = String(hex ?? '').trim().replace('#', '');
  const largo = limpio.length === 3 ? limpio.split('').map(c => c + c).join('') : limpio;
  if (!/^[0-9a-fA-F]{6}$/.test(largo)) return null;
  const n = parseInt(largo, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function pdfRgbAHex({ r, g, b }) {
  const c = x => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function pdfMezclar(hexA, hexB, cuanto) {
  const a = pdfHexARgb(hexA), b = pdfHexARgb(hexB);
  if (!a || !b) return hexA;
  return pdfRgbAHex({ r: a.r + (b.r - a.r) * cuanto, g: a.g + (b.g - a.g) * cuanto, b: a.b + (b.b - a.b) * cuanto });
}
function pdfConTransparencia(hex, alfa) {
  const c = pdfHexARgb(hex);
  return c ? `rgba(${c.r},${c.g},${c.b},${alfa})` : hex;
}
function pdfEsColorClaro(hex) {
  const c = pdfHexARgb(hex);
  if (!c) return false;
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255 > 0.55;
}

/* De los colores elegidos por el negocio saca TODOS los tonos y los
   devuelve en dos formas: como variables de CSS (para pintar) y como
   paleta suelta (para las etiquetas y alertas, que llevan el color
   escrito a mano en cada una). */
function pdfCalcularColores(colores) {
  const c = { ...PDF_COLORES_DEFECTO, ...(colores || {}) };
  const principal = pdfHexARgb(c.principal) ? c.principal : PDF_COLORES_DEFECTO.principal;
  const fondo = pdfHexARgb(c.fondo) ? c.fondo : PDF_COLORES_DEFECTO.fondo;
  const claro = pdfEsColorClaro(fondo);
  const texto = pdfHexARgb(c.texto) ? c.texto : (claro ? '#1A1611' : '#F4EFE7');
  const hondo = pdfMezclar(fondo, claro ? '#FFFFFF' : '#000000', 0.35);

  const vars = {
    '--ambar': principal,
    '--ambar-hondo': pdfMezclar(principal, '#000000', 0.22),
    '--noche': fondo,
    '--noche-alto': pdfMezclar(fondo, texto, 0.05),
    '--noche-hondo': hondo,
    '--borde': pdfMezclar(fondo, texto, 0.14),
    '--borde-claro': pdfMezclar(fondo, texto, 0.22),
    '--hueso': texto,
    '--hueso-medio': pdfMezclar(texto, fondo, 0.3),
    '--hueso-suave': pdfMezclar(texto, fondo, 0.48),
    '--ladrillo': '#D2603A',
    '--salvia': '#86A98C',
    '--acento-halo': pdfConTransparencia(principal, 0.16)
  };
  const paleta = { principal, fondo, texto, superficie: pdfMezclar(fondo, texto, 0.05) };
  return { vars, paleta };
}

/* ---------- Fotos ----------
   Cada foto se baja una sola vez y se guarda ya convertida, para no
   volver a pedirla si el cliente cambia de opción. El formato final
   (una dirección «data:…») viaja dentro del propio PDF: así el PDF
   no necesita internet para verse. */
const pdfCacheImagenes = new Map();

async function pdfImagenAdato(url) {
  if (pdfCacheImagenes.has(url)) return pdfCacheImagenes.get(url);
  const promesa = (async () => {
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) throw new Error(String(r.status));
    const blob = await r.blob();
    return await new Promise((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(lector.result);
      lector.onerror = () => mal(new Error('lectura'));
      lector.readAsDataURL(blob);
    });
  })().catch(() => null);   // una foto que no baja no debe tumbar el PDF
  pdfCacheImagenes.set(url, promesa);
  return promesa;
}

/* Baja en paralelo, pero de pocas en pocas, para no saturar la red
   ni la memoria del móvil. */
async function pdfBajarEnLotes(urls, tam = 6) {
  const unicas = [...new Set(urls.filter(Boolean))];
  for (let i = 0; i < unicas.length; i += tam) {
    await Promise.all(unicas.slice(i, i + tam).map(u => pdfImagenAdato(u)));
  }
}

/* ---------- ¿Qué tipos de foto trae la carta? ----------
   Sirve para apagar en la ventana los interruptores de un tipo que
   no tenga ninguna foto (no engañar con una opción que no hará nada).
   Manda el interruptor general de imágenes de la carta. */
function pdfTiposDeImagen(carta) {
  const hay = { seccion: false, grupo: false, item: false };
  const master = carta?.negocio?.imagenes === true;
  if (!master) return hay;
  for (const s of (carta.secciones || [])) {
    if (s.imagen) hay.seccion = true;
    for (const g of (s.grupos || [])) {
      if (g.imagen) hay.grupo = true;
      for (const it of (g.items || [])) if (it.imagen) hay.item = true;
    }
  }
  return hay;
}

/* ---------- Traer todo ----------
   Devuelve un paquete con la carta publicada, la apariencia, los
   colores ya cocinados, los idiomas y qué tipos de foto hay. Lanza
   un error con un mensaje claro si falta la conexión o el archivo. */
async function pdfCartaPublicada() {
  const a = leerAjustes();
  if (!a.owner || !a.repo || !a.ruta) {
    throw new Error('Faltan datos de conexión. Entra en «Ajustes» y complétalos.');
  }

  let carta;
  try {
    const r = await fetch(pdfUrlPublicada(a, 'carta.json'), { cache: 'no-store' });
    if (r.status === 404) throw new Error('Todavía no hay ninguna carta publicada.');
    if (!r.ok) throw new Error('no se ha podido leer la carta (' + r.status + ').');
    carta = await r.json();
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Sin conexión: el PDF se genera desde la carta publicada y hace falta internet.');
    throw e;
  }

  // La apariencia puede no existir: es normal si el negocio no ha
  // personalizado nada. En ese caso valen los colores de siempre.
  let apariencia = null;
  try {
    const r = await fetch(pdfUrlPublicada(a, 'apariencia.json'), { cache: 'no-store' });
    if (r.ok) apariencia = await r.json();
  } catch { /* se queda sin apariencia propia */ }

  // Compatibilidad con cartas antiguas sin «secciones».
  if (!carta.secciones && carta.grupos) {
    carta.secciones = [{ id: 's-general', nombre: { es: 'Carta', en: 'Menu' }, grupos: carta.grupos }];
  }

  const idiomas = detectarIdiomas(carta);
  const { vars, paleta } = pdfCalcularColores(apariencia?.colores);

  return {
    ajustes: a,
    carta,
    apariencia,
    idiomas,
    colores: vars,
    paleta,
    tipos: pdfTiposDeImagen(carta),
    urlDe: (rutaRelativa) => pdfUrlPublicada(a, sinVersion(rutaRelativa))
  };
}