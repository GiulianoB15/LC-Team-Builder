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
    estampa.js         dibuja el equipo en un canvas y lo baja como PNG
    seleccion.js       alta/baja de IDs con tope y una-por-Sinner
    storage.js         persistencia en localStorage, versionada y migrable (Identities y E.G.O)
    cx.js              junta clases y descarta las que no aplican
  components/          una pestaña por archivo, más la ficha de Identidad y los chips
  styles.css           tokens de color/tipografía y todas las clases
public/
  retratos/            imágenes bajadas  ← generado, no editar a mano
scripts/
  build-dataset.mjs    fusiona las fuentes y genera los JSON
  fetch-imagenes.mjs   baja los retratos y genera las miniaturas
  fetch-datos.mjs      baja pasivas y números de skill, uno por id
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
| [limbus-assets.eldritchtools.com](https://limbus.eldritchtools.com) | **pasivas y números de skill** | combate y soporte de las 184, pasiva de los 110 E.G.O con su costo en Sin, y poder base / monedas / valor de moneda |
| [LCTeamBuilder](https://github.com/LCTeamBuilder/LCTeamBuilder.github.io) (MIT, © 2024 SuenoImposible) | respaldo | pasivas y números de skill, si la fuente de arriba no los tiene |
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

`scripts/fetch-datos.mjs` las baja y las normaliza a `src/data/pasivas.json`. Se corre
desde *Actions* → **Bajar datos de la fuente**, por la misma razón que el de retratos:
son ~300 pedidos a un servidor ajeno.

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

### Números de skill

Poder base, monedas, valor de moneda y peso de ataque. Salen de la misma pasada del
bajador, a `src/data/skills.json`, y se cruzan **por id de skill**: el dump ya trae ese
id en `skillTypes[].id` y es la misma clave del diccionario `skills` de la fuente, así
que no hay nada que interpretar.

Es la diferencia grande con el injerto anterior desde LCTeamBuilder, que matcheaba
**por tier**: cuando una ID tiene dos skills del mismo tier hay que desempatar por
afinidad, y aun así quedaban 40 ambiguas y 2 con las dos fuentes en desacuerdo.

| | Antes (por tier, LCTeamBuilder) | Ahora (por id) |
|---|---|---|
| Resueltas | 417 de 618 | **618 de 618** |
| Ambiguas | 40 | 0 |
| En conflicto | 2 | 0 |

Validado igual que las pasivas, en las 416 skills donde LCTeamBuilder resuelve sin
ambigüedad:

| | Resultado |
|---|---|
| Valor de moneda | **416 de 416** |
| Poder base | 415 de 416 |
| Monedas | 414 de 416 |
| Nombre | 408 de 416 |

De las 8 de nombre, 6 son erratas de LCTeamBuilder (`Flank Trust` por `Flank Thrust`,
`Enacment` por `Enactment`, `Supress` por `Suppress`, `4OS-2` con la letra O donde va
un cero) y 2 son skills que el juego renombró. Las 3 numéricas —`Ward` de Meursault,
`Un, Deux` de Meursault y `Scission` de Outis— **quedan sin resolver**: lo más
probable es que sean cambios de balance posteriores al corte de LCTeamBuilder, pero
no hay una tercera fuente para confirmarlo. Se toma la de eldritchtools por estar al
día.

Un detalle de la fuente que hay que respetar: `skills[<id>].data` **no** trae una copia
entera por uptie, sino solo lo que cambia en cada uno. Hay que acumular los tramos del
1 al 4, no quedarse con el último — si no, salen objetos incompletos. El bajador hace
lo mismo que su `SkillCard`.

### Sinergia: quién aplica y quién cobra

El arquetipo es oficial y viene en el dump, pero dice a qué **familia** pertenece cada
Identidad, no **qué hace adentro**. En un equipo de Bleed hay quien inflige el sangrado y
quien lo cobra, y son roles distintos: seis que cobran y ninguno que inflija no es un
equipo, es una lista. Ese campo no existe en ninguna fuente.

Sí está en el texto de las pasivas, con los nombres internos entre corchetes —los mismos
que ya mapea `derivarMapeoEstados()`:

```
"Apply 2 [Laceration] …"             → aplica Bleed
"…damage to targets with [Burst]"    → lee Rupture
```

Se mira **frase por frase** y decide el verbo que viene antes del token en esa misma
frase. Mirar la pasiva entera mezclaría un `Apply` de una oración con el token de otra.

| | |
|---|---|
| IDs con algún rol derivado | 116 de 184 |
| Sin señal (sus pasivas no nombran estados) | 68 |
| Reparten buffs al equipo | 23 |
| Con pasiva posicional | 6 |
| **Arquetipos derivados fuera del keyword oficial** | **14** |

Esa última fila es el guardarraíl: son casos donde el parser derivó un arquetipo que la
ID no tiene oficialmente. Algunos son legítimos —una ID puede cobrar un estado que no es
el suyo— y otros son ruido. Se publica en `meta.sinergia` y hay un chequeo que falla si
se dispara. **Es interpretación de texto, no dato oficial, y la app lo dice.**

#### Posición en el Dashboard

`Dashboard` aparece en dos sentidos y solo uno sirve: el orden del equipo (*"allies placed
after this unit on the Dashboard"*) y los slots de skill de la propia unidad (*"Base Attack
Skills on this unit's Dashboard"*). **De 21 pasivas que lo nombran, 14 son del segundo
tipo**, así que se exige la forma relacional completa y no alcanza con la palabra suelta.
Quedan 6 IDs con posición real, y son las únicas que pisan el orden por aporte de recursos.

#### Velocidad, y qué significa "orden de despliegue"

Quién actúa primero lo decide la **velocidad**; el orden de despliegue solo desempata
cuando dos unidades sacan el mismo valor ([wiki, *Battles*](https://limbuscompany.wiki.gg/wiki/Battles)).
El motor tenía `velocidad` en el dataset **sin usar** y llamaba "orden de despliegue" a un
ranking por recursos de Sin. Ahora la app muestra el rango de velocidad del equipo y dice
qué determina cada cosa.

### Importar builds de la comunidad: intentado y descartado

[limbus-teams.eldritchtools.com](https://limbus-teams.eldritchtools.com) tiene una base de
equipos publicados con `identity_ids`, `ego_ids` y `deployment_order`, **con nuestros mismos
ids**. Sobre el papel es la fuente ideal para el §3.2. Se escribió el bajador y se descartó.

Lo que se aprendió, por si algún día se retoma:

- Su buscador va por el RPC `search_builds_v9`. Si **no** se le pasa
  `p_ignore_block_discovery`, el servidor filtra solo las builds de quien no marcó su
  contenido como no descubrible. Ese es el default correcto para algo automático: lo
  decide su servidor, no nosotros.
- La conexión a Supabase son variables `NEXT_PUBLIC_*`, o sea que en teoría viven en el
  bundle. **No se pudieron extraer en tres intentos**: los scripts que cuelgan del HTML
  solo *usan* `getSupabase()`, y seguir el mapa de chunks hasta 80 archivos tampoco dio.
- La alternativa era leer el HTML de cada `/builds/<id>`, pero eso es **una petición por
  build** contra el servidor de un proyecto chico, en vez de una llamada paginada.

Se cortó por dos motivos: reconstruir desde afuera la plomería interna de otro proyecto se
rompe el día que redeployan, y la vía que sí funcionaba era la menos considerada con ellos.

La postura sobre qué se copiaría, si se retoma: **solo ids, título, autor, link, orden,
tags y fecha**. Nunca el texto que escribió la persona — para eso, linkear al original.

### Facciones tachadas

Cinco etiquetas de cuatro Identidades venían del dump envueltas en el marcado con el que
el juego las pinta en pantalla, y el chip lo mostraba tal cual:

```
<color=#d40000><s>Le Sette Famiglie<s></color>
```

Son **afiliaciones anteriores** del personaje: el juego las muestra en rojo y tachadas
porque ese vínculo se rompió. Thumb Nursefather ya no está en Le Sette Famiglie ni es
Sottocapo, pero lo estuvo, y eso explica de dónde viene.

Así que no se borran: el conversor limpia el marcado y guarda el nombre en `etiquetas`
—para que filtrar por esa facción la siga encontrando— y además lo anota en `etiquetasEx`.
La UI lo usa para tacharlo, igual que el juego; en la ficha, que es tabla de texto, va
como `(ex)`.

Las cuatro afectadas: 10613 *The Lord of Hongyuan* (`Jia Family`), 10614 *Ring Nursefather*
(`Maestro`), 10916 *Thumb Nursefather* (`Le Sette Famiglie`, `Sottocapo`) y 11115 *Middle
Nursefather* (`Great Sister`). Ningún E.G.O.

**Dos detalles que condicionaron la solución.** Dos de las cinco vienen mal cerradas
(`<s>…<s>` en vez de `</s>`), así que emparejar aperturas con cierres no funcionaba: se
limpia etiqueta por etiqueta. Y el limpiador **nombra** las etiquetas de formato
(`color`, `size`, `s`, `b`, `i`, `u`) en vez de borrar todo `<...>`, porque los textos de
las pasivas usan esa misma sintaxis para contenido real —`<Bloodfiend>`, `<Lake Entity>`,
`<Rules of the Backstreets>`— y un barrido genérico se los comía.

### Limitaciones conocidas, verificadas

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

**294 de 294.** La URL sale del id, sin tabla de mapeo. Con `sharp` las 294 pesan
**1,2 MB** en total (96px WebP); sin `sharp` se guardan los originales, bastante más
pesados.

**Identities:** las 12 base (id terminado en `01`) usan el sufijo `_normal` y el resto
`_gacksung`.

**E.G.O:** `<id>_awaken_profile.webp`. No se deduce del patrón de Identities ni del
código de la fuente: es una mezcla de los dos. Lo que devolvió 404:

| Patrón | De dónde salió |
|---|---|
| `_gacksung`, `_normal`, `_profile`, `_erosion`, sin sufijo | analogía con el de Identities |
| `_awaken.webp` | analogía cruzada |
| `_awaken_profile.png` | del código de la fuente ([`limbus-shared-library`](https://github.com/eldritchtools/limbus-shared-library), `src/ego/ego.js`) |
| `/ego/…`, `/egoes/…` | por si la carpeta fuera otra |

El nombre `<id>_awaken_profile` sí es el de su app —`awaken` es el arte base y
`erosion` el de corrosión— pero la extensión que este servidor sirve en `/assets` es
`.webp`, no el `.png` del código. Las Identities son al revés: ahí el naming `_profile`
no existe y va el sufijo pelado.

**Contra este servidor manda lo que responde 200, no lo que dice el código de su app.**
Cambiar la regla de Identities por la del código, que parecía más correcta, rompió las
12 que ya funcionaban.

Por eso el script tiene `--probar`: prueba una matriz de URLs candidatas sobre un par
de ids y muestra el código de respuesta de cada una, sin bajar ni commitear nada.
Desde *Actions* → **Bajar retratos** → tildar *probar*. Así apareció el patrón de
E.G.O, en una corrida de 8 segundos en vez de 110 pedidos por corazonada.

`src/data/retratos.json` lista los ids disponibles y la app lo consulta **antes** de
pedir cada imagen: sin eso dispararía ~300 pedidos fallidos. Lo que falte se muestra
como un marcador con las iniciales en el color del arquetipo, nunca como imagen rota.

**El arte es de Project Moon.** Esto solo lo redistribuye para uso personal, igual que
cualquier fan site. Fuente: `limbus-assets.eldritchtools.com`.

### Regla del dataset

**No se completan datos de memoria.** Todo sale de las fuentes. Si algo está mal, se
corrige el conversor y se regenera — nunca se edita el JSON a mano.

## Cuántos entran a pelear, y para qué sirve la banca

**El cupo no es un número fijo del juego**: cada encuentro define su *Participant Limit*.
Mirror of Immortality y el Canto IX van con **7**; el Canto VII y el Intervallo V, con 6; y
hay encuentros con menos ([wiki, *Battles*](https://limbuscompany.wiki.gg/wiki/Battles) y
las páginas de cada capítulo). Por eso se elige en la app, con 7 de default — el del Mirror
Dungeon actual, que es donde armar equipo importa.

El equipo siempre son 12, uno por Sinner. Los que no entran quedan de banca.

### Por qué la banca no es un detalle

De un suplente **lo único que llega a la mesa es su pasiva de soporte**: la de combate corre
cuando la ID está desplegada y la de soporte cuando **no** lo está
([wiki](https://limbuscompany.wiki.gg/wiki/Identity_Support_Passives)). Cualquier
recomendación de banca que mire la pasiva de combate está vendiendo algo que no va a pasar.

Por eso `sinergia` se guarda además **separada por tipo de pasiva**: 83 Identities tienen un
rol derivable de su pasiva de soporte específicamente, y ése es el que se usa para la banca.

Y como el equipo son 12 Sinners con uno cada uno, la banca no es "cinco cualesquiera" sino
**uno por cada Sinner que no entró**. La pregunta no es "¿a quién bajo?" sino, por cada
Sinner que quedó afuera, "¿cuál de mis Identidades de ese Sinner conviene tener ahí?".

Se puntúa por dos cosas: que el equipo le cubra el costo de su pasiva de soporte, y que esa
pasiva toque el arquetipo que el equipo está jugando.

## Filtrar por lo que hace, no por lo que es

Además de Sinner, arquetipo y facción, la colección filtra por **rol**: quién aplica el
estado, quién lo aprovecha, quién reparte buffs al equipo y a quién le importa la posición.
Sale de la capa de sinergia.

Los dos primeros **se cruzan con los chips de arquetipo**: `Bleed` + `aplica` es "las que
infligen sangrado" (13 de 184), no "las de Bleed que aplican cualquier cosa". Sin arquetipo
elegido alcanza con que apliquen algo (83).

En la sección de E.G.O los chips no aparecen: no tienen sinergia derivada, y un filtro que
no filtra nada es peor que no estar.

## Qué me falta

El inverso de «Completar equipo»: esa arma con lo que tenés, esta dice qué te falta. Sirve
para decidir dónde gastar, no para jugar hoy.

**Lo que cuenta son los Sinners, no las Identidades.** Diez de Bleed repartidas en tres
Sinners no arman un equipo de Bleed: se despliegan 6 y no puede haber dos del mismo. Por eso
el número grande es "Sinners cubiertos" sobre el cupo, y una candidata cuyo Sinner ya está cubierto
aparece atenuada — es una alternativa, no un lugar nuevo.

Encima se mira el rol: si lo que tenés solo cobra el estado y nadie lo inflige, la
recomendación no es "más del mismo arquetipo" sino específicamente quien lo aplique.

Lo que **no** sabe: qué banner está activo ni cuál es el meta. Te dice qué le falta a tu
colección, no qué conviene sacar este mes.

## Ficha de Identidad y comparador

Todo el dataset estaba y no se veía: el texto de las pasivas, su costo, los números de
cada skill, la velocidad. El motor los usaba para puntuar, pero no había forma de mirarlos.
El botón **ficha** de cada tarjeta abre un panel con eso.

Adentro hay un desplegable **Comparar con**, y al elegir una segunda la misma tabla gana
una columna: **las filas que difieren quedan resaltadas**. Es una tabla y no dos fichas al
lado porque comparando importa la fila —"la velocidad de esta contra la de aquella"—, no la
tarjeta; y porque dos columnas entran en un celular y dos fichas completas no.

Se ofrecen las 184, no solo las propias: comparar contra una que **no** tenés es justo lo
que sirve para decidir si conviene sacarla.

## Descargar el equipo como imagen

Botón *Descargar imagen* en Armar equipo. Arma un PNG con los desplegados numerados y la
banca aparte y apagada — la distinción importa, y una imagen que las mezcle miente.

Se dibuja en un `<canvas>` en el navegador: sin dependencias, sin servidor y sin subir nada
a ningún lado. Los retratos los sirve la propia app, así que no hay CORS que resolver. Si
alguno falta se dibuja el marcador de iniciales en vez de abortar.

## Las 12 base vienen marcadas

Las «LCB Sinner» —una por Sinner, 1★— las tiene cualquiera desde que empieza a jugar, así
que pedirle a cada persona que las marque a mano es pedirle que confirme algo obvio.

**No se deducen del id.** Terminan en `01`, pero eso es el esquema de numeración, no una
garantía. Salen de la etiqueta `Base Identity` que trae el dump y que aparece exactamente
12 veces, una por Sinner.

Se marcan en tres lugares para que no haya estados inconsistentes:

- **Al guardar**, con una migración `v3 → v4`. Queda escrito en el storage, así que no hay
  que recalcularlo en cada carga y se nota en el historial que la colección cambió por una
  decisión nuestra.
- **Al decodificar un código ajeno**, porque un código hecho antes de este cambio no las
  trae y la colección visitada se vería con 12 menos que la de su dueño.
- **En la UI**: las tarjetas quedan bloqueadas con una insignia *«por defecto»*. Dejar
  destildarlas sería ofrecer un estado que la app revierte sola al recargar.

De paso apareció un bug latente: `migrar()` devolvía siempre `egos: {}`, así que cualquier
migración desde v2 o v3 habría borrado los E.G.O. Hasta ahora no se disparaba —un guardado
v3 tomaba el atajo de "misma versión"— pero con la v4 sí pasa por ahí. Corregido y con
chequeo.

**Para E.G.O no hay equivalente**: hay 20 ZAYIN repartidos entre los 12 Sinners y
`extraible: false` marca 82 de 110, así que no hay forma de deducir del dataset cuáles
vienen de arranque. Eso queda sin tocar.

## Completar equipo: la base puede crecer hasta 12

El tope eran 3 Identidades de referencia porque así lo pedía el handoff original, no por
nada del juego. Ahora son **hasta 12, una por Sinner**, igual que el equipo.

Tiene sentido porque la recomendación se recalcula sobre la base **entera** —perfil de
arquetipos, recursos de Sin, huérfanos y resistencias—, así que cada Identidad que sumás la
cambia. Verificado: con una base de Bleed que crece de 1 a 8, la primera recomendación va
cambiando en el camino, y sigue reaccionando pasado 3, que era el límite viejo.

Al llegar a 12 no quedan candidatas **por definición** —no hay Sinner libre—, así que la
pestaña lo dice en vez de mostrar una lista vacía, y distingue ese caso del otro: no tener
Identidades de los Sinners que quedaron libres.

## Cómo se ordenan las recomendaciones

**Por afinidad temática primero, y el resto desempata.** No por un puntaje único, y hay un
motivo medido.

En «Completar equipo» el puntaje suma cosas heterogéneas: compartir arquetipo vale +3, cada
resistencia que no empeora +2, cada pasiva ajena destrabada +2, y no compartir arquetipo
resta apenas 1. Con la colección completa el tope sale bien, pero **con una colección chica
—que es el caso real— 4 de las 8 recomendaciones no compartían nada con la base**: una
Identidad genérica junta 8 o 9 puntos por resistencias y pasivas baratas y se cuela arriba.

Ahora la afinidad (arquetipo compartido, tapar un huérfano, cobrar lo que el equipo inflige)
se lleva aparte y ordena; el total desempata. Así "el que juega a lo mismo" siempre va antes
que "el que tiene buenas resistencias", sin depender de qué número le pusimos a cada cosa.
Hay un chequeo que verifica la invariante.

En «Qué me falta» el problema era otro: `sinnerNuevo` pesaba 4 y el rol 3, así que **sumar
un Sinner valía más que hacer lo que al equipo le falta**. Y como casi todas cumplían las
dos cosas, las ocho visibles empataban en 7 y el orden terminaba siendo alfabético. Ahora es
un orden lexicográfico explícito —cumple el rol, después Sinner nuevo, después si hace los
dos roles— sin números mágicos.

## Los estilos son CSS, no objetos inline

Arrancaron como objetos JS en `styles.js` que se pasaban por `style={}`. Andaba, pero el
atributo `style` solo acepta declaraciones sueltas: **no puede expresar `:hover`,
`:focus-visible`, `@media` ni transiciones**. O sea que la respuesta al mouse y al teclado,
y la adaptación al ancho de pantalla, eran literalmente imposibles de escribir — no por
React, sino por el atributo.

Ahora todo eso vive en `src/styles.css`, con los colores, tipografías y radios como
custom properties en `:root`. Lo único que sigue inline es lo que se **calcula con datos**:
el color del arquetipo y el tamaño de un retrato. Eso entra como variable
(`style={{ "--acento": color }}`) y la regla del CSS la consume: el valor lo pone JS, la
forma la pone CSS.

Lo que apareció al hacerlo:

- **`botonChico` estaba definido dos veces**, a mitad del archivo y al final. La segunda
  pisaba a la primera, así que la primera era código muerto que nadie había notado.
- **Convivían dos paletas** que fueron divergiendo: una fría (`#17161a`, `#2a2830`) del
  prototipo y una cálida (`#1b1917`, `#2c2926`) que entró con la ficha. Se usaban
  indistintamente según qué componente hubiera tocado uno último. Quedaron unificadas en
  una sola escala de superficies.
- **Las pestañas se desbordaban en móvil.** En 390px las cuatro etiquetas llegaban justo
  al filo y «Qué me falta» quedaba pegada contra el borde. Ahora la barra scrollea si no
  entran, y por debajo de 430px el tipo achica un punto.

Lo que se ganó, además de poder tocarlo: hover en tarjetas, botones y chips; anillo de
foco visible al navegar con teclado (`:focus-visible`, así que aparece al tabular y no al
hacer click); y `prefers-reduced-motion` respetado, que para algunas personas no es una
preferencia estética sino un problema real.

Un detalle deliberado: los chips **decorativos** no tienen cursor ni hover. El CSS se
cuelga de `[role="button"]`, que solo está cuando el chip filtra de verdad. Prometer una
acción que no existe es peor que no ofrecerla.

## Rendimiento

Medido con Playwright y la CPU frenada 4× (un celular de gama media, no esta máquina):

| | Antes | Después |
|---|---|---|
| `DOMContentLoaded` | 223 ms | **117 ms** |
| Abrir las 184 tarjetas | 1149 ms | **586 ms** |
| Tipear 5 letras en el buscador | 307 ms | **185 ms** |
| Marcar una casilla | 125 ms | **101 ms** |
| Heap JS | 10 MB | 8 MB |

El problema no era el tamaño sino **cuántos componentes se volvían a renderizar**. Marcar
una casilla re-renderizaba las 184 tarjetas, por dos causas que se tapaban entre sí:

1. `toggleOwned` dependía de `propia`, así que cambiaba de identidad en cada marca y
   ninguna memoización lo habría salvado. Ahora guarda con un `useEffect` sobre `propia` y
   actualiza con la forma funcional de `setState`, así el handler es estable.
2. `onChange={() => toggle(x.id)}` creaba una función nueva por tarjeta y por render. Ahora
   la tarjeta le pasa su propio id al handler, que es siempre el mismo.

Recién con las dos cosas `React.memo` sobre `IdCard` y `EgoCard` sirve de algo.

**Sobre el bundle:** 704 kB minificado, **157 kB con gzip**. El grueso es el dataset, que se
importa como JSON y queda dentro del JS: `pasivas` 43% y `skills` 22% de `identities.json`,
y las dos se usan en la ficha. Hay ~30 KB en crudo de campos que hoy no lee nadie
(`estados`, `umbralesQuiebre`, `saludPorNivel`, `temporada`, `pesoAtaque`), que en gzip son
unos pocos KB: **no se sacan** porque el dataset también es el registro de lo que se bajó, y
la diferencia no se nota contra un `DOMContentLoaded` de 117 ms.

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

- **Guardar tus propios equipos con una nota** de cómo te fue. Es la alternativa honesta
  a las recetas ajenas: dato tuyo, y no envejece a escondidas porque sabés cuándo lo
  jugaste.
- **Recetas citadas a mano** (§3.2, capa 3): equipos concretos de guías reales, cada uno
  con autor, link y fecha visible en la app. Fuentes que sirven:
  [GameFAQs](https://gamefaqs.gamespot.com/pc/395588-limbus-company/faqs/80477) y las guías
  de Steam. Son prosa larga: no se parsean, se transcriben.

  Lo propio de esta capa: **una receta es opinión con fecha de vencimiento**. El meta se
  mueve por parches, así que cada entrada necesita su `actualizadoEn` a la vista, y la app
  tiene que presentarla como cita —"esto lo dice tal, en tal fecha"— y no como cálculo
  nuestro.

  Las tier lists que devuelve una búsqueda genérica son casi todas SEO generado en serie
  (`propelrc`, `axeetech`, `beatcopgame`, `lucidpuzzle`): citarlas sería cambiar "me lo
  acuerdo" por "lo dijo una página que no sé quién escribió". No entran.
