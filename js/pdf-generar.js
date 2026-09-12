/* =========================================================
   PDF DE LA CARTA · GENERAR
   Une todas las piezas: prepara las fotos, arma la maqueta,
   la reparte en hojas y, o bien la enseña como vista previa,
   o bien la «fotografía» hoja a hoja para fabricar el PDF que
   se descarga.
   ========================================================= */

/* Prepara el contexto que necesitan la maqueta y sus ayudantes. */
function pdfContexto(paquete, opciones, fotos) {
  const idioma = opciones.idioma || paquete.idiomas[0] || 'es';
  return {
    paquete, opciones, fotos, idioma,
    ui: PDF_UI[idioma] || PDF_UI.es
  };
}

/* Baja las fotos que hagan falta según las opciones y devuelve un mapa
   dirección -> «data:…» (o null si alguna no bajó). */
async function pdfPrepararFotos(paquete, opciones) {
  const ctx = pdfContexto(paquete, opciones, new Map());
  const urls = pdfUrlsNecesarias(ctx);
  await pdfBajarEnLotes(urls);
  const fotos = new Map();
  for (const u of urls) fotos.set(u, await pdfImagenAdato(u));
  return fotos;
}

/* Arma las hojas listas para pintar (vista previa) o fotografiar (PDF). */
async function pdfConstruirHojas(paquete, opciones) {
  const fotos = await pdfPrepararFotos(paquete, opciones);
  const ctx = pdfContexto(paquete, opciones, fotos);
  const unidades = pdfConstruirUnidades(ctx);
  const M = pdfMedidas(opciones);
  const hojas = pdfPaginar(unidades, M, paquete.colores);
  return { hojas, M };
}

/* Envuelve las hojas en una raíz con los colores del negocio. */
function pdfEnvolver(hojas, colores, claseExtra) {
  const raiz = pdfCrear('div', 'pdf-raiz' + (claseExtra ? ' ' + claseExtra : ''));
  for (const [k, v] of Object.entries(colores)) raiz.style.setProperty(k, v);
  hojas.forEach(h => raiz.appendChild(h));
  return raiz;
}

/* ---------- Vista previa ----------
   Enseña las hojas de verdad (mismo dibujo que tendrá el PDF),
   encogidas para que quepan en el ancho disponible. */
async function pdfMostrarVistaPrevia(contenedor, paquete, opciones) {
  const { hojas, M } = await pdfConstruirHojas(paquete, opciones);
  contenedor.innerHTML = '';
  const raiz = pdfEnvolver(hojas, paquete.colores, 'pdf-raiz--preview');
  contenedor.appendChild(raiz);
  pdfAjustarZoomPreview(contenedor, M);
  return { paginas: hojas.length, M };
}

/* Encoge la vista previa para que la hoja quepa a lo ancho. */
function pdfAjustarZoomPreview(contenedor, M) {
  const raiz = contenedor.querySelector('.pdf-raiz--preview');
  if (!raiz) return;
  const disponible = contenedor.clientWidth - 24;   // un respiro a los lados
  const factor = Math.min(1, disponible / M.anchoPx);
  raiz.style.zoom = factor > 0 ? factor : 1;
}

/* ---------- Nombre del archivo ---------- */
function pdfNombreArchivo(paquete, opciones) {
  const base = String(paquete.carta?.negocio?.nombre || 'carta').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'carta';
  return `carta-${base}-${opciones.tamano}-${opciones.idioma || 'es'}.pdf`;
}

/* ---------- Fabricar el PDF ----------
   Cada hoja se «fotografía» a alta resolución y se coloca en una
   página del PDF con el tamaño exacto en milímetros. */
async function pdfFabricar(paquete, opciones, onProgreso) {
  if (!window.jspdf || !window.html2canvas) {
    throw new Error('No se han podido cargar las herramientas del PDF. Revisa la conexión y vuelve a intentarlo.');
  }
  const { hojas, M } = await pdfConstruirHojas(paquete, opciones);
  if (!hojas.length) throw new Error('La carta publicada no tiene platos que imprimir.');

  // Se montan fuera de la pantalla, a tamaño real, para poder fotografiarlas.
  const raiz = pdfEnvolver(hojas, paquete.colores, 'pdf-raiz--taller');
  document.body.appendChild(raiz);

  // Que la letra del negocio esté lista antes de fotografiar.
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const escala = Math.max(1, Math.min(PDF_ESCALA, PDF_LADO_MAX_PX / Math.max(M.anchoPx, M.altoPx)));
  const fondo = paquete.colores['--noche'] || '#12100E';

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: M.anchoMm > M.altoMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [M.anchoMm, M.altoMm],
    compress: true
  });

  try {
    for (let i = 0; i < hojas.length; i++) {
      if (onProgreso) onProgreso(i, hojas.length);
      const lienzo = await window.html2canvas(hojas[i], {
        scale: escala,
        backgroundColor: fondo,
        useCORS: true,
        logging: false,
        width: M.anchoPx,
        height: M.altoPx,
        windowWidth: M.anchoPx,
        windowHeight: M.altoPx
      });
      const imagen = lienzo.toDataURL('image/jpeg', 0.95);
      if (i > 0) doc.addPage([M.anchoMm, M.altoMm], M.anchoMm > M.altoMm ? 'landscape' : 'portrait');
      doc.addImage(imagen, 'JPEG', 0, 0, M.anchoMm, M.altoMm, undefined, 'FAST');
    }
    if (onProgreso) onProgreso(hojas.length, hojas.length);
    const nombre = pdfNombreArchivo(paquete, opciones);
    doc.save(nombre);
    return { nombre, paginas: hojas.length };
  } finally {
    raiz.remove();
  }
}