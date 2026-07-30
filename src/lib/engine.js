import {
  SINS, SIN_LABEL, DAMAGE_TYPES, DAMAGE_LABEL, ARQUETIPOS,
  esPuntoBlando, MULT_NORMAL,
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
      if (s.sin && s.sin in out) out[s.sin] += 1;
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
      if (s.sin && demanda[s.sin]) total += 1;
    });
    return total;
  };

  return [...team]
    .map((id) => ({ id, aporte: aporte(id) }))
    .sort((a, b) => b.aporte - a.aporte || a.id.nombre.localeCompare(b.id.nombre))
    .map(({ id, aporte: n }, idx) => {
      const sinsQueAporta = [...new Set(id.skills.map((s) => s.sin).filter((s) => s && demanda[s]))];
      const motivo = n === 0
        ? "No aporta recursos de los Sins que piden las pasivas del equipo."
        : `Aporta ${n} skill${n === 1 ? "" : "s"} de ${sinsQueAporta.map((s) => SIN_LABEL[s]).join(", ")}, que las pasivas del equipo necesitan.`;
      return { id, motivo, aporte: n, banca: idx >= 6 };
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
