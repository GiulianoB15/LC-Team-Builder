/*
  Chequeo rápido del motor, corrible con `node scripts/smoke-test.mjs`.
  Cubre puntualmente los bugs que se arreglaron al portar el prototipo, para
  que no vuelvan sin que nadie se entere.
*/
import { IDENTITIES, validateIdentities } from "../src/data/identities.js";
import { resistanceProfile, sinAffinityCounts, suggestOrder, candidateScore } from "../src/lib/engine.js";
import { toggleSeleccion } from "../src/lib/seleccion.js";

let fallos = 0;
const check = (nombre, ok, detalle = "") => {
  console.log(`${ok ? "ok  " : "FALLA"} ${nombre}${ok || !detalle ? "" : ` — ${detalle}`}`);
  if (!ok) fallos++;
};

const byKey = (k) => IDENTITIES.find((i) => i.key === k);

// --- Dataset íntegro ---
const problemas = validateIdentities();
check("el dataset no tiene problemas de integridad", problemas.length === 0, problemas.join("; "));

// --- Bug: "Pride" y "Orgullo" contaban como Sins distintos ---
const equipoPride = [byKey("yisang-wubranch"), byKey("faust-shi")];
const counts = sinAffinityCounts(equipoPride);
check("Wu Branch y Shi Faust suman al MISMO Sin (Pride)", counts.Pride === 2, JSON.stringify(counts));
check("no aparecen claves de Sin fuera de las 7", Object.keys(counts).length === 7);

// --- Bug: no se podía cambiar de ID con el equipo lleno ---
const seisKeys = IDENTITIES.slice(0, 6).map((i) => i.key);
const equipoLleno = ["yisang-lcb", "faust-lcb"];
const trasSwap = toggleSeleccion(equipoLleno, "faust-shi", "Faust", 2, IDENTITIES);
check(
  "con el cupo lleno, elegir otra ID del mismo Sinner la reemplaza",
  trasSwap.includes("faust-shi") && !trasSwap.includes("faust-lcb") && trasSwap.length === 2,
  JSON.stringify(trasSwap)
);
// Cupo 1 ya ocupado por Yi Sang: una ID de OTRO Sinner no entra.
const trasTope = toggleSeleccion(["yisang-lcb"], "faust-lcb", "Faust", 1, IDENTITIES);
check(
  "con el cupo lleno, una ID de otro Sinner sí queda bloqueada",
  trasTope.length === 1 && !trasTope.includes("faust-lcb"),
  JSON.stringify(trasTope)
);

// --- Bug: "cubre la debilidad" era imposible (agregar no sube un mínimo) ---
// Equipo con 2 de 2 débiles a contundente; una candidata normal no debería
// afirmar que lo arregla, pero sí debe puntuar por no agregar otra debilidad.
const equipoBluntFlojo = [byKey("yisang-ring"), byKey("faust-lcb")];
const perfil = resistanceProfile(equipoBluntFlojo);
check("el perfil cuenta débiles, no solo el peor caso", perfil.blunt.debiles === 2 && perfil.blunt.total === 2);

const { motivos } = candidateScore(byKey("faust-wcorp"), equipoBluntFlojo);
check(
  "ningún motivo afirma que se 'cubre' una debilidad ya presente",
  !motivos.some((m) => m.toLowerCase().includes("cubre"))
);
check(
  "sí avisa que la candidata no agrega otra debilidad",
  motivos.some((m) => m.includes("no agrega otro")),
  motivos.join(" | ")
);

// Equipo débil a perforante (yisang-lcb) + candidata TAMBIÉN débil a perforante.
const penalizada = candidateScore(byKey("faust-shi"), [byKey("yisang-lcb")]);
check(
  "penaliza sumar otra debilidad donde el equipo ya está flojo",
  penalizada.motivos.some((m) => m.startsWith("Ojo:")),
  penalizada.motivos.join(" | ")
);

// --- El orden por cadena de recursos sigue funcionando ---
const equipoCharge = [byKey("yisang-dimshredder"), byKey("faust-wcorp")];
const orden = suggestOrder(equipoCharge);
check("el generador de Charge va antes que el consumidor", orden[0].id.key === "faust-wcorp", orden.map((o) => o.id.key).join(" -> "));
check("el orden no pierde ni duplica miembros", orden.length === 2 && new Set(orden.map((o) => o.id.key)).size === 2);

const ordenCompleto = suggestOrder(IDENTITIES.slice(0, 6));
check("con 6 miembros tampoco pierde ni duplica", ordenCompleto.length === 6 && new Set(ordenCompleto.map((o) => o.id.key)).size === 6);

console.log(fallos === 0 ? "\nTodo verde." : `\n${fallos} chequeo(s) fallando.`);
process.exit(fallos === 0 ? 0 : 1);
