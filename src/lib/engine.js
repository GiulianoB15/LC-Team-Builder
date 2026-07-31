import {
  SINS, SIN_LABEL, DAMAGE_TYPES, DAMAGE_LABEL, ARQUETIPOS,
  esPuntoBlando, MULT_NORMAL, SLOTS_DESPLIEGUE,
} from "../data/constants.js";

/*
  MOTOR

  Reescrito sobre los datos reales del dataset. El prototipo puntuaba con tres
  campos cargados a mano —positionPref, generates, consumes— que no existen en
  ninguna fuente verificable. Ahora todo sale de datos del juego:

    - afinidad de Sin por skill  → perfil de recursos del equipo
    - costo de las pasivas       → qué pasivas se activan con ese perfil
    - resistencias numéricas     → puntos blandos del equipo
    - arquetipos derivados       → sinergia temática

  Lo que NO se puede derivar del dataset está marcado como heurística.
*/

/* ------------------------------------------------------------------ *
   Recursos de Sin
 * ------------------------------------------------------------------ */

/*
  Perfil de recursos del equipo: cuántas skills de cada Sin aporta.

  Es una ESTIMACIÓN de la capacidad de generación, no el conteo exacto de
  recursos en combate —eso depende de qué skills salen cada turno—, pero es la
  misma aproximación que usan las herramientas de la comunidad y alcanza para
  saber si una pasiva tiene chance de activarse.
*/
export function recursosDeSin(team) {
  const out = {};
  SINS.forEach((s) => (out[s] = 0));
  team.forEach((id) => {
    id.skills.forEach((s) => {
      // Ponderado por copias en el mazo (3+2+1 = 6 por ID). Contar skills
      // sueltas subestimaba al Sin de la skill más repetida.
      if (s.sin && s.sin in out) out[s.sin] += s.copias ?? 1;
    });
  });
  return out;
}

/*
  Dado un perfil de recursos, decide qué pasivas de una ID llegan a su costo.
  Las pasivas sin costo se consideran siempre activas.
*/
export function estadoPasivas(identity, recursos) {
  const evaluar = (p) => {
    const faltantes = p.costo
      .map((c) => ({ ...c, disponible: recursos[c.sin] ?? 0 }))
      .filter((c) => c.disponible < c.cantidad);
    return { ...p, activa: faltantes.length === 0, faltantes };
  };
  return {
    combate: identity.pasivas.combate.map(evaluar),
    soporte: identity.pasivas.soporte.map(evaluar),
  };
}

/*
  Cuántas pasivas del equipo entero quedan activas con el perfil dado.
  Sirve para comparar composiciones: más pasivas activas = equipo más coherente.
*/
export function pasivasActivasDelEquipo(team, recursos = recursosDeSin(team)) {
  let activas = 0;
  let totales = 0;
  team.forEach((id) => {
    const e = estadoPasivas(id, recursos);
    [...e.combate, ...e.soporte].forEach((p) => {
      totales += 1;
      if (p.activa) activas += 1;
    });
  });
  return { activas, totales };
}

/* ------------------------------------------------------------------ *
   E.G.O
 * ------------------------------------------------------------------ */

/*
  Un E.G.O se paga con recursos de Sin del equipo. Acá se compara su costo
  contra el perfil de recursos, con la MISMA aproximación que se usa para las
  pasivas: el perfil estima capacidad de generación, no el stock exacto de un
  turno. Sirve para saber si un E.G.O es realista con el equipo armado, no para
  predecir el turno 3.

  Solo tiene sentido para E.G.O de Sinners que estén desplegados: si el Sinner
  no está en combate, su E.G.O no se puede usar.
*/
export function estadoEgo(ego, recursos) {
  const faltantes = ego.costo
    .map((c) => ({ ...c, disponible: recursos[c.sin] ?? 0 }))
    .filter((c) => c.disponible < c.cantidad);

  const costoTotal = ego.costo.reduce((a, c) => a + c.cantidad, 0);
  return { ego, alcanza: faltantes.length === 0, faltantes, costoTotal };
}

/*
  E.G.O de la colección que pertenecen a Sinners desplegados, ordenados por si
  alcanzan y después por costo. `sinnersDesplegados` es un Set de nombres.
*/
export function egosDelEquipo(egosPropios, sinnersDesplegados, recursos) {
  return egosPropios
    .filter((e) => sinnersDesplegados.has(e.sinner))
    .map((e) => estadoEgo(e, recursos))
    .sort((a, b) =>
      Number(b.alcanza) - Number(a.alcanza) ||
      b.costoTotal - a.costoTotal ||
      a.ego.nombre.localeCompare(b.ego.nombre)
    );
}

/* ------------------------------------------------------------------ *
   Resistencias
 * ------------------------------------------------------------------ */

/*
  Las resistencias son multiplicadores de daño recibido: más bajo es mejor.

  Se cuenta cuántos miembros son punto blando de cada tipo, no solo el peor
  caso. El prototipo puntuaba candidatas contra el peor caso del equipo, y eso
  no puede funcionar: sumar un miembro nunca mejora un mínimo, porque el
  miembro débil sigue estando.
*/
export function perfilResistencias(team) {
  const out = {};
  DAMAGE_TYPES.forEach((t) => {
    if (team.length === 0) {
      out[t] = { peor: null, blandos: 0, total: 0, promedio: null };
      return;
    }
    const valores = team.map((id) => id.resistencias[t]);
    out[t] = {
      peor: Math.max(...valores), // el multiplicador más alto = el más golpeado
      blandos: valores.filter(esPuntoBlando).length,
      total: team.length,
      promedio: valores.reduce((a, b) => a + b, 0) / valores.length,
    };
  });
  return out;
}

/* ------------------------------------------------------------------ *
   Arquetipos
 * ------------------------------------------------------------------ */

export function perfilArquetipos(team) {
  const out = {};
  ARQUETIPOS.forEach((a) => (out[a] = 0));
  team.forEach((id) => id.arquetipos.forEach((a) => { if (a in out) out[a] += 1; }));
  return out;
}

/* ------------------------------------------------------------------ *
   Sinergia: quién aplica y quién cobra
 * ------------------------------------------------------------------ */

/*
  El arquetipo dice a qué familia pertenece cada ID, pero no qué hace adentro.
  En un equipo de Bleed hay quien INFLIGE el sangrado y quien lo COBRA, y son
  roles distintos: seis que cobran y ninguno que inflija no es un equipo, es una
  lista. Eso es lo que mide esto.

  Los roles salen de `id.sinergia`, derivado del texto de las pasivas en
  build-dataset.mjs. Es interpretación de texto, no un campo oficial: por eso la
  UI lo presenta como observación y no como veredicto.
*/
export function perfilSinergia(team) {
  const porArquetipo = {};

  const anotar = (arquetipo, rol, id) => {
    porArquetipo[arquetipo] ??= { aplican: [], leen: [] };
    porArquetipo[arquetipo][rol].push(id);
  };

  team.forEach((id) => {
    const s = id.sinergia ?? { aplica: [], lee: [] };
    s.aplica.forEach((a) => anotar(a, "aplican", id));
    s.lee.forEach((a) => anotar(a, "leen", id));
  });

  /*
    Lo accionable son los dos desbalances:

    - huérfano: alguien cobra un estado que nadie del equipo inflige. Es el
      hueco que conviene tapar, y lo que hace que una candidata valga la pena.
    - sinCobrador: alguien lo inflige y nadie lo aprovecha. Molesta menos
      —infligir suele ser daño igual— así que se reporta pero no se penaliza.
  */
  const huerfanos = [];
  const sinCobrador = [];
  Object.entries(porArquetipo).forEach(([arquetipo, { aplican, leen }]) => {
    if (leen.length && !aplican.length) huerfanos.push({ arquetipo, leen });
    if (aplican.length && !leen.length) sinCobrador.push({ arquetipo, aplican });
  });

  return {
    porArquetipo,
    huerfanos,
    sinCobrador,
    buffean: team.filter((id) => id.sinergia?.buffeaAliados),
    /* Sin datos derivados no se puede opinar; la UI lo dice en vez de callar. */
    sinSenal: team.filter((id) => {
      const s = id.sinergia;
      return !s || (!s.aplica.length && !s.lee.length);
    }),
  };
}

/* ------------------------------------------------------------------ *
   Velocidad
 * ------------------------------------------------------------------ */

/*
  Quién actúa primero lo decide la VELOCIDAD, no el orden de despliegue: ese
  solo desempata cuando dos unidades sacan el mismo valor.
  (https://limbuscompany.wiki.gg/wiki/Battles)

  La velocidad se tira cada turno dentro de un rango, así que lo único honesto
  es reportar el rango del equipo, no un número. Sirve para leer si el equipo
  puede ganar iniciativa o va a ir siempre a rebufo.
*/
export function perfilVelocidad(team) {
  const conDato = team.filter((id) => id.velocidad?.max != null);
  if (!conDato.length) return { min: null, max: null, promedioMax: null, sinDato: team.length };

  const mins = conDato.map((id) => id.velocidad.min).filter((v) => v != null);
  const maxs = conDato.map((id) => id.velocidad.max);
  return {
    min: Math.min(...mins),
    max: Math.max(...maxs),
    promedioMax: Number((maxs.reduce((a, b) => a + b, 0) / maxs.length).toFixed(1)),
    sinDato: team.length - conDato.length,
  };
}

export const arquetipoDominante = (team) => {
  const perfil = perfilArquetipos(team);
  const orden = Object.entries(perfil).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  return orden.length ? orden[0][0] : null;
};

/* ------------------------------------------------------------------ *
   Orden de despliegue
 * ------------------------------------------------------------------ */

/*
  ⚠️ HEURÍSTICA, no dato verificado.

  El dataset no tiene ningún campo que diga qué ID conviene desplegar primero:
  esa información es contenido curado (guías, tier lists), no dato crudo del
  juego. El prototipo lo resolvía con un campo `positionPref` cargado a mano,
  que se sacó por no tener fuente.

  Mientras no exista la capa de recetas (§3.2 del handoff), el orden se arma
  con un criterio explícito y declarado: primero quienes más recursos aportan
  a los Sins que las pasivas del equipo necesitan, porque son los que habilitan
  al resto. Es una aproximación razonable, no una recomendación del juego.
*/
export function sugerirOrden(team) {
  if (team.length === 0) return [];

  const recursos = recursosDeSin(team);

  // Qué Sins pide el equipo, y cuánto.
  const demanda = {};
  team.forEach((id) => {
    [...id.pasivas.combate, ...id.pasivas.soporte].forEach((p) => {
      p.costo.forEach((c) => {
        demanda[c.sin] = Math.max(demanda[c.sin] ?? 0, c.cantidad);
      });
    });
  });

  const aporte = (id) => {
    let total = 0;
    id.skills.forEach((s) => {
      if (s.sin && demanda[s.sin]) total += s.copias ?? 1;
    });
    return total;
  };

  const conAporte = [...team]
    .map((id) => ({ id, aporte: aporte(id) }))
    .sort((a, b) => b.aporte - a.aporte || a.id.nombre.localeCompare(b.id.nombre));

  /*
    Hasta acá el orden es por aporte de recursos, que responde "a quién bajar a
    la cancha". Pero el SLOT en sí también importa, y por un motivo concreto:
    hay pasivas que buffean según la posición relativa en el Dashboard.

    Son pocas —6 de 184— pero cuando están, mandan:

      "placed after this unit"   → conviene temprano, para que queden más atrás
      "adjacent to this unit"    → conviene al medio, donde tiene dos vecinos
                                   en vez de uno
      "placed before this unit"  → conviene tarde

    El resto del equipo se acomoda alrededor.
  */
  const pos = (x) => x.id.sinergia?.posicion ?? null;
  const temprano = conAporte.filter((x) => pos(x) === "temprano");
  const medio = conAporte.filter((x) => pos(x) === "medio");
  const tarde = conAporte.filter((x) => pos(x) === "tarde");
  const resto = conAporte.filter((x) => !pos(x));

  const base = [...temprano, ...resto, ...tarde];
  /* Las de adyacencia van al centro de lo que quedó, no al principio. */
  const centro = Math.max(temprano.length, Math.floor((base.length - medio.length) / 2));
  const ordenado = [...base.slice(0, centro), ...medio, ...base.slice(centro)];

  const MOTIVO_POSICION = {
    temprano: "Conviene temprano: su pasiva buffea a los aliados que van después.",
    medio: "Conviene al medio: su pasiva buffea a los aliados de al lado, y ahí tiene dos.",
    tarde: "Conviene tarde: su pasiva se apoya en los aliados que van antes.",
  };

  return ordenado.map(({ id, aporte: n }, idx) => {
    const sinsQueAporta = [...new Set(id.skills.map((s) => s.sin).filter((s) => s && demanda[s]))];
    const motivo = n === 0
      ? "No aporta recursos de los Sins que piden las pasivas del equipo."
      : `Aporta ${n} copia${n === 1 ? "" : "s"} de skill de ${sinsQueAporta.map((s) => SIN_LABEL[s]).join(", ")}, que las pasivas del equipo necesitan.`;

    return {
      id,
      motivo,
      /* Se devuelve aparte para que la UI lo pueda destacar: es el único de los
         dos motivos que habla del slot y no de quién juega. */
      motivoPosicion: id.sinergia?.posicion ? MOTIVO_POSICION[id.sinergia.posicion] : null,
      aporte: n,
      banca: idx >= SLOTS_DESPLIEGUE,
      sinDatos: !id.tienePasivas,
    };
  });
}

/* ------------------------------------------------------------------ *
   Puntaje de candidatas
 * ------------------------------------------------------------------ */

export function puntuarCandidata(candidate, team) {
  let score = 0;
  const motivos = [];

  const equipoConCandidata = [...team, candidate];

  // --- Arquetipo: la señal más fuerte de que dos IDs juegan al mismo juego ---
  const perfil = perfilArquetipos(team);
  const compartidos = candidate.arquetipos.filter((a) => perfil[a] > 0);
  if (compartidos.length) {
    score += compartidos.length * 3;
    motivos.push(`Comparte arquetipo con el equipo: ${compartidos.join(", ")}.`);
  } else if (candidate.arquetipos.length && Object.values(perfil).some((c) => c > 0)) {
    score -= 1;
    motivos.push(`Su arquetipo (${candidate.arquetipos.join(", ")}) no coincide con el del equipo.`);
  }

  /*
    --- Rol dentro del arquetipo ---

    Compartir arquetipo ya suma arriba, pero es una señal gruesa: seis IDs de
    Bleed que solo cobran sangrado no sangran a nadie. Acá se mira el rol.

    Tapar un huérfano —alguien del equipo cobra un estado que nadie inflige— es
    lo más valioso que puede hacer una candidata, más que sumar otro del mismo
    arquetipo, así que pesa más que el bonus de arquetipo.
  */
  const sinergia = perfilSinergia(team);
  const propia = candidate.sinergia ?? { aplica: [], lee: [], buffeaAliados: false };

  const tapa = sinergia.huerfanos.filter((h) => propia.aplica.includes(h.arquetipo));
  tapa.forEach((h) => {
    score += 4;
    const n = h.leen.length;
    motivos.push(
      `Aplica ${h.arquetipo}, que ${n === 1 ? "un miembro" : `${n} miembros`} del equipo aprovecha${n === 1 ? "" : "n"} pero nadie inflige.`
    );
  });

  /* A la inversa: cobra algo que el equipo ya está infligiendo. */
  const cobra = propia.lee.filter(
    (a) => sinergia.porArquetipo[a]?.aplican.length && !tapa.some((t) => t.arquetipo === a)
  );
  if (cobra.length) {
    score += 2;
    motivos.push(`Aprovecha el ${cobra.join(", ")} que el equipo ya inflige.`);
  }

  if (propia.buffeaAliados) {
    score += 1;
    motivos.push("Su pasiva reparte buffs al resto del equipo, no solo a sí misma.");
  }

  // --- Recursos de Sin: ¿destraba pasivas que hoy no llegan al costo? ---
  const antes = pasivasActivasDelEquipo(team);
  const despues = pasivasActivasDelEquipo(equipoConCandidata);
  const destrabadas = despues.activas - antes.activas - contarPropiasActivas(candidate, equipoConCandidata);
  if (destrabadas > 0) {
    score += destrabadas * 2;
    motivos.push(`Sus skills destraban ${destrabadas} pasiva${destrabadas === 1 ? "" : "s"} de sus compañeros.`);
  }

  const propiasActivas = contarPropiasActivas(candidate, equipoConCandidata);
  const propiasTotales = candidate.pasivas.combate.length + candidate.pasivas.soporte.length;
  if (propiasTotales > 0 && propiasActivas === propiasTotales) {
    score += 2;
    motivos.push("El equipo le cubre el costo de todas sus pasivas.");
  } else if (propiasTotales > 0 && propiasActivas === 0) {
    score -= 2;
    motivos.push("El equipo no le cubre el costo de ninguna de sus pasivas.");
  }

  // --- Pasiva de soporte: rinde aunque quede en banca (§3.1) ---
  const soporteActivo = estadoPasivas(candidate, recursosDeSin(equipoConCandidata)).soporte.filter((p) => p.activa);
  if (soporteActivo.length) {
    score += 1;
    motivos.push(`Su pasiva de soporte "${soporteActivo[0].nombre}" se activa, y sirve incluso desde la banca.`);
  }

  /*
    Resistencias: premiar no agravar el punto blando.

    Con menos de MIN_EQUIPO_RESISTENCIAS miembros esto no se evalúa. Sobre un
    equipo de 1, "la mitad o más son débiles" se cumple apenas ese único miembro
    lo sea, y el motivo aparecía en casi todas las candidatas sin aportar nada.
  */
  const MIN_EQUIPO_RESISTENCIAS = 2;
  const res = perfilResistencias(team);
  DAMAGE_TYPES.forEach((t) => {
    const { blandos, total } = res[t];
    if (total < MIN_EQUIPO_RESISTENCIAS) return;
    const equipoFlojo = blandos >= Math.ceil(total / 2);
    if (!equipoFlojo) return;

    if (!esPuntoBlando(candidate.resistencias[t])) {
      score += 2;
      const plural = blandos === 1 ? "miembro débil" : "miembros débiles";
      motivos.push(
        `El equipo ya tiene ${blandos} de ${total} ${plural} a daño ${DAMAGE_LABEL[t].toLowerCase()}; esta no agrega otro.`
      );
    } else {
      score -= 1;
      motivos.push(
        `Ojo: suma otra debilidad a daño ${DAMAGE_LABEL[t].toLowerCase()}, donde el equipo ya está flojo.`
      );
    }
  });

  // Las advertencias van al final: primero por qué sí, después el pero.
  const esAdvertencia = (m) => m.startsWith("Ojo:") || m.includes("no coincide") || m.includes("no le cubre");
  motivos.sort((a, b) => Number(esAdvertencia(a)) - Number(esAdvertencia(b)));

  return { score, motivos };
}

function contarPropiasActivas(identity, team) {
  const e = estadoPasivas(identity, recursosDeSin(team));
  return [...e.combate, ...e.soporte].filter((p) => p.activa).length;
}

/* ------------------------------------------------------------------ *
   Utilidades de presentación
 * ------------------------------------------------------------------ */

export const resumenResistencia = (perfil) =>
  perfil.peor == null ? "—" : perfil.peor;

export { MULT_NORMAL };
