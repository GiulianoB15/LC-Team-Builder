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
/*
  Ancho de la miniatura. No es un número estético: lo fija la pantalla más
  densa donde se mira. Las tarjetas muestran el retrato a 72 px y la ficha a
  80; en un celular con densidad 2× eso son 144 y 160 px reales, así que por
  debajo de 160 la imagen se ve blanda.

  Estuvo en 96 mientras el retrato se mostraba a 44 px (44 × 2 = 88, entraba
  justo). Al agrandarlo hubo que rehacerlas: subir de 96 no agrega detalle que
  no se bajó nunca.

  Cuesta ~3 MB en total para las 294, contra 1,2 MB de antes. Se sirven con
  `loading="lazy"`, así que lo que pesa es el repo, no la visita.
*/
const ANCHO = 160;

const leer = (f) => JSON.parse(readFileSync(path.join(RAIZ, "src/data", f), "utf8"));
const { identities } = leer("identities.json");
const { egos } = leer("egos.json");

/*
  Las base (…01) usan _normal; todas las demás, _gacksung.

  Esta regla es empírica y está verificada contra el servidor: bajó 184 de 184.
  Se probó cambiarla por la del código de la fuente (limbus-shared-library,
  src/identity/identity.js), que dice

      type = (uptie > 2 || tags incluye "Base Identity") ? "gacksung" : "normal"

  o sea gacksung para todas a uptie máximo. Con eso las 12 base pasaron a fallar:
  `10101_gacksung.webp` no existe. La explicación es que hay DOS juegos de
  archivos y esa regla es la del otro (ver el bloque de E.G.O acá abajo): en el
  de .webp, las base solo están como _normal.

  Moraleja: contra este servidor manda lo que responde 200, no lo que dice el
  código de su app.
*/
const urlIdentity = (id) => `${BASE}/identities/${id}_${String(id).endsWith("01") ? "normal" : "gacksung"}.webp`;

/*
  E.G.O: `_awaken_profile.webp`. Verificado con --probar contra el servidor real
  (200 en 20101 y en 21209).

  Costó encontrarlo porque no se deduce ni del patrón de Identities ni del
  código de la fuente, sino que es una mezcla de los dos. Lo que falló:

    _gacksung, _normal, sin sufijo, _profile, _erosion   404
    _awaken.webp                                         404
    _awaken_profile.png                                  404  ← el de su código
    /ego/…, /egoes/…                                     404

  O sea: el nombre `<id>_awaken_profile` es el de su app —"awaken" es el arte
  base, "erosion" el de corrosión— pero la extensión que este servidor sirve en
  /assets es .webp, no el .png que dice el código. Las Identities son al revés:
  ahí el naming _profile no existe y va el sufijo pelado.

  Moraleja repetida: contra este servidor manda lo que responde 200.
*/
const urlsEgo = (id) => [`${BASE}/egos/${id}_awaken_profile.webp`];

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

/*
  --probar: no baja nada, solo pregunta. Prueba una matriz de URLs candidatas
  contra unos pocos ids y muestra el código de respuesta de cada una.

  Existe porque adivinar el patrón a fuerza de corridas completas cuesta 110
  pedidos y una hora de ida y vuelta por cada intento. Con esto, una corrida de
  segundos dice cuál anda.

  Las dos primeras son controles: se sabe que responden 200. Si fallan, el
  problema es el servidor o la red, no el patrón.

  Ya cumplió su función una vez —así apareció `_awaken_profile.webp` para los
  E.G.O— y se queda para la próxima vez que un patrón deje de responder.
*/
if (process.argv.includes("--probar")) {
  const candidatas = [
    ["control Identity no-base", `${BASE}/identities/10109_gacksung.webp`],
    ["control Identity base", `${BASE}/identities/10101_normal.webp`],
    ["¿existe el juego _profile.png?", `${BASE}/identities/10109_gacksung_profile.png`],
    ["Identity base con la regla del código", `${BASE}/identities/10101_gacksung.webp`],
  ];

  /* Sobre dos E.G.O distintos, por si alguno fuera un caso raro. */
  for (const id of [20101, 21209]) {
    for (const s of ["_awaken", "_erosion", "_normal", "_gacksung", "_profile", ""]) {
      candidatas.push([`E.G.O ${id}`, `${BASE}/egos/${id}${s}.webp`]);
      candidatas.push([`E.G.O ${id}`, `${BASE}/egos/${id}${s}.png`]);
    }
    candidatas.push([`E.G.O ${id}`, `${BASE}/egos/${id}_awaken_profile.png`]);
    candidatas.push([`E.G.O ${id}`, `${BASE}/egos/${id}_awaken_profile.webp`]);
    /* Por si la carpeta fuera otra. */
    candidatas.push([`E.G.O ${id}`, `${BASE}/ego/${id}_awaken_profile.png`]);
    candidatas.push([`E.G.O ${id}`, `${BASE}/egoes/${id}_awaken.webp`]);
  }

  console.log("Probando URLs (sin descargar nada):\n");
  for (const [que, url] of candidatas) {
    let estado;
    try {
      const res = await fetch(url, { method: "HEAD" });
      estado = `${res.status}${res.ok ? "  ✔" : ""}`;
    } catch (e) {
      estado = `error: ${e.message}`;
    }
    console.log(`  ${estado.padEnd(12)} ${url.replace(BASE, "")}   ${que}`);
  }
  console.log("\nListo. Las que digan 200 son las que hay que usar.");
  process.exit(0);
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
