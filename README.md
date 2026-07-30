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
    identities.json    184 Identities  ← generado, no editar a mano
    egos.json          110 E.G.O       ← generado, no editar a mano
  lib/
    engine.js          motor: recursos de Sin, pasivas, resistencias, puntajes
    seleccion.js       alta/baja de IDs con tope y una-por-Sinner
    storage.js         persistencia en localStorage, versionada y migrable
  components/          una pestaña por archivo
scripts/
  build-dataset.mjs    fusiona las dos fuentes y genera los JSON
  smoke-test.mjs       corre los chequeos
  tests.js             los chequeos en sí
```

## El dataset

**184 Identities y 110 E.G.O**, la más nueva del 2026-07-23. Sale de fusionar dos
fuentes, porque ninguna de las dos alcanza sola:

| Fuente | Rol | Aporta |
|---|---|---|
| Dump actualizado | **base** | 184 IDs, stats, resistencias, skills con afinidad y copias, keywords oficiales, fechas de estreno |
| [LCTeamBuilder](https://github.com/LCTeamBuilder/LCTeamBuilder.github.io) (MIT, © 2024 SuenoImposible) | **solo pasivas** | separación combate/soporte y costo en recursos de Sin |

Para regenerar:

```bash
git clone --depth 1 https://github.com/LCTeamBuilder/LCTeamBuilder.github.io.git /tmp/lctb
node scripts/build-dataset.mjs --nuevo <dir con identities.json y egos.json> --lctb /tmp/lctb
```

### Por qué se fusionan y no se elige una

- **El dump nuevo gana en casi todo**: 184 IDs contra 147, trae `skillKeywordList`
  oficial en vez de keywords derivados del texto, y sus resistencias son correctas.
- **Las resistencias de LCTeamBuilder no sirven**: 109 de sus 147 IDs comparten el
  mismo perfil (`1, 0.5, 2`). Los seis perfiles posibles son las permutaciones de
  {0.5, 1, 2}, y el reparto del dump nuevo es plausible (43/37/34/32/19/19), así que
  ese 74% idéntico es un valor por defecto que nunca completaron.
- **Pero el dump nuevo no tiene pasivas**, y sin ellas se cae la mitad del motor.

### Limitaciones conocidas, verificadas

- **37 Identities no tienen datos de pasivas**: son posteriores al corte de
  LCTeamBuilder (2025-08-06). Quedan marcadas con `tienePasivas: false` y la UI las
  muestra con una etiqueta "sin pasivas", para que no parezcan analizadas igual que
  el resto.
- **Una ID quedó fuera del índice de LCTeamBuilder.** `LobotomyCorpRemnantFaust`
  existe como archivo válido pero nunca se agregó a `Equipables.ts`, así que su propia
  app no la muestra. El conversor la importa aparte.

### Regla del dataset

**No se completan datos de memoria.** Todo sale de las fuentes. Si algo está mal, se
corrige el conversor y se regenera — nunca se edita el JSON a mano.

## Qué hace el motor, y con qué datos

Todo lo que puntúa sale de datos verificables del juego:

| Señal | De dónde sale |
|---|---|
| Recursos de Sin del equipo | afinidad de cada skill, ponderada por copias en el mazo (3+2+1) |
| Qué pasivas se activan | `costo: [{sin, cantidad}]` de cada pasiva |
| Pasivas de combate vs. soporte | `PassiveType` del dataset (las de soporte rinden desde la banca) |
| Puntos blandos del equipo | multiplicadores de resistencia (0.5 resiste, 1 normal, 2 fatal) |
| Sinergia temática | `skillKeywordList`, los 7 arquetipos oficiales |

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

**Al fusionar el dump actualizado (184 IDs):**


9. Las resistencias de LCTeamBuilder eran un valor por defecto en el 74% de las IDs
   (109 de 147 con el mismo perfil). El motor venía puntuando resistencias sobre dato
   malo. Ahora salen del dump nuevo.
10. Los arquetipos derivados del texto acertaban 134 de 147 contra los keywords
    oficiales (91%). Se reemplazaron por `skillKeywordList`, que es el dato real.
11. Los recursos de Sin contaban skills sueltas. Ahora ponderan por copias en el mazo,
    que es lo que determina cuántos recursos genera de verdad una ID.
12. Las fuentes escriben el mismo nombre distinto (`LCE E.G.O::Dimension Shredder` vs
    `LCE E.G.O:: Dimension Shredder`). La migración del guardado normaliza espacios.

Todo esto está cubierto por `scripts/tests.js`.

## Pendiente

- **Pasivas de las 37 Identities nuevas.** Es el único hueco de datos que queda.
  Hace falta una fuente que publique pasivas con su tipo (combate/soporte) y su costo
  en recursos de Sin, posterior a agosto 2025.
- **Capa de recetas / arquetipos curados** (§3.2 del handoff): combos conocidos de la
  comunidad, con fuente y fecha. Es lo que convertiría el orden de heurística en
  recomendación. El meta cambia por temporada, así que cada receta necesita su
  `actualizadoEn` visible.
- **Usar los E.G.O.** Ya están en `egos.json` con costo de Sin y resistencias, pero el
  motor todavía no los considera.
- **Importar/exportar la colección**, para no tildar 184 IDs a mano y poder compartirla.
