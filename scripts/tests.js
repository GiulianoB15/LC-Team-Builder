/*
  Chequeos del motor y del dataset. No se corre directo: lo bundlea y ejecuta
  scripts/smoke-test.mjs, porque estos módulos importan JSON como hace Vite.
*/
import { IDENTITIES, EGOS, META, validateIdentities, identityPorNombre } from "../src/data/identities.js";
import { SINS, SINNERS, ARQUETIPOS, esPuntoBlando } from "../src/data/constants.js";
import {
  recursosDeSin, estadoPasivas, perfilResistencias, perfilArquetipos,
  sugerirOrden, puntuarCandidata, pasivasActivasDelEquipo, estadoEgo, egosDelEquipo,
} from "../src/lib/engine.js";
import { toggleSeleccion } from "../src/lib/seleccion.js";
import { migrar } from "../src/lib/storage.js";
import { codificar, decodificar, comparar, LARGO_CODIGO } from "../src/lib/codigo.js";

export let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  console.log(`${ok ? "ok  " : "FALLA"} ${nombre}${ok || !detalle ? "" : ` — ${detalle}`}`);
  if (!ok) fallos++;
};

const porId = (id) => IDENTITIES.find((i) => i.id === id);

/* --- Dataset --- */

const problemas = validateIdentities();
check("el dataset no tiene problemas de integridad", problemas.length === 0, problemas.slice(0, 3).join("; "));
check("hay 184 Identities y 110 E.G.O", IDENTITIES.length === 184 && EGOS.length === 110, `${IDENTITIES.length}/${EGOS.length}`);
check("todas tienen Sinner de la lista de 12", IDENTITIES.every((i) => SINNERS.includes(i.sinner)));
check("todas tienen al menos una skill", IDENTITIES.every((i) => i.skills.length > 0));
check("los ids son únicos", new Set(IDENTITIES.map((i) => i.id)).size === IDENTITIES.length);
check("el meta declara las dos fuentes y su rol", META.fuentes.length === 2 && META.fuentes.every((f) => !!f.rol));
check("el meta declara la fecha de la Identity más nueva", META.ultimaIdentity === "2026-07-23");

/* Las copias de skill son 3+2+1 en todas las IDs: sirve de checksum del dump. */
check("las copias de skill suman 6 en todas",
  IDENTITIES.every((i) => i.skills.reduce((a, s) => a + s.copias, 0) === 6));

/* Cobertura de pasivas: solo las anteriores al corte de LCTeamBuilder las tienen. */
const conPasivas = IDENTITIES.filter((i) => i.tienePasivas);
check("147 con pasivas y 37 sin", conPasivas.length === 147 && IDENTITIES.length - conPasivas.length === 37);
check("las que declaran tener pasivas, las tienen de verdad",
  conPasivas.every((i) => i.pasivas.soporte.length > 0));
check("las que no, quedan con listas vacías y no rompen",
  IDENTITIES.filter((i) => !i.tienePasivas).every((i) => i.pasivas.combate.length === 0 && i.pasivas.soporte.length === 0));

const ring = porId(10109);
check("Ring Yi Sang: resistencias del dump nuevo", ring.resistencias.slash === 1 && ring.resistencias.pierce === 0.5 && ring.resistencias.blunt === 2);
check("Ring Yi Sang: afinidades ponderadas por copias", ring.afinidades.Gloom === 3 && ring.afinidades.Lust === 2 && ring.afinidades.Sloth === 1, JSON.stringify(ring.afinidades));
check("Ring Yi Sang: la dominante sale de las copias, no del conteo de skills", ring.afinidadDominante === "Gloom");
check("Ring Yi Sang: pasivas injertadas desde LCTeamBuilder", ring.pasivas.combate.length === 2 && ring.pasivas.soporte.length === 1);
check("Ring Yi Sang: la pasiva de soporte conserva su costo de Sin", ring.pasivas.soporte[0].costo[0]?.sin === "Lust" && ring.pasivas.soporte[0].costo[0]?.cantidad === 4);
check("Ring Yi Sang: arquetipo oficial Bleed", ring.arquetipos.join(",") === "Bleed");

/* Las 3 IDs semilla del prototipo que faltaban por desfasaje ahora están. */
check("está Heishou Pack - Wu Branch Adept (2025-08-28)", !!identityPorNombre("Heishou Pack - Wu Branch Adept", "Yi Sang"));
check("está Shi Assoc. East Section 3 (2025-10-09)", !!identityPorNombre("Shi Assoc. East Section 3", "Faust"));
check("está Dimension Shredder, pese a los espacios en el nombre", !!identityPorNombre("LCE E.G.O::Dimension Shredder", "Yi Sang"));

const nueva = porId(10116);
check("una ID posterior al corte queda marcada sin pasivas", nueva && !nueva.tienePasivas && nueva.fecha === "2026-07-23");

check("los arquetipos son solo los 7 oficiales",
  IDENTITIES.every((i) => i.arquetipos.every((a) => ARQUETIPOS.includes(a))),
  [...new Set(IDENTITIES.flatMap((i) => i.arquetipos).filter((a) => !ARQUETIPOS.includes(a)))].join(","));

check("los E.G.O traen costo de Sin", EGOS.filter((e) => e.costo.length > 0).length >= 100);
check("los E.G.O traen resistencias por Sin", EGOS.every((e) => e.resistenciasSin.length === 7 || e.resistenciasSin.length === 0));
check("los 96 E.G.O de LCTeamBuilder tienen su pasiva", EGOS.filter((e) => e.tienePasiva).length === 96);

/*
  Arquetipos de E.G.O: el dump solo trae estados con nombres internos
  ("Laceration", "Burst"), no los arquetipos que ve el jugador. El mapeo se
  deriva de las Identities, donde conviven ambos campos.
*/
check("el meta publica el mapeo de estados para poder auditarlo",
  META.mapeoEstados && Object.keys(META.mapeoEstados).length >= 8);
check("el mapeo traduce los nombres internos que no son obvios",
  META.mapeoEstados.Laceration?.arquetipo === "Bleed" &&
  META.mapeoEstados.Burst?.arquetipo === "Rupture" &&
  META.mapeoEstados.Breath?.arquetipo === "Poise" &&
  META.mapeoEstados.Vibration?.arquetipo === "Tremor");
check("todo par del mapeo llega al umbral de precisión",
  Object.values(META.mapeoEstados).every((v) => v.precision >= 0.85 && v.soporte >= 8));
check("93 de 110 E.G.O quedan con arquetipo", EGOS.filter((e) => e.arquetipos.length).length === 93);
check("los arquetipos de E.G.O son de los 7 oficiales",
  EGOS.every((e) => e.arquetipos.every((a) => ARQUETIPOS.includes(a))));

/*
  Los E.G.O sin arquetipo no son un agujero del mapeo: infligen buffs y debuffs
  genéricos, no estados de arquetipo. Si alguno tuviera un estado ya mapeado y
  aun así quedara vacío, eso sí sería un bug.
*/
check("ningún E.G.O sin arquetipo tiene un estado que el mapeo conoce",
  EGOS.filter((e) => !e.arquetipos.length).every((e) => e.estados.every((s) => !META.mapeoEstados[s])));

/* --- Migración del guardado --- */

const migrado = migrar(1, { "yisang-ring": true, "faust-lcb": true, "clave-inventada": true });
check("migra claves v1 al id numérico del juego",
  migrado.identities[10109] === true && migrado.identities[10201] === true, JSON.stringify(migrado));
check("descarta claves desconocidas sin romper",
  !("clave-inventada" in migrado.identities) && Object.keys(migrado.identities).length === 2);
check("toda migración devuelve la forma v3, con E.G.O vacíos",
  !!migrado.egos && Object.keys(migrado.egos).length === 0);
check("migrar v2 conserva las identities", migrar(2, { 10109: true }).identities[10109] === true);

/* --- Selección --- */

const dosDistintos = [10109, 10201]; // Yi Sang + Faust
const swap = toggleSeleccion(dosDistintos, 10101, "Yi Sang", 2, IDENTITIES);
check("con el cupo lleno, otra ID del mismo Sinner reemplaza",
  swap.includes(10101) && !swap.includes(10109) && swap.length === 2, JSON.stringify(swap));
const bloqueado = toggleSeleccion([10109], 10201, "Faust", 1, IDENTITIES);
check("con el cupo lleno, una ID de otro Sinner queda bloqueada",
  bloqueado.length === 1 && !bloqueado.includes(10201));

/* --- Recursos de Sin y pasivas --- */

const equipoRing = [ring];
const recursos = recursosDeSin(equipoRing);
check("los recursos de Sin ponderan por copias de skill", recursos.Gloom === 3 && recursos.Lust === 2, JSON.stringify(recursos));
check("suma los recursos de todo el equipo",
  recursosDeSin([ring, porId(10101)]).Lust >= recursos.Lust);

const estado = estadoPasivas(ring, { ...recursos, Lust: 4 });
check("una pasiva con costo cubierto queda activa", estado.soporte[0].activa);
const estadoPobre = estadoPasivas(ring, { ...recursos, Lust: 1 });
check("una pasiva con costo NO cubierto queda inactiva y reporta el faltante",
  !estadoPobre.soporte[0].activa && estadoPobre.soporte[0].faltantes[0].sin === "Lust");
check("las pasivas sin costo se consideran activas", estado.combate[0].activa);

const resumen = pasivasActivasDelEquipo([ring]);
check("el resumen de pasivas cuenta totales y activas", resumen.totales === 3 && resumen.activas <= 3);

/* --- Resistencias (multiplicadores: más bajo es mejor) --- */

check("esPuntoBlando marca los multiplicadores > 1", esPuntoBlando(2) && !esPuntoBlando(1) && !esPuntoBlando(0.5));
const perfil = perfilResistencias([ring]);
check("el peor caso es el multiplicador MÁS ALTO", perfil.blunt.peor === 2, JSON.stringify(perfil.blunt));
check("cuenta cuántos miembros son punto blando", perfil.blunt.blandos === 1 && perfil.pierce.blandos === 0);

/* El motivo imposible del prototipo: agregar un miembro no puede subir un mínimo. */
const equipoFlojoBlunt = IDENTITIES.filter((i) => i.resistencias.blunt === 2).slice(0, 2);
const candidataFuerte = IDENTITIES.find((i) => i.resistencias.blunt < 2 && !equipoFlojoBlunt.includes(i));
const { motivos } = puntuarCandidata(candidataFuerte, equipoFlojoBlunt);
// Ojo: "cubre" aparece legítimamente hablando del costo de las pasivas.
// Lo que no puede aparecer es que cubra una DEBILIDAD ya presente en el equipo.
check("ningún motivo afirma que se cubre una debilidad ya presente",
  !motivos.some((m) => /cubre (la )?debilidad/i.test(m)), motivos.join(" | "));
check("sí reporta que la candidata no agrega otra debilidad",
  motivos.some((m) => m.includes("no agrega otro")), motivos.join(" | "));

/* --- Orden --- */

const equipo8 = IDENTITIES.slice(0, 8);
const orden = sugerirOrden(equipo8);
check("el orden no pierde ni duplica miembros",
  orden.length === 8 && new Set(orden.map((o) => o.id.id)).size === 8);
check("marca como banca a partir del 7º", orden.filter((o) => o.banca).length === 2);
check("todo miembro del orden trae su motivo", orden.every((o) => typeof o.motivo === "string" && o.motivo.length > 0));
check("el orden está ordenado por aporte descendente",
  orden.every((o, i) => i === 0 || orden[i - 1].aporte >= o.aporte));

/* --- Arquetipos --- */

const perfilArq = perfilArquetipos([ring]);
check("el perfil de arquetipos cuenta Bleed", perfilArq.Bleed === 1 && perfilArq.Burn === 0);




/* --- E.G.O y recursos de Sin --- */

const egoCaro = EGOS.find((e) => e.costo.reduce((a, c) => a + c.cantidad, 0) >= 10);
const sinNada = Object.fromEntries(SINS.map((s) => [s, 0]));
const conTodo = Object.fromEntries(SINS.map((s) => [s, 99]));

check("un E.G.O no alcanza sin recursos", !estadoEgo(egoCaro, sinNada).alcanza);
check("y reporta qué Sin le falta y cuánto hay",
  estadoEgo(egoCaro, sinNada).faltantes.every((f) => f.disponible === 0 && f.cantidad > 0));
check("con recursos de sobra, alcanza", estadoEgo(egoCaro, conTodo).alcanza);

const egosDeYiSang = EGOS.filter((e) => e.sinner === "Yi Sang");
const soloYiSang = egosDelEquipo(egosDeYiSang, new Set(["Yi Sang"]), conTodo);
check("solo se listan E.G.O de Sinners desplegados",
  soloYiSang.length === egosDeYiSang.length &&
  egosDelEquipo(egosDeYiSang, new Set(["Faust"]), conTodo).length === 0);
check("los que alcanzan van primero",
  (() => {
    const mixto = egosDelEquipo(egosDeYiSang, new Set(["Yi Sang"]), { ...sinNada, Sloth: 99 });
    const idx = mixto.findIndex((x) => !x.alcanza);
    return idx === -1 || mixto.slice(idx).every((x) => !x.alcanza);
  })());



/* --- Código para compartir la colección --- */

const coleccionEjemplo = {
  identities: Object.fromEntries(IDENTITIES.slice(0, 40).map((i) => [i.id, true])),
  egos: Object.fromEntries(EGOS.slice(0, 15).map((e) => [e.id, true])),
};

const { codigo, fueraDeRango } = codificar(coleccionEjemplo);
check("ningún id del dataset queda fuera del esquema del código", fueraDeRango.length === 0, JSON.stringify(fueraDeRango));
check(`el código es corto y de largo fijo (${codigo.length} chars)`, codigo.length === LARGO_CODIGO && codigo.length < 120);
check("el código es seguro para una URL", /^[A-Za-z0-9_-]+$/.test(codigo));

const vuelta = decodificar(codigo);
check("decodificar devuelve exactamente lo que se codificó",
  vuelta.ok &&
  JSON.stringify(Object.keys(vuelta.identities).map(Number).sort((a, b) => a - b)) ===
    JSON.stringify(Object.keys(coleccionEjemplo.identities).map(Number).sort((a, b) => a - b)) &&
  JSON.stringify(Object.keys(vuelta.egos).map(Number).sort((a, b) => a - b)) ===
    JSON.stringify(Object.keys(coleccionEjemplo.egos).map(Number).sort((a, b) => a - b)));

const todo = codificar({
  identities: Object.fromEntries(IDENTITIES.map((i) => [i.id, true])),
  egos: Object.fromEntries(EGOS.map((e) => [e.id, true])),
});
check("una colección COMPLETA entra en el mismo largo", todo.codigo.length === LARGO_CODIGO);
check("y decodifica las 184 + 110", (() => {
  const d = decodificar(todo.codigo);
  return d.ok && Object.keys(d.identities).length === 184 && Object.keys(d.egos).length === 110;
})());

check("una colección vacía va y vuelve",
  (() => {
    const d = decodificar(codificar({ identities: {}, egos: {} }).codigo);
    return d.ok && Object.keys(d.identities).length === 0 && Object.keys(d.egos).length === 0;
  })());

/*
  La propiedad que justifica el diseño: el código no depende de la posición en
  el array, así que agregar Identities nuevas no invalida los códigos viejos.
*/
check("un código sobrevive a que el dataset sume Identities nuevas", (() => {
  const antes = codificar({ identities: { 10109: true, 11216: true }, egos: {} }).codigo;
  const d = decodificar(antes);
  return d.ok && d.identities[10109] && d.identities[11216] && Object.keys(d.identities).length === 2;
})());

check("un id de una versión más nueva se decodifica igual y se puede detectar",
  (() => {
    const d = decodificar(codificar({ identities: { 10117: true }, egos: {} }).codigo);
    const conocidos = new Set(IDENTITIES.map((i) => i.id));
    return d.ok && d.identities[10117] === true && !conocidos.has(10117);
  })());

/* Errores: nunca tiran, siempre explican. */
check("un código vacío da error claro", !decodificar("").ok && /Pegá un código/.test(decodificar("").error));
check("un código truncado da error claro", !decodificar(codigo.slice(0, 20)).ok);
check("un código con un carácter cambiado lo detecta el checksum", (() => {
  const roto = codigo.slice(0, -2) + (codigo.at(-2) === "A" ? "B" : "A") + codigo.at(-1);
  const d = decodificar(roto);
  return !d.ok && typeof d.error === "string" && d.error.length > 0;
})());
check("decodificar basura no tira excepción", (() => {
  try { return !decodificar("no soy un codigo!!!").ok; } catch { return false; }
})());

const comp = comparar(vuelta, { identities: { 10101: true }, egos: {} }, {
  idsConocidos: new Set(IDENTITIES.map((i) => i.id)),
  egosConocidos: new Set(EGOS.map((e) => e.id)),
});
check("comparar informa cuántas trae y cuántas tenés vos",
  comp.identities === 40 && comp.egos === 15 && comp.propiasIdentities === 1);
check("comparar detecta marcadas que tu dataset no conoce",
  comparar(decodificar(codificar({ identities: { 10117: true }, egos: {} }).codigo),
    { identities: {}, egos: {} },
    { idsConocidos: new Set(IDENTITIES.map((i) => i.id)), egosConocidos: new Set(EGOS.map((e) => e.id)) }
  ).desconocidas === 1);

console.log(fallos === 0 ? "\nTodo verde." : `\n${fallos} chequeo(s) fallando.`);
