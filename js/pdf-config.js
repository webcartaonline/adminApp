/* =========================================================
   PDF DE LA CARTA · CONFIGURACIÓN
   Listas fijas y números que no cambian mientras la
   aplicación funciona: los tamaños de papel, los textos
   fijos que van en el PDF y el catálogo de alérgenos.
   Si hay que añadir un tamaño o cambiar un texto, se toca
   aquí y en ningún otro sitio.
   ========================================================= */

/* ---------- Tamaños de papel ----------
   Los más usados en hostelería. Las medidas van SIEMPRE en
   vertical (ancho × alto, en milímetros); la orientación
   apaisada se calcula sola girando estas dos cifras. */
const PDF_TAMANOS = {
  a3:     { rotulo: 'A3',                    ancho: 297, alto: 420 },
  a4:     { rotulo: 'A4',                    ancho: 210, alto: 297 },
  a5:     { rotulo: 'A5',                    ancho: 148, alto: 210 },
  tercio: { rotulo: 'Tercio de A4 (alargado)', ancho: 99,  alto: 210 },
  carta:  { rotulo: 'Carta (US Letter)',    ancho: 216, alto: 279 }
};
const PDF_TAMANO_DEFECTO = 'a4';

/* Márgenes de papel, en milímetros. */
const PDF_MARGEN_DEFECTO = 12;
const PDF_MARGEN_MIN = 0;
const PDF_MARGEN_MAX = 40;

/* ---------- Conversiones de medida ----------
   El navegador piensa en píxeles y el papel, en milímetros.
   A 96 puntos por pulgada, un milímetro son 3,7795 píxeles. */
const PDF_PX_POR_MM = 96 / 25.4;      // milímetros -> píxeles de pantalla
const PDF_PT_A_PX   = 96 / 72;        // puntos de imprenta -> píxeles

/* Ancho mínimo cómodo de una columna de lectura, en milímetros.
   Con esto se decide cuántas columnas caben cuando la opción de
   columnas está en «Automática». */
const PDF_COL_MIN_MM = 92;
const PDF_COL_MAX = 4;

/* Nitidez del PDF: cuántos píxeles reales se dibujan por cada píxel
   de pantalla al «fotografiar» cada página. Más = más nítido pero
   más pesado. Se limita el lado mayor para no agotar la memoria del
   móvil con papeles grandes. */
const PDF_ESCALA = 2;
const PDF_LADO_MAX_PX = 2600;

/* ---------- Textos fijos del PDF ----------
   Los mismos que enseña la carta pública (carta.js), para que el
   papel hable igual que la pantalla. */
const PDF_UI = {
  es: {
    alergenosTitulo: 'Alérgenos',
    contiene: 'Contiene',
    sinAlergenos: 'Sin alérgenos declarados',
    ivaNota: 'IVA incluido',
    continua: '(continúa)'
  },
  en: {
    alergenosTitulo: 'Allergens',
    contiene: 'Contains',
    sinAlergenos: 'No declared allergens',
    ivaNota: 'VAT included',
    continua: '(continued)'
  }
};

/* Nombre en cristiano de cada idioma, para los rótulos de la ventana. */
const PDF_NOMBRE_IDIOMA = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português' };

/* ---------- Catálogo de alérgenos ----------
   Los 14 de declaración obligatoria, con el MISMO dibujo (icono)
   que usa la carta pública, para que las pastillas salgan idénticas
   en el papel. Copiado de la plantilla; si allí cambian los iconos,
   cámbialos también aquí. */
const PDF_ALERGENOS = {
  'gluten':       { es: 'Cereales con gluten', en: 'Cereals with gluten',
    icono: '<path d="M12 21V6"/><path d="M12 12c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4Z"/><path d="M12 12c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4Z"/><path d="M12 17c-2.4 0-4-1.6-4-4 2.4 0 4 1.6 4 4Z"/><path d="M12 17c2.4 0 4-1.6 4-4-2.4 0-4 1.6-4 4Z"/>' },
  'crustaceos':   { es: 'Crustáceos', en: 'Crustaceans',
    icono: '<path d="M17 6c-5 0-9 3.4-9 7.5 0 2.6 1.8 4.5 4.2 4.5 2 0 3.3-1.3 3.3-2.9 0-1.4-1-2.4-2.3-2.4"/><path d="M17 6c1.7 0 2.9.9 3.5 2.2"/><path d="M8 13.6 4.2 16M8.7 16.2 5.2 18.8"/>' },
  'huevos':       { es: 'Huevos', en: 'Eggs',
    icono: '<path d="M12 3.5c3.3 0 6 4.2 6 8.2 0 4-2.7 7.3-6 7.3s-6-3.3-6-7.3c0-4 2.7-8.2 6-8.2Z"/><circle cx="12" cy="12.4" r="2.6"/>' },
  'pescado':      { es: 'Pescado', en: 'Fish',
    icono: '<path d="M4.5 12c2.8-3.8 6-5.6 9.3-5.6 2.6 0 4.6 1 6.2 2.6-1 1.2-1 4.8 0 6-1.6 1.6-3.6 2.6-6.2 2.6-3.3 0-6.5-1.8-9.3-5.6Z"/><path d="M4.5 12 8 9.4M4.5 12 8 14.6"/><circle cx="16.8" cy="10.6" r=".9" fill="currentColor" stroke="none"/>' },
  'cacahuetes':   { es: 'Cacahuetes', en: 'Peanuts',
    icono: '<path d="M12 4.4c2.3 0 4 1.7 4 3.8 0 1.5-.9 2.3-.9 3.8s.9 2.3.9 3.8c0 2.1-1.7 3.8-4 3.8s-4-1.7-4-3.8c0-1.5.9-2.3.9-3.8S8 9.7 8 8.2c0-2.1 1.7-3.8 4-3.8Z"/>' },
  'soja':         { es: 'Soja', en: 'Soya',
    icono: '<path d="M6 17.5c-1.6-1.6-1.6-4.2 0-5.8l6-6c1.6-1.6 4.2-1.6 5.8 0 1.6 1.6 1.6 4.2 0 5.8l-6 6c-1.6 1.6-4.2 1.6-5.8 0Z"/><circle cx="9.4" cy="14.6" r="1.5"/><circle cx="14.6" cy="9.4" r="1.5"/>' },
  'lacteos':      { es: 'Lácteos', en: 'Milk',
    icono: '<path d="M8 9.5h8V20H8z"/><path d="M8 9.5 9.9 4h4.2L16 9.5"/><path d="M8 13.4h8"/>' },
  'frutos-secos': { es: 'Frutos de cáscara', en: 'Tree nuts',
    icono: '<path d="M12 3.8c3.5 0 6.5 3.6 6.5 8 0 4.6-3 8.4-6.5 8.4S5.5 16.4 5.5 11.8c0-4.4 3-8 6.5-8Z"/><path d="M12 20.2V6.6"/><path d="M12 12.6c1.5-1.6 3.1-2.5 4.7-2.7M12 12.6c-1.5-1.6-3.1-2.5-4.7-2.7"/>' },
  'apio':         { es: 'Apio', en: 'Celery',
    icono: '<path d="M8.3 21c-.7-4.5-.6-9 .5-13.4M12 21c0-5 .1-10 .6-13.9M15.7 21c.7-4.5.6-9-.5-13.4"/>' },
  'mostaza':      { es: 'Mostaza', en: 'Mustard',
    icono: '<path d="M9 21h6a1.5 1.5 0 0 0 1.5-1.5V11a4.5 4.5 0 0 0-3-4.2V4.5h-3v2.3A4.5 4.5 0 0 0 7.5 11v8.5A1.5 1.5 0 0 0 9 21Z"/><path d="M7.5 13.4h9"/>' },
  'sesamo':       { es: 'Sésamo', en: 'Sesame',
    icono: '<ellipse cx="8.5" cy="9" rx="2" ry="3.1" transform="rotate(-25 8.5 9)"/><ellipse cx="15.6" cy="10.6" rx="2" ry="3.1" transform="rotate(22 15.6 10.6)"/><ellipse cx="11.6" cy="16.4" rx="2" ry="3.1" transform="rotate(-8 11.6 16.4)"/>' },
  'sulfitos':     { es: 'Sulfitos', en: 'Sulphites',
    icono: '<path d="M7.5 3.5h9l-.8 6a3.7 3.7 0 0 1-7.4 0Z"/><path d="M12 15.3V20"/><path d="M8.6 20h6.8"/>' },
  'altramuces':   { es: 'Altramuces', en: 'Lupin',
    icono: '<circle cx="9" cy="8.8" r="3.2"/><circle cx="15.4" cy="11.6" r="3.2"/><circle cx="10.4" cy="16.2" r="3.2"/>' },
  'moluscos':     { es: 'Moluscos', en: 'Molluscs',
    icono: '<path d="M12 20c-4.4 0-8-3.4-8-7.6C4 8 7.6 4 12 4s8 4 8 8.4c0 4.2-3.6 7.6-8 7.6Z"/><path d="M12 20V4M12 20 7.1 6.7M12 20l4.9-13.3"/>' }
};

const PDF_ICONO_DESCONOCIDO = '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.4a2.3 2.3 0 1 1 2.9 2.2c-.5.2-.7.6-.7 1.1v.6"/><circle cx="12" cy="16.4" r=".9" fill="currentColor" stroke="none"/>';

/* ---------- Opciones por defecto de la ventana ---------- */
function pdfOpcionesDefecto() {
  return {
    tamano: PDF_TAMANO_DEFECTO,
    orientacion: 'vertical',        // 'vertical' | 'apaisado'
    columnas: 'auto',               // 'auto' | 1 | 2 | 3 | 4
    idioma: null,                   // se rellena con el idioma principal de la carta
    margenes: { arriba: PDF_MARGEN_DEFECTO, abajo: PDF_MARGEN_DEFECTO, izquierda: PDF_MARGEN_DEFECTO, derecha: PDF_MARGEN_DEFECTO },
    margenesIguales: true,
    portada: true,                  // ¿página de portada al principio?
    mostrarTitulo: true,            // en la portada
    mostrarLogo: true,              // en la portada
    imagenes: { seccion: false, grupo: false, item: false }
  };
}