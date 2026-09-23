/* Prueba de la papelera del navegador: un sessionStorage de mentira,
   con tope de espacio, para ver que se guarda, se poda y se recupera. */
import { readFileSync } from 'node:fs';

/* Se lanza con:  node pruebas/papelera-de-fotos.mjs
   No toca nada: monta un sessionStorage de mentira, con su tope de
   espacio, y comprueba la papelera de fotos de js/imagenes.js. */

let TOPE = 1e9;
const almacen = new Map();
globalThis.sessionStorage = {
  get length(){ return almacen.size; },
  key(i){ return [...almacen.keys()][i] ?? null; },
  getItem(k){ return almacen.has(k) ? almacen.get(k) : null; },
  removeItem(k){ almacen.delete(k); },
  setItem(k,v){
    const ocupado = [...almacen.entries()].filter(([c])=>c!==k).reduce((t,[c,d])=>t+c.length+d.length,0);
    if (ocupado + k.length + v.length > TOPE) { const e = new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; }
    almacen.set(k,v);
  }
};
globalThis.CLAVE_FOTOS_QUITADAS = 'editorCartaUniversal.fotoQuitada';
globalThis.MAX_FOTOS_QUITADAS = 8;
let negocio = 'pruebas2';
globalThis.clienteActual = () => negocio;

const fuente = readFileSync(new URL('../js/imagenes.js', import.meta.url),'utf8');
const trozo = fuente.slice(fuente.indexOf('const claveDeFotoQuitada'), fuente.indexOf('/* Al borrar una sección'));
(0, eval)(trozo);   // eval indirecto: se ejecuta en el ámbito global

let fallos = 0;
const comprobar = (t,c,d='') => { console.log((c?'  OK   ':'  MAL  ')+t+(c?'':'  -> '+d)); if(!c) fallos++; };

console.log('\nLa copia se guarda y se recupera');
comprobar('se guarda', guardarFotoQuitada('img/items/i-uno.jpg',{base64:'AAAA',tipo:'image/jpeg',foco:'centro'}));
comprobar('se lee igual', fotoQuitada('img/items/i-uno.jpg')?.base64 === 'AAAA');
comprobar('lleva el foco', fotoQuitada('img/items/i-uno.jpg')?.foco === 'centro');
comprobar('de otra foto no hay nada', fotoQuitada('img/items/i-dos.jpg') === null);

console.log('\nCada negocio tiene las suyas');
negocio = 'fusion-cafe';
comprobar('el otro negocio no ve la copia', fotoQuitada('img/items/i-uno.jpg') === null);
negocio = 'pruebas2';
comprobar('y el dueño sí la sigue viendo', fotoQuitada('img/items/i-uno.jpg')?.base64 === 'AAAA');

console.log('\nNo se acumulan: solo las últimas ' + MAX_FOTOS_QUITADAS);
for (let i = 0; i < 14; i++) guardarFotoQuitada('img/items/i-' + i + '.jpg', { base64: 'B'.repeat(50), cuando: i });
const guardadas = fotosQuitadasGuardadas();
comprobar('quedan 8, no 15', guardadas.length === MAX_FOTOS_QUITADAS, 'hay ' + guardadas.length);
comprobar('la última sigue estando', fotoQuitada('img/items/i-13.jpg') !== null);
comprobar('la primera ya no', fotoQuitada('img/items/i-0.jpg') === null);

console.log('\nSi el navegador se queda sin sitio');
almacen.clear(); TOPE = 400;
comprobar('la primera cabe', guardarFotoQuitada('a.jpg',{base64:'C'.repeat(200)}));
comprobar('la segunda hace hueco tirando la vieja', guardarFotoQuitada('b.jpg',{base64:'D'.repeat(200)}));
comprobar('y la vieja ya no está', fotoQuitada('a.jpg') === null);
comprobar('la nueva sí', fotoQuitada('b.jpg')?.base64.startsWith('D'));
TOPE = 10;
comprobar('una foto que no cabe ni vacía -> devuelve false', guardarFotoQuitada('c.jpg',{base64:'E'.repeat(500)}) === false);
TOPE = 1e9;

console.log('\nOlvidar');
guardarFotoQuitada('z.jpg',{base64:'F'});
olvidarFotoQuitada('z.jpg');
comprobar('se borra al recuperarla', fotoQuitada('z.jpg') === null);

console.log(fallos ? `\n${fallos} PRUEBAS MAL` : '\nTodas las pruebas pasan');
process.exit(fallos?1:0);
