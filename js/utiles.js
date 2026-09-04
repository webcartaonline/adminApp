/* =========================================================
   UTILIDADES
   Herramientas pequeñas que usa medio programa.
   ========================================================= */

/* Atajo para buscar un elemento de la página: $('#btnPublicar') */
const $ = (s)=>document.querySelector(s);

/* ---------- Base64 con acentos y eñes ----------
   GitHub recibe y devuelve los archivos codificados en base64.
   Estas dos funciones traducen en un sentido y en el otro sin
   romper las tildes ni la ñ. */
function aBase64(txt){const b=new TextEncoder().encode(txt);let s='';b.forEach(x=>s+=String.fromCharCode(x));return btoa(s);}
function deBase64(b64){const bin=atob(String(b64).replace(/\s/g,''));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));}

/* Convierte datos binarios (una foto) a base64, por trozos para
   no desbordar la memoria con archivos grandes. */
async function blobABase64(blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let s='';
  for(let i=0;i<bytes.length;i+=8192){
    s+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
  }
  return btoa(s);
}

/* Rehace un blob a partir del base64, para vistas previas. */
function base64ABlob(base64,tipo='image/jpeg'){
  const bin=atob(base64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new Blob([bytes],{type:tipo});
}

/* Franja de aviso bajo la barra superior.
   Los avisos con resultado ("bien" y "error") se ocultan solos pasados
   unos segundos. Los de estado en marcha ("info", como "Publicando…") se
   quedan hasta que el propio proceso los sustituye por el resultado.
   Se guarda el temporizador para poder cancelarlo: si llega un aviso nuevo
   antes de tiempo, el reloj anterior no debe ocultar el mensaje reciente. */
let avisoReloj=null;
function avisar(txt,tipo='info'){
  const m=$('#mensaje');
  m.textContent=txt;
  m.className=`mensaje mensaje--${tipo}`;
  m.hidden=false;
  clearTimeout(avisoReloj);
  const segundos = tipo==='error' ? 9 : (tipo==='bien' ? 6 : 0);
  if(segundos>0) avisoReloj=setTimeout(()=>{m.hidden=true;},segundos*1000);
}

/* Deja el texto seguro para meterlo dentro del HTML. */
function escapar(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* Inventa un identificador único a partir de un nombre.
   El trozo aleatorio del final evita que dos platos distintos
   acaben compartiendo el nombre del archivo de su foto. */
function nuevoId(pre,base){
  const s=String(base||'x').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'').slice(0,24)||'x';
  return `${pre}-${s}-${Math.random().toString(36).slice(2,6)}`;
}

/* Un nombre muy largo desbordaría un botón. */
function recortarRotulo(txt,max=24){
  const t=String(txt||'');
  return t.length>max?`${t.slice(0,max-1).trimEnd()}…`:t;
}