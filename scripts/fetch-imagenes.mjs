/*
  Descarga los retratos de Identities y E.G.O y genera miniaturas.

    node scripts/fetch-imagenes.mjs            # descarga lo que falte
    node scripts/fetch-imagenes.mjs --forzar   # vuelve a bajar todo

  IMPORTANTE: esto se corre a mano, no en CI ni en cada build. Las imágenes
  quedan versionadas en public/retratos/ y la app las sirve estáticas, así que
  no le pega al servidor de nadie en cada visita.

  Fuente: limbus-assets.eldritchtools.com. La URL sale del id, sin tabla de
  mapeo: las 12 Identities base (id terminado en 01) usan el sufijo `_normal` y
  el resto `_gacksung`. Verificado contra los 147 archivos de LCTeamBuilder,
  donde esos son los dos únicos sufijos que existen.

  El arte es de Project Moon. Esto solo lo redistribuye para uso personal, igual
  que cualquier fan site; la atribución está en el README y en el pie de la app.
*/

import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = path.join(RAIZ, "public/retratos");
/* Overrideable para poder probar el script contra un servidor local. */
const BASE = process.env.LIMBUS_ASSETS_BASE ?? "https://limbus-assets.eldritchtools.com/assets";

const forzar = process.argv.includes("--forzar");
const ANCHO = 96; // suficiente para la lista; 2,4 KB por imagen en WebP

const leer = (f) => JSON.parse(readFileSync(path.join(RAIZ, "src/data", f), "utf8"));
const { identities } = leer("identities.json");
const { egos } = leer("egos.json");

/*
  Siempre _gacksung. La regla real de la fuente (limbus-shared-library,
  src/identity/identity.js) es:

      type = (uptie > 2 || tags incluye "Base Identity") ? "gacksung" : "normal"

  O sea: "normal" es el arte de uptie 1-2 y "gacksung" el de uptie 3-4. Como acá
  se muestran las IDs a uptie máximo, corresponde gacksung para todas. La regla
  anterior ("las que terminan en 01 usan normal") bajaba las 12 Identities base
  con el arte sin subir de nivel.
*/
const urlIdentity = (id) => `${BASE}/identities/${id}_gacksung.webp`;

/*
  Para E.G.O el patrón es distinto y no se deduce del de Identities: la primera
  corrida bajó 184 de 184 Identities y 0 de 110 E.G.O probando los sufijos que
  parecían obvios (_gacksung, _normal, sin sufijo).

  El correcto sale del código de la propia fuente
  (github.com/eldritchtools/limbus-shared-library, src/ego/ego.js):

      `${ASSETS_ROOT}/egos/${ego.id}_${type}_profile.png`   type: awaken | erosion

  "awaken" es el arte base y "erosion" el de corrosión, que no todas tienen.
  Se pide el de awaken. Se prueba primero la variante .webp porque para
  Identities existe y pesa menos; si no está, se cae al .png que sí está
  confirmado en el código de la fuente. sharp convierte cualquiera de las dos a
  WebP de 96 px, así que el archivo que queda en disco es igual.
*/
const urlsEgo = (id) => [
  `${BASE}/egos/${id}_awaken.webp`,
  `${BASE}/egos/${id}_awaken_profile.png`,
];

/* sharp es opcional: sin él se guardan los originales y se avisa. */
let sharp = null;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.warn("⚠ sharp no está instalado: se guardan los originales sin redimensionar.");
  console.warn("  Para miniaturas de ~2 KB: npm install --no-save sharp");
  console.warn("  (--no-save: es una herramienta de un solo uso, no hace falta en package.json)\n");
}

async function bajar(urls) {
  for (const url of Array.isArray(urls) ? urls : [urls]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      return { buf: Buffer.from(await res.arrayBuffer()), url };
    } catch {
      /* red caída o host inalcanzable: se prueba la siguiente variante */
    }
  }
  return null;
}

async function miniatura(buf) {
  if (!sharp) return buf;
  return sharp(buf).resize(ANCHO, ANCHO, { fit: "cover", position: "top" }).webp({ quality: 78 }).toBuffer();
}

mkdirSync(DESTINO, { recursive: true });

const objetivos = [
  ...identities.map((i) => ({ id: i.id, nombre: `${i.nombre} (${i.sinner})`, urls: urlIdentity(i.id) })),
  ...egos.map((e) => ({ id: e.id, nombre: `${e.nombre} (${e.sinner})`, urls: urlsEgo(e.id), esEgo: true })),
];

let bajadas = 0;
let saltadas = 0;
const fallidas = [];
const variantesEgo = {};

for (const o of objetivos) {
  const salida = path.join(DESTINO, `${o.id}.webp`);
  if (!forzar && existsSync(salida)) {
    saltadas += 1;
    continue;
  }

  const r = await bajar(o.urls);
  if (!r) {
    fallidas.push(o);
    continue;
  }

  if (o.esEgo) {
    const v = r.url.replace(/.*\/\d+/, "") || "(sin sufijo)";
    variantesEgo[v] = (variantesEgo[v] || 0) + 1;
  }

  writeFileSync(salida, await miniatura(r.buf));
  bajadas += 1;

  // Una pausa corta: son ~300 pedidos a un servidor ajeno, no hay apuro.
  await new Promise((r) => setTimeout(r, 60));
}

/* --- Resumen --- */

const archivos = readdirSync(DESTINO).filter((f) => f.endsWith(".webp"));

/*
  Manifiesto de lo que quedó disponible. La app lo consulta antes de pedir cada
  imagen, así no dispara pedidos por las que no existen.
*/
writeFileSync(
  path.join(RAIZ, "src/data/retratos.json"),
  JSON.stringify(
    {
      _comentario: "Generado por scripts/fetch-imagenes.mjs. No editar a mano.",
      ids: archivos.map((f) => Number(f.replace(".webp", ""))).sort((a, b) => a - b),
    },
    null,
    1
  ) + "\n"
);
const pesoTotal = archivos.reduce((a, f) => a + statSync(path.join(DESTINO, f)).size, 0);

console.log(`\nDescargadas: ${bajadas}   ya estaban: ${saltadas}   fallidas: ${fallidas.length}`);
console.log(`En public/retratos/: ${archivos.length} archivos, ${(pesoTotal / 1048576).toFixed(2)} MB`);
console.log(`Cobertura: ${archivos.length} de ${objetivos.length}`);

if (Object.keys(variantesEgo).length) {
  console.log("Sufijo que funcionó para E.G.O:", JSON.stringify(variantesEgo));
}

if (fallidas.length) {
  console.log(`\nNo se pudieron bajar (${fallidas.length}):`);
  fallidas.slice(0, 15).forEach((f) => console.log(`   ${f.id}  ${f.nombre}`));
  if (fallidas.length > 15) console.log(`   … y ${fallidas.length - 15} más`);
  console.log("\nLa app usa un marcador con las iniciales cuando falta la imagen, así que");
  console.log("esto no rompe nada: solo quedan esas tarjetas sin retrato.");
}
