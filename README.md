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
en GitHub Pages, Cloudflare Pages, Vercel, Netlify o abriendo el `index.html` local.

## Publicarla

Cada push a la rama por defecto dispara `.github/workflows/deploy.yml`, que corre los
chequeos, buildea y publica en GitHub Pages. Si los chequeos fallan **no se despliega**,
así un dataset inconsistente no llega a la página.

**Hay que habilitar Pages a mano una vez**, y no se puede automatizar: el `GITHUB_TOKEN`
de Actions no tiene permiso para crear el sitio (`enablement: true` falla con *Resource
not accessible by integration*). Haría falta un token personal guardado como secreto,
que no vale la pena solo para esto.

En el repo: **Settings** → barra lateral izquierda, grupo *Code and automation* →
**Pages** → sección *Build and deployment* → desplegable **Source** → **GitHub Actions**.
Link directo: `github.com/GiulianoB15/LC-Team-Builder/settings/pages`

Hasta que eso esté hecho, el workflow falla en `configure-pages` con *Get Pages site
failed ... Not Found*. Después basta con re-lanzarlo desde la pestaña Actions, sin
necesidad de un commit nuevo.

Queda en `https://giulianob15.github.io/LC-Team-Builder/`.

La página lleva `noindex` y un `robots.txt` que desalienta el rastreo, porque es un
proyecto personal que se comparte por link y no busca tráfico.

**Eso no es control de acceso**: cualquiera con la URL entra. Los buscadores serios
respetan esas señales, un scraper no tiene por qué. Si hiciera falta que solo entre
gente autorizada, hay que hostearla detrás de autenticación real — Cloudflare Access
tiene un plan gratuito hasta 50 usuarios.

Nada sensible vive en el servidor: el dataset es data pública del juego y la colección
de cada persona queda en el `localStorage` de su propio navegador.

## Estructura

```
src/
  data/
    constants.js       Sins, Sinners, tipos de daño, arquetipos
    identities.js      carga del dataset + validación de integridad
    identities.json    184 Identities  ← generado, no editar a mano
    egos.json          110 E.G.O       ← generado, no editar a mano
  lib/
    engine.js          motor: recursos de Sin, pasivas, E.G.O, resistencias, puntajes
    codigo.js          codifica/decodifica la colección para compartirla
    seleccion.js       alta/baja de IDs con tope y una-por-Sinner
    storage.js         persistencia en localStorage, versionada y migrable (Identities y E.G.O)
  components/          una pestaña por archivo
public/
  retratos/            imágenes bajadas  ← generado, no editar a mano
scripts/
  build-dataset.mjs    fusiona las fuentes y genera los JSON
  fetch-imagenes.mjs   baja los retratos y genera las miniaturas
  fetch-pasivas.mjs    baja las pasivas, una por id, desde limbus-assets
  parse-pasivas-wiki.mjs  extrae las pasivas de soporte del HTML de la wiki
  smoke-test.mjs       corre los chequeos
  tests.js             los chequeos en sí
```

## El dataset

**184 Identities y 110 E.G.O**, la más nueva del 2026-07-23. Sale de fusionar varias
fuentes, porque ninguna alcanza sola:

| Fuente | Rol | Aporta |
|---|---|---|
| Dump actualizado | **base** | 184 IDs, stats, resistencias, skills con afinidad y copias, keywords oficiales, fechas de estreno |
| [limbus-assets.eldritchtools.com](https://limbus.eldritchtools.com) | **pasivas** | combate y soporte de las 184, pasiva de los 110 E.G.O, con costo en Sin |
| [LCTeamBuilder](https://github.com/LCTeamBuilder/LCTeamBuilder.github.io) (MIT, © 2024 SuenoImposible) | números de skill | poder base, monedas y valor de moneda (417 de 618). Respaldo de pasivas |
| [Wiki de Limbus Company](https://limbuscompany.wiki.gg/wiki/Identity_Support_Passives) | respaldo | pasivas de soporte; hoy sin uso, cubierto por eldritchtools |

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

### E.G.O

Los 110 E.G.O tienen costo en recursos de Sin, resistencias por Sin, rango y tipo de
daño. La app te deja marcar cuáles tenés y, al armar equipo, te muestra **cuáles
podés usar de verdad**: solo los de Sinners desplegados (los de la banca no cuentan),
con su costo contrastado contra los recursos que genera el equipo.

Sus arquetipos **no venían en el dump**: el único campo temático es `statuses`, con
los nombres internos del juego (`Laceration`, `Burst`, `Breath`), que no coinciden con
los que ve el jugador (Bleed, Rupture, Poise). El mapeo no se escribió a mano: se
deriva de las Identities, donde conviven `estados` internos y `arquetipos` oficiales,
quedándose solo con los pares de precisión ≥ 0.85 y respaldo ≥ 8 IDs. El resultado se
publica en `meta.mapeoEstados` para poder auditarlo.

Cubre **93 de 110**. Los 17 restantes no son un agujero del mapeo: infligen buffs y
debuffs genéricos (`Binding`, `Protection`, `Agility`), no estados de arquetipo — hay
un chequeo que lo verifica.

### Cobertura de pasivas

**Completa: las 184 Identities con combate y soporte, y los 110 E.G.O con la suya.**

Durante un tiempo no lo fue, porque el dump de `identities.json` no trae pasivas y
LCTeamBuilder quedó en 147 IDs. La wiki tapó 34 huecos, pero solo publica las de
soporte, así que 34 IDs quedaban a medias y 3 sin nada.

El problema era de dónde se pedía el dato. La fuente sí publica las pasivas: no en
`identities.json`, sino en **un archivo por id**.

```
https://limbus-assets.eldritchtools.com/data/identities/<id>.json   combatPassives, supportPassives
https://limbus-assets.eldritchtools.com/data/egos/<id>.json         passiveList
```

Eso sale de su propio código: el componente que muestra "Combat Passives" hace
`useData(`identities/${identity.id}`)` y lee `skillData.combatPassives`
([`limbus-team-building-hub`](https://github.com/eldritchtools/limbus-team-building-hub),
`src/app/components/SkillLoader.js`), y `useData` resuelve contra `DATA_ROOT`.

`scripts/fetch-pasivas.mjs` las baja y las normaliza a `src/data/pasivas.json`. Se corre
desde *Actions* → **Bajar pasivas**, por la misma razón que el de retratos: son ~300
pedidos a un servidor ajeno.

#### Cómo se validó

Cruzando contra LCTeamBuilder en las **146 IDs que están en las dos fuentes**, que son
independientes entre sí:

| | Resultado |
|---|---|
| Costo en Sin (cuál y cuánto) | **312 de 312 idénticos** |
| Nombre de la pasiva | 312 de 323 |
| Tipo de costo (`owned` / `resonance`) | 307 de 312 |

Las 11 diferencias de nombre son erratas de LCTeamBuilder (`Conering` por `Cornering`,
`Repspiration` por `Respiration`, `Defense Breathing` por `Defensive Breathing`) o
renombres del juego. **Las 5 de tipo de costo quedan sin resolver**: no hay una tercera
fuente para desempatar. Se toma la de eldritchtools por estar al día y porque en el
costo, que es lo que consume el motor, acertó el 100%.

Aparte, los 5 E.G.O que se habían transcrito a mano desde capturas del juego coinciden
**exactamente** con lo que trajo la fuente automática. Hay un chequeo que lo verifica.

### Limitaciones conocidas, verificadas

- **Faltan los números de 201 de 618 skills** (poder base, monedas, valor de moneda):
  son de las Identities posteriores al corte de LCTeamBuilder. El motor no los usa.
  Los archivos por id de eldritchtools traen una clave `skills` que podría cerrarlo;
  falta mirarla.
- **Una ID quedó fuera del índice de LCTeamBuilder.** `LobotomyCorpRemnantFaust`
  existe como archivo válido pero nunca se agregó a `Equipables.ts`, así que su propia
  app no la muestra. El conversor la importa aparte.
- **Las descripciones traen los tokens del juego**, tipo `[AttackDmgUp]` o `[Binding]`:
  es el texto original, que la fuente reemplaza por íconos al mostrarlo. Se deja crudo
  antes que reescribirlo.

## Retratos

Dos formas, según prefieras:

**Desde GitHub, sin instalar nada** — pestaña *Actions* → workflow **Bajar retratos** →
botón *Run workflow*. Baja las imágenes, genera las miniaturas y las commitea solo.

**En tu máquina:**

```bash
npm install --no-save sharp        # opcional, para miniaturas de ~2 KB
node scripts/fetch-imagenes.mjs    # --forzar para rebajar todo
```

En los dos casos se corre **a demanda**, no en cada push. Las imágenes quedan versionadas en `public/retratos/`
y la app las sirve estáticas, así que no le pega al servidor de nadie en cada visita.

La URL sale del id, sin tabla de mapeo:

| | Patrón |
|---|---|
| Identity | `identities/<id>_gacksung.webp` |
| E.G.O | `egos/<id>_awaken.webp`, y si no está, `egos/<id>_awaken_profile.png` |

`gacksung` es el arte de uptie 3-4 y `normal` el de uptie 1-2, que es como se muestran
las IDs acá. `awaken` es el arte base del E.G.O; `erosion` es el de corrosión, que no
todos tienen y no se usa. Las dos reglas salen del código de la propia fuente
([`limbus-shared-library`](https://github.com/eldritchtools/limbus-shared-library),
`src/identity/identity.js` y `src/ego/ego.js`).

Con `sharp` las 294 imágenes pesan **0,64 MB** en total (96px WebP). Sin `sharp` se
guardan los originales, que son bastante más pesados.

`src/data/retratos.json` lista los ids disponibles y la app lo consulta **antes** de
pedir cada imagen: sin eso dispararía ~300 pedidos fallidos. Lo que falte se muestra
como un marcador con las iniciales en el color del arquetipo, nunca como imagen rota.

**El arte es de Project Moon.** Esto solo lo redistribuye para uso personal, igual que
cualquier fan site. Fuente: `limbus-assets.eldritchtools.com`.

### Regla del dataset

**No se completan datos de memoria.** Todo sale de las fuentes. Si algo está mal, se
corrige el conversor y se regenera — nunca se edita el JSON a mano.

## Compartir la colección

Tu colección entera —184 Identities y 110 E.G.O— entra en un **código de 99
caracteres**. Se copia como texto o como link (`…#c=<código>`), así que se pasa por
Discord o WhatsApp sin archivos de por medio.

Funciona porque los ids del juego son regulares (`1·SS·NN` para Identities, `2·SS·NN`
para E.G.O, SS = Sinner), así que la colección es un bitfield de posición fija: 32
slots por Sinner para Identities y 16 para E.G.O.

Lo que importa no es que sea corto, es que es **estable ante actualizaciones del
dataset**: cuando salga la Identity 10117 solo prende un bit que antes estaba en cero,
y los códigos que ya circularon siguen siendo válidos. Codificar "posición en el
array" habría invalidado todos los códigos compartidos cada vez que se suma una ID.

Lleva versión y checksum: un código truncado o mal copiado da un mensaje claro en vez
de cargar una colección equivocada en silencio.

### Modo visita

Abrir el código de otro **nunca toca tu colección**. Entrás en modo visita: ves la
ajena, podés armarle equipos y pedir recomendaciones con lo que esa persona tiene, y
salís cuando querés. Mientras tanto los checkboxes están bloqueados y nada se
persiste. Adoptarla como propia es un botón aparte, con confirmación.

Un link compartido tampoco se aplica solo: la app te dice qué trae y decidís vos.

## Qué hace el motor, y con qué datos

Todo lo que puntúa sale de datos verificables del juego:

| Señal | De dónde sale |
|---|---|
| Recursos de Sin del equipo | afinidad de cada skill, ponderada por copias en el mazo (3+2+1) |
| Qué pasivas se activan | `costo: [{sin, cantidad}]` de cada pasiva |
| Pasivas de combate vs. soporte | `PassiveType` del dataset (las de soporte rinden desde la banca) |
| Puntos blandos del equipo | multiplicadores de resistencia (0.5 resiste, 1 normal, 2 fatal) |
| Sinergia temática | `skillKeywordList`, los 7 arquetipos oficiales |
| Si un E.G.O es usable | su costo en Sin contra los recursos del equipo, solo para Sinners desplegados |

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

**Al sumar compartir:**

13. El hash `#c=` solo se leía al montar el componente. Con la app ya abierta, clickear
    un link compartido no hacía nada, porque el navegador no recarga cuando solo cambia
    el hash. Ahora también se escucha `hashchange`.

Todo esto está cubierto por `scripts/tests.js`.

## Pendiente

- **Números de skills de las Identities nuevas** (201 de 618). No los usa el motor.
  Posible fuente sin explorar: la clave `skills` de los archivos por id de
  eldritchtools, la misma vía por donde llegaron las pasivas.
- **Capa de recetas / arquetipos curados** (§3.2 del handoff): combos conocidos de la
  comunidad, con fuente y fecha. Es lo que convertiría el orden de heurística en
  recomendación. El meta cambia por temporada, así que cada receta necesita su
  `actualizadoEn` visible.
