/*
  Chequeos del motor y del dataset. No se corre directo: lo bundlea y ejecuta
  scripts/smoke-test.mjs, porque estos módulos importan JSON como hace Vite.
*/
import { IDENTITIES, EGOS, META, validateIdentities, identityPorNombre } from "../src/data/identities.js";
import { SINS, SINNERS, esPuntoBlando } from "../src/data/constants.js";
import {
  recursosDeSin, estadoPasivas, perfilResistencias, perfilArquetipos,
  sugerirOrden, puntuarCandidata, pasivasActivasDelEquipo,
} from "../src/lib/engine.js";
import { toggleSeleccion } from "../src/lib/seleccion.js";
import { migrar } from "../src/lib/storage.js";

export let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  console.log(`${ok ? "ok  " : "FALLA"} ${nombre}${ok || !detalle ? "" : ` — ${detalle}`}`);
  if (!ok) fallos++;
};

const porId = (id) => IDENTITIES.find((i) => i.id === id);

/* --- Dataset --- */

const problemas = validateIdentities();
check("el dataset no tiene problemas de integridad", problemas.length === 0, problemas.slice(0, 3).join("; "));
check("hay 147 Identities y 96 E.G.O", IDENTITIES.length === 147 && EGOS.length === 96, `${IDENTITIES.length}/${EGOS.length}`);
check("todas tienen Sinner de la lista de 12", IDENTITIES.every((i) => SINNERS.includes(i.sinner)));
check("todas tienen al menos una skill", IDENTITIES.every((i) => i.skills.length > 0));
check("todas tienen pasiva de soporte", IDENTITIES.every((i) => i.pasivas.soporte.length > 0));
check("los ids son únicos", new Set(IDENTITIES.map((i) => i.id)).size === IDENTITIES.length);
check("el meta declara la fuente y su fecha", !!META.fuente.repo && !!META.fuente.ultimoCommit);

// Verificación puntual contra el archivo fuente de LCTeamBuilder que se leyó a mano.
const ring = porId(10109);
check("Ring Yi Sang: resistencias correctas", ring.resistencias.slash === 1 && ring.resistencias.pierce === 0.5 && ring.resistencias.blunt === 2);
check("Ring Yi Sang: 4 skills con su afinidad", ring.skills.length === 4 && ring.afinidades.Lust === 2 && ring.afinidades.Gloom === 1 && ring.afinidades.Sloth === 1);
check("Ring Yi Sang: pasivas separadas combate/soporte", ring.pasivas.combate.length === 2 && ring.pasivas.soporte.length === 1);
check("Ring Yi Sang: la pasiva de soporte tiene costo de Sin", ring.pasivas.soporte[0].costo[0]?.sin === "Lust" && ring.pasivas.soporte[0].costo[0]?.cantidad === 4);

/* El bug de derivación: sus skills nombran 5 estados al azar, pero es solo Bleed. */
check("Ring Yi Sang: arquetipo único Bleed pese a nombrar 5 estados",
  ring.arquetipos.length === 1 && ring.arquetipos[0] === "Bleed", ring.arquetipos.join(","));
check("ninguna ID tiene más de 3 arquetipos", IDENTITIES.every((i) => i.arquetipos.length <= 3),
  IDENTITIES.filter((i) => i.arquetipos.length > 3).map((i) => i.nombre).join(", "));

/* La ID que el repo de origen dejó fuera de su propio índice. */
check("incluye LobotomyCorpRemnantFaust, que su repo no exporta", !!identityPorNombre("Lobotomy Corp. Remnant", "Faust"));

/* --- Migración del guardado --- */

const migrado = migrar(1, { "yisang-ring": true, "faust-lcb": true, "clave-inventada": true });
check("migra claves v1 al id numérico del juego", migrado[10109] === true && migrado[10201] === true, JSON.stringify(migrado));
check("descarta claves desconocidas sin romper", !("clave-inventada" in migrado) && Object.keys(migrado).length === 2);
check("migrar es idempotente sobre datos v2", JSON.stringify(migrar(2, { 10109: true })) === JSON.stringify({ 10109: true }));

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
check("los recursos de Sin cuentan skills, no IDs", recursos.Lust === 2 && recursos.Gloom === 1, JSON.stringify(recursos));
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

console.log(fallos === 0 ? "\nTodo verde." : `\n${fallos} chequeo(s) fallando.`);
