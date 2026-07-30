# Limbus Docket

App web para **Limbus Company** que lleva registro de qué Identities tenés, sugiere
el orden de despliegue de un equipo y recomienda con qué completarlo usando solo
tu colección.

Corre 100% en el navegador, sin backend. Uso personal, no comercial.
No está afiliado ni respaldado por Project Moon.

## Correr el proyecto

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # genera dist/ para publicar
npm run preview  # previsualiza el build
node scripts/smoke-test.mjs   # chequeos del motor
```

El build sale con rutas relativas (`base: "./"`), así que `dist/` funciona igual
en GitHub Pages, Vercel, Netlify o abriendo el `index.html` local.

## Estructura

```
src/
  data/
    constants.js     Sins, Sinners, tipos de daño, escala de resistencias
    identities.js    dataset + validación de integridad
  lib/
    engine.js        motor: orden de despliegue, resistencias, puntaje de candidatas
    seleccion.js     alta/baja de IDs con tope y una-por-Sinner
    storage.js       persistencia en localStorage, versionada
  components/        una pestaña por archivo
scripts/
  smoke-test.mjs     chequeos del motor
```

## Regla del dataset

**No se completan datos de memoria.** Cualquier Identity que se agregue tiene que
venir de una fuente verificable. Un dato inventado rompe la confianza en todas las
recomendaciones del motor.

Hoy hay **8 Identities de ejemplo** (Yi Sang y Faust), heredadas del prototipo.
Sirven para probar que el motor funciona; **no** son un dataset usable — el juego
tiene ~185 Identities y decenas de E.G.O.

`validateIdentities()` corre sola en modo dev y avisa por consola si una Identity
tiene un Sin, un Sinner, una resistencia o un `positionPref` inválido.

## Qué se arregló al portar el prototipo

El prototipo era un artifact de un solo archivo. Al pasarlo a proyecto real se
corrigieron estos bugs, todos cubiertos por `scripts/smoke-test.mjs`:

1. **`window.storage` no existe en un navegador.** Era API del sandbox de artifacts;
   `window.storage?.get(...).then(...)` tiraba `TypeError` al cargar. Ahora usa
   `localStorage`, con envoltorio `{ version, owned }` para poder migrar cuando
   cambien las claves del dataset sin borrarle la colección a nadie.
2. **`sinAffinity` mezclaba idiomas.** Una ID decía `"Pride"` y otra `"Orgullo"`
   para el mismo Sin, así que el conteo los tomaba como dos afinidades distintas y
   los umbrales de 3/5 daban mal. Ahora la clave interna es siempre en inglés y el
   español vive solo en la UI.
3. **"Cubre la debilidad del equipo" era imposible.** El puntaje comparaba contra el
   *mínimo* del equipo, y agregar un miembro nunca puede subir un mínimo: el miembro
   débil sigue ahí. La app afirmaba cubrir algo que no cubría. Ahora se cuenta
   *cuántos* miembros son el punto blando, que sí es una métrica que un fichaje mueve.
4. **No se podía cambiar de ID con el equipo lleno.** El tope se chequeaba antes de
   sacar al Sinner repetido, así que con 6 elegidas no pasaba nada al clickear otra
   ID de un Sinner ya presente, en vez de reemplazarla.
5. **Solo se veían 2 Sinners de 12.** La lista se derivaba del dataset. Ahora es fija
   y los Sinners sin datos se muestran vacíos, para que se note qué falta.

## Pendiente

- **E.G.O**: no están modelados ni en el dataset ni en el motor, aunque son parte
  del objetivo del proyecto.
- **Dataset completo** (~185 Identities) desde una fuente verificable.
- **Orden de despliegue de 12**, con banca y `supportPassive` separado de
  `combatPassive`, más el costo en recursos de Sin de los support passives.
- **Capa de recetas / arquetipos**: combos conocidos de la comunidad (ej. Bleed con
  Ring Yi Sang + dúo Kurokumo), con fuente y fecha, porque el meta cambia por
  temporada y ninguna suma de atributos sueltos los descubre sola.
- **Importar/exportar la colección**, para no tildar ~185 IDs a mano y poder
  compartirla.
