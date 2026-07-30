/*
  Genera src/data/identities.json y src/data/egos.json fusionando DOS fuentes.

  Uso:
    node scripts/build-dataset.mjs --nuevo <dir> [--lctb <clon>]

    --nuevo  carpeta con identities.json y egos.json del dump actualizado.
             Es la fuente PRIMARIA: 184 IDs y 110 E.G.O, con fechas de estreno.
    --lctb   clon de LCTeamBuilder.github.io (MIT, © 2024 SuenoImposible).
             Fuente SECUNDARIA, solo para las pasivas: es la única de las dos
             que trae la separación combate/soporte y el costo en recursos de
             Sin, que es lo que pide el §3.1 del handoff.

  Por qué se fusionan y no se elige una:

  - El dump nuevo gana en cobertura (184 vs 147), trae `skillKeywordList`
    OFICIAL en vez de keywords derivados del texto, y sus resistencias son
    correctas. Las de LCTeamBuilder no: 109 de sus 147 IDs comparten el mismo
    perfil (1, 0.5, 2), o sea un valor por defecto que nunca completaron.
  - Pero el dump nuevo NO tiene pasivas, y sin ellas se cae la mitad del motor.

  Así que la base es el dump nuevo y las pasivas se injertan desde LCTeamBuilder
  donde el id coincide. Las 37 IDs nuevas quedan sin pasivas, marcadas con
  `tienePasivas: false` para que la UI y el motor no las traten como completas.
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
const statsSkills = { conNumeros: 0, ambiguas: 0, conflicto: 0, sinFuente: 0 };

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
    en el dump nuevo, pero sí en LCTeamBuilder. Se injertan igual que las
    pasivas, matcheando por tier de ataque.

    Ojo: SkillTierEnum de LCTeamBuilder arranca en 1, no en 0. Asumir lo
    contrario hacía que casi nada matcheara.

    Si la fuente da más de un candidato, o si la afinidad de las dos fuentes no
    coincide, se deja en null en vez de elegir a dedo: un número inventado acá
    contamina cualquier cálculo que se apoye en él.
  */
  const skillsLctb = (skillsLctbPorId.get(id) ?? []).filter((s) => s.SkillType === 0);

  const skills = (raw.skillTypes ?? []).map((s) => {
    const sin = capSin(s.type?.affinity);
    const tier = s.type?.tier ?? null;

    let numeros = null;
    if (skillsLctb.length === 0) {
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
  const pasivas =
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
    etiquetas: raw.tags ?? [],
    estados: raw.statuses ?? [],
    pasivas: pasivas ?? { combate: [], soporte: [] },
    tienePasivas: !!pasivas,
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
  const pasiva = pasivaEgoPorId.get(id) ?? (capturada ? marcarCaptura(capturada) : null);

  return {
    id,
    nombre: raw.name,
    arquetipos,
    pasiva,
    tienePasiva: !!pasiva,
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
    { nombre: "LCTeamBuilder", rol: "solo pasivas (combate/soporte y costo de Sin)", repo: "https://github.com/LCTeamBuilder/LCTeamBuilder.github.io", licencia: "MIT", copyright: "© 2024 SuenoImposible", ultimoCommit: fechaLctb },
  ],
  advertencia: `${identities.length - conPasivas} Identities no tienen datos de pasivas: son posteriores al corte de LCTeamBuilder.`,
  conteo: {
    identities: identities.length,
    egos: egos.length,
    conPasivas,
    sinPasivas: identities.length - conPasivas,
    egosConPasiva: egos.filter((e) => e.tienePasiva).length,
  },
  /* Mapeo derivado, publicado para poder auditarlo. Ver derivarMapeoEstados(). */
  mapeoEstados,
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
  egos: egos.filter((e) => e.pasiva?.fuente === "captura").length,
  identities: identities.filter((i) => [...i.pasivas.combate, ...i.pasivas.soporte].some((p) => p.fuente === "captura")).length,
};
console.log(`E.G.O con pasiva: ${meta.conteo.egosConPasiva}   sin arquetipo derivable: ${egosSinArquetipo}`);
console.log(`Cargado desde capturas: ${deCaptura.identities} Identities, ${deCaptura.egos} E.G.O`);
console.log("Mapeo estado→arquetipo derivado:",
  Object.entries(mapeoEstados).map(([k, v]) => `${k}→${v.arquetipo}(${v.precision})`).join(", "));

const totalSkills = identities.reduce((a, i) => a + i.skills.length, 0);
console.log(`Skills con números injertados: ${statsSkills.conNumeros}/${totalSkills}` +
  `  (ambiguas ${statsSkills.ambiguas}, conflicto de afinidad ${statsSkills.conflicto}, sin fuente ${statsSkills.sinFuente})`);
