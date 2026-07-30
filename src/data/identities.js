import { SINS, SINNERS, DAMAGE_TYPES, RES_VALUE } from "./constants.js";

/*
  DATASET SEMILLA — 8 Identities (Yi Sang y Faust).

  ⚠️ Regla del proyecto: no se completan datos de memoria. Estas 8 vienen del
  prototipo original, donde se cargaron verificadas por búsqueda. Sirven para
  probar el motor; NO son un dataset usable — el juego tiene ~185 Identities.
  Ampliar solo con datos de fuente verificable.

  Cambio respecto del prototipo: `sinAffinity` ahora usa siempre la clave en
  inglés. Antes convivían "Pride" y "Orgullo" para el mismo Sin y el conteo
  de afinidades los tomaba como dos cosas distintas.
*/
export const IDENTITIES = [
  {
    key: "yisang-lcb",
    sinner: "Yi Sang",
    name: "LCB Sinner Yi Sang",
    tags: ["Rupture"],
    sinAffinity: "Gloom",
    resistances: { slash: "normal", pierce: "weak", blunt: "normal" },
    positionPref: "flexible",
    generates: [],
    consumes: [],
    note: "ID base, sin mecánicas de posición fuertes. Sirve como comodín de Rupture liviano.",
  },
  {
    key: "yisang-dimshredder",
    sinner: "Yi Sang",
    name: "LCE E.G.O::Dimension Shredder Yi Sang",
    tags: ["Rupture", "Charge"],
    sinAffinity: "Wrath",
    resistances: { slash: "weak", pierce: "normal", blunt: "normal" },
    positionPref: "flexible",
    generates: ["charge"],
    consumes: ["charge"],
    note: "Gana Charge al no recibir daño el turno anterior; su daño escala con la diferencia de Velocidad. Genera y también consume Charge, así que rinde mejor con otro generador de Charge en el equipo.",
  },
  {
    key: "yisang-ring",
    sinner: "Yi Sang",
    name: "The Ring Pointillist Student Yi Sang",
    tags: ["Bleed", "Status negativo"],
    sinAffinity: "Gloom",
    resistances: { slash: "normal", pierce: "normal", blunt: "weak" },
    positionPref: "flexible",
    generates: ["status_negativo"],
    consumes: ["status_negativo"],
    note: "Se fortalece cuantos más estados negativos haya sobre los enemigos. Quiere compañeros que apliquen Sangrado u otros debuffs antes que él actúe.",
  },
  {
    key: "yisang-wubranch",
    sinner: "Yi Sang",
    name: "Heishou Pack - Wu Branch Adept Yi Sang",
    tags: ["Rupture", "Tremor", "Tanque", "Buff de equipo"],
    sinAffinity: "Pride",
    resistances: { slash: "endure", pierce: "normal", blunt: "endure" },
    positionPref: "first",
    generates: ["command_cry"],
    consumes: [],
    note: "Tanque que reparte buffs de Nivel de Defensa y Poder de Clash a todo el equipo. Conviene desplegarlo temprano para que el buff cubra al resto del turno.",
  },
  {
    key: "faust-lcb",
    sinner: "Faust",
    name: "LCB Sinner Faust",
    tags: ["Generalista"],
    sinAffinity: "Gluttony",
    resistances: { slash: "normal", pierce: "normal", blunt: "weak" },
    positionPref: "flexible",
    generates: [],
    consumes: [],
    note: "ID base equilibrada, buena de comodín mientras no tengas alternativas mejores para el hueco de Sin Afinidad.",
  },
  {
    key: "faust-lobocorp",
    sinner: "Faust",
    name: "Lobotomy Corp. Remnant Faust",
    tags: ["Sinking", "Soporte"],
    sinAffinity: "Envy",
    resistances: { slash: "weak", pierce: "endure", blunt: "normal" },
    positionPref: "last",
    generates: ["sinking"],
    consumes: [],
    note: "Aplica Hundimiento (Sinking) de forma consistente. Como sus efectos se acumulan sobre el enemigo, rinde bien yendo más tarde en el orden para rematar con el Sinking ya acumulado por otros.",
  },
  {
    key: "faust-shi",
    sinner: "Faust",
    name: "Shi Assoc. East Section 3 Faust",
    tags: ["Bleed", "Poise", "Arquera"],
    sinAffinity: "Pride",
    resistances: { slash: "endure", pierce: "weak", blunt: "normal" },
    positionPref: "flexible",
    generates: ["poise", "bleed"],
    consumes: ["poise"],
    note: "Híbrida de Poise y Sangrado. Su pasiva de equipo registra quién infligió más Sangrado en el turno priorizando al que esté primero en el orden de despliegue, así que conviene desplegarla temprano si buscás que ella gatille esa pasiva.",
  },
  {
    key: "faust-wcorp",
    sinner: "Faust",
    name: "W Corp. L2 Cleanup Agent Faust",
    tags: ["Rupture", "Recursos"],
    sinAffinity: "Lust",
    resistances: { slash: "normal", pierce: "normal", blunt: "endure" },
    positionPref: "flexible",
    generates: ["charge"],
    consumes: [],
    note: "Genera Charge de forma pasiva. Buena compañera para IDs que consumen Charge, como Dimension Shredder Yi Sang — conviene desplegarla antes que esas.",
  },
];

/*
  Chequeo de integridad del dataset. Corre en dev y avisa por consola en vez de
  fallar en silencio: un typo en un Sin o en un Sinner rompe los conteos del
  motor sin que se note en la UI, que es exactamente lo que pasaba antes.
  Devuelve la lista de problemas para poder testearla.
*/
export function validateIdentities(list = IDENTITIES) {
  const problemas = [];
  const vistos = new Set();

  list.forEach((id) => {
    if (vistos.has(id.key)) problemas.push(`key duplicada: "${id.key}"`);
    vistos.add(id.key);

    if (!SINS.includes(id.sinAffinity)) {
      problemas.push(`${id.key}: sinAffinity "${id.sinAffinity}" no es un Sin válido`);
    }
    if (!SINNERS.includes(id.sinner)) {
      problemas.push(`${id.key}: sinner "${id.sinner}" no está en la lista de 12`);
    }
    DAMAGE_TYPES.forEach((t) => {
      if (!(id.resistances?.[t] in RES_VALUE)) {
        problemas.push(`${id.key}: resistencia "${t}" inválida ("${id.resistances?.[t]}")`);
      }
    });
    if (!["first", "last", "flexible"].includes(id.positionPref)) {
      problemas.push(`${id.key}: positionPref inválido ("${id.positionPref}")`);
    }
  });

  return problemas;
}

if (import.meta.env?.DEV) {
  const problemas = validateIdentities();
  if (problemas.length) {
    console.warn("[Limbus Docket] Problemas en el dataset:\n" + problemas.join("\n"));
  }
}
