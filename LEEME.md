# Editor de la carta — guía rápida

## 1. Ponerlo en marcha (una sola vez)

1. Crea un repositorio nuevo en la cuenta `webcartaonline`. Por ejemplo `editor`.
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio
   (el `index.html` tiene que quedar arriba del todo, no dentro de otra carpeta).
3. En el repositorio: **Settings → Pages → Source: Deploy from a branch →
   rama `main`, carpeta `/ (root)`** y guarda.
4. A los dos minutos la aplicación está en
   `https://webcartaonline.github.io/editor/`

Esa dirección es la misma para todos los clientes. Lo que distingue a un cliente
de otro son sus ajustes (cuenta, repositorio, token), que se guardan en su
navegador y no viajan con la aplicación.

> **Importante:** tiene que ir por `https://`. Abrir el `index.html` con doble
> clic desde el disco duro funciona, pero sin actualizaciones ni instalación.

## 2. Cómo lo instala el cliente

- **Móvil (Android/Chrome):** entra en la dirección → menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** entra en la dirección → botón compartir → *Añadir a pantalla de inicio*.
- **Ordenador (Chrome/Edge):** entra en la dirección → icono de instalar en la barra de direcciones.

A partir de ahí tiene un icono propio y se abre a pantalla completa.

## 3. Cómo publicar una versión nueva

Cada vez que cambies algo del editor, **dos archivos**:

### `sw.js` — la constante `VERSION`, al principio del archivo
```js
const VERSION = '1.0.0';   // ← súbelo: 1.0.1, 1.1.0, 2.0.0…
```
Esto es lo que hace que los navegadores se enteren de que hay algo nuevo. **Si
no lo cambias, nadie recibe la actualización**, aunque hayas cambiado el resto
de archivos.

### `version.json`
```json
{
  "version": "1.0.1",
  "fecha": "2026-09-04",
  "titulo": "Frase corta que resume la versión",
  "cambios": [
    "Una frase por novedad, escrita para el dueño del bar, no para un programador.",
    "Otra novedad."
  ]
}
```
Es lo que el cliente lee en la ventana de novedades.

Sube los cambios a GitHub y ya está. **La versión nueva se instala sola**, sin
que el cliente tenga que hacer ni aceptar nada.

> **Si añades un archivo `.css` o `.js` nuevo**, apúntalo también en la lista
> `ARCHIVOS` de `sw.js`, o no se guardará para funcionar sin conexión.

## 4. Qué ve el cliente cuando hay una versión nueva

Nada que decidir. La aplicación se pone al día ella sola en cuanto puede, sin
avisos a mitad de una edición ni botones que pulsar.

Lo único que aparece es una **ventana informativa** con la lista de novedades,
la primera vez que abre el editor después de que haya cambiado la versión. Se
cierra con un botón «Entendido» y no vuelve a salir hasta la siguiente
publicación. Sus ajustes, su token y su carta no se ven afectados en ningún
momento por este proceso.

## 5. Estructura

```
index.html          la página
manifest.json       nombre e icono de la app instalada
sw.js               el "vigilante": guarda copia y actualiza sin preguntar
version.json        las novedades que lee el cliente
css/                estilos, uno por parte de la interfaz
js/                 programa, uno por responsabilidad
img/                iconos de la app
```
