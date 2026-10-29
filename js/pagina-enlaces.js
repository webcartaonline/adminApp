/* =========================================================
   REDES SOCIALES DEL PIE DE LA CARTA
   Las seis redes que el negocio puede poner al final de su
   carta (pie.redes del apariencia.json): TikTok, Instagram, X,
   YouTube, Facebook y Snapchat. Cada una lleva su icono y su
   campo para el enlace. Con enlace, sale en la carta; en
   blanco, no.

   Los iconos son los mismos que dibuja la carta: si se cambia
   uno aquí, hay que cambiarlo también allí (REDES en el
   carta.js de cada plantilla).

   Las apps de pedidos van aparte, en su propio bloque y con su
   propia pieza (pagina-reparto.js), porque no son iconos
   nuestros: cada local sube el logotipo de su app.

   Es una pieza aparte para que pagina-apariencia.js no crezca
   más: aquí solo están la lista y cómo se pintan sus filas;
   dónde se guardan los datos lo decide pagina-apariencia.js.
   ========================================================= */
const EnlacesDelPie=(()=>{

  /* Las seis redes, en el orden en que se pintan. */
  const REDES=[
    { clave:'tiktok',    nombre:'TikTok',
      icono:'<path d="M15 4.2c.4 2.3 2 3.9 4.2 4.1"/><path d="M15 4.2v9.3a4.1 4.1 0 1 1-3.4-4.04"/>' },
    { clave:'instagram', nombre:'Instagram',
      icono:'<rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.7" cy="7.3" r=".9" fill="currentColor" stroke="none"/>' },
    { clave:'x',         nombre:'X',
      icono:'<path d="M5.3 4.5h3.5l9.9 15h-3.5Z"/><path d="M10.6 13.4 5 19.5"/><path d="M18.7 4.5 13.3 10.4"/>' },
    { clave:'youtube',   nombre:'YouTube',
      icono:'<rect x="3.5" y="6" width="17" height="12" rx="3.6"/><path d="M10.4 9.5v5l4.4-2.5Z"/>' },
    { clave:'facebook',  nombre:'Facebook',
      icono:'<path d="M15.6 4.5h-1.9a3.5 3.5 0 0 0-3.5 3.5V20"/><path d="M8 11.6h6.6"/>' },
    { clave:'snapchat',  nombre:'Snapchat',
      icono:'<path d="M12 4c2.5 0 4.3 1.9 4.3 4.5v1.6c0 .3.2.5.5.5l1.7.4c-.6 1.3-1.6 2.2-2.9 2.7.9 1.2 2.2 1.9 3.9 2.1-1 1.2-2.4 1.9-4 1.9-.5.8-1.9 1.4-3.5 1.4s-3-.6-3.5-1.4c-1.6 0-3-.7-4-1.9 1.7-.2 3-.9 3.9-2.1-1.3-.5-2.3-1.4-2.9-2.7l1.7-.4c.3 0 .5-.2.5-.5V8.5C7.7 5.9 9.5 4 12 4Z"/>' }
  ];

  /* El nombre de una red tal y como se escribe («TikTok»). Lo usa
     también el resumen de «Revisar antes de publicar». */
  const nombreDe=(clave)=>REDES.find((s)=>s.clave===clave)?.nombre||clave;

  /* Pone en blanco las redes que falten (un apariencia.json nuevo, o
     uno de antes de que existiera alguna). */
  function completar(valores){
    return {...Object.fromEntries(REDES.map((s)=>[s.clave,''])),...(valores||{})};
  }

  /* Un enlace escrito sin el «https://» delante se arregla solo. */
  function normalizar(url){
    const t=String(url||'').trim();
    if(!t)return '';
    return /^https?:\/\//i.test(t)?t:`https://${t}`;
  }

  /* Una fila por red: el icono en su pastilla y el campo del enlace. */
  function pintar(caja,valores){
    caja.innerHTML=REDES.map((s)=>`
      <label class="enlaces__fila">
        <span class="enlaces__icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round">${s.icono}</svg>
        </span>
        <span class="enlaces__datos">
          <span class="campo__etiqueta">${s.nombre}</span>
          <input type="text" inputmode="url" autocomplete="off" spellcheck="false"
                 data-clave="${s.clave}" value="${escapar(valores[s.clave]||'')}"
                 placeholder="https://…">
        </span>
      </label>`).join('');
  }

  /* Lo que se escribe en un campo se guarda en los valores que dé
     leerValores() en ese momento (cambian al recargar la apariencia),
     y se avisa con alCambiar(). */
  function escuchar(caja,leerValores,alCambiar){
    caja.addEventListener('input',(ev)=>{
      const clave=ev.target.dataset.clave;
      if(!clave)return;
      leerValores()[clave]=ev.target.value;
      alCambiar();
    });
  }

  return { nombreDe, completar, normalizar, pintar, escuchar };
})();
