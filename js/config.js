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
const CLAVE_PANEL_ANCHO    = 'editorCartaUniversal.panelAncho';
const CLAVE_SITIO          = 'editorCartaUniversal.sitio';

/* ---------- Espera entre publicaciones ---------- */
const MS_ESPERA = 2*60*1000;   // 2 minutos

/* ---------- Imágenes ----------
   Cada tipo de imagen tiene su propia forma y su propio tamaño.
   La proporción debe coincidir con la de estilos.css de la carta:
     seccion -> .panel__cabecera--imagen{aspect-ratio:3/1}
     grupo   -> .grupo__cabecera--imagen{aspect-ratio:4/1}
     item    -> .item__foto{aspect-ratio:1/1}
   Si allí cambian, cámbialas también aquí. */
const IMG_TIPOS = {
  seccion:{
    etiqueta:'sección', rotulo:'Sección', demostrativo:'esta sección',
    titulo:'Imagen de la sección', carpeta:'img/secciones',
    relA:3, relB:1,                 // franja ancha, de borde a borde de la pantalla
    anchoMax:1600, anchoMin:800,
    peso:400*1024
  },
  grupo:{
    etiqueta:'grupo', rotulo:'Grupo', demostrativo:'este grupo',
    titulo:'Imagen del grupo', carpeta:'img/grupos',
    relA:4, relB:1,                 // banda más baja que la de la sección
    anchoMax:1400, anchoMin:700,
    peso:300*1024
  },
  item:{
    etiqueta:'plato', rotulo:'Plato', demostrativo:'este plato',
    titulo:'Foto del plato', carpeta:'img/items',
    relA:1, relB:1,                 // cuadrado exacto
    anchoMax:600, anchoMin:300,     // se ve a ~104 px: 600 sobra hasta en pantallas muy nítidas
    peso:150*1024
  }
};

/* ---------- Zona importante de la foto ----------
   Las franjas de sección y grupo ocupan todo el ancho de la pantalla,
   así que en pantallas anchas quedan más bajas de lo que se recortó y
   la foto se recorta un poco más por arriba y por abajo. Esto decide
   qué parte se conserva. Se guarda en el campo "foco". */
const FOCOS = [
  { clave:'arriba', rotulo:'Arriba' },
  { clave:'centro', rotulo:'Centro' },
  { clave:'abajo',  rotulo:'Abajo'  }
];

const IMG_ENTRADA_MAX     = 25*1024*1024; // 25 MB de archivo original
const IMG_MEGAPIXELES_MAX = 80;           // fotos enormes revientan el lienzo del navegador
const PREVIA_ANCHO = 700;                 // el alto se calcula según el tipo