import { identityPorNombre } from "../data/identities.js";

/*
  Persistencia de la colección en localStorage.

  El valor va envuelto en { version, owned } justamente para poder migrar. Esta
  es la primera migración real: la v1 guardaba claves de texto inventadas por el
  prototipo ("yisang-ring") y la v2 usa el ID numérico del juego (10109), que es
  estable y no cambia si mañana reemplazamos la fuente del dataset.

  Sin esto, importar el dataset le habría borrado la colección a todo el mundo.
*/

const STORAGE_KEY = "limbus:collection";
const STORAGE_VERSION = 2;

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
  if (!esNavegadorConStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);

    // v0: el mapa { clave: true } pelado, sin envoltorio.
    if (parsed && typeof parsed === "object" && !("version" in parsed)) {
      return migrar(0, parsed);
    }
    if (parsed?.version === STORAGE_VERSION) return normalizar(parsed.owned);
    return migrar(parsed?.version ?? 0, parsed?.owned ?? {});
  } catch {
    // Dato corrupto: se arranca vacío en vez de romper la app.
    return {};
  }
}

export function saveCollection(owned) {
  if (!esNavegadorConStorage()) return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, owned })
    );
    return true;
  } catch {
    // Cuota llena o storage bloqueado.
    return false;
  }
}

/* Las claves de un objeto JSON siempre son strings; adentro se usan números. */
function normalizar(owned) {
  const out = {};
  Object.entries(owned ?? {}).forEach(([k, v]) => {
    if (v) out[Number(k)] = true;
  });
  return out;
}

export function migrar(desdeVersion, owned) {
  if (desdeVersion >= 2) return normalizar(owned);

  // v0 y v1 comparten forma: claves de texto del prototipo.
  const out = {};
  Object.entries(owned ?? {}).forEach(([clave, tenida]) => {
    if (!tenida) return;
    const ref = CLAVES_V1[clave];
    if (!ref) return; // clave desconocida: se descarta en vez de romper
    const id = identityPorNombre(ref[0], ref[1]);
    if (id) out[id.id] = true;
  });
  return out;
}
