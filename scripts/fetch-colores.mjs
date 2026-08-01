/*
  Baja el color firma de cada Sinner y escribe src/data/colores.json.

    node scripts/fetch-colores.mjs

  QUÉ ES ESTE DATO

  El juego le asigna a cada uno de los 12 Sinners un color con nombre propio
  —Yi Sang es "Dreamy Gray", Gregor "Verminous Brown"— y lo muestra en su ficha
  de personaje. Sirve para darle identidad visual a cada bloque de la colección:
  con 12 acordeones idénticos hay que leer el nombre para saber dónde estás.

  DE DÓNDE SALE

  De limbuscompany.wiki.gg, que lo publica en la infobox de cada Sinner. Se
  probaron tres wikis antes de elegir: Fandom devuelve 403 a todo pedido
  automatizado y Cogitopedia no publica el campo.

  El dato no está en el dump que usa el resto del dataset —no hay ningún campo
  de color ahí— y la regla del proyecto es no completar de memoria, así que o
  sale de acá o no entra.

  CÓMO SE EXTRAE

  La infobox marca el campo con `data-source="color"`, y adentro el valor viene
  como texto plano:

      <div ... data-source="color">
        <h3 class="pi-data-label ...">Color</h3>
        <div class="pi-data-value pi-font"><span style="...">
          &#160;#8b9c15&#160; (Immature Green)
        </span></div>
      </div>

  Se ancla en `data-source="color"` y no en "un hex cerca de la palabra color",
  que fue el primer intento y falló: las páginas tienen veinte hexes de la
  plantilla de la wiki, y el heurístico sacó 11 de 12 con ruido en dos.

  IMPORTANTE: esto se corre a mano desde el workflow, no en cada build. Son 12
  pedidos a un servidor ajeno y el dato cambia únicamente si Project Moon saca
  un Sinner nuevo, cosa que no pasó nunca.
*/

import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Los 12 salen de constants.js para que no haya dos listas que mantener. */
const SINNERS = JSON.parse(
  readFileSync(path.join(RAIZ, "src/data/identities.json"), "utf8")
).identities.reduce((acc, i) => (acc.includes(i.sinner) ? acc : [...acc, i.sinner]), []);

const url = (s) => `https://limbuscompany.wiki.gg/wiki/${encodeURIComponent(s.replace(/ /g, "_"))}`;

/*
  El bloque de la infobox, y adentro el par hex + nombre. El `[\s\S]{0,800}?`
  es perezoso a propósito: se queda con el primer par después del ancla, que es
  el del campo, y no sigue barriendo el resto de la página.
*/
const CAMPO = /data-source="color"[\s\S]{0,800}?#([0-9a-fA-F]{6})(?:&#160;|&nbsp;|\s)*\(([^)<]+)\)/;

async function colorDe(sinner) {
  const res = await fetch(url(sinner), {
    headers: { "user-agent": "limbus-docket/1.0 (proyecto personal; https://github.com/GiulianoB15/LC-Team-Builder)" },
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };

  const m = CAMPO.exec(await res.text());
  if (!m) return { error: "no se encontró el campo de color en la infobox" };

  return { hex: `#${m[1].toLowerCase()}`, nombre: m[2].trim() };
}

const colores = {};
const fallidos = [];

for (const sinner of SINNERS) {
  const r = await colorDe(sinner);
  if (r.error) {
    fallidos.push(`${sinner}: ${r.error}`);
    console.log(`  ${sinner.padEnd(12)} ✗ ${r.error}`);
  } else {
    colores[sinner] = r;
    console.log(`  ${sinner.padEnd(12)} ${r.hex}  ${r.nombre}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

/*
  Doce o nada. Un archivo con diez Sinners dejaría a dos con el color por
  defecto sin que se note, y eso es peor que no tener la función: alguien
  miraría la app y creería que esos dos no tienen color propio.
*/
if (fallidos.length) {
  console.error(`\nFaltan ${fallidos.length} de ${SINNERS.length}:`);
  fallidos.forEach((f) => console.error(`   ${f}`));
  console.error("\nNo se escribe nada. Si la wiki cambió el marcado, hay que ajustar CAMPO.");
  process.exit(1);
}

writeFileSync(
  path.join(RAIZ, "src/data/colores.json"),
  JSON.stringify(
    {
      _comentario: "Generado por scripts/fetch-colores.mjs. No editar a mano.",
      fuente: "https://limbuscompany.wiki.gg",
      generadoEn: new Date().toISOString().slice(0, 10),
      colores,
    },
    null,
    1
  ) + "\n"
);

console.log(`\nEscrito src/data/colores.json con los ${SINNERS.length} Sinners.`);
