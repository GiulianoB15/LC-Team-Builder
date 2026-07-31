/*
  Genera PENDIENTES.md: qué datos faltan y en qué tandas cargarlos.

    node scripts/pendientes.mjs

  Se regenera solo, así que a medida que se completen datos la lista se achica
  sin que haya que editarla a mano.
*/
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = (f) => JSON.parse(readFileSync(path.join(RAIZ, "src/data", f), "utf8"));

const { identities } = leer("identities.json");
const { egos } = leer("egos.json");

const idsFaltantes = identities.filter((i) => !i.tienePasivas).sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));
const egosFaltantes = egos.filter((e) => !e.tienePasivas).sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

const skills = identities.flatMap((i) => i.skills);
const skillsSinNumeros = skills.filter((s) => s.poderBase == null);

/*
  Con las pasivas completas ya no queda nada que capturar a mano. En vez de
  emitir un documento de tandas vacío —que se lee como si algo hubiera fallado—
  se escribe qué quedó y qué no, y listo. Si mañana entra contenido nuevo antes
  de que la fuente lo publique, la lista vuelve sola.
*/
if (idsFaltantes.length === 0 && egosFaltantes.length === 0) {
  writeFileSync(
    path.join(RAIZ, "PENDIENTES.md"),
    `# Datos pendientes

Generado por \`scripts/pendientes.mjs\`. **No editar a mano** — se regenera.

**No falta ninguna pasiva.** Las ${identities.length} Identities tienen las de combate y las de
soporte, y los ${egos.length} E.G.O tienen la suya. Salen de \`src/data/pasivas.json\`, que baja
\`scripts/fetch-datos.mjs\`.

Si entra contenido nuevo antes de que la fuente lo publique, esta lista vuelve a
aparecer sola con lo que falte.

## Lo único que sigue incompleto

**Números de skills** — poder base, monedas y valor de moneda: hay
${skills.length - skillsSinNumeros.length} de ${skills.length}. Los ${skillsSinNumeros.length} que faltan son de las Identities posteriores al
corte de LCTeamBuilder, que es de donde salen hoy.

Probablemente se puedan completar igual que las pasivas: los archivos
\`data/identities/<id>.json\` de la fuente traen una clave \`skills\` que todavía no
se miró. Falta ver qué forma tiene antes de prometer nada.

No afecta al motor: no usa esos números para nada de lo que calcula hoy
(recursos de Sin, pasivas, resistencias, arquetipos). Quedan en \`null\`, nunca en
cero, para que se note que es un dato que falta y no un valor real.
`
  );
  console.log(`PENDIENTES.md — sin pasivas pendientes; faltan números de ${skillsSinNumeros.length} skills`);
  process.exit(0);
}

/*
  Se ordena por fecha de estreno, de más vieja a más nueva: cuanto más tiempo
  lleva una ID en el juego, más probable es tenerla, así que las primeras tandas
  son las que más rinden.
*/
const CORTE_LCTB = "2025-08-06";
const anterioresAlCorte = [...idsFaltantes, ...egosFaltantes].filter((x) => (x.fecha ?? "") < CORTE_LCTB);

const TANDA = 10;
const tandas = [];
const todo = [
  ...idsFaltantes.map((i) => ({ ...i, tipo: "Identity" })),
  ...egosFaltantes.map((e) => ({ ...e, tipo: "E.G.O" })),
].sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""));

for (let i = 0; i < todo.length; i += TANDA) tandas.push(todo.slice(i, i + TANDA));

const fila = (x) =>
  `| ${x.tipo} | ${x.sinner} | ${x.nombre} | ${x.fecha ?? "—"} | \`${x.id}\` | ☐ |`;

const md = `# Datos pendientes

Generado por \`scripts/pendientes.mjs\`. **No editar a mano** — se regenera.

Faltan **${idsFaltantes.length} Identities** y **${egosFaltantes.length} E.G.O**. Casi todas son
posteriores al corte de LCTeamBuilder (2025-08-06), la única fuente que publica pasivas con
su tipo y su costo en recursos de Sin.

${anterioresAlCorte.length ? `Excepción: ${anterioresAlCorte.map((x) => `**${x.nombre}** (${x.sinner}, ${x.fecha})`).join(", ")} — anterior al corte, pero LCTeamBuilder nunca la agregó a su dataset.` : ""}

## Qué hace falta capturar

Para cada una, **solo tres cosas por pasiva**. El motor no usa el texto de la
descripción, así que no hace falta capturarlo:

1. **Nombre** de la pasiva.
2. **Tipo**: de combate o de soporte.
3. **Costo en recursos de Sin** — ej. \`Lujuria 4\`, \`Orgullo 3\`. Si no tiene costo,
   decilo explícitamente; "sin costo" es un dato, no un hueco.

Las Identities suelen tener 2 pasivas de combate y 1 de soporte. Los E.G.O, una sola.

> **Regla**: si algo no se lee bien en la captura, queda en \`null\` y se reporta. Nunca
> se completa de memoria. Todo lo cargado así lleva \`fuente: "captura"\` para poder
> distinguirlo del dato automático y reemplazarlo si aparece una fuente mejor.

## Tandas

${tandas
  .map(
    (t, n) => `### Tanda ${n + 1} — ${t.length} ${t.length === 1 ? "ítem" : "ítems"} (${t[0].fecha} a ${t.at(-1).fecha})

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
${t.map(fila).join("\n")}`
  )
  .join("\n\n")}

## Ya resuelto sin capturas

- **Números de skills** (poder base, monedas, valor de moneda): recuperados de
  LCTeamBuilder para ${identities.flatMap((i) => i.skills).filter((s) => s.poderBase != null).length} de ${identities.flatMap((i) => i.skills).length} skills.
  Las que faltan son de estas mismas Identities nuevas.
- **Arquetipos**: los ${identities.length} vienen del \`skillKeywordList\` oficial del dump.
- **Resistencias, stats, afinidades y copias de skill**: completos en las ${identities.length}.
`;

writeFileSync(path.join(RAIZ, "PENDIENTES.md"), md);
console.log(`PENDIENTES.md — ${idsFaltantes.length} Identities + ${egosFaltantes.length} E.G.O en ${tandas.length} tandas`);
