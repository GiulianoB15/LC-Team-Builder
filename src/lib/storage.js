import { identityPorNombre, identityPorId, conBase } from "../data/identities.js";

/*
  Persistencia de la colección en localStorage.

  El valor va envuelto en { version, ... } para poder migrar:

    v0  { "yisang-ring": true }                  mapa pelado del prototipo
    v1  { version:1, owned: {clave: true} }      mismas claves de texto
    v2  { version:2, owned: {10109: true} }      id numérico del juego
    v3  { version:3, identities:{}, egos:{} }    se suman los E.G.O
    v4  igual que la v3                          se dan por tenidas las 12 base
    v5  + equipo:[ids] + base:[ids]              se guardan las dos selecciones

  Las claves de texto del prototipo se resuelven por nombre contra el dataset,
  así que una migración no le borra la colección a nadie.

  La v4 no cambia la FORMA, solo el contenido: marca las 12 Identidades base,
  que son con las que arranca cualquiera. Se hace en una versión nueva y no al
  vuelo para que quede escrito en el storage y no haya que recalcularlo cada
  vez, y para que se note en el historial que la colección de alguien cambió
  por una decisión nuestra y no por algo que hizo.

  LA v5, Y POR QUÉ TARDÓ TANTO EN APARECER

  Hasta acá se guardaba QUÉ TENÉS pero no QUÉ ARMASTE. El equipo y la base de
  «Completar equipo» vivían en el estado del componente, así que un F5 los
  borraba. Medido: elegís una Identidad, recargás, queda en cero.

  Es raro que haya durado tanto, porque el equipo es justamente lo único que la
  app produce: la colección la cargás vos, el orden y los motivos los calcula
  ella. Perder eso al cerrar la pestaña es perder el trabajo, no el insumo.

  Se guardan como listas de id y no como objetos: un id sigue resolviendo
  contra un dataset regenerado, un objeto viejo no.
*/

const STORAGE_KEY = "limbus:collection";
const STORAGE_VERSION = 5;

/* Cuántos entran en cada selección. Mismo tope que aplica la UI. */
const MAX_SELECCION = 12;

/* Ni siquiera una colección vacía está vacía: las 12 base las tiene todo el mundo. */
const VACIO = { identities: conBase({}), egos: {}, equipo: [], base: [] };

/* Las 8 claves del prototipo, con el nombre y Sinner que les corresponde. */
const CLAVES_V1 = {
  "yisang-lcb": ["LCB Sinner", "Yi Sang"],
  "yisang-dimshredder": ["LCE E.G.O::Dimension Shredder", "Yi Sang"],
  "yisang-ring": ["The Ring Pointillist Student", "Yi Sang"],
  "yisang-wubranch": ["Heishou Pack - Wu Branch Adept", "Yi Sang"],
  "faust-lcb": ["LCB Sinner", "Faust"],
  "faust-lobocorp": ["Lobotomy Corp. Remnant", "Faust"],
  "faust-shi": ["Shi Assoc. East Section 3", "Faust"],
  "faust-wcorp": ["W Corp. L2 Cleanup Agent", "Faust"],
};

function esNavegadorConStorage() {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    // Safari en modo privado puede tirar al tocar localStorage.
    return false;
  }
}

export function loadCollection() {
  if (!esNavegadorConStorage()) return VACIO;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return VACIO;

    const parsed = JSON.parse(raw);

    // v0: el mapa { clave: true } pelado, sin envoltorio.
    if (parsed && typeof parsed === "object" && !("version" in parsed)) {
      return migrar(0, parsed);
    }
    if (parsed?.version === STORAGE_VERSION) {
      return {
        identities: conBase(normalizar(parsed.identities)),
        egos: normalizar(parsed.egos),
        equipo: normalizarSeleccion(parsed.equipo),
        base: normalizarSeleccion(parsed.base),
      };
    }
    /* De la v3 para arriba los E.G.O ya existían y hay que conservarlos. */
    return migrar(parsed?.version ?? 0, parsed?.owned ?? parsed?.identities ?? {}, parsed?.egos);
  } catch {
    // Dato corrupto: se arranca vacío en vez de romper la app.
    return VACIO;
  }
}

export function saveCollection({ identities, egos, equipo = [], base = [] }) {
  if (!esNavegadorConStorage()) return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, identities, egos, equipo, base })
    );
    return true;
  } catch {
    // Cuota llena o storage bloqueado.
    return false;
  }
}

/*
  Una selección guardada tiene que volver cumpliendo las mismas reglas que la
  UI impone al armarla, porque nada garantiza que el archivo no haya cambiado
  entre una sesión y la siguiente:

  - se descartan los ids que el dataset ya no conoce (se regeneró y esa ID no
    está más, o el guardado se editó a mano);
  - una sola por Sinner, igual que toggleSeleccion;
  - tope de 12.

  Sin esto, un guardado viejo podría meter dos del mismo Sinner y el motor
  calcularía sobre un equipo que la UI nunca habría dejado armar.
*/
function normalizarSeleccion(lista) {
  const vistos = new Set();
  const sinners = new Set();
  const out = [];

  (Array.isArray(lista) ? lista : []).forEach((valor) => {
    if (out.length >= MAX_SELECCION) return;
    const id = Number(valor);
    if (!Number.isFinite(id) || vistos.has(id)) return;
    const identidad = identityPorId(id);
    if (!identidad || sinners.has(identidad.sinner)) return;
    vistos.add(id);
    sinners.add(identidad.sinner);
    out.push(id);
  });

  return out;
}

/* Las claves de un objeto JSON siempre son strings; adentro se usan números. */
function normalizar(mapa) {
  const out = {};
  Object.entries(mapa ?? {}).forEach(([k, v]) => {
    if (v) out[Number(k)] = true;
  });
  return out;
}

/*
  Devuelve siempre la forma actual. Los E.G.O no existían antes de la v3, así
  que viniendo de v0/v1 arrancan vacíos; de v3 en adelante se conservan.
*/
export function migrar(desdeVersion, guardadas, egosGuardados) {
  /*
    Nadie viene con equipo guardado desde antes de la v5, así que las dos
    selecciones arrancan vacías en toda migración. No es pérdida: no existían.
  */
  if (desdeVersion >= 2) {
    return { identities: conBase(normalizar(guardadas)), egos: normalizar(egosGuardados), equipo: [], base: [] };
  }

  // v0 y v1 comparten forma: claves de texto del prototipo.
  const identities = {};
  Object.entries(guardadas ?? {}).forEach(([clave, tenida]) => {
    if (!tenida) return;
    const ref = CLAVES_V1[clave];
    if (!ref) return; // clave desconocida: se descarta en vez de romper
    const id = identityPorNombre(ref[0], ref[1]);
    if (id) identities[id.id] = true;
  });
  return { identities: conBase(identities), egos: {}, equipo: [], base: [] };
}
