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

/* ---------- Imágenes de la carta ----------
   Secciones, grupos y platos. Cada tipo tiene su propia forma y su
   propio tamaño. La proporción debe coincidir con la de estilos.css
   de la carta:
     seccion -> .panel__cabecera--imagen{aspect-ratio:3/1}
     grupo   -> .grupo__cabecera--imagen{aspect-ratio:4/1}
     item    -> .item__foto{aspect-ratio:1/1}
   Si allí cambian, cámbialas también aquí.

   Los anchos son los que de verdad se ven en la carta con margen de
   sobra para las pantallas más nítidas. Guardar más píxeles no se
   nota en ninguna pantalla y sí se nota en lo que ocupa el
   repositorio, así que aquí se recorta sin miedo. */
const IMG_TIPOS = {
  seccion:{
    etiqueta:'sección', rotulo:'Sección', demostrativo:'esta sección',
    titulo:'Imagen de la sección', carpeta:'img/secciones',
    conFoco:true,                   // franja: la carta la recorta según la pantalla
    relA:3, relB:1,                 // franja ancha, de borde a borde de la pantalla
    anchoMax:1200, anchoMin:600,
    peso:180*1024
  },
  grupo:{
    etiqueta:'grupo', rotulo:'Grupo', demostrativo:'este grupo',
    titulo:'Imagen del grupo', carpeta:'img/grupos',
    conFoco:true,
    relA:4, relB:1,                 // banda más baja que la de la sección
    anchoMax:1100, anchoMin:550,
    peso:150*1024
  },
  item:{
    etiqueta:'plato', rotulo:'Plato', demostrativo:'este plato',
    titulo:'Foto del plato', carpeta:'img/items',
    conFoco:false,                  // cuadrado exacto: se ve entera, no hay nada que elegir
    relA:1, relB:1,                 // cuadrado exacto
    anchoMax:450, anchoMin:240,     // se ve a ~104 px: 450 sobra hasta en pantallas muy nítidas
    peso:70*1024
  }
};

/* Escalera de calidad del JPG. Se prueba de arriba abajo hasta que el
   archivo cabe en el peso previsto de su tipo. Con los anchos de arriba
   casi siempre basta el primer peldaño, que casi no se nota. */
const IMG_CALIDADES = [0.80, 0.70, 0.60];

/* ---------- Logotipo y foto de la portada ----------
   Estas dos NO se comprimen: son las que dan la cara y se suben tal
   cual mientras no se pasen de estos límites. Solo si los superan se
   tocan, y lo mínimo posible (calidad muy alta, y sin tocar la
   transparencia del logotipo). */
const LOGO_LADO_MAX     = 1000;          // px del lado mayor
const LOGO_PESO_INTACTO = 400*1024;      // hasta aquí, se sube sin tocar
const LOGO_PESO_MAX     = 10*1024*1024;  // más que esto no se acepta
const LOGO_CALIDAD      = 0.92;          // solo se usa si hay que reducirlo

const FONDO_LADO_MAX     = 1800;         // ocupa toda la pantalla, por eso es ancha
const FONDO_PESO_INTACTO = 900*1024;
const FONDO_PESO_MAX     = 15*1024*1024;
const FONDO_CALIDAD      = 0.90;

/* ---------- Zona importante de la foto ----------
   Las franjas de sección y grupo ocupan todo el ancho de la pantalla,
   así que según la pantalla quedan más bajas o más estrechas de lo que
   se encuadró y la foto se recorta un poco. Esto decide qué parte se
   conserva siempre. Se guarda en el campo "foco".

   El orden es el de la cuadrícula de tres por tres que se ve en la
   ventana de la foto: primera fila, segunda fila y tercera. */
const FOCOS = [
  { clave:'arriba-izquierda', rotulo:'Arriba a la izquierda' },
  { clave:'arriba',           rotulo:'Arriba' },
  { clave:'arriba-derecha',   rotulo:'Arriba a la derecha' },
  { clave:'izquierda',        rotulo:'Izquierda' },
  { clave:'centro',           rotulo:'Centro' },
  { clave:'derecha',          rotulo:'Derecha' },
  { clave:'abajo-izquierda',  rotulo:'Abajo a la izquierda' },
  { clave:'abajo',            rotulo:'Abajo' },
  { clave:'abajo-derecha',    rotulo:'Abajo a la derecha' }
];
const FOCO_DEFECTO = 'centro';

const IMG_ENTRADA_MAX     = 25*1024*1024; // 25 MB de archivo original
const IMG_MEGAPIXELES_MAX = 80;           // fotos enormes revientan el lienzo del navegador
const PREVIA_ANCHO = 700;                 // el alto se calcula según el tipo