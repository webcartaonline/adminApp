/* =========================================================
   CONFIGURACIÓN
   Listas fijas y números que no cambian mientras la
   aplicación funciona. Si hay que tocar un límite o añadir
   un idioma, se toca aquí y en ningún otro sitio.
   ========================================================= */

/* Los 14 alérgenos de declaración obligatoria en la UE. */
const ALERGENOS = ['gluten','crustaceos','huevos','pescado','cacahuetes','soja',
  'lacteos','frutos-secos','apio','mostaza','sesamo','sulfitos','altramuces','moluscos'];

const ETIQUETAS = {
  'gluten':'Gluten','crustaceos':'Crustáceos','huevos':'Huevos','pescado':'Pescado',
  'cacahuetes':'Cacahuetes','soja':'Soja','lacteos':'Lácteos','frutos-secos':'Frutos de cáscara',
  'apio':'Apio','mostaza':'Mostaza','sesamo':'Sésamo','sulfitos':'Sulfitos',
  'altramuces':'Altramuces','moluscos':'Moluscos'
};

const NOMBRE_IDIOMA = { es:'Español', en:'English', fr:'Français', de:'Deutsch', it:'Italiano', pt:'Português' };

/* ---------- Lo que se guarda en este navegador ---------- */
const CLAVE_AJUSTES        = 'editorCartaUniversal.ajustes';
const CLAVE_TEMA           = 'editorCartaUniversal.tema';
const CLAVE_COPIA          = 'editorCartaUniversal.itemCopiado';
const CLAVE_ESPERA         = 'editorCartaUniversal.esperaHasta';
const CLAVE_VERSION_VISTA  = 'editorCartaUniversal.versionVista';
const CLAVE_COLOR          = 'editorCartaUniversal.color';

/* ---------- Espera entre publicaciones ---------- */
const MS_ESPERA = 2*60*1000;   // 2 minutos

/* ---------- Imágenes ----------
   Cada tipo de imagen tiene su propia forma y su propio tamaño.
   La proporción debe coincidir con la de estilos.css de la carta:
     seccion -> .panel__imagen-envoltorio{aspect-ratio:5/2}
     item    -> .item__foto{aspect-ratio:1/1}
   Si allí cambian, cámbialas también aquí. */
const IMG_TIPOS = {
  seccion:{
    etiqueta:'sección', carpeta:'img/secciones',
    relA:5, relB:2,                 // franja ancha
    anchoMax:1600, anchoMin:800,
    peso:400*1024
  },
  item:{
    etiqueta:'plato', carpeta:'img/items',
    relA:1, relB:1,                 // cuadrado exacto
    anchoMax:600, anchoMin:300,     // se ve a ~104 px: 600 sobra hasta en pantallas muy nítidas
    peso:150*1024
  }
};
const IMG_ENTRADA_MAX     = 25*1024*1024; // 25 MB de archivo original
const IMG_MEGAPIXELES_MAX = 80;           // fotos enormes revientan el lienzo del navegador
const PREVIA_ANCHO = 700;                 // el alto se calcula según el tipo
