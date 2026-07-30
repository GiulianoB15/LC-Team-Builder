/*
  Genera src/data/identities.json y src/data/egos.json a partir del repo
  LCTeamBuilder (MIT, © 2024 SuenoImposible).

  Uso:
    git clone --depth 1 https://github.com/LCTeamBuilder/LCTeamBuilder.github.io.git /tmp/lctb
    node scripts/build-dataset.mjs --src /tmp/lctb

  Por qué así y no scrapeando la wiki: el JSON queda estático y versionado en el
  repo, la app no le pega a nada en runtime (sin CORS, sin rate limits, anda
  offline) y este script se vuelve a correr solo cuando sale contenido nuevo.

  Los datos de LCTeamBuilder son objetos TypeScript, un archivo por ID. En vez
  de parsearlos con regex —frágil— se bundlean con esbuild y se evalúan, así que
  lo que sale es exactamente lo que su app usa.
*/

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const src = path.resolve(args[args.indexOf("--src") + 1] ?? "");
if (args.indexOf("--src") === -1 || !src) {
  console.error("Falta --src <ruta al clon de LCTeamBuilder.github.io>");
  process.exit(1);
}

/* --- Mapeos de enums. El orden replica el de los enums de LCTeamBuilder. --- */

const SINNER_POR_INDICE = [
  "Yi Sang", "Faust", "Don Quixote", "Ryōshū", "Meursault", "Hong Lu",
  "Heathcliff", "Ishmael", "Rodion", "Sinclair", "Outis", "Gregor",
];

// Ojo: este orden NO es el mismo que el de nuestro constants.js.
// Se respeta el de ellos porque es el que da valor a los enums numéricos.
const SIN_POR_INDICE = ["Wrath", "Lust", "Sloth", "Gluttony", "Gloom", "Pride", "Envy"];

const TIPO_DANIO_POR_INDICE = ["slash", "pierce", "blunt"];
const TIPO_SKILL_POR_INDICE = ["attack", "defense"];
const TIPO_PASIVA_POR_INDICE = ["combat", "support", "ego"];
const TIPO_COSTO_POR_INDICE = ["owned", "resonance"];

/*
  Arquetipos de equipo: los estados alrededor de los cuales la comunidad arma
  equipos. Son los que usa el motor para puntuar sinergia.
  Salen de los tokens más frecuentes del propio dataset, no de memoria.
*/
const ARQUETIPOS = ["Bleed", "Burn", "Rupture", "Tremor", "Sinking", "Poise", "Charge", "Bloodfeast"];

/*
  Marcadores de momento/disparo. Aparecen entre corchetes igual que los
  keywords, pero no describen qué hace la ID sino cuándo. Se excluyen.
*/
const ES_MARCADOR_DE_TIMING = (token) =>
  /^(On |Before |After |Heads |Tails |Clash |Combat |Turn |Round )/.test(token);

/* --- Extracción --- */

function bundlearDataset() {
  const tmp = mkdtempSync(path.join(tmpdir(), "lctb-"));
  const stub = path.join(tmp, "jquery-stub.mjs");
  const entrada = path.join(tmp, "entrada.ts");
  const salida = path.join(tmp, "dataset.mjs");

  // Los Handlers de su app importan jquery; el dataset no lo necesita.
  writeFileSync(stub, "const $ = new Proxy(function(){}, { get: () => $, apply: () => $ });\nexport default $;\n");

  /*
    LobotomyCorpRemnantFaust existe como archivo válido pero nunca fue agregada
    a Equipables.ts en el repo de origen, así que su propia app no la muestra.
    Se importa aparte para no perderla: son 147 IDs, no 146.
  */
  writeFileSync(
    entrada,
    [
      `export { Identities, Egos } from ${JSON.stringify(path.join(src, "src/Constants/Equipables"))};`,
      `export { LobotomyCorpRemnantFaust } from ${JSON.stringify(path.join(src, "src/Constants/Sinners/Faust/Identities/LobotomyCorpRemnantFaust"))};`,
    ].join("\n")
  );

  const esbuild = path.join(RAIZ, "node_modules/esbuild/bin/esbuild");
  execFileSync(esbuild, [
    entrada, "--bundle", "--format=esm", "--platform=node",
    `--alias:jquery=${stub}`, `--outfile=${salida}`, "--log-level=error",
  ]);

  return { salida, limpiar: () => rmSync(tmp, { recursive: true, force: true }) };
}

/* --- Transformación --- */

const textoDeSkill = (skill) => (skill.SkillDescription ?? []).map((p) => p.Text).join(" ");

function tokensDe(texto) {
  return [...texto.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
}

/*
  Algunas IDs tienen skills que infligen "1 de los siguientes efectos" al azar y
  nombran cinco estados. Derivar keywords del texto crudo las etiqueta con los
  cinco, que es falso: son IDs de un solo arquetipo.

  El propio juego lo aclara en una pasiva ("only counts as an 'Identity that
  inflicts [X]'"), así que se usa esa frase para fijar el arquetipo real en vez
  de adivinar. Hoy afecta a 2 de 147 IDs (las dos Ring Pointillist Student).
*/
function arquetipoForzadoPorPasiva(identity) {
  for (const p of identity.Passives) {
    const m = /only counts as an .Identity that inflicts \[([^\]]+)\]/i.exec(p.Description ?? "");
    if (m) return m[1];
  }
  return null;
}

function derivarKeywords(identity) {
  const textos = [
    ...identity.Skills.map(textoDeSkill),
    ...identity.Passives.map((p) => p.Description ?? ""),
  ];
  const encontrados = new Set();
  textos.forEach((t) => tokensDe(t).forEach((tok) => {
    if (!ES_MARCADOR_DE_TIMING(tok)) encontrados.add(tok);
  }));
  return [...encontrados].sort();
}

function convertirSkill(skill) {
  return {
    nombre: skill.Name,
    tipo: TIPO_SKILL_POR_INDICE[skill.SkillType] ?? null,
    tier: (skill.SkillTier ?? 0) + 1,
    sin: SIN_POR_INDICE[skill.Affinity] ?? null,
    tipoDanio: skill.DamageType === undefined ? null : TIPO_DANIO_POR_INDICE[skill.DamageType],
    poderBase: skill.BaseValue,
    monedas: skill.Coins,
    valorMoneda: skill.CoinValue,
    pesoAtaque: skill.AttackWeight,
    descripcion: (skill.SkillDescription ?? []).map((p) => ({ moneda: p.Coin, texto: p.Text })),
  };
}

const convertirCosto = (cost) =>
  (cost ?? []).map((c) => ({ sin: SIN_POR_INDICE[c.sin] ?? null, cantidad: c.amount }));

function convertirPasiva(p) {
  return {
    nombre: p.Name,
    descripcion: p.Description,
    costo: convertirCosto(p.Cost),
    tipoCosto: p.CostType === undefined ? null : TIPO_COSTO_POR_INDICE[p.CostType],
  };
}

function convertirIdentity(identity) {
  const skills = identity.Skills.map(convertirSkill);

  // Afinidad por skill: es el dato que permite chequear recursos de Sin de
  // verdad. El prototipo guardaba una sola "afinidad dominante" y perdía esto.
  const afinidades = {};
  skills.forEach((s) => {
    if (s.sin) afinidades[s.sin] = (afinidades[s.sin] || 0) + 1;
  });
  const dominante =
    Object.entries(afinidades).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  const pasivas = identity.Passives.map((p) => ({ ...convertirPasiva(p), _tipo: TIPO_PASIVA_POR_INDICE[p.Type] }));
  const keywords = derivarKeywords(identity);

  const forzado = arquetipoForzadoPorPasiva(identity);
  const arquetipos = forzado
    ? ARQUETIPOS.filter((a) => a === forzado)
    : ARQUETIPOS.filter((a) => keywords.includes(a));

  return {
    id: identity.Id,
    nombre: identity.Name,
    sinner: SINNER_POR_INDICE[identity.Sinner] ?? null,
    rareza: identity.Rarity,
    saludBase: identity.BaseHealth,
    saludPorNivel: identity.HealthPerLevel,
    velocidad: { min: identity.SpeedMin, max: identity.SpeedMax },
    nivelDefensa: identity.DefenseLevel,
    /*
      Multiplicador de daño recibido, tal como viene del juego:
      0.5 resiste, 1 normal, 2 fatal. MÁS BAJO ES MEJOR.
      Se guarda el número y no una etiqueta para poder promediar y comparar.
    */
    resistencias: {
      slash: identity.SlashResist,
      pierce: identity.PierceResist,
      blunt: identity.BluntResist,
    },
    skills,
    afinidades,
    afinidadDominante: dominante,
    pasivas: {
      combate: pasivas.filter((p) => p._tipo === "combat").map(({ _tipo, ...r }) => r),
      soporte: pasivas.filter((p) => p._tipo === "support").map(({ _tipo, ...r }) => r),
    },
    keywords,
    arquetipos,
    imagenes: { completa: identity.FullImageDir, retrato: identity.PortraitImageDir },
  };
}

function convertirEgo(ego) {
  const pasiva = ego.Passive ? convertirPasiva(ego.Passive) : null;
  const textos = [
    ego.AwakeningSkill ? textoDeSkill(ego.AwakeningSkill) : "",
    ego.CorrosionSkill ? textoDeSkill(ego.CorrosionSkill) : "",
    pasiva?.descripcion ?? "",
  ];
  const keywords = [...new Set(textos.flatMap(tokensDe).filter((t) => !ES_MARCADOR_DE_TIMING(t)))].sort();

  return {
    id: ego.Id,
    nombre: ego.Name,
    sinner: SINNER_POR_INDICE[ego.Sinner] ?? null,
    nivelRiesgo: ego.RiskLevel,
    costo: convertirCosto(ego.Cost),
    resistenciasSin: (ego.Resistances ?? []).map((r) => ({
      sin: SIN_POR_INDICE[r.sin] ?? null,
      resistencia: r.resistance,
    })),
    skillDespertar: ego.AwakeningSkill ? convertirSkill(ego.AwakeningSkill) : null,
    costoCorduraDespertar: ego.AwakeningSanityCost ?? null,
    skillCorrosion: ego.CorrosionSkill ? convertirSkill(ego.CorrosionSkill) : null,
    costoCorduraCorrosion: ego.CorrosionSanityCost ?? null,
    pasiva,
    keywords,
    arquetipos: ARQUETIPOS.filter((a) => keywords.includes(a)),
    imagenes: { completa: ego.FullImageDir },
  };
}

/* --- Main --- */

const { salida, limpiar } = bundlearDataset();
const mod = await import(pathToFileURL(salida).href);

const identidadesCrudas = [...mod.Identities, mod.LobotomyCorpRemnantFaust];
const identities = identidadesCrudas.map(convertirIdentity).sort((a, b) => a.id - b.id);
const egos = mod.Egos.map(convertirEgo).sort((a, b) => a.id - b.id);

let fechaFuente = "desconocida";
try {
  fechaFuente = execFileSync("git", ["-C", src, "log", "-1", "--format=%ad", "--date=short"]).toString().trim();
} catch {
  /* el clon puede no tener .git */
}

const meta = {
  generadoEn: new Date().toISOString().slice(0, 10),
  fuente: {
    nombre: "LCTeamBuilder",
    repo: "https://github.com/LCTeamBuilder/LCTeamBuilder.github.io",
    licencia: "MIT",
    copyright: "© 2024 SuenoImposible",
    ultimoCommit: fechaFuente,
  },
  advertencia:
    "Dataset congelado a la fecha de ultimoCommit. Las Identities publicadas después no están.",
  conteo: { identities: identities.length, egos: egos.length },
};

mkdirSync(path.join(RAIZ, "src/data"), { recursive: true });
writeFileSync(path.join(RAIZ, "src/data/identities.json"), JSON.stringify({ meta, identities }, null, 1));
writeFileSync(path.join(RAIZ, "src/data/egos.json"), JSON.stringify({ meta, egos }, null, 1));
limpiar();

/* --- Resumen y chequeos de sanidad --- */

const sinSinner = identities.filter((i) => !i.sinner);
const sinSkills = identities.filter((i) => i.skills.length === 0);
const sinSoporte = identities.filter((i) => i.pasivas.soporte.length === 0);
const conArquetipo = identities.filter((i) => i.arquetipos.length > 0);

console.log(`Identities: ${identities.length}   E.G.O: ${egos.length}`);
console.log(`Fuente: LCTeamBuilder @ ${fechaFuente} (MIT)`);
console.log(`Con al menos un arquetipo: ${conArquetipo.length}/${identities.length}`);
console.log(`Sin pasiva de soporte: ${sinSoporte.length}`);
if (sinSinner.length) console.warn(`⚠ ${sinSinner.length} sin Sinner mapeado`);
if (sinSkills.length) console.warn(`⚠ ${sinSkills.length} sin skills`);

const porArquetipo = {};
ARQUETIPOS.forEach((a) => (porArquetipo[a] = identities.filter((i) => i.arquetipos.includes(a)).length));
console.log("IDs por arquetipo:", porArquetipo);
