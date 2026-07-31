/*
  Baja las pasivas de Identities y E.G.O desde limbus-assets.eldritchtools.com y
  las deja normalizadas en src/data/pasivas.json.

    node scripts/fetch-pasivas.mjs

  POR QUÉ EXISTE

  Hasta ahora las pasivas salían de LCTeamBuilder, que quedó en 147 IDs, más un
  puñado cargado a mano en capturas.json. Quedaban 3 Identities sin nada, 34 con
  pasivas de soporte solamente y 9 E.G.O sin pasiva.

  El dump de identities.json que se venía usando no las trae, pero NO porque la
  fuente no las publique: las publica en archivos aparte, uno por id:

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
      egos/<id>.json         passiveList: [...]

  De cada tramo por uptie se toma el más alto (uptie 4, que es como se juega).
  El objeto de pasiva tiene `name`, `desc` y, cuando corresponde, `condition`
  con el costo en recursos de Sin.

  Esto NO se corre en cada build ni en la app: son ~300 pedidos a un servidor
  ajeno. Va por el workflow manual .github/workflows/pasivas.yml y el resultado
  queda versionado.

  Si algo de la forma cambia, el bloque `meta` del archivo generado lo delata:
  guarda las claves que vinieron, los valores que no se supieron mapear y los
  ids que fallaron. Sin ese bloque habría que adivinar por qué salió vacío.
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
  sinsDesconocidos: new Set(),
  tiposCostoVistos: new Set(),
  fallidos: [],
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

/* De [{uptie, passives}] se queda con el uptie más alto: así se juega. */
function tramoMasAlto(lista, passiveData) {
  if (!Array.isArray(lista) || lista.length === 0) return [];
  const mejor = lista.reduce((a, b) => ((b.uptie ?? 0) >= (a.uptie ?? 0) ? b : a));
  return (mejor.passives ?? []).map((x) => normalizarPasiva(x, passiveData)).filter(Boolean);
}

const salidaIdentities = {};
const salidaEgos = {};

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

const meta = {
  generado: new Date().toISOString().slice(0, 10),
  fuente: DATA,
  clavesIdentity: diagnostico.clavesIdentity,
  clavesEgo: diagnostico.clavesEgo,
  clavesPasiva: [...diagnostico.clavesPasiva].sort(),
  tiposCostoVistos: [...diagnostico.tiposCostoVistos].sort(),
  sinsDesconocidos: [...diagnostico.sinsDesconocidos].sort(),
  fallidos: diagnostico.fallidos,
  conteo: {
    identitiesPedidas: identities.length,
    identitiesConPasivas: Object.keys(salidaIdentities).length,
    identitiesConCombate: Object.values(salidaIdentities).filter((x) => x.combate.length).length,
    identitiesConSoporte: Object.values(salidaIdentities).filter((x) => x.soporte.length).length,
    egosPedidos: egos.length,
    egosConPasiva: Object.keys(salidaEgos).length,
  },
};

writeFileSync(
  path.join(RAIZ, "src/data/pasivas.json"),
  JSON.stringify(
    { _comentario: "Generado por scripts/fetch-pasivas.mjs. No editar a mano.", meta, identities: salidaIdentities, egos: salidaEgos },
    null,
    1
  ) + "\n"
);

console.log("\n--- Resumen ---");
console.log(JSON.stringify(meta, null, 2));
