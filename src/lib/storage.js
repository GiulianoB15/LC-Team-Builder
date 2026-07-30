/*
  Persistencia de la colección.

  El prototipo usaba `window.storage`, que es una API del sandbox de artifacts
  y no existe en un navegador común: `window.storage?.get(...)` devolvía
  undefined y el `.then()` encadenado tiraba TypeError al cargar la app.
  Acá se usa localStorage, que sí existe en todos lados.

  El valor guardado va envuelto en { version, owned } para poder migrar más
  adelante. Importa: cuando reemplacemos el dataset semilla por el completo
  (~185 IDs), las `key` van a cambiar. Sin versión, esa migración le borra la
  colección a todo el mundo en silencio.
*/

const STORAGE_KEY = "limbus:collection";
const STORAGE_VERSION = 1;

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

    // v0: se guardaba el mapa { key: true } pelado, sin envoltorio.
    if (parsed && typeof parsed === "object" && !("version" in parsed)) {
      return migrar(0, parsed);
    }
    if (parsed?.version === STORAGE_VERSION) {
      return parsed.owned || {};
    }
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

/*
  Punto único donde encadenar migraciones futuras. Hoy la v0 y la v1 tienen la
  misma forma, así que alcanza con devolver el mapa.
*/
function migrar(desdeVersion, owned) {
  return owned && typeof owned === "object" ? owned : {};
}
