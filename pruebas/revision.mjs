/* Prueba del resumen de «Revisar antes de publicar»: qué ha cambiado
   (js/revision-cambios.js) y qué falta (js/revision-avisos.js).

   Se lanza con:  node pruebas/revision.mjs
   No toca nada: monta dos cartas de mentira y compara. */
import { readFileSync } from 'node:fs';

/* Carga un archivo del editor como lo haría el navegador. Las «const» de
   un archivo no salen solas de él: se sacan a mano las que hacen falta. */
const cargar = (archivo, nombres = []) => (0, eval)(
  readFileSync(new URL(`../js/${archivo}`, import.meta.url), 'utf8') +
  `\n;Object.assign(globalThis,{${nombres.join(',')}});`);

// Lo poco del editor que usan estas dos piezas.
globalThis.estado = { idiomas: ['es', 'en'] };
globalThis.$ = () => null;   // sin página: idiomas.js no encuentra su ventana y no hace nada
cargar('config.js', ['ALERGENOS', 'ETIQUETAS', 'NOMBRE_IDIOMA']);
cargar('idiomas.js');
cargar('pagina-enlaces.js', ['EnlacesDelPie']);
cargar('pagina-reparto.js', ['RepartoDelPie']);
cargar('revision-cambios.js', ['CambiosSinPublicar']);
cargar('revision-avisos.js', ['AvisosDeLaCarta']);

let fallos = 0;
const comprobar = (t, c, d = '') => { console.log((c ? '  OK   ' : '  MAL  ') + t + (c ? '' : '  -> ' + d)); if (!c) fallos++; };
const copia = (x) => JSON.parse(JSON.stringify(x));

const publicada = {
  negocio: { nombre: 'Bar', idiomas: ['es', 'en'], imagenes: true },
  secciones: [
    { id: 's-comer', nombre: { es: 'Comer', en: 'Food' }, grupos: [
      { id: 'g-fritos', nombre: { es: 'Fritos', en: 'Fried' }, items: [
        { id: 'i-croq', nombre: { es: 'Croquetas', en: 'Croquettes' }, descripcion: { es: 'De jamón', en: 'Ham' },
          precio: 6, alergenos: ['gluten', 'lacteos'], imagen: 'img/items/i-croq.jpg' },
        { id: 'i-bravas', nombre: { es: 'Bravas', en: 'Bravas' }, descripcion: { es: '', en: '' }, precio: 5, alergenos: [] }
      ] },
      { id: 'g-ensaladas', nombre: { es: 'Ensaladas', en: 'Salads' }, items: [
        { id: 'i-mixta', nombre: { es: 'Mixta', en: 'Mixed' }, precio: 8, alergenos: ['huevos'] }
      ] }
    ] },
    { id: 's-beber', nombre: { es: 'Beber', en: 'Drinks' }, grupos: [
      { id: 'g-cervezas', nombre: { es: 'Cervezas', en: 'Beers' }, items: [
        { id: 'i-cana', nombre: { es: 'Caña', en: 'Small beer' }, precio: 2, alergenos: ['gluten'] }
      ] }
    ] }
  ]
};

console.log('\nSin tocar nada, no hay cambios');
comprobar('cero tarjetas', CambiosSinPublicar.deLaCarta(publicada, copia(publicada)).length === 0);
// El editor añade listas vacías al pintar (etiquetas: []): no son cambios.
const conListas = copia(publicada);
conListas.secciones[0].grupos[0].items[0].etiquetas = [];
conListas.secciones[0].notas = [];
comprobar('una lista vacía nueva no cuenta', CambiosSinPublicar.deLaCarta(publicada, conListas).length === 0);

console.log('\nCambios de un plato');
const ahora = copia(publicada);
const croq = ahora.secciones[0].grupos[0].items[0];
croq.precio = 6.5;
croq.nombre.en = 'Ham croquettes';
croq.alergenos = ['gluten', 'huevos'];
delete croq.imagen;
const tarjetas = CambiosSinPublicar.deLaCarta(publicada, ahora);
const cambiados = tarjetas.find((t) => t.clave === 'platos-cambiados');
comprobar('sale en «Platos cambiados»', cambiados && cambiados.lineas.length === 1);
const det = cambiados.lineas[0].detalles;
comprobar('precio de 6,00 € a 6,50 €', det.some((d) => d.campo === 'Precio' && d.antes === '6,00 €' && d.despues === '6,50 €'), JSON.stringify(det));
comprobar('nombre en inglés', det.some((d) => d.campo === 'Nombre (EN)' && d.despues === 'Ham croquettes'));
comprobar('el nombre en español no sale', !det.some((d) => d.campo === 'Nombre (ES)'));
comprobar('alérgenos: + Huevos − Lácteos', det.some((d) => d.campo === 'Alérgenos' && d.mas.join() === 'Huevos' && d.menos.join() === 'Lácteos'));
comprobar('foto quitada', det.some((d) => d.texto === 'Foto quitada'));
comprobar('dice dónde está', cambiados.lineas[0].donde === 'Comer › Fritos');

console.log('\nPlatos nuevos, eliminados y movidos');
const otra = copia(publicada);
otra.secciones[0].grupos[0].items.push({ id: 'i-calamares', nombre: { es: 'Calamares', en: '' }, precio: 9, alergenos: [] });
otra.secciones[0].grupos[1].items = [];                         // fuera la mixta
const cana = otra.secciones[1].grupos[0].items.pop();
otra.secciones[0].grupos[0].items.push(cana);                   // la caña, a fritos
const t2 = CambiosSinPublicar.deLaCarta(publicada, otra);
comprobar('nuevo: Calamares', t2.find((t) => t.clave === 'platos-nuevos')?.lineas[0]?.titulo === 'Calamares');
comprobar('eliminado: Mixta', t2.find((t) => t.clave === 'platos-fuera')?.lineas[0]?.titulo === 'Mixta');
const movida = t2.find((t) => t.clave === 'platos-cambiados')?.lineas.find((l) => l.titulo === 'Caña');
comprobar('la caña sale como movida', movida?.tipo === 'movido', JSON.stringify(movida));

console.log('\nSecciones y grupos enteros: no se cuentan plato a plato');
const sinBeber = copia(publicada);
sinBeber.secciones.pop();
sinBeber.secciones.push({ id: 's-postres', nombre: { es: 'Postres', en: 'Desserts' }, grupos: [
  { id: 'g-caseros', nombre: { es: 'Caseros', en: '' }, items: [{ id: 'i-flan', nombre: { es: 'Flan' }, precio: 4, alergenos: [] }] }
] });
const t3 = CambiosSinPublicar.deLaCarta(publicada, sinBeber);
const secciones = t3.find((t) => t.clave === 'secciones');
comprobar('sección nueva y sección eliminada', secciones?.lineas.length === 2);
comprobar('el resumen cuenta los platos que se van', secciones.lineas.some((l) => l.tipo === 'quitado' && /1 plato/.test(l.detalles[0].texto)));
comprobar('no salen la caña ni el flan sueltos', !t3.some((t) => t.clave === 'platos-nuevos' || t.clave === 'platos-fuera'));
comprobar('el orden no se marca por quitar o añadir', !t3.some((t) => t.clave === 'orden'));

console.log('\nOrden');
const reordenada = copia(publicada);
reordenada.secciones.reverse();
reordenada.secciones[1].grupos[0].items.reverse();
const orden = CambiosSinPublicar.deLaCarta(publicada, reordenada).find((t) => t.clave === 'orden');
comprobar('orden de secciones y de platos', orden?.lineas.length === 2, JSON.stringify(orden?.lineas));

console.log('\nVentana emergente');
const conAnuncio = copia(publicada);
conAnuncio.anuncio = { activo: true };
comprobar('un anuncio sin nada no cuenta', CambiosSinPublicar.deLaCarta(publicada, conAnuncio).length === 0);
conAnuncio.anuncio.mensaje = { es: '2x1 en cañas', en: '' };
comprobar('un anuncio con mensaje sale como nuevo',
  CambiosSinPublicar.deLaCarta(publicada, conAnuncio).find((t) => t.clave === 'anuncio')?.lineas[0]?.tipo === 'nuevo');

console.log('\nAjustes de la carta');
const aparPublicada = { colores: { principal: '#E9B44C', fondo: '#12100E', texto: 'auto' },
  identidad: { titulo: 'Bar', eslogan: { es: 'Hola' }, logo: 'img/logo.png?v=1' },
  pie: { bloques: [{ titulo: 'Horario', texto: '9 a 14' }], redes: { instagram: 'https://instagram.com/bar' } } };
const aparBorrador = copia(aparPublicada);
// Lo que deja el borrador aunque no se toque nada: valores de fábrica.
aparBorrador.pagina = { barra: 'inferior', alergenos: 'abajo' };
aparBorrador.identidad.eslogan.en = '';
aparBorrador.identidad.fondo = { imagen: '', foco: 'centro' };
aparBorrador.fuentes = { titulo: null, texto: null };
aparBorrador.pie.redes = EnlacesDelPie.completar(aparBorrador.pie.redes);
aparBorrador.pie.reparto = RepartoDelPie.completar();
comprobar('los valores de fábrica no salen como cambios', CambiosSinPublicar.deLaApariencia(aparPublicada, aparBorrador).length === 0,
  JSON.stringify(CambiosSinPublicar.deLaApariencia(aparPublicada, aparBorrador)));
aparBorrador.colores.principal = '#FF0000';
aparBorrador.identidad.logo = 'img/logo.png?v=2';
aparBorrador.pie.redes.tiktok = 'https://tiktok.com/@bar';
aparBorrador.pie.reparto.glovo.enlace = 'https://glovoapp.com/bar';
const tp = CambiosSinPublicar.deLaApariencia(aparPublicada, aparBorrador);
comprobar('color principal', tp.find((t) => t.clave === 'pagina-colores')?.lineas[0].detalles[0].despues === '#FF0000');
comprobar('logotipo cambiado', tp.find((t) => t.clave === 'pagina-portada')?.lineas[0].detalles.some((d) => d.texto === 'Logotipo cambiado'));
comprobar('TikTok nueva, con su nombre', tp.find((t) => t.clave === 'pagina-redes')?.lineas.some((l) => l.titulo === 'TikTok' && l.tipo === 'nuevo'));
comprobar('Glovo nueva, con su nombre', tp.find((t) => t.clave === 'pagina-reparto')?.lineas.some((l) => l.titulo === 'Glovo' && l.tipo === 'nuevo'));
comprobar('primera publicación', CambiosSinPublicar.deLaApariencia(null, aparBorrador)[0]?.clave === 'pagina-estreno');

console.log('\nAvisos');
const avisos = AvisosDeLaCarta.deLaCarta(otra, { idiomas: ['es', 'en'], fotosDePlatos: true });
const de = (clave) => avisos.find((a) => a.clave === clave);
comprobar('falta en English: Calamares', de('traducciones')?.casos.some((c) => c.nombre === 'Calamares' && c.idioma === 'en'));
comprobar('la descripción vacía no pide traducción', !de('traducciones')?.casos.some((c) => c.nombre === 'Bravas' && c.campo === 'descripcion'));
comprobar('alérgenos sin marcar: Bravas y Calamares', de('alergenos')?.casos.map((c) => c.nombre).sort().join() === 'Bravas,Calamares');
comprobar('fotos: todos menos los que tienen', de('fotos')?.casos.length === 3, String(de('fotos')?.casos.length));
comprobar('grupo vacío: Ensaladas', de('vacios')?.casos.some((c) => c.nombre === 'Ensaladas'));
const sinFotos = AvisosDeLaCarta.deLaCarta(otra, { idiomas: ['es', 'en'], fotosDePlatos: false });
comprobar('sin fotos en el plan, no se habla de fotos', !sinFotos.some((a) => a.clave === 'fotos'));
const unIdioma = AvisosDeLaCarta.deLaCarta(otra, { idiomas: ['es'] });
comprobar('con un solo idioma no hay traducciones', !unIdioma.some((a) => a.clave === 'traducciones'));
const sinNombre = copia(otra);
sinNombre.secciones[0].grupos[0].items[0].nombre = { es: '', en: '' };
comprobar('plato sin nombre: va el primero', AvisosDeLaCarta.deLaCarta(sinNombre, { idiomas: ['es', 'en'] })[0]?.clave === 'nombres');
const cero = copia(publicada);
cero.secciones[0].grupos[0].items[0].precio = 0;
comprobar('precio a cero', AvisosDeLaCarta.deLaCarta(cero, { idiomas: ['es', 'en'] }).find((a) => a.clave === 'precios')?.casos.length === 1);

console.log(fallos ? `\n${fallos} prueba(s) fallan` : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
