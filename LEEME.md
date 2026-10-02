# Editor de la carta — guía rápida

La app con la que el dueño del bar cambia su carta: secciones, grupos, platos, precios,
fotos, alérgenos, idiomas y el aspecto de la página. Se instala en el móvil como una app y
funciona sin internet. Es HTML, CSS y JavaScript, sin frameworks ni compilación.

## 1. Dónde está

- **Dirección:** `https://adminapp-16c.pages.dev` (Cloudflare Pages).
- **De dónde sale:** este repositorio, `webcartaonline/adminApp`, **rama `deploy`**.
  Cloudflare publica solo lo que llega a esa rama.
- **Con quién habla:** solo con el portero (`webcarta-publicar`), que es quien lee y guarda
  la carta. El editor nunca toca los almacenes directamente. La dirección del portero está
  en `js/nube.js`, y solo ahí.

La dirección es la misma para todos los clientes. Lo que distingue a uno de otro son sus
dos datos de **Ajustes → Conexión**:

- **Negocio:** el nombre corto, el mismo de su carta (`el-parke-lounge-bar` en
  `el-parke-lounge-bar.webcartaonline.com`).
- **Clave:** la que se le da al contratar.

Los dos se guardan **solo en el navegador del cliente**. No viajan con la aplicación ni se
guardan en ningún otro sitio. Para llevarlos a otro dispositivo, se exportan desde Ajustes.

> **Importante:** tiene que ir por `https://`. Abrir el `index.html` con doble clic desde el
> disco duro no sirve para instalarla ni para que se actualice.

## 2. Cómo la instala el cliente

- **Móvil (Android/Chrome):** entra en la dirección → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** entra en la dirección → botón compartir → *Añadir a pantalla de inicio*.
- **Ordenador (Chrome/Edge):** entra en la dirección → icono de instalar en la barra de direcciones.

A partir de ahí tiene un icono propio y se abre a pantalla completa. Después pone su
negocio y su clave en Ajustes y pulsa «Probar la conexión».

## 3. Cómo publicar una versión nueva

Cada vez que cambies algo del editor, sube la versión en **dos archivos a la vez**.

### `sw.js` — la constante `VERSION`, al principio del archivo
```js
const VERSION = '12.0.0-BETA';   // ← súbela: 12.0.1, 12.1.0, 13.0.0…
```
Es lo que hace que los navegadores se enteren de que hay algo nuevo. **Si no la cambias,
nadie recibe la actualización**, aunque hayas cambiado el resto de archivos.

Formato **A.B.C**, con `-BETA` opcional en versiones de prueba:

- **A:** cambio funcional o gráfico global.
- **B:** cambio interno o gráfico relevante que no altera el funcionamiento.
- **C:** erratas, mensajes mal mostrados, arreglos y mejoras menores.

### `version.json`
```json
{
  "version": "12.0.1",
  "fecha": "2026-10-02",
  "titulo": "Frase corta que resume la versión",
  "cambios": [
    "Una frase por novedad, escrita para el dueño del bar, no para un programador.",
    "Otra novedad."
  ]
}
```
Es lo que el cliente lee en la ventana de novedades.

> **Si añades un archivo `.css` o `.js` nuevo**, apúntalo también en la lista `ARCHIVOS` de
> `sw.js`, o no se guardará para funcionar sin conexión.
>
> **Si añades una página `.html` nueva**, va en la lista `PAGINAS` de `sw.js`, no en
> `ARCHIVOS`, y además en el apartado de navegación del `fetch`. Cloudflare quita el `.html`
> de las direcciones: en `sw.js` se guarda con el nombre corto (`./ajustes`) y en los
> enlaces se escribe el nombre completo (`pagina.html`).

### Comprobar y subir

```powershell
# Desde esta carpeta. Primero, traer lo último
git pull

# Comprobar
node --check js/publicar.js          # uno por cada archivo .js tocado
node pruebas/papelera-de-fotos.mjs

# Publicar
git checkout deploy
git add .
git commit -m "Qué ha cambiado, en español"
git push origin deploy
```

A los pocos minutos Cloudflare ha publicado la versión nueva. Se comprueba abriendo el
editor con **Ctrl + F5** y mirando en Ajustes → Información que sale la versión nueva.

La rama **`main`** guarda la versión que funciona y sirve de marcha atrás. Se une con
`deploy` cuando lo nuevo está comprobado.

## 4. Qué ve el cliente cuando hay una versión nueva

La primera vez que abre el editor después de una publicación le sale una **ventana con las
novedades** de `version.json` y un botón «Actualizar». Al pulsarlo, el editor se recarga con
la versión nueva. Sale al abrir, antes de tocar nada, así que no hay trabajo a medias que
perder, y no vuelve a salir hasta la siguiente versión.

Su negocio, su clave y su carta no se ven afectados en ningún momento.

## 5. Estructura

```
index.html          el editor de la carta
ajustes.html        conexión (negocio y clave), personalización e información
pagina.html         «Ajustes de la página» (colores, portada, fuentes…), dentro de un iframe
manifest.json       nombre e icono de la app instalada
sw.js               el "vigilante": guarda copia y actualiza sin preguntar
version.json        las novedades que lee el cliente
css/                estilos, uno por parte de la pantalla
js/                 programa, uno por responsabilidad
  nube.js           el único que sabe dónde está el servidor
  licencia.js       qué deja hacer el plan del cliente
  publicar*.js      traer la carta y publicarla
  imagen*.js        fotos: rutas, papelera, comprimir y encuadrar
  plantilla.js      la plantilla del local para la vista previa
  pdf-*.js          la carta en PDF (en BETA)
  vista*.js         el árbol lateral y la columna del editor
vista-previa/       la vista previa de la carta con los cambios sin publicar
vendor/             librerías de terceros (jsPDF, html2canvas); no se editan
pruebas/            pruebas que se lanzan con Node
img/                iconos de la app
```

## 6. Ojo

- **Este repositorio es público** y todo lo que se sube lo publica Cloudflare Pages. Aquí no
  puede ir ninguna clave, token ni dato de clientes.
- Al publicar, el orden es siempre: fotos nuevas → carta → fotos que ya no se usan → ajustes
  de la página. Así la carta nunca apunta a una foto que no existe.
- Esconder un botón según el plan no protege nada: el portero vuelve a comprobar los permisos.
