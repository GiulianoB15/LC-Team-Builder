# Limbus Docket

App web para **Limbus Company** que lleva registro de qué Identities tenés, analiza
un equipo armado y recomienda con qué completarlo usando solo tu colección.

Corre 100% en el navegador, sin backend. Uso personal, no comercial.
No está afiliado ni respaldado por Project Moon.

## Correr el proyecto

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # genera dist/ para publicar
npm run preview  # previsualiza el build
node scripts/smoke-test.mjs   # chequeos del motor y del dataset
```

El build sale con rutas relativas (`base: "./"`), así que `dist/` funciona igual
en GitHub Pages, Vercel, Netlify o abriendo el `index.html` local.

## Estructura

```
src/
  data/
    constants.js       Sins, Sinners, tipos de daño, arquetipos
    identities.js      carga del dataset + validación de integridad
    identities.json    147 Identities  ← generado, no editar a mano
    egos.json           96 E.G.O       ← generado, no editar a mano
  lib/
    engine.js          motor: recursos de Sin, pasivas, resistencias, puntajes
    seleccion.js       alta/baja de IDs con tope y una-por-Sinner
    storage.js         persistencia en localStorage, versionada y migrable
  components/          una pestaña por archivo
scripts/
  build-dataset.mjs    genera los JSON desde el repo de LCTeamBuilder
  smoke-test.mjs       corre los chequeos
  tests.js             los chequeos en sí
```

## El dataset

**Fuente:** [LCTeamBuilder](https://github.com/LCTeamBuilder/LCTeamBuilder.github.io),
licencia MIT, © 2024 SuenoImposible. Se eligió por ser la única fuente evaluada que
es a la vez completa, licenciada de forma permisiva y accesible sin backend.

Para regenerar:

```bash
git clone --depth 1 https://github.com/LCTeamBuilder/LCTeamBuilder.github.io.git /tmp/lctb
node scripts/build-dataset.mjs --src /tmp/lctb
```

Sus datos son objetos TypeScript, un archivo por ID. El conversor los bundlea con
esbuild y los evalúa en vez de parsearlos con regex, así que lo que sale es
exactamente lo que su app usa.

### Limitaciones conocidas, verificadas

- **Congelado al 2025-08-06.** Ese es el último commit del repo de origen. Tiene 147
  Identities; el roster actual ronda las 185, así que **faltan unas 38**. La app
  muestra la fecha en el pie para que se note. Los ids son contiguos y sin huecos,
  o sea que el dataset está completo *hasta* su fecha de corte.
- **Los keywords venían vacíos.** `KeywordEnum` es un enum vacío en el repo de origen
  y las 147 IDs tienen `Keywords: []`. Los arquetipos de este proyecto se **derivan**
  del texto de skills y pasivas, que sí está completo.
- **Una ID quedó fuera de su propio índice.** `LobotomyCorpRemnantFaust` existe como
  archivo válido pero nunca se agregó a `Equipables.ts`, así que su propia app no la
  muestra. El conversor la importa aparte: son 147, no 146.

### Regla del dataset

**No se completan datos de memoria.** Todo sale de la fuente. Si algo está mal, se
corrige el conversor y se regenera — nunca se edita el JSON a mano.

## Qué hace el motor, y con qué datos

Todo lo que puntúa sale de datos verificables del juego:

| Señal | De dónde sale |
|---|---|
| Recursos de Sin del equipo | afinidad de cada skill |
| Qué pasivas se activan | `costo: [{sin, cantidad}]` de cada pasiva |
| Pasivas de combate vs. soporte | `PassiveType` del dataset (las de soporte rinden desde la banca) |
| Puntos blandos del equipo | multiplicadores de resistencia (0.5 resiste, 1 normal, 2 fatal) |
| Sinergia temática | arquetipos derivados del texto |

**La única excepción, y está marcada como tal en la UI:** el *orden* de despliegue es
una **heurística**, no un dato. El dataset no tiene ningún campo que diga qué ID
conviene desplegar primero — eso es contenido curado, no dato crudo. El criterio
actual (primero quienes más aportan a los Sins que las pasivas del equipo necesitan)
está escrito en pantalla para que se pueda juzgar.

## Historial de arreglos

**Al portar el prototipo** (artifact de un solo archivo → proyecto Vite):

1. `window.storage` era API del sandbox de artifacts; la app tiraba `TypeError` al
   cargar en un navegador común. Ahora usa `localStorage`.
2. `sinAffinity` mezclaba `"Pride"` y `"Orgullo"` para el mismo Sin, así que el conteo
   los tomaba separados y los umbrales daban mal.
3. El puntaje afirmaba "cubre la debilidad del equipo" comparando contra el mínimo,
   pero **agregar un miembro nunca puede subir un mínimo**: el débil sigue ahí.
4. Con el equipo lleno no se podía cambiar de ID: el tope se chequeaba antes de sacar
   al Sinner repetido.
5. La pestaña Colección mostraba 2 Sinners de 12 porque la lista se derivaba del dataset.

**Al importar el dataset real:**

6. Los campos `positionPref` / `generates` / `consumes` eran invención del prototipo,
   sin fuente. Se eliminaron y el motor se reescribió sobre datos del juego.
7. Las claves de guardado pasaron de texto (`"yisang-ring"`) al id numérico (`10109`).
   La migración v1→v2 mapea por nombre para no borrarle la colección a nadie.
8. Derivar arquetipos del texto crudo etiquetaba a Ring Yi Sang con 5 arquetipos,
   porque sus skills nombran cinco estados al azar. El propio juego lo aclara en una
   pasiva ("only counts as an 'Identity that inflicts [Bleed]'"), y el conversor usa
   esa frase. Afectaba a 2 de 147 IDs.

Todo esto está cubierto por `scripts/tests.js`.

## Pendiente

- **Completar las ~38 Identities faltantes.** Alternativa evaluada:
  `limbus-assets.eldritchtools.com/data/identities.json` es más reciente (abril 2026)
  pero no tiene licencia declarada.
- **Capa de recetas / arquetipos curados** (§3.2 del handoff): combos conocidos de la
  comunidad, con fuente y fecha. Es lo que convertiría el orden de heurística en
  recomendación. El meta cambia por temporada, así que cada receta necesita su
  `actualizadoEn` visible.
- **Usar los E.G.O.** Ya están en `egos.json` con costo de Sin y resistencias, pero el
  motor todavía no los considera.
- **Importar/exportar la colección**, para no tildar 147 IDs a mano y poder compartirla.
