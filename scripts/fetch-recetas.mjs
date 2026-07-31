/*
  Baja equipos publicados por la comunidad en limbus-teams.eldritchtools.com y
  los deja en src/data/recetas.json.

    node scripts/fetch-recetas.mjs                # baja hasta LIMITE recetas
    node scripts/fetch-recetas.mjs --probar       # solo verifica que se llega, no escribe

  QUÉ SE GUARDA, Y QUÉ NO

  Esto NO es como bajar pasivas. Las pasivas son datos del juego; una build es
  algo que escribió una persona con nombre. Así que se guarda lo mínimo para
  poder cruzarla contra tu colección, y nada más:

      id, título, autor, URL, ids de Identities y E.G.O, orden, tags, fecha

  NO se guarda el `body`: el texto que la persona escribió explicando su equipo.
  Para leer eso, la app linkea al original. La receta acá es un índice, no una
  copia.

  CÓMO SE PIDE

  Por el mismo RPC que usa su propio buscador (search_builds_v9), con la clave
  publicable que su web expone al navegador. Es más liviano para ellos que
  scrapear una página por build: una llamada paginada en vez de N renders.

  Dos cosas a propósito:

  - NO se pasa `p_ignore_block_discovery`. Su web sí la pasa en el buscador,
    pero el default del RPC respeta a quien marcó su build como no descubrible,
    y esa es la opción correcta para algo automático. Lo decide el servidor, no
    nosotros.
  - Hay un límite y una pausa entre páginas. No hace falta el corpus entero:
    con las mejores rankeadas alcanza, y el servidor es de un proyecto chico.

  El arte y los datos del juego son de Project Moon. Las builds son de sus
  autores, y por eso van con nombre y link.
*/

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITIO = process.env.LIMBUS_TEAMS_SITIO ?? "https://limbus-teams.eldritchtools.com";
const LIMITE = Number(process.env.LIMBUS_RECETAS_LIMITE ?? 200);
const POR_PAGINA = 24; // el mismo tamaño de página que usa su buscador
const soloProbar = process.argv.includes("--probar");

const AGENTE = "limbus-docket/1.0 (proyecto personal; github.com/GiulianoB15/LC-Team-Builder)";

const leer = (f) => JSON.parse(readFileSync(path.join(RAIZ, "src/data", f), "utf8"));
const idsConocidos = new Set(leer("identities.json").identities.map((i) => i.id));
const egosConocidos = new Set(leer("egos.json").egos.map((e) => e.id));

/*
  La URL y la clave publicable de Supabase no están en su repo: son variables
  NEXT_PUBLIC_*, o sea que viven en el bundle que el navegador descarga. Se
  sacan de ahí, que es exactamente de donde las saca su propia web.

  Se pueden pasar por entorno para saltear el descubrimiento si algún día
  cambian de forma.
*/
async function descubrirCredenciales() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_KEY, via: "entorno" };
  }

  const res = await fetch(SITIO, { headers: { "user-agent": AGENTE } });
  if (!res.ok) throw new Error(`El sitio respondió ${res.status}`);
  const html = await res.text();

  const iniciales = [...html.matchAll(/src="([^"]*\/_next\/static\/[^"]+\.js)"/g)].map((m) =>
    m[1].startsWith("http") ? m[1] : SITIO + m[1]
  );
  if (!iniciales.length) throw new Error("No se encontró ningún bundle en el HTML");

  const absoluta = (ruta) => (ruta.startsWith("http") ? ruta : `${SITIO}/_next/${ruta.replace(/^\/?_next\//, "")}`);
  const vistos = new Set();
  const pendientes = [...iniciales];

  let url = null;
  let key = null;

  /*
    La primera vuelta miró solo los scripts que cuelgan del HTML y no alcanzó:
    esos USAN getSupabase(), pero la definición —que es donde quedan inlineadas
    la URL y la clave— vive en otro chunk que se carga después.

    Los nombres de esos chunks igual están, como literales, adentro de los que
    sí bajamos (es el mapa que arma webpack). Así que se sigue ese rastro, una
    vuelta más, con tope: no es una araña, son unas decenas de archivos.
  */
  const TOPE = 80;
  while (pendientes.length && vistos.size < TOPE) {
    const src = pendientes.shift();
    if (vistos.has(src)) continue;
    vistos.add(src);

    let js;
    try {
      js = await (await fetch(src, { headers: { "user-agent": AGENTE } })).text();
    } catch {
      continue;
    }

    url ??= js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0] ?? null;
    /* Las publicables son `sb_publishable_…` en el formato nuevo y un JWT en el viejo. */
    key ??= js.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0] ?? js.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0] ?? null;
    if (url && key) return { url, key, via: src.replace(SITIO, ""), revisados: vistos.size };

    if (vistos.size < TOPE) {
      [...js.matchAll(/["'`]((?:\/_next\/)?static\/chunks\/[^"'`]+?\.js)["'`]/g)].forEach((m) => {
        const abs = absoluta(m[1]);
        if (!vistos.has(abs)) pendientes.push(abs);
      });
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No se pudo extraer la conexión de ${vistos.size} chunks (url: ${!!url}, key: ${!!key})`);
}

async function pedirPagina({ url, key }, offset) {
  const res = await fetch(`${url}/rest/v1/rpc/search_builds_v9`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": AGENTE,
      apikey: key,
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      p_published: true,
      p_sort_by: "score", // el mismo default que su buscador
      p_strict_filter: false,
      p_limit: POR_PAGINA,
      p_offset: offset,
    }),
  });

  if (!res.ok) throw new Error(`RPC ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/*
  De todo lo que devuelve el RPC nos quedamos con esto. Los ids vienen con
  huecos —una build puede tener slots vacíos— y se filtran contra el dataset:
  un id que no conocemos no se inventa, se descarta y se cuenta.
*/
const limpiarIds = (lista, conocidos, desconocidos) =>
  (lista ?? [])
    .filter((x) => x != null)
    .map(Number)
    .filter((x) => {
      if (conocidos.has(x)) return true;
      desconocidos.add(x);
      return false;
    });

/*
  --probar: diagnóstico, no descarga. La primera corrida real falló con
  "no se pudo extraer la conexión de 13 bundles", que no dice nada útil: no se
  sabe si el problema es el host, el regex de la URL, el de la clave, o que la
  conexión ni siquiera está en esos archivos.

  Esto lo contesta en una corrida: dónde aparece la palabra "supabase", en qué
  archivo, y con qué pinta.
*/
async function diagnosticar() {
  /*
    Primero la vía real, que es lo único que importa saber. El barrido de abajo
    queda por si vuelve a fallar.
  */
  try {
    const c = await descubrirCredenciales();
    console.log(`✔ Conexión encontrada en ${c.via} tras revisar ${c.revisados ?? "?"} chunks`);
    console.log(`  host: ${c.url}`);
    console.log(`  clave: ${c.key.slice(0, 12)}… (${c.key.length} caracteres)`);
    const muestra = await pedirPagina(c, 0);
    console.log(`\n✔ El RPC respondió con ${muestra.length} builds.`);
    console.log("  claves de la primera:", Object.keys(muestra[0] ?? {}).sort().join(", "));
    console.log("\nNo se escribió nada (--probar).");
    return;
  } catch (e) {
    console.log("✗ No se pudo:", e.message);
    console.log("  Barrido de dónde aparece la palabra, para ver qué cambió:\n");
  }

  const hosts = [SITIO, "https://limbus.eldritchtools.com"];

  for (const host of hosts) {
    console.log(`\n=== ${host} ===`);
    let res;
    try {
      res = await fetch(host, { headers: { "user-agent": AGENTE } });
    } catch (e) {
      console.log("  no se pudo conectar:", e.message);
      continue;
    }
    console.log(`  HTTP ${res.status}   URL final: ${res.url}`);
    const html = await res.text();
    console.log(`  el HTML menciona "supabase": ${/supabase/i.test(html)}`);

    const scripts = [...html.matchAll(/src="([^"]*\/_next\/static\/[^"]+\.js)"/g)].map((m) =>
      m[1].startsWith("http") ? m[1] : host + m[1]
    );
    console.log(`  bundles en el HTML: ${scripts.length}`);

    let encontrados = 0;
    for (const src of scripts) {
      let js;
      try {
        js = await (await fetch(src, { headers: { "user-agent": AGENTE } })).text();
      } catch {
        continue;
      }
      const i = js.search(/supabase/i);
      if (i === -1) continue;
      encontrados += 1;
      /* Una ventana alrededor, recortada, para ver con qué forma está escrito. */
      console.log(`  → ${src.replace(host, "")}`);
      console.log(`     …${js.slice(Math.max(0, i - 90), i + 130).replace(/\s+/g, " ")}…`);
      if (encontrados >= 3) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!encontrados) console.log("  ningún bundle del HTML menciona supabase");
  }
  console.log("\nNo se escribió nada (--probar).");
}

if (soloProbar) {
  await diagnosticar();
  process.exit(0);
}

const credenciales = await descubrirCredenciales();
console.log(`Conexión descubierta en ${credenciales.via}`);

const recetas = [];
const desconocidas = { identities: new Set(), egos: new Set() };
let paginas = 0;

for (let offset = 0; offset < LIMITE; offset += POR_PAGINA) {
  const pagina = await pedirPagina(credenciales, offset);
  paginas += 1;
  if (!pagina.length) break;

  pagina.forEach((b) => {
    const identities = limpiarIds(b.identity_ids, idsConocidos, desconocidas.identities);
    const egos = limpiarIds(b.ego_ids, egosConocidos, desconocidas.egos);
    /* Sin Identities no hay nada que cruzar contra una colección. */
    if (!identities.length) return;

    const id = b.build_id ?? b.id;
    recetas.push({
      id,
      titulo: b.title ?? null,
      autor: b.username ?? null,
      url: `${SITIO}/builds/${id}`,
      identities,
      egos,
      /* El orden viene por índice de slot; se guarda tal cual lo dio la fuente. */
      orden: b.deployment_order ?? null,
      tags: b.tags ?? [],
      likes: b.like_count ?? 0,
      fecha: (b.published_at ?? b.created_at ?? "").slice(0, 10) || null,
    });
  });

  if (pagina.length < POR_PAGINA) break;
  await new Promise((r) => setTimeout(r, 400));
}

const meta = {
  generado: new Date().toISOString().slice(0, 10),
  fuente: SITIO,
  /* Para que quede escrito en el archivo por qué falta el texto de cada build. */
  guardamos: "solo ids, título, autor, link, orden, tags y fecha. El texto de cada build queda en el original.",
  respetaBlockDiscovery: true,
  paginas,
  conteo: {
    recetas: recetas.length,
    conEgos: recetas.filter((r) => r.egos.length).length,
    conOrden: recetas.filter((r) => r.orden).length,
    equiposCompletos: recetas.filter((r) => r.identities.length >= 6).length,
  },
  /* Ids que la fuente conoce y nosotros no: contenido más nuevo que el dataset. */
  idsDesconocidos: {
    identities: [...desconocidas.identities].sort((a, b) => a - b),
    egos: [...desconocidas.egos].sort((a, b) => a - b),
  },
};

writeFileSync(
  path.join(RAIZ, "src/data/recetas.json"),
  JSON.stringify({ _comentario: "Generado por scripts/fetch-recetas.mjs. No editar a mano.", meta, recetas }, null, 1) + "\n"
);

console.log("\n--- Recetas ---");
console.log(JSON.stringify(meta, null, 2));
