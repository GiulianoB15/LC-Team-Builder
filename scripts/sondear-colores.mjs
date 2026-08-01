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

/*
  La primera pasada probó tres wikis: Fandom devuelve 403 a todo, Cogitopedia
  no publica el dato, y wiki.gg lo tiene en las 12 páginas. Así que queda una
  sola fuente, y ahora lo que hace falta es ver el marcado exacto para escribir
  un extractor que no adivine.
*/
const FUENTES = [
  ["wiki.gg", (s) => `https://limbuscompany.wiki.gg/wiki/${encodeURIComponent(s.replace(/ /g, "_"))}`],
];

/*
  La primera pasada dijo QUE el dato está; esta dice CÓMO está escrito. Se
  imprime el fragmento crudo alrededor de la palabra "Colour"/"Color" para
  poder escribir el extractor mirando el marcado en vez de adivinándolo.

  Adivinar ya falló una vez: un heurístico de "nombre de color + hex cerca"
  agarró 11 de 12 —a Hong Lu se le escapó porque su color no termina en
  ninguna de las palabras de la lista— y encima trajo ruido en dos.
*/
const CONTEXTO = /(colou?r)/i;

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
    const r = await traer(construir(sinner));
    console.log(`\n--- ${sinner} ---`);

    if (r.error) {
      console.log(`  ✗ ${r.error}`);
      continue;
    }

    /* Todas las apariciones de "colour/color" con lo que las rodea. */
    let i = 0, encontradas = 0;
    while (encontradas < 6) {
      const m = r.html.slice(i).search(CONTEXTO);
      if (m < 0) break;
      const pos = i + m;
      const frag = r.html.slice(Math.max(0, pos - 160), pos + 240).replace(/\s+/g, " ");
      /* Solo interesan los que tienen un hex cerca: el resto es CSS de la wiki. */
      if (/#[0-9a-f]{6}/i.test(frag)) {
        console.log(`  · ${frag}`);
        encontradas += 1;
      }
      i = pos + 6;
    }

    await new Promise((r) => setTimeout(r, 400));
  }
}

console.log("\nListo. Con el marcado a la vista se puede escribir el extractor.");
