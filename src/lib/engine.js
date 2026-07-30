import { SINS, SIN_LABEL, DAMAGE_TYPES, DAMAGE_LABEL, RES_VALUE, WEAK_THRESHOLD } from "../data/constants.js";

/*
  Perfil de resistencias del equipo, por tipo de daño.

  El prototipo devolvía solo el mínimo ("peor caso"). Eso servía para mostrar,
  pero se usaba además para puntuar candidatas, y ahí estaba mal: agregar un
  miembro NUNCA puede subir un mínimo, porque el miembro débil sigue en el
  equipo. La app te decía "cubre la debilidad a cortante" y no cubría nada.

  Ahora se devuelve también cuántos miembros son el punto blando. Esa sí es una
  métrica sobre la que un fichaje nuevo puede mover la aguja: no arregla al
  débil que ya está, pero cambia qué proporción del equipo se cae ante ese tipo.
*/
export function resistanceProfile(team) {
  const out = {};
  DAMAGE_TYPES.forEach((t) => {
    if (team.length === 0) {
      out[t] = { peor: null, debiles: 0, total: 0, promedio: null };
      return;
    }
    const valores = team.map((id) => RES_VALUE[id.resistances[t]]);
    out[t] = {
      peor: Math.min(...valores),
      debiles: valores.filter((v) => v <= WEAK_THRESHOLD).length,
      total: team.length,
      promedio: valores.reduce((a, b) => a + b, 0) / valores.length,
    };
  });
  return out;
}

export function sinAffinityCounts(team) {
  const counts = {};
  SINS.forEach((s) => (counts[s] = 0));
  team.forEach((id) => {
    if (id.sinAffinity in counts) counts[id.sinAffinity] += 1;
  });
  return counts;
}

/*
  Orden de despliegue sugerido.

  Esta parte del prototipo estaba bien y se porta casi tal cual: coloca a los
  que quieren ir primero, después resuelve el bloque flexible poniendo a los
  generadores de un recurso antes que a quienes lo consumen, y cierra con los
  que rinden yendo últimos.

  Pendiente (§3.1 del handoff): extender esto a 12 posiciones con banca y
  support passives. Todavía no está hecho.
*/
export function suggestOrder(team) {
  if (team.length === 0) return [];

  const firstPref = team.filter((i) => i.positionPref === "first");
  const lastPref = team.filter((i) => i.positionPref === "last");
  const flexible = team.filter((i) => i.positionPref === "flexible");

  const ordenados = [];
  const colocados = new Set();

  const colocar = (id, motivo) => {
    ordenados.push({ id, motivo });
    colocados.add(id.key);
  };

  // Primero, los que generan algo que otro del bloque flexible consume.
  flexible.forEach((id) => {
    const recurso = id.generates.find((r) =>
      flexible.some((otro) => otro.key !== id.key && otro.consumes.includes(r))
    );
    if (recurso && !colocados.has(id.key)) {
      colocar(id, `Genera "${recurso}", conviene que actúe antes de quien lo consume.`);
    }
  });

  // El resto, en el orden en que vienen.
  flexible.forEach((id) => {
    if (!colocados.has(id.key)) {
      colocar(id, "Sin dependencias fuertes de orden; posición flexible.");
    }
  });

  return [
    ...firstPref.map((id) => ({
      id,
      motivo: "Su pasiva rinde más desplegado temprano (buff de equipo o inicio de combo).",
    })),
    ...ordenados,
    ...lastPref.map((id) => ({
      id,
      motivo: "Se beneficia de ir tarde, aprovechando efectos ya acumulados por el equipo.",
    })),
  ];
}

/*
  Puntaje de una candidata para sumarse a un equipo en armado.
  Devuelve el puntaje y los motivos en texto que se le muestran al usuario.
*/
export function candidateScore(candidate, currentTeam) {
  let score = 0;
  const motivos = [];

  // --- Afinidad de Sin: empujar hacia los umbrales ---
  const counts = sinAffinityCounts(currentTeam);
  const proyectado = (counts[candidate.sinAffinity] || 0) + 1;
  const sinEs = SIN_LABEL[candidate.sinAffinity] ?? candidate.sinAffinity;

  if (proyectado === 3) {
    score += 3;
    motivos.push(`Suma la 3ª unidad de afinidad ${sinEs} (umbral de bono).`);
  } else if (proyectado === 5) {
    score += 5;
    motivos.push(`Suma la 5ª unidad de afinidad ${sinEs} (umbral de bono mayor).`);
  } else if (proyectado === 2) {
    score += 1;
    motivos.push(`Suma afinidad ${sinEs}, acercando al umbral de 3.`);
  }

  // --- Resistencias: premiar no agravar el punto blando del equipo ---
  const perfil = resistanceProfile(currentTeam);
  DAMAGE_TYPES.forEach((t) => {
    const { debiles, total } = perfil[t];
    if (total === 0) return;

    const valorCandidata = RES_VALUE[candidate.resistances[t]];
    const equipoFlojo = debiles >= Math.ceil(total / 2);

    if (equipoFlojo && valorCandidata > WEAK_THRESHOLD) {
      score += 2;
      const plural = debiles === 1 ? "miembro débil" : "miembros débiles";
      motivos.push(
        `El equipo ya tiene ${debiles} de ${total} ${plural} a daño ${DAMAGE_LABEL[t].toLowerCase()}; esta no agrega otro.`
      );
    } else if (equipoFlojo && valorCandidata <= WEAK_THRESHOLD) {
      score -= 1;
      motivos.push(
        `Ojo: suma otra debilidad a daño ${DAMAGE_LABEL[t].toLowerCase()}, donde el equipo ya está flojo.`
      );
    }
  });

  // --- Huecos de rol de posición ---
  const tienePrimera = currentTeam.some((i) => i.positionPref === "first");
  const tieneUltima = currentTeam.some((i) => i.positionPref === "last");
  if (candidate.positionPref === "first" && !tienePrimera) {
    score += 2;
    motivos.push("El equipo no tiene ninguna unidad pensada para ir primera.");
  }
  if (candidate.positionPref === "last" && !tieneUltima) {
    score += 2;
    motivos.push("El equipo no tiene ninguna unidad pensada para ir última.");
  }

  // --- Cadenas de recurso ---
  currentTeam.forEach((miembro) => {
    if (miembro.consumes.some((r) => candidate.generates.includes(r))) {
      score += 2;
      motivos.push(`Genera un recurso que ${miembro.name} consume.`);
    }
    if (candidate.consumes.some((r) => miembro.generates.includes(r))) {
      score += 2;
      motivos.push(`Consume un recurso que ${miembro.name} ya genera.`);
    }
  });

  // --- Tags compartidos (Rupture / Bleed / Sinking...) ---
  const tagsCompartidos = candidate.tags.filter((t) =>
    currentTeam.some((m) => m.tags.includes(t))
  );
  if (tagsCompartidos.length) {
    score += tagsCompartidos.length;
    motivos.push(`Comparte temática con el equipo: ${tagsCompartidos.join(", ")}.`);
  }

  return { score, motivos };
}
