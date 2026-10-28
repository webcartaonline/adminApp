/* =========================================================
   APPS DE PEDIDOS DEL PIE DE LA CARTA
   El bloque «Pedidos por app» de «Ajustes de la carta»: Just
   Eat, Uber Eats, Glovo, Deliveroo y Too Good To Go. Va
   separado de las redes sociales (pagina-enlaces.js) a
   propósito: las redes son para seguir al local, las apps para
   pedirle comida.

   Cada app guarda tres cosas en pie.reparto del apariencia.json:

     enlace   a dónde lleva (el perfil del local en esa app).
              Sin enlace, la app no sale en la carta.
     texto    lo que se lee en la carta mientras no hay logotipo
              («Pide en Glovo»…). En blanco, el nombre de la app.
     logo     el logotipo que sube el propio local (img/reparto/…).

   El LOGOTIPO LO SUBE EL LOCAL, no nosotros: el permiso para usar
   la marca de cada app lo tiene él, como socio de la app. Por eso
   el bloque lo avisa y lo explica en «Saber más». Con logotipo, el
   campo del texto se esconde: en la carta sale solo el logotipo.

   Aquí están la lista, cómo se pintan sus filas y qué hacen sus
   botones. Dónde se guardan los datos y cómo se suben los
   logotipos lo decide pagina-apariencia.js.
   ========================================================= */
const RepartoDelPie=(()=>{

  /* Las cinco apps, en el orden en que salen en la carta (el mismo que
     APPS_DE_REPARTO en el reparto.js de cada plantilla). */
  const APPS=[
    { clave:'justeat',     nombre:'Just Eat' },
    { clave:'ubereats',    nombre:'Uber Eats' },
    { clave:'glovo',       nombre:'Glovo' },
    { clave:'deliveroo',   nombre:'Deliveroo' },
    { clave:'toogoodtogo', nombre:'Too Good To Go' }
  ];

  /* Lo más largo que se deja escribir en el texto: en la carta va en
     una sola línea, junto a las demás apps. */
  const TEXTO_MAX=30;

  /* Los formatos de logotipo que se admiten (los mismos que el portero). */
  const TIPOS_DE_LOGO=['image/png','image/jpeg','image/webp','image/svg+xml'];

  const nombreDe=(clave)=>APPS.find((app)=>app.clave===clave)?.nombre||clave;

  /* Las cinco apps con sus tres campos, rellenando en blanco lo que
     falte (un apariencia.json nuevo, o uno de antes de que existieran). */
  function completar(valores){
    return Object.fromEntries(APPS.map(({clave})=>{
      const guardado=valores?.[clave];
      return [clave,{enlace:'',texto:'',logo:'',...(guardado&&typeof guardado==='object'?guardado:{})}];
    }));
  }

  /* Copia lista para publicarse: sin espacios sobrantes y con el
     «https://» puesto en el enlace si faltaba. */
  function normalizado(valores){
    return Object.fromEntries(Object.entries(valores).map(([clave,app])=>[clave,{
      enlace:EnlacesDelPie.normalizar(app.enlace),
      texto:String(app.texto||'').trim(),
      logo:String(app.logo||'')
    }]));
  }

  /* El hueco del logotipo de una fila: lo que hay y sus botones. Sin
     permiso para subir imágenes no hay botones (el portero rechazaría
     la subida), aunque se sigue enseñando el que ya hubiera. */
  function zonaDeLogo(app,imagen,puedeSubir){
    if(!puedeSubir&&!imagen)return '';
    const marco=imagen
      ?`<img src="${escapar(imagen)}" alt="Logotipo de ${escapar(app.nombre)}">`
      :'Sin logotipo';
    const botones=puedeSubir?`
        <button class="btn btn--suave btn--mini" type="button" data-accion="elegir">${imagen?'Cambiar':'Subir'} el logotipo</button>
        ${imagen?'<button class="btn btn--peligro btn--mini" type="button" data-accion="quitar">Quitar</button>':''}
        <input type="file" hidden data-accion="archivo" accept="${TIPOS_DE_LOGO.join(',')}">`:'';
    return `
      <div class="reparto-fila__logo">
        <span class="reparto-fila__marco">${marco}</span>${botones}
      </div>`;
  }

  /* Una tarjeta por app: su logotipo, el texto (solo sin logotipo) y el
     enlace.
       imagenDe(clave)  → dirección para enseñar su logotipo, o ''.
       puedeSubir       → si el plan deja subir logotipos. */
  function pintar(caja,valores,{imagenDe,puedeSubir}){
    caja.innerHTML=APPS.map((app)=>{
      const v=valores[app.clave];
      const imagen=v.logo?imagenDe(app.clave):'';
      return `
      <div class="reparto-fila" data-app="${app.clave}">
        <span class="reparto-fila__nombre">${app.nombre}</span>
        ${zonaDeLogo(app,imagen,puedeSubir)}
        <label class="campo"${v.logo?' hidden':''}>
          <span class="campo__etiqueta">Texto que se ve en la carta</span>
          <input type="text" maxlength="${TEXTO_MAX}" autocomplete="off" data-campo="texto"
                 value="${escapar(v.texto)}" placeholder="${escapar(app.nombre)}">
          <span class="campo__pista">Mientras no haya logotipo. En blanco, «${escapar(app.nombre)}».</span>
        </label>
        <label class="campo">
          <span class="campo__etiqueta">Enlace a tu local en ${app.nombre}</span>
          <input type="text" inputmode="url" autocomplete="off" spellcheck="false" data-campo="enlace"
                 value="${escapar(v.enlace)}" placeholder="https://…">
        </label>
      </div>`;
    }).join('');
  }

  /* Lo que se hace en las tarjetas:
       leerValores()               → los datos de las apps en este momento
       alCambiar()                 → tras escribir en un campo
       alElegirLogo(clave,archivo) → tras elegir un archivo de logotipo
       alQuitarLogo(clave)         → al pulsar «Quitar» */
  function escuchar(caja,{leerValores,alCambiar,alElegirLogo,alQuitarLogo}){
    const claveDe=(el)=>el.closest('[data-app]')?.dataset.app;
    caja.addEventListener('input',(ev)=>{
      const campo=ev.target.dataset.campo;
      if(!campo)return;
      leerValores()[claveDe(ev.target)][campo]=ev.target.value;
      alCambiar();
    });
    caja.addEventListener('click',(ev)=>{
      const boton=ev.target.closest('button[data-accion]');
      if(!boton)return;
      const fila=boton.closest('[data-app]');
      if(boton.dataset.accion==='elegir')fila.querySelector('input[type="file"]').click();
      if(boton.dataset.accion==='quitar')alQuitarLogo(fila.dataset.app);
    });
    caja.addEventListener('change',(ev)=>{
      if(ev.target.dataset.accion!=='archivo')return;
      const archivo=ev.target.files[0];
      ev.target.value='';
      if(archivo)alElegirLogo(claveDe(ev.target),archivo);
    });
  }

  /* El botón «Saber más»: enseña y esconde la explicación larga. */
  function prepararSaberMas(boton,panel){
    boton.addEventListener('click',()=>{
      const abrir=panel.hidden;
      panel.hidden=!abrir;
      boton.setAttribute('aria-expanded',String(abrir));
      boton.textContent=abrir?'Ocultar':'Saber más';
    });
  }

  return { TIPOS_DE_LOGO, nombreDe, completar, normalizado, pintar, escuchar, prepararSaberMas };
})();
