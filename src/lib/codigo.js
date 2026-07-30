import { SINNERS } from "../data/constants.js";

/*
  Código para compartir una colección.

  Los ids del juego son perfectamente regulares:

      Identities   1 SS NN     SS = Sinner (01-12), NN = 01..16
      E.G.O        2 SS NN     SS = Sinner (01-12), NN = 01..10

  Así que la colección entera se codifica como un bitfield de posición fija:
  32 slots por Sinner para Identities y 16 para E.G.O. Son 72 bytes, ~99
  caracteres en base64url — entra en un mensaje sin problema.

  Lo importante no es que sea corto, es que es ESTABLE ante actualizaciones del
  dataset. Cuando salga la Identity 10117 solo prende un bit que antes estaba en
  cero, y los códigos que ya circularon siguen siendo válidos. Si en cambio se
  codificara "posición en el array", insertar una ID en el medio invalidaría
  todos los códigos que la gente ya se pasó.
*/

const VERSION = 1;
const SLOTS_ID = 32;   // hoy se usan 16
const SLOTS_EGO = 16;  // hoy se usan 10
const BYTES_ID = (SLOTS_ID / 8) * SINNERS.length;   // 48
const BYTES_EGO = (SLOTS_EGO / 8) * SINNERS.length; // 24
const TOTAL = 1 + BYTES_ID + BYTES_EGO + 1;         // versión + payload + checksum

const checksum = (bytes, hasta) => {
  let s = 0;
  for (let i = 0; i < hasta; i++) s = (s + bytes[i]) & 0xff;
  return s;
};

/* id -> { sinner (1-12), nn } o null si no encaja en el esquema. */
function partirId(id, tipoEsperado) {
  const s = String(id);
  if (s.length !== 5 || s[0] !== String(tipoEsperado)) return null;
  const sinner = Number(s.slice(1, 3));
  const nn = Number(s.slice(3));
  if (!sinner || sinner > SINNERS.length || !nn) return null;
  return { sinner, nn };
}

const armarId = (tipo, sinner, nn) =>
  tipo * 10000 + sinner * 100 + nn;

function prender(bytes, offset, slotsPorSinner, sinner, nn) {
  const bit = (sinner - 1) * slotsPorSinner + (nn - 1);
  bytes[offset + (bit >> 3)] |= 1 << (bit & 7);
}

function estaPrendido(bytes, offset, slotsPorSinner, sinner, nn) {
  const bit = (sinner - 1) * slotsPorSinner + (nn - 1);
  return (bytes[offset + (bit >> 3)] & (1 << (bit & 7))) !== 0;
}

/* --- base64url sin padding --- */

function aBase64Url(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(txt) {
  const limpio = txt.trim().replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(limpio + "=".repeat((4 - (limpio.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* --- API --- */

/*
  Codifica { identities: {id:true}, egos: {id:true} }.
  Devuelve { codigo, fueraDeRango } — fueraDeRango son ids que no entran en los
  slots reservados; hoy no debería haber ninguno, pero se informa en vez de
  perderlos en silencio.
*/
export function codificar({ identities = {}, egos = {} } = {}) {
  const bytes = new Uint8Array(TOTAL);
  bytes[0] = VERSION;
  const fueraDeRango = [];

  const cargar = (mapa, tipo, offset, slots) => {
    Object.entries(mapa).forEach(([id, tenido]) => {
      if (!tenido) return;
      const p = partirId(Number(id), tipo);
      if (!p || p.nn > slots) {
        fueraDeRango.push(Number(id));
        return;
      }
      prender(bytes, offset, slots, p.sinner, p.nn);
    });
  };

  cargar(identities, 1, 1, SLOTS_ID);
  cargar(egos, 2, 1 + BYTES_ID, SLOTS_EGO);

  bytes[TOTAL - 1] = checksum(bytes, TOTAL - 1);
  return { codigo: aBase64Url(bytes), fueraDeRango };
}

/*
  Decodifica un código. Devuelve { ok, identities, egos, error }.
  Nunca tira: un pegado mal hecho tiene que dar un mensaje, no romper la app.
*/
export function decodificar(texto) {
  if (!texto || !texto.trim()) return { ok: false, error: "Pegá un código primero." };

  let bytes;
  try {
    bytes = deBase64Url(texto);
  } catch {
    return { ok: false, error: "El código tiene caracteres que no corresponden." };
  }

  if (bytes.length !== TOTAL) {
    return { ok: false, error: "El código está incompleto o le sobran caracteres." };
  }
  if (bytes[0] !== VERSION) {
    return { ok: false, error: `El código es de otra versión (v${bytes[0]}); esta app usa la v${VERSION}.` };
  }
  if (bytes[TOTAL - 1] !== checksum(bytes, TOTAL - 1)) {
    return { ok: false, error: "El código está dañado: se copió incompleto o le falta un pedazo." };
  }

  const identities = {};
  const egos = {};
  for (let sinner = 1; sinner <= SINNERS.length; sinner++) {
    for (let nn = 1; nn <= SLOTS_ID; nn++) {
      if (estaPrendido(bytes, 1, SLOTS_ID, sinner, nn)) identities[armarId(1, sinner, nn)] = true;
    }
    for (let nn = 1; nn <= SLOTS_EGO; nn++) {
      if (estaPrendido(bytes, 1 + BYTES_ID, SLOTS_EGO, sinner, nn)) egos[armarId(2, sinner, nn)] = true;
    }
  }

  return { ok: true, identities, egos };
}

/*
  Compara una colección decodificada contra la propia y contra el dataset.
  Sirve para mostrar qué implica antes de aplicar nada.
*/
export function comparar(decodificada, propia, { idsConocidos, egosConocidos }) {
  const cuenta = (mapa, conocidos) => {
    const ids = Object.keys(mapa).map(Number).filter((id) => mapa[id]);
    return {
      total: ids.length,
      desconocidos: ids.filter((id) => !conocidos.has(id)).length,
    };
  };

  const ids = cuenta(decodificada.identities, idsConocidos);
  const egos = cuenta(decodificada.egos, egosConocidos);
  const propiasIds = Object.values(propia.identities ?? {}).filter(Boolean).length;
  const propiosEgos = Object.values(propia.egos ?? {}).filter(Boolean).length;

  return {
    identities: ids.total,
    egos: egos.total,
    /* Marcadas que tu dataset todavía no conoce: el otro tiene una versión más nueva. */
    desconocidas: ids.desconocidos + egos.desconocidos,
    propiasIdentities: propiasIds,
    propiosEgos,
  };
}

export const LARGO_CODIGO = aBase64Url(new Uint8Array(TOTAL)).length;
