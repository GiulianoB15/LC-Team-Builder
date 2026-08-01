/*
  Genera src/data/identities.json y src/data/egos.json fusionando cuatro fuentes.

  Uso:
    node scripts/build-dataset.mjs --nuevo <dir> [--lctb <clon>]

    --nuevo  carpeta con identities.json y egos.json del dump actualizado.
             Fuente PRIMARIA de todo menos las pasivas: 184 IDs y 110 E.G.O,
             con stats, resistencias, skills, keywords oficiales y fechas.
    --lctb   clon de LCTeamBuilder.github.io (MIT, © 2024 SuenoImposible).
             Hoy es solo respaldo de pasivas; ver más abajo.

  Las otras dos no son argumentos, viven en el repo:

    src/data/pasivas.json    pasivas de combate y soporte de las 184 Identities
                             y de los 110 E.G.O, con su costo en recursos de
                             Sin. La baja scripts/fetch-datos.mjs.
    src/data/capturas.json   lo transcrito a mano desde capturas del juego.

  Por qué son cuatro y no una:

  - El dump nuevo gana en cobertura (184 vs 147), trae `skillKeywordList`
    OFICIAL en vez de keywords derivados del texto, y sus resistencias son
    correctas. Las de LCTeamBuilder no: 109 de sus 147 IDs comparten el mismo
    perfil (1, 0.5, 2), o sea un valor por defecto que nunca completaron.
  - Pero el dump nuevo NO tiene pasivas, y sin ellas se cae la mitad del motor.
    Ojo: la fuente sí las publica, solo que en un archivo por id, y eso es lo
    que junta pasivas.json.

  Orden de precedencia para las pasivas:

      pasivas.json  >  LCTeamBuilder  >  capturas.json

  Con pasivas.json completo, las otras dos no se activan para ninguna ID. Se
  dejan igual: son el respaldo si la fuente nueva se cae o borra una entrada, y
  sirven para validarla cruzando las 147 IDs que están en las dos.
*/

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const arg = (n) => (args.indexOf(n) === -1 ? null : path.resolve(args[args.indexOf(n) + 1] ?? ""));
const dirNuevo = arg("--nuevo");
const dirLctb = arg("--lctb");

if (!dirNuevo) {
  console.error("Falta --nuevo <carpeta con identities.json y egos.json>");
  process.exit(1);
}

/* --- Mapeos --- */

const SINNER_POR_ID = {
  1: "Yi Sang", 2: "Faust", 3: "Don Quixote", 4: "Ryōshū", 5: "Meursault", 6: "Hong Lu",
  7: "Heathcliff", 8: "Ishmael", 9: "Rodion", 10: "Sinclair", 11: "Outis", 12: "Gregor",
};

/* El dump nuevo usa los Sins en minúscula; internamente van capitalizados. */
const SIN_CANONICO = {
  wrath: "Wrath", lust: "Lust", sloth: "Sloth", gluttony: "Gluttony",
  gloom: "Gloom", pride: "Pride", envy: "Envy",
};

const SIN_POR_INDICE_LCTB = ["Wrath", "Lust", "Sloth", "Gluttony", "Gloom", "Pride", "Envy"];
const TIPO_PASIVA = ["combat", "support", "ego"];
const TIPO_COSTO = ["owned", "resonance"];

const capSin = (s) => SIN_CANONICO[String(s).toLowerCase()] ?? null;

/* --- Fuente primaria --- */

const leerJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const nuevoIds = leerJson(path.join(dirNuevo, "identities.json"));
const nuevoEgos = leerJson(path.join(dirNuevo, "egos.json"));

/*
  Tercera fuente: datos transcritos a mano desde capturas del juego, para lo que
  ninguna fuente automática publica. Vive en su propio archivo y lo cargado así
  queda marcado con fuente: "captura", para poder distinguirlo y reemplazarlo.
*/
const capturas = (() => {
  try {
    return leerJson(path.join(RAIZ, "src/data/capturas.json"));
  } catch {
    return { identities: {}, egos: {} };
  }
})();

const marcarCaptura = (p) => ({ ...p, fuente: "captura" });

/*
  Cuarta fuente, y la que manda para pasivas: limbus-assets.eldritchtools.com,
  bajada por scripts/fetch-datos.mjs a src/data/pasivas.json. Cubre las 184
  Identities con combate Y soporte, y los 110 E.G.O.

  Va primero que LCTeamBuilder porque está al día (LCTeamBuilder quedó en 147
  IDs) y porque el texto es el del juego, no una reescritura. Se valida solo:
  en las IDs que están en las dos fuentes coinciden nombre, Sin del costo y
  cantidad; hay un chequeo en tests.js que lo verifica.

  LCTeamBuilder y las capturas quedan como respaldo. Hoy no se activan para
  ninguna ID, pero se dejan: si mañana la fuente nueva se cae o borra una
  entrada, el dataset no se queda sin pasivas de golpe.
*/
const pasivasNuevas = (() => {
  try {
    return leerJson(path.join(RAIZ, "src/data/pasivas.json"));
  } catch {
    console.warn("⚠ Sin src/data/pasivas.json: las pasivas salen de LCTeamBuilder y las capturas.");
    return { identities: {}, egos: {} };
  }
})();

/*
  La fuente escribe el tipo de costo abreviado ("res"). Se canonicaliza acá, que
  es donde vive el vocabulario del dataset, y no en el bajador: ese refleja lo
  que dice la fuente, tal cual, para que se note si cambia.
*/
const canonCosto = (t) => (t === "res" ? "resonance" : t);
const normalizarPasivaNueva = (p) => ({ ...p, tipoCosto: canonCosto(p.tipoCosto) });

/*
  Mismo origen, misma pasada del bajador: los números de cada skill, indexados
  por id de skill. El dump ya trae ese id en `skillTypes[].id`, así que el cruce
  es exacto. Ver el injerto desde LCTeamBuilder más abajo para el contraste:
  ahí hay que adivinar por tier y afinidad, y quedan skills sin resolver.
*/
const skillsNuevas = (() => {
  try {
    return leerJson(path.join(RAIZ, "src/data/skills.json")).skills ?? {};
  } catch {
    console.warn("⚠ Sin src/data/skills.json: los números de skill salen solo de LCTeamBuilder.");
    return {};
  }
})();

/* --- Fuente secundaria: pasivas de LCTeamBuilder --- */

function extraerPasivas() {
  if (!dirLctb || !existsSync(dirLctb)) {
    console.warn("⚠ Sin --lctb: el dataset sale sin pasivas.");
    return { porId: new Map(), fecha: null };
  }

  const tmp = mkdtempSync(path.join(tmpdir(), "lctb-"));
  const stub = path.join(tmp, "jquery-stub.mjs");
  const entrada = path.join(tmp, "entrada.ts");
  const salida = path.join(tmp, "dataset.mjs");

  writeFileSync(stub, "const $ = new Proxy(function(){}, { get: () => $, apply: () => $ });\nexport default $;\n");

  // LobotomyCorpRemnantFaust existe como archivo pero nunca se agregó al índice
  // de su propio repo, así que se importa aparte.
  writeFileSync(entrada, [
    `export { Identities, Egos } from ${JSON.stringify(path.join(dirLctb, "src/Constants/Equipables"))};`,
    `export { LobotomyCorpRemnantFaust } from ${JSON.stringify(path.join(dirLctb, "src/Constants/Sinners/Faust/Identities/LobotomyCorpRemnantFaust"))};`,
  ].join("\n"));

  execFileSync(path.join(RAIZ, "node_modules/esbuild/bin/esbuild"), [
    entrada, "--bundle", "--format=esm", "--platform=node",
    `--alias:jquery=${stub}`, `--outfile=${salida}`, "--log-level=error",
  ]);

  return { salida, tmp };
}

const convertirPasiva = (p) => ({
  nombre: p.Name,
  descripcion: p.Description,
  costo: (p.Cost ?? []).map((c) => ({ sin: SIN_POR_INDICE_LCTB[c.sin] ?? null, cantidad: c.amount })),
  tipoCosto: p.CostType === undefined ? null : TIPO_COSTO[p.CostType],
});

const ref = extraerPasivas();
const pasivasPorId = new Map();
const pasivaEgoPorId = new Map();
const skillsLctbPorId = new Map();
let fechaLctb = null;

/* Contadores del injerto de números de skill, para el resumen. */
const statsSkills = { conNumeros: 0, porId: 0, porTier: 0, ambiguas: 0, conflicto: 0, sinFuente: 0 };

if (ref.salida) {
  const mod = await import(pathToFileURL(ref.salida).href);
  [...mod.Identities, mod.LobotomyCorpRemnantFaust].forEach((i) => {
    const ps = i.Passives.map((p) => ({ ...convertirPasiva(p), _tipo: TIPO_PASIVA[p.Type] }));
    pasivasPorId.set(i.Id, {
      combate: ps.filter((p) => p._tipo === "combat").map(({ _tipo, ...r }) => r),
      soporte: ps.filter((p) => p._tipo === "support").map(({ _tipo, ...r }) => r),
    });
  });
  mod.Egos.forEach((e) => {
    if (e.Passive) pasivaEgoPorId.set(e.Id, convertirPasiva(e.Passive));
  });
  mod.Identities.forEach((i) => skillsLctbPorId.set(i.Id, i.Skills));
  try {
    fechaLctb = execFileSync("git", ["-C", dirLctb, "log", "-1", "--format=%ad", "--date=short"]).toString().trim();
  } catch { /* el clon puede no tener .git */ }
  rmSync(ref.tmp, { recursive: true, force: true });
}

/* --- Conversión de Identities --- */

function convertirIdentity(id, raw) {
  /*
    `num` son las copias de cada skill en el mazo y suman 6 en todas las IDs.
    Ponderar por copias estima mejor la generación de recursos que contar
    skills sueltas, que es lo que hacía la versión anterior.
  */
  /*
    Los números de cada skill (poder base, monedas, valor de moneda) no vienen
    en el dump nuevo. Salen de dos lados, en este orden:

    1. skills.json, cruzando por id de skill. Exacto: el id es el mismo de las
       dos partes, no hay nada que interpretar.
    2. LCTeamBuilder, matcheando por tier de ataque. Es lo que se usaba antes de
       tener (1), y se queda de respaldo. Tiene dos problemas: cubre 147 IDs, y
       el match es por tier, así que cuando una ID tiene dos skills del mismo
       tier hay que desempatar por afinidad y a veces igual queda ambiguo.

       Ojo: SkillTierEnum de LCTeamBuilder arranca en 1, no en 0. Asumir lo
       contrario hacía que casi nada matcheara.

    Si nada resuelve, queda en null en vez de elegir a dedo: un número inventado
    acá contamina cualquier cálculo que se apoye en él.
  */
  const skillsLctb = (skillsLctbPorId.get(id) ?? []).filter((s) => s.SkillType === 0);

  const skills = (raw.skillTypes ?? []).map((s) => {
    const sin = capSin(s.type?.affinity);
    const tier = s.type?.tier ?? null;

    let numeros = null;
    const nueva = skillsNuevas[String(s.id)];
    if (nueva) {
      numeros = {
        nombre: nueva.nombre,
        poderBase: nueva.poderBase,
        monedas: nueva.monedas,
        valorMoneda: nueva.valorMoneda,
        pesoAtaque: nueva.pesoAtaque,
      };
      statsSkills.porId += 1;
      statsSkills.conNumeros += 1;
    } else if (skillsLctb.length === 0) {
      statsSkills.sinFuente += 1;
    } else {
      let cand = skillsLctb.filter((x) => x.SkillTier === tier);
      if (cand.length > 1) cand = cand.filter((x) => SIN_POR_INDICE_LCTB[x.Affinity] === sin);

      if (cand.length === 1 && SIN_POR_INDICE_LCTB[cand[0].Affinity] === sin) {
        numeros = {
          nombre: cand[0].Name,
          poderBase: cand[0].BaseValue,
          monedas: cand[0].Coins,
          valorMoneda: cand[0].CoinValue,
          pesoAtaque: cand[0].AttackWeight,
        };
        statsSkills.conNumeros += 1;
        statsSkills.porTier += 1;
      } else if (cand.length === 1) {
        statsSkills.conflicto += 1; // las dos fuentes discrepan en la afinidad
      } else {
        statsSkills.ambiguas += 1;
      }
    }

    return {
      id: s.id,
      sin,
      tier,
      tipoDanio: s.type?.type ?? null,
      copias: s.num ?? 1,
      ...(numeros ?? { nombre: null, poderBase: null, monedas: null, valorMoneda: null, pesoAtaque: null }),
    };
  });

  const etiquetas = convertirEtiquetas(raw.tags);

  const skillsDefensa = (raw.defenseSkillTypes ?? []).map((s) => ({
    id: s.id,
    sin: capSin(s.type?.affinity),
    tipo: s.type?.type ?? null,
  }));

  const afinidades = {};
  skills.forEach((s) => {
    if (s.sin) afinidades[s.sin] = (afinidades[s.sin] || 0) + s.copias;
  });
  const dominante =
    Object.entries(afinidades).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  // La velocidad viene por uptie; se usa el último, que es el nivel jugable.
  const vel = (raw.speedList ?? []).at(-1) ?? [null, null];

  /*
    Igual que con los E.G.O: la fuente automática manda y la captura solo cubre
    lo que falta. `combate` y `soporte` se toman como bloque, no se mezclan
    parcialmente, para no terminar con una ID mitad de una fuente y mitad de otra.
  */
  const cap = capturas.identities?.[String(id)];
  const nueva = pasivasNuevas.identities?.[String(id)];
  const pasivas =
    (nueva
      ? {
          combate: (nueva.combate ?? []).map(normalizarPasivaNueva),
          soporte: (nueva.soporte ?? []).map(normalizarPasivaNueva),
        }
      : null) ??
    pasivasPorId.get(id) ??
    (cap?.pasivas
      ? {
          combate: (cap.pasivas.combate ?? []).map(marcarCaptura),
          soporte: (cap.pasivas.soporte ?? []).map(marcarCaptura),
        }
      : null);

  return {
    id,
    nombre: raw.name,
    sinner: SINNER_POR_ID[raw.sinnerId] ?? null,
    rareza: raw.rank ?? null,
    fecha: raw.date ?? null,
    temporada: raw.season ?? null,
    saludBase: raw.hp?.base ?? null,
    saludPorNivel: raw.hp?.level ?? null,
    velocidad: { min: vel[0], max: vel[1] },
    nivelDefensa: raw.defCorrection ?? null,
    umbralesQuiebre: raw.breakSection ?? [],
    /* Multiplicador de daño recibido: 0.5 resiste, 1 normal, 2 fatal. Más bajo, mejor. */
    resistencias: {
      slash: raw.resists?.slash ?? 1,
      pierce: raw.resists?.pierce ?? 1,
      blunt: raw.resists?.blunt ?? 1,
    },
    skills,
    skillsDefensa,
    afinidades,
    afinidadDominante: dominante,
    /* Keywords OFICIALES del dump, no derivados del texto. */
    arquetipos: raw.skillKeywordList ?? [],
    etiquetas: etiquetas.limpias,
    /*
      Las que el juego muestra tachadas: afiliaciones que el personaje ya no
      tiene. Se listan aparte para que el filtro siga trabajando con nombres
      limpios y la UI pueda mostrarlas distinto.
    */
    etiquetasEx: etiquetas.ex,
    estados: raw.statuses ?? [],
    pasivas: pasivas ?? { combate: [], soporte: [] },
    tienePasivas: !!pasivas,
    /*
      "Completa" = tiene las de combate además de las de soporte. La wiki solo
      publica las de soporte, así que lo que salga solo de ahí queda marcado
      como parcial y la UI lo muestra distinto, para no aparentar un análisis
      que no tiene. Se mira el dato final en vez de preguntarle a una fuente en
      particular, así sirve venga de donde venga.
    */
    pasivasCompletas: (pasivas?.combate.length ?? 0) > 0,
  };
}

/* --- Etiquetas --- */

/*
  Algunas etiquetas vienen con texto enriquecido de Unity, no como texto pelado:

      <color=#d40000><s>Le Sette Famiglie<s></color>
      <color=#d40000><s>Sottocapo</s></color>

  Son 5 etiquetas en 4 Identities, todas del mismo patrón: rojo y tachado. En el
  juego eso marca una afiliación que el personaje YA NO tiene —los tres
  "Nursefather" y el "Lord of Hongyuan"—, así que no es ruido: es información, y
  borrarlas sería perderla. Lo que hay que sacar es el marcado.

  Ojo con el HTML mal cerrado: dos de las cinco abren <s> dos veces en vez de
  cerrar con </s>. Por eso se quitan TODAS las etiquetas sueltas en vez de
  buscar pares, que con esa entrada no matchearían.
*/
/*
  Se sacan SOLO las etiquetas de formato de Unity, no cualquier cosa entre <>.
  El dataset usa los ángulos para contenido real en las descripciones de
  pasivas: <Bloodfiend>, <Lake Entity>, <Rules of the Backstreets> son
  categorías del juego, no marcado. Un `replace(/<[^>]*>/g, "")` a lo bruto se
  las comería si alguna vez aparecieran en una etiqueta.
*/
const FORMATO_UNITY = /<\/?(?:color|size|s|b|i|u)\b[^>]*>/gi;
const TACHADA = /<\/?s\b[^>]*>/i;
const limpiarEtiqueta = (t) => String(t).replace(FORMATO_UNITY, "").trim();

function convertirEtiquetas(tags) {
  const limpias = [];
  const ex = [];
  (tags ?? []).forEach((t) => {
    const nombre = limpiarEtiqueta(t);
    if (!nombre) return;
    limpias.push(nombre);
    if (TACHADA.test(String(t))) ex.push(nombre);
  });
  return { limpias, ex };
}

/* --- Sinergia derivada de las pasivas --- */

/*
  Qué aporta esto que no tuviéramos ya.

  El arquetipo de cada ID es oficial y viene en el dump, pero dice a qué familia
  pertenece, no qué hace adentro de ella. En un equipo de Bleed hay quien INFLIGE
  el sangrado y quien lo COBRA, y son roles distintos: seis que cobran y ninguno
  que inflija es un equipo que no funciona. Eso no está en ningún campo.

  Sí está en el texto de las pasivas, y con los nombres internos entre corchetes,
  que son los mismos que ya mapea derivarMapeoEstados(). O sea que se puede leer:

      "Apply 2 [Laceration] …"          → aplica Bleed
      "…damage to targets with [Burst]"  → lee Rupture

  Se mira frase por frase (cortando por punto y por salto de línea) y se decide
  por el verbo que viene ANTES del token en esa misma frase. Mirar la pasiva
  entera mezclaría un "Apply" de una oración con el token de otra.

  ESTO ES DERIVADO, NO OFICIAL. Los conteos y la tasa de acuerdo con el
  arquetipo oficial se publican en meta.sinergia para poder auditarlo, igual que
  con mapeoEstados.
*/

const VERBO_APLICA = /\b(apply|inflict|gain|grant|deal)\b/i;
const VERBO_LEE = /\b(with|has|have|per|for each|for every|consume|if the target)\b/i;

/*
  "Dashboard" aparece en dos sentidos distintos y solo uno sirve acá: el orden
  del equipo ("allies placed after this unit on the Dashboard") y los slots de
  skill de la propia unidad ("Base Attack Skills on this unit's Dashboard"). De
  21 pasivas que nombran el Dashboard, 14 son del segundo tipo. Por eso se exige
  la forma relacional completa y no alcanza con la palabra suelta.

  "Identities" además de "allies" porque algunas lo dicen por facción
  ("Kurokumo Clan Identities adjacent to this unit").
*/
const POSICION = [
  ["temprano", /(allies|Identities)[^.\n]*placed after this unit/i],
  ["tarde", /(allies|Identities)[^.\n]*placed before this unit/i],
  ["medio", /(allies|Identities)[^.\n]*adjacent to this unit/i],
];

/* Le da algo al equipo, no solo a sí misma. */
const BUFFEA_ALIADOS = [
  /\b(apply|grant|heal|give)\b[^.\n]{0,90}\ballies?\b/i,
  /\ballies?\b[^.\n]{0,40}\b(gain|heal)\b/i,
];

/* Lee una lista de pasivas y devuelve qué arquetipos aplica y cuáles cobra. */
function rolesDe(pasivas, mapeoEstados) {
  const aplica = new Set();
  const lee = new Set();

  pasivas.forEach((p) => {
    (p.descripcion ?? "").match(/[^.\n]+/g)?.forEach((frase) => {
      (frase.match(/\[([A-Za-z][A-Za-z ]*)\]/g) ?? []).forEach((token) => {
        const arquetipo = mapeoEstados[token.slice(1, -1)]?.arquetipo;
        if (!arquetipo) return;
        const antes = frase.slice(0, frase.indexOf(token));
        /* El verbo manda: si no hay ninguno reconocible, no se adivina. */
        if (VERBO_APLICA.test(antes)) aplica.add(arquetipo);
        else if (VERBO_LEE.test(antes)) lee.add(arquetipo);
      });
    });
  });

  return { aplica: [...aplica].sort(), lee: [...lee].sort() };
}

function derivarSinergia(identity, mapeoEstados) {
  let posicion = null;
  let buffeaAliados = false;

  const todas = [...identity.pasivas.combate, ...identity.pasivas.soporte];
  todas.forEach((p) => {
    const texto = p.descripcion ?? "";
    if (!posicion) {
      const hit = POSICION.find(([, re]) => re.test(texto));
      if (hit) posicion = hit[0];
    }
    if (!buffeaAliados) buffeaAliados = BUFFEA_ALIADOS.some((re) => re.test(texto));
  });

  /*
    Se separa por tipo de pasiva, además del total, porque las dos NO están
    activas a la vez: la de combate corre cuando la ID está desplegada y la de
    soporte cuando NO lo está
    (https://limbuscompany.wiki.gg/wiki/Identity_Support_Passives).

    Para recomendar banca eso es justamente lo que hace falta: de una ID que no
    va a pelear, lo único que aporta es su pasiva de soporte, así que mirar el
    rol combinado diría que sirve por algo que no va a pasar.
  */
  return {
    ...rolesDe(todas, mapeoEstados),
    combate: rolesDe(identity.pasivas.combate, mapeoEstados),
    soporte: rolesDe(identity.pasivas.soporte, mapeoEstados),
    buffeaAliados,
    posicion,
  };
}

/* --- Conversión de E.G.O --- */

const convertirCostoSin = (obj) =>
  Object.entries(obj ?? {})
    .map(([sin, cantidad]) => ({ sin: capSin(sin), cantidad }))
    .filter((c) => c.sin)
    .sort((a, b) => b.cantidad - a.cantidad);

/*
  Los E.G.O no traen keywords: su único campo temático es `statuses`, con los
  nombres INTERNOS del juego ("Laceration", "Burst", "Breath"…), que no coinciden
  con los arquetipos que ve el jugador ("Bleed", "Rupture", "Poise").

  El mapeo no se escribe a mano: se deriva de las Identities, donde conviven
  `estados` (internos) y `arquetipos` (oficiales). Se queda solo con los pares
  que tienen precisión y respaldo altos, y el resultado se publica en el meta
  para poder auditarlo.
*/
function derivarMapeoEstados(identities, { minPrecision = 0.85, minSoporte = 8 } = {}) {
  const co = {};
  identities.forEach((i) => {
    (i.estados ?? []).forEach((s) => {
      co[s] ??= { total: 0, arq: {} };
      co[s].total += 1;
      (i.arquetipos ?? []).forEach((a) => (co[s].arq[a] = (co[s].arq[a] || 0) + 1));
    });
  });

  const mapeo = {};
  Object.entries(co).forEach(([estado, v]) => {
    if (v.total < minSoporte) return;
    const [arquetipo, n] = Object.entries(v.arq).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!arquetipo) return;
    const precision = n / v.total;
    if (precision >= minPrecision) {
      mapeo[estado] = { arquetipo, precision: Number(precision.toFixed(2)), soporte: v.total };
    }
  });
  return mapeo;
}

function convertirEgo(id, raw, mapeoEstados) {
  const estados = raw.statuses ?? [];
  const arquetipos = [
    ...new Set(estados.map((s) => mapeoEstados[s]?.arquetipo).filter(Boolean)),
  ].sort();

  /*
    La automática manda; la captura solo rellena lo que no vino de LCTeamBuilder.
    Así, si mañana el repo de origen suma este E.G.O, gana el dato automático sin
    que haya que borrar la captura a mano.
  */
  const capturada = capturas.egos?.[String(id)]?.pasiva;
  const nuevas = pasivasNuevas.egos?.[String(id)];
  /*
    La fuente nueva devuelve una lista: la mayoría de los E.G.O tiene una sola
    pasiva, pero unos pocos tienen dos. Las otras dos fuentes traen una sola, y
    se envuelven para que el campo sea siempre una lista.
  */
  const pasivas =
    nuevas?.map(normalizarPasivaNueva) ??
    (pasivaEgoPorId.has(id)
      ? [pasivaEgoPorId.get(id)]
      : capturada
        ? [marcarCaptura(capturada)]
        : []);

  return {
    id,
    nombre: raw.name,
    arquetipos,
    pasivas,
    tienePasivas: pasivas.length > 0,
    sinner: SINNER_POR_ID[raw.sinnerId] ?? null,
    rango: raw.rank ?? null,
    fecha: raw.date ?? null,
    temporada: raw.season ?? null,
    extraible: !!raw.extractable,
    costo: convertirCostoSin(raw.cost),
    /* Resistencias por Sin, no por tipo de daño: los E.G.O usan otra escala. */
    resistenciasSin: Object.entries(raw.resists ?? {})
      .map(([sin, valor]) => ({ sin: capSin(sin), valor }))
      .filter((r) => r.sin),
    despertar: raw.awakeningType
      ? { sin: capSin(raw.awakeningType.affinity), tipoDanio: raw.awakeningType.type }
      : null,
    corrosion: raw.corrosionType
      ? { sin: capSin(raw.corrosionType.affinity), tipoDanio: raw.corrosionType.type }
      : null,
    estados: raw.statuses ?? [],
  };
}

/* --- Generación --- */

const identities = Object.entries(nuevoIds)
  .map(([k, v]) => convertirIdentity(Number(k), v))
  .sort((a, b) => a.id - b.id);

const mapeoEstados = derivarMapeoEstados(identities);

/*
  Segunda pasada: la sinergia necesita el mapeo, y el mapeo se deriva de las
  Identities, así que no puede salir de convertirIdentity().
*/
const statsSinergia = { conRol: 0, sinSenal: 0, aplica: 0, lee: 0, buffean: 0, posicionales: 0, fueraDelOficial: 0 };
identities.forEach((i) => {
  i.sinergia = derivarSinergia(i, mapeoEstados);
  const s = i.sinergia;
  if (s.aplica.length || s.lee.length) statsSinergia.conRol += 1;
  else statsSinergia.sinSenal += 1;
  statsSinergia.aplica += s.aplica.length;
  statsSinergia.lee += s.lee.length;
  if (s.buffeaAliados) statsSinergia.buffean += 1;
  if (s.posicion) statsSinergia.posicionales += 1;
  const oficial = new Set(i.arquetipos);
  if (oficial.size) {
    statsSinergia.fueraDelOficial += [...new Set([...s.aplica, ...s.lee])].filter((a) => !oficial.has(a)).length;
  }
});

const egos = Object.entries(nuevoEgos)
  .map(([k, v]) => convertirEgo(Number(k), v, mapeoEstados))
  .sort((a, b) => a.id - b.id);

const fechas = identities.map((i) => i.fecha).filter(Boolean).sort();
const conPasivas = identities.filter((i) => i.tienePasivas).length;

const meta = {
  generadoEn: new Date().toISOString().slice(0, 10),
  ultimaIdentity: fechas.at(-1) ?? null,
  fuentes: [
    { nombre: "Dump actualizado", rol: "base: stats, resistencias, skills, keywords oficiales", identities: identities.length, egos: egos.length },
    { nombre: "limbus-assets.eldritchtools.com", rol: "pasivas de combate y soporte, de E.G.O, y números de skill", via: "scripts/fetch-datos.mjs", generado: pasivasNuevas.meta?.generado ?? null },
    { nombre: "LCTeamBuilder", rol: "respaldo de pasivas y de números de skill", repo: "https://github.com/LCTeamBuilder/LCTeamBuilder.github.io", licencia: "MIT", copyright: "© 2024 SuenoImposible", ultimoCommit: fechaLctb },
  ],
  advertencia:
    conPasivas === identities.length
      ? null
      : `${identities.length - conPasivas} Identities no tienen datos de pasivas.`,
  conteo: {
    identities: identities.length,
    egos: egos.length,
    conPasivas,
    pasivasCompletas: identities.filter((i) => i.pasivasCompletas).length,
    soloSoporte: identities.filter((i) => i.tienePasivas && !i.pasivasCompletas).length,
    sinPasivas: identities.length - conPasivas,
    egosConPasiva: egos.filter((e) => e.tienePasivas).length,
  },
  /* Mapeo derivado, publicado para poder auditarlo. Ver derivarMapeoEstados(). */
  mapeoEstados,
  /*
    Lo mismo para la sinergia: es texto interpretado, no un campo del dump, así
    que los números quedan a la vista. `fueraDelOficial` es el que hay que
    mirar: son arquetipos derivados que la ID no tiene en su keyword oficial.
    Algunos son legítimos (una ID puede cobrar un estado que no es el suyo) y
    otros son ruido del parser; si ese número se dispara, la regla se rompió.
  */
  sinergia: statsSinergia,
};

mkdirSync(path.join(RAIZ, "src/data"), { recursive: true });
writeFileSync(path.join(RAIZ, "src/data/identities.json"), JSON.stringify({ meta, identities }, null, 1));
writeFileSync(path.join(RAIZ, "src/data/egos.json"), JSON.stringify({ meta, egos }, null, 1));

/* --- Resumen y chequeos --- */

console.log(`Identities: ${identities.length}   E.G.O: ${egos.length}`);
console.log(`Última Identity: ${meta.ultimaIdentity}`);
console.log(`Con pasivas: ${conPasivas}   sin pasivas: ${identities.length - conPasivas}`);

const sinSinner = identities.filter((i) => !i.sinner);
const sinSkills = identities.filter((i) => i.skills.length === 0);
const sinArquetipo = identities.filter((i) => i.arquetipos.length === 0);
const copiasMal = identities.filter((i) => i.skills.reduce((a, s) => a + s.copias, 0) !== 6);

if (sinSinner.length) console.warn(`⚠ ${sinSinner.length} sin Sinner mapeado`);
if (sinSkills.length) console.warn(`⚠ ${sinSkills.length} sin skills`);
if (copiasMal.length) console.warn(`⚠ ${copiasMal.length} cuyas copias de skill no suman 6`);
console.log(`Sin arquetipo (esperable en tanques/soporte): ${sinArquetipo.length}`);

const porArquetipo = {};
identities.forEach((i) => i.arquetipos.forEach((a) => (porArquetipo[a] = (porArquetipo[a] || 0) + 1)));
console.log("IDs por arquetipo:", porArquetipo);

const egosSinArquetipo = egos.filter((e) => e.arquetipos.length === 0).length;
const deCaptura = {
  egos: egos.filter((e) => e.pasivas.some((p) => p.fuente === "captura")).length,
  identities: identities.filter((i) => [...i.pasivas.combate, ...i.pasivas.soporte].some((p) => p.fuente === "captura")).length,
};
console.log(`E.G.O con pasiva: ${meta.conteo.egosConPasiva}   sin arquetipo derivable: ${egosSinArquetipo}`);
console.log(`Cargado desde capturas: ${deCaptura.identities} Identities, ${deCaptura.egos} E.G.O`);
console.log("Mapeo estado→arquetipo derivado:",
  Object.entries(mapeoEstados).map(([k, v]) => `${k}→${v.arquetipo}(${v.precision})`).join(", "));

const totalSkills = identities.reduce((a, i) => a + i.skills.length, 0);
console.log(`Skills con números: ${statsSkills.conNumeros}/${totalSkills}` +
  `  (por id ${statsSkills.porId}, por tier desde LCTeamBuilder ${statsSkills.porTier})`);
console.log(`Sin resolver: ambiguas ${statsSkills.ambiguas}, conflicto de afinidad ${statsSkills.conflicto}, sin fuente ${statsSkills.sinFuente}`);
