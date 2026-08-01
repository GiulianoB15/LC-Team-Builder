/*
  Sonda de un solo uso: ¿existe una fuente publicada del color firma de cada
  Sinner, y con qué cobertura?

  POR QUÉ EXISTE

  El juego le asigna a cada Sinner un color con nombre propio —Sinclair es
  "Immature Green", Gregor "Verminous Brown"— y eso sirve para darle identidad
  visual a cada bloque de la colección. Pero el dataset que usamos no trae
  ningún campo de color, y la regla del proyecto es no completar datos de
  memoria: o sale de una fuente que se pueda mirar, o no entra.

  Desde el entorno de desarrollo todos los hosts que no sean GitHub responden
  403, así que esto corre en Actions, que sí tiene salida a internet. No
  escribe nada: imprime lo que encuentra para poder decidir con el resultado a
  la vista.

  Si aparece una fuente completa para los 12, se convierte en un script de
  descarga de verdad. Si no, se borra y el color se deriva de otra cosa.
*/

const SINNERS = [
  "Yi Sang", "Faust", "Don Quixote", "Ryōshū", "Meursault", "Hong Lu",
  "Heathcliff", "Ishmael", "Rodion", "Sinclair", "Outis", "Gregor",
];

/* wiki.gg y Fandom publican la misma información con plantillas distintas. */
const FUENTES = [
  ["wiki.gg", (s) => `https://limbuscompany.wiki.gg/wiki/${encodeURIComponent(s.replace(/ /g, "_"))}`],
  ["fandom", (s) => `https://limbuscompany.fandom.com/wiki/${encodeURIComponent(s.replace(/ /g, "_"))}`],
  ["cogitopedia", (s) => `https://projectmoon.miraheze.org/wiki/${encodeURIComponent(s.replace(/ /g, "_"))}`],
];

/*
  Lo que se busca es la dupla "nombre de color + hex". Los nombres son
  inventados por el juego ("Decay Blue"), así que no alcanza con buscar un hex
  suelto: en una página de wiki hay decenas, casi todos de la plantilla.
*/
const HEX = /#([0-9a-f]{6})\b/gi;
const CERCA_DE_COLOR = /(colou?r)[^<]{0,80}?#([0-9a-f]{6})/gi;
const NOMBRE_Y_HEX = /([A-Z][a-z]+ (?:Gray|Grey|Pink|Scarlet|Olive|Burgundy|Green|Brown|Blue|Red|Yellow|Purple|Orange|Violet|Gold|Black|White))[^<]{0,60}?#?([0-9a-f]{6})?/g;

const limpiar = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

async function traer(url) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "limbus-docket/1.0 (proyecto personal; sonda de un solo uso)" },
      redirect: "follow",
    });
    if (!res.ok) return { error: res.status };
    return { html: limpiar(await res.text()) };
  } catch (e) {
    return { error: e.message };
  }
}

for (const [nombreFuente, construir] of FUENTES) {
  console.log(`\n${"=".repeat(70)}\n${nombreFuente}\n${"=".repeat(70)}`);

  for (const sinner of SINNERS) {
    const url = construir(sinner);
    const r = await traer(url);

    if (r.error) {
      console.log(`  ${sinner.padEnd(12)} ✗ ${r.error}`);
      continue;
    }

    const cerca = [...r.html.matchAll(CERCA_DE_COLOR)].map((m) => `#${m[2]}`);
    const nombrados = [...r.html.matchAll(NOMBRE_Y_HEX)]
      .map((m) => `${m[1]}${m[2] ? ` #${m[2]}` : ""}`)
      .filter((v, i, a) => a.indexOf(v) === i);
    const totalHex = new Set([...r.html.matchAll(HEX)].map((m) => m[0].toLowerCase())).size;

    console.log(
      `  ${sinner.padEnd(12)} ✔ ${String(r.html.length).padStart(7)} bytes` +
      ` · ${totalHex} hex distintos` +
      (cerca.length ? ` · junto a "color": ${cerca.slice(0, 4).join(" ")}` : "") +
      (nombrados.length ? ` · nombres: ${nombrados.slice(0, 4).join(" | ")}` : "")
    );

    await new Promise((r) => setTimeout(r, 400));
  }
}

console.log("\nListo. Lo que interesa es si aparece un nombre de color propio por Sinner.");
