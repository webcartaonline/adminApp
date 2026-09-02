/* =========================================================
   PREPARADOR DE IMÁGENES
   El único sitio donde una foto se encoge o se comprime.
   Todo lo que sube al repositorio pasa por aquí, así que si
   hay que cambiar cómo se comprime, se cambia en un sitio.

   Hay dos formas de tratar una imagen, y son distintas a
   propósito:

   1) A MEDIDA (secciones, grupos y platos)
      La carta ya sabe de qué forma y de qué tamaño las va a
      enseñar, así que no tiene sentido guardar más píxeles
      de los que se van a ver. Se recortan y se ajustan al
      tamaño previsto: es lo que de verdad ahorra espacio.

   2) TAL CUAL (logotipo y foto de la portada)
      Son las dos imágenes que dan la cara, y valen más
      cuanto mejor se vean. Se suben exactamente como vienen
      mientras no se pasen de tamaño ni de peso. Solo si se
      pasan se tocan, y lo justo para que quepan.

   Los números (tamaños, pesos, calidades) no están aquí:
   están en config.js.
   ========================================================= */

/* Extensión que le corresponde a cada tipo de archivo. Si no está en
   la lista, es que no sabemos tratarlo tal cual. */
const EXTENSION_POR_TIPO = {
  'image/jpeg':'jpg',
  'image/png' :'png',
  'image/webp':'webp'
};

/* ---------- Piezas pequeñas ---------- */

/* Abre la foto respetando la orientación con la que se hizo.
   Devuelve un mapa de bits que hay que cerrar al terminar. */
async function abrirImagen(archivo){
  try{
    return await createImageBitmap(archivo,{imageOrientation:'from-image'});
  }catch{
    throw new Error('No se ha podido abrir esa foto. Puede estar dañada o en un formato que el navegador no entiende.');
  }
}

/* Dibuja un trozo de la foto en un lienzo del tamaño pedido.
   La zona es opcional: sin ella se dibuja la foto entera. */
function dibujarEnLienzo(mapa,ancho,alto,zona){
  const lienzo=document.createElement('canvas');
  lienzo.width=Math.max(1,Math.round(ancho));
  lienzo.height=Math.max(1,Math.round(alto));
  const ctx=lienzo.getContext('2d');
  ctx.imageSmoothingQuality='high';
  if(zona)ctx.drawImage(mapa,zona.sx,zona.sy,zona.sw,zona.sh,0,0,lienzo.width,lienzo.height);
  else ctx.drawImage(mapa,0,0,lienzo.width,lienzo.height);
  return lienzo;
}

/* toBlob, pero como promesa, que se lee mucho mejor. */
function lienzoABlob(lienzo,tipo,calidad){
  return new Promise((listo,fallo)=>{
    lienzo.toBlob(blob=>{
      if(blob)listo(blob);
      else fallo(new Error('El navegador no ha podido preparar la imagen.'));
    },tipo,calidad);
  });
}

/* Cuánto hay que encoger para que el lado mayor quepa en el límite.
   Nunca agranda: si la foto ya es pequeña, se queda como está. */
function escalaParaCaber(ancho,alto,ladoMax){
  return Math.min(1,ladoMax/Math.max(ancho,alto));
}

/* ---------- 1) A MEDIDA: secciones, grupos y platos ----------
   Recorta la zona elegida y la guarda al tamaño que la carta va a
   enseñar. Si aun así pesa más de la cuenta, baja la calidad por
   pasos y, si con eso no basta, también el tamaño.

   - mapa: la foto original abierta
   - zona: {sx,sy,sw,sh}, el trozo que quedó dentro del marco
   - conf: la ficha del tipo de imagen (IMG_TIPOS.seccion, .grupo…) */
async function comprimirAMedida(mapa,zona,conf){
  let ancho=Math.min(conf.anchoMax,Math.max(conf.anchoMin,Math.round(zona.sw)));

  for(let intento=0;intento<6;intento++){
    const alto=Math.round(ancho*conf.relB/conf.relA);
    const lienzo=dibujarEnLienzo(mapa,ancho,alto,zona);
    const ultimaOportunidad=ancho<=conf.anchoMin;

    for(let i=0;i<IMG_CALIDADES.length;i++){
      const calidad=IMG_CALIDADES[i];
      const blob=await lienzoABlob(lienzo,'image/jpeg',calidad);
      const cabe=blob.size<=conf.peso;
      const noQuedaMargen=ultimaOportunidad&&i===IMG_CALIDADES.length-1;
      if(cabe||noQuedaMargen)return {blob,ancho,alto};
    }
    ancho=Math.max(conf.anchoMin,Math.round(ancho*0.85));
  }
  throw new Error('No se ha podido reducir la foto lo suficiente. Prueba con otra imagen.');
}

/* ---------- 2) TAL CUAL: logotipo y foto de la portada ----------
   Devuelve {blob, extension, ancho, alto, tocada}. "tocada" dice si
   ha habido que reducirla, para poder avisar al cliente.

   politica: { ladoMax, pesoIntacto, calidad, conservarTransparencia } */
async function prepararImagenIntacta(archivo,politica){
  const mapa=await abrirImagen(archivo);
  try{
    const original=EXTENSION_POR_TIPO[archivo.type];
    const escala=escalaParaCaber(mapa.width,mapa.height,politica.ladoMax);
    const cabeDeTamano=escala===1;
    const cabeDePeso=archivo.size<=politica.pesoIntacto;

    // El camino bueno: ni se abre ni se vuelve a guardar. Los bytes que
    // sube el cliente son exactamente los que llegan al repositorio, así
    // que no se pierde ni un pelo de calidad.
    if(original&&cabeDeTamano&&cabeDePeso){
      return {blob:archivo,extension:original,ancho:mapa.width,alto:mapa.height,tocada:false};
    }

    // Se pasa de algo, así que toca reducirla. Se conserva la
    // transparencia cuando importa (un logotipo con fondo transparente
    // se vería con un recuadro blanco si lo pasáramos a JPG).
    const transparente=politica.conservarTransparencia&&/png|webp|gif/.test(archivo.type);
    const lienzo=dibujarEnLienzo(mapa,mapa.width*escala,mapa.height*escala);
    const tipo=transparente?'image/png':'image/jpeg';
    const blob=await lienzoABlob(lienzo,tipo,transparente?undefined:politica.calidad);

    return {
      blob,
      extension:transparente?'png':'jpg',
      ancho:lienzo.width,
      alto:lienzo.height,
      tocada:true
    };
  }finally{
    mapa.close?.();
  }
}

/* Frase corta para contarle al cliente qué ha pasado con su imagen. */
function resumenDeImagen(preparada){
  const kb=Math.round(preparada.blob.size/1024);
  return preparada.tocada
    ? `Se ha reducido a ${preparada.ancho}×${preparada.alto} (${kb} KB) para que no ocupe de más.`
    : `Se sube tal cual, sin comprimir (${kb} KB).`;
}
