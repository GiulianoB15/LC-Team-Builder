/*
  Extrae las pasivas de SOPORTE del HTML que devuelve la API de la wiki para
  la página Identity_Support_Passives, y las mezcla en src/data/capturas.json.

    node scripts/parse-pasivas-wiki.mjs <apiresult.json>

  El JSON se consigue con:
    limbuscompany.wiki.gg/api.php?action=parse&page=Identity_Support_Passives&format=json&prop=text

  Ojo: el wikitexto crudo (?action=raw) NO sirve. La página usa directivas #dpl
  que arman la tabla al renderizar tirando de la página de cada Identity, así
  que hay que pedirla ya expandida.

  Solo cubre pasivas de soporte. Las de combate no están en esta página.
*/

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entrada = process.argv[2];

if (!entrada) {
  console.error("Uso: node scripts/parse-pasivas-wiki.mjs <apiresult.json>");
  process.exit(1);
}

const { identities } = JSON.parse(readFileSync(path.join(RAIZ, "src/data/identities.json"), "utf8"));

/*
  Los títulos vienen con entidades HTML (&#39; por el apóstrofo, &amp; por &).
  Hay que decodificarlas ANTES de normalizar: si no, "Jeong&#39;s" se convierte
  en "jeong 39 s" y no matchea nunca.
*/
const decodificar = (s) =>
  String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#160;|&nbsp;/g, " ");

/* Los nombres de la wiki traen tildes y macrones distintos; se comparan planos. */
const normalizar = (s) =>
  decodificar(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*::\s*/g, "::")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

// La wiki titula "<nombre> <sinner>"; nuestro dataset los tiene separados.
const porNombreCompleto = new Map(
  identities.map((i) => [normalizar(`${i.nombre} ${i.sinner}`), i])
);

const limpiar = (html) => decodificar(String(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/*
  La wiki mete la definición de cada estado como tooltip DENTRO del texto, en
  <span class="tooltip-contents">. Si se quitan las etiquetas sin más, esa
  definición queda incrustada en la descripción y el resultado es ilegible:
  "...inflicted the most Bleed Bleed The next Y time(s) this unit tosses..."

  No alcanza con un regex: los spans están anidados. Se recorre contando
  apertura y cierre para borrar el bloque completo.
*/
function quitarTooltips(html) {
  const marca = '<span class="tooltip-contents';
  let salida = html;
  let inicio;

  while ((inicio = salida.indexOf(marca)) !== -1) {
    let i = salida.indexOf(">", inicio) + 1;
    let nivel = 1;
    while (i < salida.length && nivel > 0) {
      const abre = salida.indexOf("<span", i);
      const cierra = salida.indexOf("</span", i);
      if (cierra === -1) break;
      if (abre !== -1 && abre < cierra) {
        nivel += 1;
        i = abre + 5;
      } else {
        nivel -= 1;
        i = cierra + 6;
      }
    }
    const fin = salida.indexOf(">", i);
    salida = salida.slice(0, inicio) + " " + salida.slice(fin === -1 ? salida.length : fin + 1);
  }
  return salida;
}

/* Celdas de una fila. Los <td> no se anidan, así que el no-greedy alcanza. */
const celdas = (fila) => [...fila.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);

const json = JSON.parse(readFileSync(entrada, "utf8"));
const html = json.parse?.text?.["*"] ?? json.parse?.text ?? "";
if (typeof html !== "string" || !html) {
  console.error("El archivo no tiene parse.text: ¿pediste action=parse&prop=text?");
  process.exit(1);
}

const filas = html.split(/<tr[^>]*>/).slice(1);

const resultados = [];
const sinMatch = [];

for (const fila of filas) {
  // Nombre de la Identity: el título del enlace a su página.
  const mTitulo = /<a href="\/wiki\/[^"]+" title="([^"]+)"/.exec(fila);
  if (!mTitulo) continue;

  const id = porNombreCompleto.get(normalizar(mTitulo[1]));
  if (!id) {
    sinMatch.push(mTitulo[1]);
    continue;
  }

  // Nombre de la pasiva: va en el div interno del encabezado estilizado.
  const mNombre = /<div style="margin-right:20px">([^<]+)<\/div>/.exec(fila);
  if (!mNombre) continue;

  // Costo: un ícono por Sin (LcbSinGloom.png) y el monto con su tipo.
  const sins = [...fila.matchAll(/alt="LcbSin([A-Za-z]+)\.png"/g)].map((m) => m[1]);
  const montos = [...fila.matchAll(/>(\d+)\s+(Owned|Res)\b/g)].map((m) => ({
    cantidad: Number(m[1]),
    tipo: m[2] === "Res" ? "resonance" : "owned",
  }));

  const costo = sins.map((sin, n) => ({ sin, cantidad: montos[n]?.cantidad ?? montos[0]?.cantidad ?? null }));
  const tipoCosto = montos[0]?.tipo ?? null;

  /*
    La descripción sale de la SEGUNDA celda, no de "lo que sigue al último
    <br/>" de la fila: ese atajo se comía el encabezado de la sección siguiente
    ("...Faust [ edit ]") y a veces se quedaba solo con un sub-punto.

    Dentro de la celda el orden es: encabezado con el nombre, luego el costo,
    luego <br/> y recién ahí el texto. Así que se corta en el primer <br/> y se
    conserva todo lo que sigue, incluidos los saltos internos.
  */
  const celdaPasiva = quitarTooltips(celdas(fila)[1] ?? "");
  const trasCosto = celdaPasiva.split(/<br\s*\/?>/s).slice(1).join(" ");
  const descripcion = limpiar(trasCosto);

  resultados.push({
    id: id.id,
    ref: decodificar(mTitulo[1]),
    yaTenia: id.tienePasivas,
    pasiva: { nombre: limpiar(mNombre[1]), descripcion, costo, tipoCosto },
  });
}

/* --- Reporte --- */

const nuevos = resultados.filter((r) => !r.yaTenia);
const faltantes = identities.filter((i) => !i.tienePasivas);
const cubiertos = new Set(nuevos.map((r) => r.id));

console.log(`Filas parseadas: ${resultados.length}`);
console.log(`De las ${faltantes.length} Identities sin pasivas, se cubren: ${nuevos.length}`);
if (sinMatch.length) {
  console.log(`Nombres de la wiki que no matchean con el dataset (${sinMatch.length}):`);
  [...new Set(sinMatch)].slice(0, 10).forEach((n) => console.log("   -", n));
}

const sinCubrir = faltantes.filter((i) => !cubiertos.has(i.id));
if (sinCubrir.length) {
  console.log(`Siguen sin pasiva de soporte (${sinCubrir.length}):`);
  sinCubrir.forEach((i) => console.log(`   - ${i.sinner}: ${i.nombre}`));
}

const dudosos = resultados.filter((r) => r.pasiva.costo.some((c) => c.cantidad == null) || !r.pasiva.descripcion);
if (dudosos.length) {
  console.log(`⚠ Con costo o descripción incompletos (${dudosos.length}):`);
  dudosos.slice(0, 8).forEach((r) => console.log("   -", r.ref, JSON.stringify(r.pasiva.costo)));
}

/* --- Mezcla en capturas.json --- */

if (process.argv.includes("--escribir")) {
  const ruta = path.join(RAIZ, "src/data/capturas.json");
  const capturas = JSON.parse(readFileSync(ruta, "utf8"));
  capturas.identities ??= {};

  let escritos = 0;
  nuevos.forEach((r) => {
    if (r.pasiva.costo.some((c) => c.cantidad == null)) return; // incompleto: no se carga
    capturas.identities[String(r.id)] = {
      _ref: `${r.ref} · wiki Identity_Support_Passives`,
      pasivas: { combate: [], soporte: [r.pasiva] },
    };
    escritos += 1;
  });

  writeFileSync(ruta, JSON.stringify(capturas, null, 2) + "\n");
  console.log(`\nEscritas ${escritos} pasivas de soporte en src/data/capturas.json`);
  console.log("Las pasivas de COMBATE de esas IDs siguen faltando: esta página no las trae.");
}
