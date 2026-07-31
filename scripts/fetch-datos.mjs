/*
  Baja de limbus-assets.eldritchtools.com lo que el dump de identities.json no
  trae, y lo deja normalizado en dos archivos:

      src/data/pasivas.json   pasivas de combate y soporte, y de E.G.O
      src/data/skills.json    números de cada skill: poder base, monedas, etc.

    node scripts/fetch-datos.mjs

  Los dos salen de la misma pasada: cada archivo por id trae las dos cosas, así
  que separarlo en dos scripts sería pedir todo dos veces al mismo servidor.

  POR QUÉ EXISTE

  Hasta ahora las pasivas salían de LCTeamBuilder, que quedó en 147 IDs, más un
  puñado cargado a mano en capturas.json. Quedaban 3 Identities sin nada, 34 con
  pasivas de soporte solamente y 9 E.G.O sin pasiva. Los números de skill salían
  de la misma fuente y con el mismo techo.

  El dump de identities.json que se venía usando no trae ni una cosa ni la otra,
  pero NO porque la fuente no las publique: las publica en archivos aparte, uno
  por id:

      https://limbus-assets.eldritchtools.com/data/identities/<id>.json
      https://limbus-assets.eldritchtools.com/data/egos/<id>.json

  Eso sale de su propio código: el componente que muestra "Combat Passives" /
  "Support Passives" hace useData(`identities/${identity.id}`) y lee
  skillData.combatPassives / skillData.supportPassives
  (github.com/eldritchtools/limbus-team-building-hub,
  src/app/components/SkillLoader.js), y useData resuelve a `${DATA_ROOT}/<path>.json`
  con DATA_ROOT = https://limbus-assets.eldritchtools.com/data
  (github.com/eldritchtools/limbus-shared-library, src/paths.js).

  FORMA DE LA FUENTE

  Cada archivo trae un diccionario `passiveData` (id de pasiva -> objeto) y
  listas que referencian esas claves:

      identities/<id>.json   combatPassives: [{ uptie, passives: [...] }, ...]
                             supportPassives: [{ uptie, passives: [...] }, ...]
                             skills: { <id de skill>: { tier, data: [...] } }
      egos/<id>.json         passiveList: [...]

  De cada tramo por uptie se toma el más alto (uptie 4, que es como se juega).
  El objeto de pasiva tiene `name`, `desc` y, cuando corresponde, `condition`
  con el costo en recursos de Sin.

  Los skills son distintos: `data` NO trae una copia entera por uptie sino solo
  lo que cambia en cada uno, así que hay que ir pisando campo por campo desde el
  uptie 1 hasta el 4. Es lo mismo que hace su SkillCard:

      skill.data.reduce((acc, t) => t.uptie <= uptie ? { ...acc, ...t } : acc, {})

  Quedarse con el último tramo a secas devolvería objetos incompletos.

  La clave de ese diccionario es el mismo `id` que ya trae cada skill en el dump
  (`skillTypes[].id`), así que el cruce es exacto: no hay que adivinar por tier
  ni por afinidad, que es lo que se venía haciendo con LCTeamBuilder.

  Esto NO se corre en cada build ni en la app: son ~300 pedidos a un servidor
  ajeno. Va por el workflow manual .github/workflows/datos.yml y el resultado
  queda versionado.

  Si algo de la forma cambia, el bloque `meta` de los archivos generados lo
  delata: guarda las claves que vinieron, los valores que no se supieron mapear
  y los ids que fallaron. Sin ese bloque habría que adivinar por qué salió
  vacío.
*/

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = process.env.LIMBUS_DATA_BASE ?? "https://limbus-assets.eldritchtools.com/data";

const leer = (f) => JSON.parse(readFileSync(path.join(RAIZ, "src/data", f), "utf8"));
const { identities } = leer("identities.json");
const { egos } = leer("egos.json");

/* Mismos nombres canónicos que usa build-dataset.mjs. */
const SIN_CANONICO = {
  wrath: "Wrath", lust: "Lust", sloth: "Sloth", gluttony: "Gluttony",
  gloom: "Gloom", pride: "Pride", envy: "Envy",
};

/* Lo que no se supo interpretar, para revisarlo en vez de perderlo en silencio. */
const diagnostico = {
  clavesIdentity: null,
  clavesEgo: null,
  clavesPasiva: new Set(),
  clavesSkill: new Set(),
  sinsDesconocidos: new Set(),
  tiposCostoVistos: new Set(),
  fallidos: [],
  skillsIncompletas: [],
};

async function bajar(ruta) {
  for (let intento = 0; intento < 3; intento += 1) {
    try {
      const res = await fetch(`${DATA}/${ruta}.json`);
      if (res.status === 404) return null; // no existe: no tiene sentido reintentar
      if (res.ok) return await res.json();
    } catch {
      /* red: se reintenta */
    }
    await new Promise((r) => setTimeout(r, 500 * (intento + 1)));
  }
  return null;
}

/*
  Resuelve una entrada de las listas de pasivas. Puede venir como clave de
  `passiveData` o ya como el objeto; se contemplan las dos para no depender de
  un detalle que la fuente puede cambiar.
*/
function resolver(entrada, passiveData) {
  if (entrada && typeof entrada === "object") return entrada;
  return passiveData?.[entrada] ?? null;
}

function normalizarCosto(condition) {
  if (!condition) return { costo: [], tipoCosto: null };

  const tipo = condition.type ? String(condition.type).toLowerCase() : null;
  if (tipo) diagnostico.tiposCostoVistos.add(tipo);

  const costo = (condition.requirement ?? []).flatMap((c) => {
    const sin = SIN_CANONICO[String(c.type).toLowerCase()] ?? null;
    if (!sin) {
      diagnostico.sinsDesconocidos.add(String(c.type));
      return [];
    }
    return [{ sin, cantidad: c.value }];
  });

  return { costo, tipoCosto: tipo };
}

function normalizarPasiva(entrada, passiveData) {
  const p = resolver(entrada, passiveData);
  if (!p || !p.name) return null;
  Object.keys(p).forEach((k) => diagnostico.clavesPasiva.add(k));

  /*
    El costo puede estar en la pasiva o solo en otra entrada con el mismo
    nombre: la fuente repite la pasiva por uptie y a veces la condición figura
    en una sola de las copias. Su propio código hace este mismo rebusque
    (constructPassive en src/app/identities/IdentityUtils.js).
  */
  let condition = p.condition;
  if (!condition && passiveData) {
    const gemela = Object.values(passiveData).find((q) => q.condition && q.name === p.name);
    if (gemela) condition = gemela.condition;
  }

  return {
    nombre: p.name,
    descripcion: p.desc ?? p.description ?? "",
    ...normalizarCosto(condition),
    fuente: "eldritchtools",
  };
}

/*
  Los tramos de `data` son parciales: cada uno trae solo lo que cambia respecto
  del anterior. Hay que acumularlos en orden hasta el uptie que interesa, no
  quedarse con el último.
*/
const UPTIE = 4; // el nivel jugable, y el que ya usa el resto del dataset

function skillEnUptie(skill) {
  const tramos = (skill.data ?? [])
    .filter((t) => (t.uptie ?? 0) <= UPTIE)
    .sort((a, b) => (a.uptie ?? 0) - (b.uptie ?? 0));
  if (tramos.length === 0) return null;
  return tramos.reduce((acc, t) => ({ ...acc, ...t }), {});
}

function normalizarSkill(skill) {
  const d = skillEnUptie(skill);
  if (!d) return null;
  Object.keys(d).forEach((k) => diagnostico.clavesSkill.add(k));

  /*
    `coins` es la lista de monedas con su descripción; al dataset le interesa
    cuántas son. Si viniera como número ya hecho también sirve.
  */
  const monedas = Array.isArray(d.coins) ? d.coins.length : typeof d.coins === "number" ? d.coins : null;

  return {
    nombre: d.name ?? null,
    poderBase: d.baseValue ?? null,
    monedas,
    valorMoneda: d.coinValue ?? null,
    pesoAtaque: d.atkWeight ?? null,
    fuente: "eldritchtools",
  };
}

/* De [{uptie, passives}] se queda con el uptie más alto: así se juega. */
function tramoMasAlto(lista, passiveData) {
  if (!Array.isArray(lista) || lista.length === 0) return [];
  const mejor = lista.reduce((a, b) => ((b.uptie ?? 0) >= (a.uptie ?? 0) ? b : a));
  return (mejor.passives ?? []).map((x) => normalizarPasiva(x, passiveData)).filter(Boolean);
}

const salidaIdentities = {};
const salidaEgos = {};
const salidaSkills = {};

for (const i of identities) {
  const d = await bajar(`identities/${i.id}`);
  if (!d) {
    diagnostico.fallidos.push({ tipo: "identity", id: i.id, nombre: i.nombre });
    continue;
  }
  if (!diagnostico.clavesIdentity) diagnostico.clavesIdentity = Object.keys(d).sort();

  const combate = tramoMasAlto(d.combatPassives, d.passiveData);
  const soporte = tramoMasAlto(d.supportPassives, d.passiveData);
  if (combate.length || soporte.length) salidaIdentities[i.id] = { combate, soporte };

  /*
    Se guardan indexadas por id de skill, no por Identity: así el consumidor
    cruza directo contra el `id` que ya trae cada skill del dump.
  */
  Object.entries(d.skills ?? {}).forEach(([idSkill, skill]) => {
    const n = normalizarSkill(skill);
    if (!n) return;
    if (n.poderBase === null || n.monedas === null || n.valorMoneda === null) {
      diagnostico.skillsIncompletas.push({ identity: i.id, skill: idSkill, nombre: n.nombre });
    }
    salidaSkills[idSkill] = n;
  });

  await new Promise((r) => setTimeout(r, 60));
}

for (const e of egos) {
  const d = await bajar(`egos/${e.id}`);
  if (!d) {
    diagnostico.fallidos.push({ tipo: "ego", id: e.id, nombre: e.nombre });
    continue;
  }
  if (!diagnostico.clavesEgo) diagnostico.clavesEgo = Object.keys(d).sort();

  /*
    La app de la fuente muestra "la" pasiva del E.G.O, pero el archivo trae una
    lista. Se guardan todas y que decida quien consuma el dato.
  */
  const pasivas = (d.passiveList ?? []).map((x) => normalizarPasiva(x, d.passiveData)).filter(Boolean);
  if (pasivas.length) salidaEgos[e.id] = pasivas;

  await new Promise((r) => setTimeout(r, 60));
}

const comun = {
  generado: new Date().toISOString().slice(0, 10),
  fuente: DATA,
  clavesIdentity: diagnostico.clavesIdentity,
  clavesEgo: diagnostico.clavesEgo,
  fallidos: diagnostico.fallidos,
};

const metaPasivas = {
  ...comun,
  clavesPasiva: [...diagnostico.clavesPasiva].sort(),
  tiposCostoVistos: [...diagnostico.tiposCostoVistos].sort(),
  sinsDesconocidos: [...diagnostico.sinsDesconocidos].sort(),
  conteo: {
    identitiesPedidas: identities.length,
    identitiesConPasivas: Object.keys(salidaIdentities).length,
    identitiesConCombate: Object.values(salidaIdentities).filter((x) => x.combate.length).length,
    identitiesConSoporte: Object.values(salidaIdentities).filter((x) => x.soporte.length).length,
    egosPedidos: egos.length,
    egosConPasiva: Object.keys(salidaEgos).length,
  },
};

const metaSkills = {
  ...comun,
  clavesSkill: [...diagnostico.clavesSkill].sort(),
  /* Las que vinieron sin alguno de los números: quedan listadas, no tapadas. */
  incompletas: diagnostico.skillsIncompletas,
  conteo: {
    skills: Object.keys(salidaSkills).length,
    completas: Object.values(salidaSkills).filter((s) => s.poderBase !== null && s.monedas !== null && s.valorMoneda !== null).length,
  },
};

const escribir = (archivo, contenido) =>
  writeFileSync(
    path.join(RAIZ, "src/data", archivo),
    JSON.stringify({ _comentario: "Generado por scripts/fetch-datos.mjs. No editar a mano.", ...contenido }, null, 1) + "\n"
  );

escribir("pasivas.json", { meta: metaPasivas, identities: salidaIdentities, egos: salidaEgos });
escribir("skills.json", { meta: metaSkills, skills: salidaSkills });

console.log("\n--- Pasivas ---");
console.log(JSON.stringify(metaPasivas, null, 2));
console.log("\n--- Skills ---");
console.log(JSON.stringify({ ...metaSkills, incompletas: `${metaSkills.incompletas.length} (ver skills.json)` }, null, 2));
