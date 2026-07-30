import { identityPorNombre } from "../data/identities.js";

/*
  Persistencia de la colección en localStorage.

  El valor va envuelto en { version, ... } para poder migrar:

    v0  { "yisang-ring": true }                  mapa pelado del prototipo
    v1  { version:1, owned: {clave: true} }      mismas claves de texto
    v2  { version:2, owned: {10109: true} }      id numérico del juego
    v3  { version:3, identities:{}, egos:{} }    se suman los E.G.O

  Las claves de texto del prototipo se resuelven por nombre contra el dataset,
  así que una migración no le borra la colección a nadie.
*/

const STORAGE_KEY = "limbus:collection";
const STORAGE_VERSION = 3;

const VACIO = { identities: {}, egos: {} };

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
      return { identities: normalizar(parsed.identities), egos: normalizar(parsed.egos) };
    }
    return migrar(parsed?.version ?? 0, parsed?.owned ?? parsed?.identities ?? {});
  } catch {
    // Dato corrupto: se arranca vacío en vez de romper la app.
    return VACIO;
  }
}

export function saveCollection({ identities, egos }) {
  if (!esNavegadorConStorage()) return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, identities, egos })
    );
    return true;
  } catch {
    // Cuota llena o storage bloqueado.
    return false;
  }
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
  Devuelve siempre la forma de la v3. Los E.G.O no existían antes de esta
  versión, así que en cualquier migración arrancan vacíos.
*/
export function migrar(desdeVersion, guardadas) {
  if (desdeVersion >= 2) return { identities: normalizar(guardadas), egos: {} };

  // v0 y v1 comparten forma: claves de texto del prototipo.
  const identities = {};
  Object.entries(guardadas ?? {}).forEach(([clave, tenida]) => {
    if (!tenida) return;
    const ref = CLAVES_V1[clave];
    if (!ref) return; // clave desconocida: se descarta en vez de romper
    const id = identityPorNombre(ref[0], ref[1]);
    if (id) identities[id.id] = true;
  });
  return { identities, egos: {} };
}
