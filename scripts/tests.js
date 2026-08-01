/*
  Chequeos del motor y del dataset. No se corre directo: lo bundlea y ejecuta
  scripts/smoke-test.mjs, porque estos módulos importan JSON como hace Vite.
*/
import { IDENTITIES, EGOS, META, validateIdentities, identityPorNombre, IDS_BASE, conBase } from "../src/data/identities.js";
import { SINS, SINNERS, ARQUETIPOS, esPuntoBlando } from "../src/data/constants.js";
import {
  recursosDeSin, estadoPasivas, perfilResistencias, perfilArquetipos,
  sugerirOrden, puntuarCandidata, pasivasActivasDelEquipo, estadoEgo, egosDelEquipo,
  perfilSinergia, perfilVelocidad, analizarArquetipo, sugerirBanca,
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
check("el meta declara las tres fuentes con argumento y su rol", META.fuentes.length === 3 && META.fuentes.every((f) => !!f.rol));
check("el meta declara la fecha de la Identity más nueva", META.ultimaIdentity === "2026-07-23");

/* Las copias de skill son 3+2+1 en todas las IDs: sirve de checksum del dump. */
check("las copias de skill suman 6 en todas",
  IDENTITIES.every((i) => i.skills.reduce((a, s) => a + s.copias, 0) === 6));

/*
  Cobertura de pasivas. Antes había tres estados (completa / solo soporte / sin
  nada) porque las fuentes no llegaban a todo. Con pasivas.json llegan: las 184
  tienen combate y soporte. Estos chequeos son los que van a avisar si una
  corrida futura del bajador vuelve para atrás.
*/
const conPasivas = IDENTITIES.filter((i) => i.tienePasivas);
check("las 184 tienen pasivas", conPasivas.length === 184, `son ${conPasivas.length}`);
check("las 184 están completas: combate Y soporte",
  IDENTITIES.every((i) => i.pasivas.combate.length > 0 && i.pasivas.soporte.length > 0),
  IDENTITIES.filter((i) => !i.pasivas.combate.length || !i.pasivas.soporte.length).map((i) => i.id).join(","));
check("y ninguna queda marcada como parcial",
  IDENTITIES.filter((i) => i.tienePasivas && !i.pasivasCompletas).length === 0);
check("todas salen de la fuente automática, ninguna de una captura",
  IDENTITIES.every((i) => [...i.pasivas.combate, ...i.pasivas.soporte].every((p) => p.fuente === "eldritchtools")));
check("toda pasiva trae nombre y descripción",
  IDENTITIES.every((i) => [...i.pasivas.combate, ...i.pasivas.soporte].every((p) => p.nombre && p.descripcion)));
/*
  El costo es lo que consume el motor: si el Sin no es uno de los 7 o la
  cantidad es 0, `estadoPasivas` decide mal y no se nota en pantalla.
*/
check("los costos son utilizables por el motor",
  IDENTITIES.every((i) => [...i.pasivas.combate, ...i.pasivas.soporte]
    .every((p) => p.costo.every((c) => SINS.includes(c.sin) && c.cantidad > 0))));
check("el tipo de costo quedó canonicalizado, sin el 'res' de la fuente",
  IDENTITIES.every((i) => [...i.pasivas.combate, ...i.pasivas.soporte]
    .every((p) => p.tipoCosto === null || p.tipoCosto === "owned" || p.tipoCosto === "resonance")),
  [...new Set(IDENTITIES.flatMap((i) => [...i.pasivas.combate, ...i.pasivas.soporte]).map((p) => p.tipoCosto))].join(","));

const ring = porId(10109);
check("Ring Yi Sang: resistencias del dump nuevo", ring.resistencias.slash === 1 && ring.resistencias.pierce === 0.5 && ring.resistencias.blunt === 2);
check("Ring Yi Sang: afinidades ponderadas por copias", ring.afinidades.Gloom === 3 && ring.afinidades.Lust === 2 && ring.afinidades.Sloth === 1, JSON.stringify(ring.afinidades));
check("Ring Yi Sang: la dominante sale de las copias, no del conteo de skills", ring.afinidadDominante === "Gloom");
check("Ring Yi Sang: pasivas de combate y soporte", ring.pasivas.combate.length === 2 && ring.pasivas.soporte.length === 1);
/*
  Este costo es el mismo que traía LCTeamBuilder. Sirve de ancla: las dos
  fuentes son independientes, así que si coinciden acá el cambio de fuente no
  movió el dato que consume el motor.
*/
check("Ring Yi Sang: la pasiva de soporte conserva su costo de Sin", ring.pasivas.soporte[0].costo[0]?.sin === "Lust" && ring.pasivas.soporte[0].costo[0]?.cantidad === 4);
check("Ring Yi Sang: arquetipo oficial Bleed", ring.arquetipos.join(",") === "Bleed");

/* Las 3 IDs semilla del prototipo que faltaban por desfasaje ahora están. */
check("está Heishou Pack - Wu Branch Adept (2025-08-28)", !!identityPorNombre("Heishou Pack - Wu Branch Adept", "Yi Sang"));
check("está Shi Assoc. East Section 3 (2025-10-09)", !!identityPorNombre("Shi Assoc. East Section 3", "Faust"));
check("está Dimension Shredder, pese a los espacios en el nombre", !!identityPorNombre("LCE E.G.O::Dimension Shredder", "Yi Sang"));

/*
  10116 se estrenó el 2026-07-23, después del corte de LCTeamBuilder. Pasó por
  los tres estados: sin nada, después solo soporte por la wiki, y ahora
  completa. Es el caso que mejor mide si la fuente nueva llega al contenido
  reciente, que era todo el problema.
*/
const nueva = porId(10116);
check("la ID más nueva tiene pasivas completas",
  nueva && nueva.pasivasCompletas && nueva.pasivas.combate.length > 0 &&
  nueva.pasivas.soporte.length > 0 && nueva.fecha === "2026-07-23");

check("los arquetipos son solo los 7 oficiales",
  IDENTITIES.every((i) => i.arquetipos.every((a) => ARQUETIPOS.includes(a))),
  [...new Set(IDENTITIES.flatMap((i) => i.arquetipos).filter((a) => !ARQUETIPOS.includes(a)))].join(","));

check("los E.G.O traen costo de Sin", EGOS.filter((e) => e.costo.length > 0).length >= 100);
check("los E.G.O traen resistencias por Sin", EGOS.every((e) => e.resistenciasSin.length === 7 || e.resistenciasSin.length === 0));
check("los 110 E.G.O tienen pasiva",
  EGOS.filter((e) => e.tienePasivas).length === 110,
  `son ${EGOS.filter((e) => e.tienePasivas).length}`);
check("la pasiva de E.G.O es siempre una lista, aunque tenga una sola",
  EGOS.every((e) => Array.isArray(e.pasivas)));
check("y trae nombre y descripción", EGOS.every((e) => e.pasivas.every((p) => p.nombre && p.descripcion)));

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

/* --- Identidades base --- */

/*
  Las 12 con las que arranca cualquiera. Se derivan de la etiqueta oficial
  `Base Identity` del dump y NO del id: terminan en 01, pero eso es el esquema
  de numeración, no una garantía.
*/
check("hay exactamente 12 Identidades base", IDS_BASE.length === 12, `son ${IDS_BASE.length}`);
check("una por Sinner, sin repetir",
  new Set(IDS_BASE.map((id) => porId(id).sinner)).size === SINNERS.length);
check("todas llevan la etiqueta oficial Base Identity",
  IDS_BASE.every((id) => porId(id).etiquetas.includes("Base Identity")));
check("y ninguna otra la lleva",
  IDENTITIES.filter((i) => i.etiquetas.includes("Base Identity")).length === IDS_BASE.length);
check("conBase no pisa lo que ya estaba marcado",
  (() => {
    const r = conBase({ 10109: true });
    return r[10109] === true && IDS_BASE.every((id) => r[id] === true);
  })());

/* --- Migración del guardado --- */

const migrado = migrar(1, { "yisang-ring": true, "faust-lcb": true, "clave-inventada": true });
check("migra claves v1 al id numérico del juego",
  migrado.identities[10109] === true && migrado.identities[10201] === true, JSON.stringify(migrado));
check("descarta claves desconocidas sin romper", !("clave-inventada" in migrado.identities));
/*
  Desde la v4 toda colección arranca con las 12 base marcadas: son las que tiene
  cualquiera. El resultado son las 2 migradas más esas 12, y una de las
  migradas —el LCB Sinner de Faust— ya es una de las base.
*/
check("la migración deja las migradas más las 12 base",
  Object.keys(migrado.identities).length === IDS_BASE.length + 1,
  `${Object.keys(migrado.identities).length} identities`);
check("toda migración devuelve la forma actual, con E.G.O vacíos viniendo de v1",
  !!migrado.egos && Object.keys(migrado.egos).length === 0);
check("migrar v2 conserva las identities y suma las base",
  migrar(2, { 10109: true }).identities[10109] === true &&
  IDS_BASE.every((id) => migrar(2, { 10109: true }).identities[id] === true));
/* Un guardado v3 traía E.G.O: la migración a v4 no puede perderlos. */
check("migrar de v3 no pierde los E.G.O",
  migrar(3, { 10109: true }, { 20101: true }).egos[20101] === true);

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
/*
  El cupo no es fijo: lo define cada encuentro y por eso es un parámetro. Se
  chequea con los dos valores que más se usan.
*/
check("con 7 cupos, de un equipo de 8 queda 1 en banca",
  sugerirOrden(equipo8, 7).filter((o) => o.banca).length === 1);
check("con 6 cupos, quedan 2", sugerirOrden(equipo8, 6).filter((o) => o.banca).length === 2);
check("el default es 7, el del Mirror Dungeon actual",
  orden.filter((o) => o.banca).length === 1);
check("todo miembro del orden trae su motivo", orden.every((o) => typeof o.motivo === "string" && o.motivo.length > 0));
/*
  El aporte de recursos ordena, pero ya no manda sola: las pasivas posicionales
  pisan el orden porque el slot les cambia el efecto. Así que se verifica el
  aporte descendente SOLO entre las que no son posicionales, que son las que
  siguen la regla vieja.
*/
const sinPosicion = orden.filter((o) => !o.id.sinergia?.posicion);
check("entre las no posicionales, el aporte sigue mandando",
  sinPosicion.every((o, i) => i === 0 || sinPosicion[i - 1].aporte >= o.aporte),
  sinPosicion.map((o) => o.aporte).join(","));

/* Y la posicional va donde su pasiva la quiere, no donde la dejaría el aporte. */
const temprana = orden.find((o) => o.id.sinergia?.posicion === "temprano");
check("la que buffea a los que van después queda primera",
  !temprana || orden.indexOf(temprana) === 0,
  temprana ? `${temprana.id.nombre} en el puesto ${orden.indexOf(temprana) + 1}` : "no hay ninguna en este equipo");
check("y explica por qué, aparte del motivo de recursos",
  !temprana || /temprano/i.test(temprana.motivoPosicion ?? ""));
check("las no posicionales no inventan un motivo de posición",
  sinPosicion.every((o) => o.motivoPosicion === null));

/* --- Arquetipos --- */

const perfilArq = perfilArquetipos([ring]);
check("el perfil de arquetipos cuenta Bleed", perfilArq.Bleed === 1 && perfilArq.Burn === 0);

/* --- Sinergia derivada --- */

check("toda ID trae su bloque de sinergia, aunque salga vacío",
  IDENTITIES.every((i) => i.sinergia && Array.isArray(i.sinergia.aplica) && Array.isArray(i.sinergia.lee)));
check("los arquetipos derivados son de los 7 oficiales",
  IDENTITIES.every((i) => [...i.sinergia.aplica, ...i.sinergia.lee].every((a) => ARQUETIPOS.includes(a))));
check("la posición, si está, es una de las tres",
  IDENTITIES.every((i) => i.sinergia.posicion === null || ["temprano", "medio", "tarde"].includes(i.sinergia.posicion)));

/*
  El parser lee texto, así que puede desbocarse. Este es el guardarraíl: cuántos
  arquetipos derivados caen fuera del keyword oficial de su propia ID. Algunos
  son legítimos —una ID puede cobrar un estado que no es el suyo— pero si el
  número se dispara es que una regex empezó a agarrar cualquier cosa.
*/
check("el ruido del parser sigue acotado", META.sinergia.fueraDelOficial <= 25,
  `${META.sinergia.fueraDelOficial} arquetipos derivados fuera del oficial`);
check("y la cobertura no se derrumbó", META.sinergia.conRol >= 100,
  `${META.sinergia.conRol} de ${IDENTITIES.length} con algún rol`);

/*
  Caso concreto: Blade Lineage Salsu inflige Poise Y lo cobra. Es el ejemplo de
  por qué el arquetipo solo no alcanza —dos IDs "de Poise" pueden hacer cosas
  opuestas— y sirve de ancla si el parser cambia.
*/
const salsu = identityPorNombre("Blade Lineage Salsu", "Yi Sang");
check("Blade Lineage Salsu aplica Poise y además lo cobra",
  salsu?.sinergia.aplica.includes("Poise") && salsu?.sinergia.lee.includes("Poise"),
  JSON.stringify(salsu?.sinergia));

/* Un equipo de puros cobradores tiene que quedar señalado como huérfano. */
const soloCobran = IDENTITIES.filter((i) => i.sinergia.lee.includes("Bleed") && !i.sinergia.aplica.includes("Bleed")).slice(0, 3);
const perfSin = perfilSinergia(soloCobran);
check("detecta el arquetipo que el equipo cobra pero nadie inflige",
  perfSin.huerfanos.some((h) => h.arquetipo === "Bleed"),
  JSON.stringify(perfSin.huerfanos.map((h) => h.arquetipo)));

/* Y sumar a alguien que lo inflija tiene que ser lo mejor que le puede pasar. */
const aplicaBleed = IDENTITIES.find((i) => i.sinergia.aplica.includes("Bleed") && !soloCobran.includes(i));
const { motivos: motSin } = puntuarCandidata(aplicaBleed, soloCobran);
check("y recomienda a quien lo aplica, diciendo por qué",
  motSin.some((m) => /Aplica Bleed/.test(m) && /nadie inflige/.test(m)), motSin.join(" | "));

/* Con el hueco ya tapado, el motivo no tiene que volver a aparecer. */
const yaTapado = perfilSinergia([...soloCobran, aplicaBleed]);
check("una vez tapado el hueco, deja de reportarse",
  !yaTapado.huerfanos.some((h) => h.arquetipo === "Bleed"));

/*
  --- Datos que muestra la ficha ---

  La ficha es la única vista que enseña estos campos. Si alguno viniera vacío se
  vería como un guión en pantalla y no lo notaría nadie hasta abrirla, así que se
  chequean acá.
*/
check("todas tienen rango de velocidad, salud y nivel de defensa",
  IDENTITIES.every((i) => i.velocidad?.min != null && i.velocidad?.max != null &&
    i.saludBase != null && i.nivelDefensa != null));
check("el rango de velocidad es coherente (min ≤ max)",
  IDENTITIES.every((i) => i.velocidad.min <= i.velocidad.max));
check("todas tienen al menos una skill de defensa",
  IDENTITIES.every((i) => i.skillsDefensa.length > 0));
check("las resistencias son uno de los tres multiplicadores del juego",
  IDENTITIES.every((i) => [0.5, 1, 2].includes(i.resistencias.slash) &&
    [0.5, 1, 2].includes(i.resistencias.pierce) && [0.5, 1, 2].includes(i.resistencias.blunt)));

/*
  --- Qué falta para un arquetipo ---

  Lo que se está midiendo acá es que cuente SINNERS y no Identidades: tener seis
  de Bleed no sirve si son todas del mismo Sinner, porque solo entra una.
*/
const bleedTodas = IDENTITIES.filter((i) => i.arquetipos.includes("Bleed"));
const dosDelMismo = bleedTodas.filter((i) => i.sinner === bleedTodas[0].sinner).slice(0, 2);

check("el diagnóstico cuenta Sinners distintos, no Identidades",
  dosDelMismo.length === 2 &&
  analizarArquetipo("Bleed", dosDelMismo, IDENTITIES).sinnersCubiertos.length === 1,
  JSON.stringify(analizarArquetipo("Bleed", dosDelMismo, IDENTITIES).sinnersCubiertos));

check("y por eso reporta que faltan 6 lugares de 7, no 5",
  analizarArquetipo("Bleed", dosDelMismo, IDENTITIES).faltanSinners === 6);
check("y sigue el cupo cuando se le pasa otro",
  analizarArquetipo("Bleed", dosDelMismo, IDENTITIES, 6).faltanSinners === 5);

/* Con una colección vacía todo falta, y no debe romper. */
const vacio = analizarArquetipo("Bleed", [], IDENTITIES);
check("una colección vacía no rompe el diagnóstico",
  vacio.faltanSinners === 7 && vacio.tuyas.length === 0 && vacio.candidatas.length > 0);

/* Nunca puede recomendar algo que ya tenés. */
check("las candidatas son siempre Identidades que no tenés",
  vacio.candidatas.every((c) => c.id.arquetipos.includes("Bleed")) &&
  analizarArquetipo("Bleed", dosDelMismo, IDENTITIES).candidatas
    .every((c) => !dosDelMismo.some((p) => p.id === c.id.id)));

/* Un Sinner nuevo tiene que valer más que una alternativa de uno ya cubierto. */
const conDos = analizarArquetipo("Bleed", dosDelMismo, IDENTITIES);
const primera = conDos.candidatas[0];
check("prioriza sumar un Sinner que no tenés cubierto",
  primera.sinnerNuevo === true, `${primera.id.nombre} (${primera.id.sinner})`);
check("y lo explica en el motivo",
  primera.motivos.some((m) => /no ten[eé]s cubierto/.test(m)), primera.motivos.join(" | "));

/*
  El rol también manda: si lo que tenés solo cobra el estado, la recomendación
  tiene que ser quien lo aplique, no más de lo mismo.
*/
const soloLeenBleed = IDENTITIES
  .filter((i) => i.sinergia.lee.includes("Bleed") && !i.sinergia.aplica.includes("Bleed"))
  .slice(0, 2);
const dx = analizarArquetipo("Bleed", soloLeenBleed, IDENTITIES);
check("detecta que falta quien aplique el estado", dx.rolBuscado === "aplica", String(dx.rolBuscado));
check("y las mejores candidatas lo aplican",
  dx.candidatas.slice(0, 3).some((c) => c.aplica),
  dx.candidatas.slice(0, 3).map((c) => `${c.id.nombre}:${c.aplica}`).join(" | "));

/*
  --- La base de «Completar equipo» se puede agrandar ---

  El tope era 3 porque lo pedía el handoff, no el juego. Lo que se verifica acá
  es que agrandarla SIRVA: que la recomendación cambie de verdad al sumar
  referencias, porque si diera siempre lo mismo el tope daría igual.
*/
const bleedTodo = IDENTITIES.filter((x) => x.arquetipos.includes("Bleed"));
const cadena = [];
for (const i of bleedTodo) if (!cadena.some((b) => b.sinner === i.sinner)) cadena.push(i);

const mejorCon = (base) => {
  const usados = new Set(base.map((i) => i.sinner));
  return IDENTITIES.filter((i) => !usados.has(i.sinner))
    .map((i) => ({ id: i, ...puntuarCandidata(i, base) }))
    .sort((a, b) => b.afinidad - a.afinidad || b.score - a.score)[0];
};

/*
  La recomendación tiene que MOVERSE al sumar referencias. No crecer: la
  afinidad no es monótona —una base de 1 ya puede tener candidatas de afinidad
  10— y afirmar lo contrario sería inventar una propiedad que el motor no tiene.
  Lo que sí se sostiene es que el conjunto recomendado cambia.
*/
const cortes = [1, 3, 6, 8].map((n) => mejorCon(cadena.slice(0, n)));
const distintas = new Set(cortes.map((c) => c.id.id));
check("la recomendación cambia al agrandar la base, no queda clavada",
  distintas.size > 1,
  cortes.map((c, i) => `${[1,3,6,8][i]}→${c.id.nombre}`).join(" | "));

/* Y en particular sigue reaccionando MÁS ALLÁ de 3, que era el tope viejo. */
const con3 = mejorCon(cadena.slice(0, 3));
const con8 = mejorCon(cadena.slice(0, 8));
check("y sigue reaccionando más allá de 3, que era el tope viejo",
  con8.id.id !== con3.id.id || con8.afinidad !== con3.afinidad,
  `con 3: ${con3.id.nombre} (af${con3.afinidad}) | con 8: ${con8.id.nombre} (af${con8.afinidad})`);

/* El borde: con los 12 Sinners ocupados no queda candidata posible. */
const unoPorSinnerBase = SINNERS.map((s) => IDENTITIES.find((i) => i.sinner === s));
const usados12 = new Set(unoPorSinnerBase.map((i) => i.sinner));
check("con los 12 Sinners ocupados no hay candidatas, por definición",
  IDENTITIES.filter((i) => !usados12.has(i.sinner)).length === 0);

/* Y la selección tiene que tolerar llegar a 12 sin romper la regla de uno por Sinner. */
let seleccion = [];
IDENTITIES.forEach((i) => { seleccion = toggleSeleccion(seleccion, i.id, i.sinner, 12, IDENTITIES); });
const sinnersSel = new Set(seleccion.map((id) => IDENTITIES.find((i) => i.id === id).sinner));
check("marcando de a una se llega a 12 y nunca hay dos del mismo Sinner",
  seleccion.length === 12 && sinnersSel.size === 12,
  `${seleccion.length} elegidas, ${sinnersSel.size} Sinners`);

/*
  --- Orden de las candidatas ---

  Lo que se protege acá es que la afinidad temática ordene y el resto desempate.
  Antes se ordenaba por el total, y una ID que no comparte NADA con la base
  juntaba 8 o 9 puntos por resistencias (+2 por tipo) y pasivas destrabadas (+2
  cada una), mientras que compartir arquetipo vale +3. Con una colección chica,
  4 de las 8 recomendaciones no compartían nada con la base.
*/
const baseBleed = [];
for (const i of IDENTITIES.filter((x) => x.arquetipos.includes("Bleed")))
  if (!baseBleed.some((b) => b.sinner === i.sinner)) baseBleed.push(i);
const tresBleed = baseBleed.slice(0, 3);
const arqBase = new Set(tresBleed.flatMap((i) => i.arquetipos));
const sinnersBase = new Set(tresBleed.map((i) => i.sinner));

const puntuadas = IDENTITIES.filter((i) => !sinnersBase.has(i.sinner))
  .map((i) => ({ id: i, ...puntuarCandidata(i, tresBleed) }))
  .sort((a, b) => b.afinidad - a.afinidad || b.score - a.score);

check("puntuarCandidata separa la afinidad temática del total",
  puntuadas.every((c) => typeof c.afinidad === "number" && typeof c.score === "number"));

/* La invariante: ninguna sin afinidad puede quedar antes que una con afinidad. */
const primeraSinAfinidad = puntuadas.findIndex((c) => c.afinidad <= 0);
const ultimaConAfinidad = puntuadas.map((c) => c.afinidad > 0).lastIndexOf(true);
check("ninguna sin afinidad queda por encima de una que sí la tiene",
  primeraSinAfinidad === -1 || primeraSinAfinidad > ultimaConAfinidad,
  `primera sin afinidad en ${primeraSinAfinidad}, última con afinidad en ${ultimaConAfinidad}`);

check("y las que se muestran comparten arquetipo con la base",
  puntuadas.slice(0, 8).every((c) => c.id.arquetipos.some((a) => arqBase.has(a))),
  puntuadas.slice(0, 8).filter((c) => !c.id.arquetipos.some((a) => arqBase.has(a))).map((c) => c.id.nombre).join(", "));

/*
  El caso concreto que se rompía: una ID con buen total pero cero afinidad no
  puede ganarle a una con afinidad y total más bajo.
*/
const conAfin = puntuadas.filter((c) => c.afinidad > 0).at(-1);
const sinAfin = puntuadas.find((c) => c.afinidad <= 0 && c.score > conAfin.score);
check("una sin afinidad con MÁS puntaje total igual queda debajo",
  !sinAfin || puntuadas.indexOf(sinAfin) > puntuadas.indexOf(conAfin),
  sinAfin ? `${sinAfin.id.nombre} (${sinAfin.score}) vs ${conAfin.id.nombre} (${conAfin.score})` : "no hay caso en este dataset");

/*
  En «Qué me falta» el problema era otro: sumar un Sinner pesaba más que hacer
  lo que falta, y casi todas empataban, así que el orden visible era alfabético.
*/
const dxOrden = analizarArquetipo("Bleed", tresBleed, IDENTITIES);
check("las candidatas de «Qué me falta» exponen los criterios, no un peso opaco",
  dxOrden.candidatas.every((c) => "cumpleRol" in c && "sinnerNuevo" in c));
check("cumplir el rol que falta ordena antes que sumar un Sinner",
  dxOrden.candidatas.map((c) => Number(c.cumpleRol)).every((v, i, a) => i === 0 || a[i - 1] >= v));
check("y a igual rol, desempata el Sinner nuevo",
  dxOrden.candidatas
    .filter((c) => c.cumpleRol)
    .map((c) => Number(c.sinnerNuevo))
    .every((v, i, a) => i === 0 || a[i - 1] >= v));

/*
  --- Banca ---

  Lo que se mide acá es que la banca se calcule por SINNER y sobre la pasiva de
  SOPORTE. Las dos cosas son consecuencia de cómo funciona el juego, no
  preferencias: el equipo son 12 Sinners con uno cada uno, y la pasiva de
  combate solo corre si la ID está desplegada.
*/
const activos3 = [porId(10109), porId(10201), porId(10301)];
const bancaSug = sugerirBanca(activos3, IDENTITIES);

check("la banca es un lugar por cada Sinner que no entró",
  bancaSug.length === SINNERS.length - 3, `${bancaSug.length} lugares`);
check("y ninguno es de un Sinner que ya está peleando",
  bancaSug.every((b) => !activos3.some((a) => a.sinner === b.sinner)));
check("cada lugar propone una Identidad de ESE Sinner",
  bancaSug.every((b) => !b.mejor || b.mejor.id.sinner === b.sinner));

/*
  Lo central: la recomendación mira la pasiva de soporte, no la de combate. Si
  mirara la de combate estaría vendiendo algo que no va a pasar.
*/
check("el motivo habla de la pasiva de soporte, no de la de combate",
  bancaSug.some((b) => b.mejor?.motivos.some((m) => /soporte/i.test(m))),
  bancaSug.flatMap((b) => b.mejor?.motivos ?? []).slice(0, 3).join(" | "));
check("y expone el estado de esa pasiva contra los recursos del equipo",
  bancaSug.every((b) => !b.mejor || b.mejor.soporte.every((p) => "activa" in p)));

/* Con una colección vacía hay lugares pero sin nadie que los ocupe. */
const bancaVacia = sugerirBanca(activos3, []);
check("sin colección, los lugares quedan pero sin candidato",
  bancaVacia.length === SINNERS.length - 3 && bancaVacia.every((b) => b.mejor === null));

/* Con los 12 desplegados no queda banca. */
const unoPorSinner = SINNERS.map((s) => IDENTITIES.find((i) => i.sinner === s));
check("con los 12 peleando no hay banca", sugerirBanca(unoPorSinner, IDENTITIES).length === 0);

/* --- Velocidad --- */

const vel = perfilVelocidad([ring, salsu]);
check("el perfil de velocidad sale del rango real, no de un promedio inventado",
  vel.min === Math.min(ring.velocidad.min, salsu.velocidad.min) &&
  vel.max === Math.max(ring.velocidad.max, salsu.velocidad.max),
  JSON.stringify(vel));
check("un equipo vacío no rompe el perfil de velocidad",
  perfilVelocidad([]).max === null);




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
/*
  La ida y vuelta ya no es idéntica, a propósito: al decodificar se dan por
  tenidas las 12 base, así que un código viejo —hecho antes de que la app las
  marcara sola— no muestra 12 menos que la colección de su dueño. Lo que sí se
  conserva es todo lo que se codificó, y lo único que aparece de más son esas 12.
*/
check("decodificar devuelve todo lo que se codificó",
  vuelta.ok &&
  Object.keys(coleccionEjemplo.identities).map(Number).every((id) => vuelta.identities[id]) &&
  JSON.stringify(Object.keys(vuelta.egos).map(Number).sort((a, b) => a - b)) ===
    JSON.stringify(Object.keys(coleccionEjemplo.egos).map(Number).sort((a, b) => a - b)));
check("y lo único que agrega son las 12 base",
  Object.keys(vuelta.identities).map(Number)
    .filter((id) => !coleccionEjemplo.identities[id])
    .every((id) => IDS_BASE.includes(id)));

const todo = codificar({
  identities: Object.fromEntries(IDENTITIES.map((i) => [i.id, true])),
  egos: Object.fromEntries(EGOS.map((e) => [e.id, true])),
});
check("una colección COMPLETA entra en el mismo largo", todo.codigo.length === LARGO_CODIGO);
check("y decodifica las 184 + 110", (() => {
  const d = decodificar(todo.codigo);
  return d.ok && Object.keys(d.identities).length === 184 && Object.keys(d.egos).length === 110;
})());

check("una colección vacía va y vuelve con las 12 base y sin E.G.O",
  (() => {
    const d = decodificar(codificar({ identities: {}, egos: {} }).codigo);
    return d.ok && Object.keys(d.identities).length === IDS_BASE.length && Object.keys(d.egos).length === 0;
  })());

/*
  La propiedad que justifica el diseño: el código no depende de la posición en
  el array, así que agregar Identities nuevas no invalida los códigos viejos.
*/
check("un código sobrevive a que el dataset sume Identities nuevas", (() => {
  const antes = codificar({ identities: { 10109: true, 11216: true }, egos: {} }).codigo;
  const d = decodificar(antes);
  const extras = IDS_BASE.filter((id) => id !== 10109 && id !== 11216).length;
  return d.ok && d.identities[10109] && d.identities[11216] &&
    Object.keys(d.identities).length === 2 + extras;
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
  comp.identities === 40 + IDS_BASE.filter((id) => !coleccionEjemplo.identities[id]).length &&
  comp.egos === 15 && comp.propiasIdentities === 1,
  `${comp.identities} identities, ${comp.egos} egos`);
check("comparar detecta marcadas que tu dataset no conoce",
  comparar(decodificar(codificar({ identities: { 10117: true }, egos: {} }).codigo),
    { identities: {}, egos: {} },
    { idsConocidos: new Set(IDENTITIES.map((i) => i.id)), egosConocidos: new Set(EGOS.map((e) => e.id)) }
  ).desconocidas === 1);



/* --- Números de skill --- */

const todasLasSkills = IDENTITIES.flatMap((i) => i.skills);
const conNumeros = todasLasSkills.filter((s) => s.poderBase != null);
check("las 618 skills tienen números", conNumeros.length === 618 && todasLasSkills.length === 618,
  `${conNumeros.length} de ${todasLasSkills.length}`);
check("los números son coherentes",
  conNumeros.every((s) => s.poderBase > 0 && s.monedas >= 0 && s.valorMoneda != null && s.nombre));

/*
  Ancla de valores. Estos números venían de LCTeamBuilder y siguen iguales
  después de cambiar de fuente: son dos fuentes independientes coincidiendo,
  no una repitiéndose a sí misma.
*/
const skillsRing = porId(10109).skills;
check("Ring Yi Sang: los tres poderes base coinciden con las dos fuentes",
  skillsRing.find((s) => s.tier === 1)?.poderBase === 2 &&
  skillsRing.find((s) => s.tier === 2)?.poderBase === 8 &&
  skillsRing.find((s) => s.tier === 3)?.poderBase === 3);
check("Ring Yi Sang: las monedas también",
  skillsRing.find((s) => s.tier === 1)?.monedas === 3 &&
  skillsRing.find((s) => s.tier === 2)?.monedas === 1 &&
  skillsRing.find((s) => s.tier === 3)?.monedas === 4);
check("el número cae en el skill correcto, no en otro del mismo tier",
  skillsRing.find((s) => s.tier === 1)?.nombre === "Paint Over");

/*
  Lo que hace que el cruce sea exacto es el id: si el dump dejara de traerlo,
  o dejara de coincidir con el de la fuente, todo esto se cae en silencio.
*/
check("toda skill trae su id, que es por donde se cruza",
  todasLasSkills.every((s) => typeof s.id === "string" && s.id.length > 0));



/*
  --- Precedencia de fuentes ---

  Los 5 E.G.O que se habían transcrito a mano desde capturas del juego ahora
  vienen de la fuente automática. Se chequea que gane la automática Y que diga
  lo mismo que decía la captura: son dos transcripciones independientes del
  mismo dato, así que coincidir es la mejor validación que hay de las dos.
*/
const CAPTURADOS = { 20208: "Breath", 20209: "Doctor", 20609: "So is Writ, an Ode to Wine", 20810: "Abyssal Dance", 21209: "Wanderer" };

check("los E.G.O que estaban en capturas siguen con el mismo nombre de pasiva",
  Object.entries(CAPTURADOS).every(([id, nombre]) => EGOS.find((e) => e.id === Number(id))?.pasivas[0]?.nombre === nombre),
  Object.keys(CAPTURADOS).filter((id) => EGOS.find((e) => e.id === Number(id))?.pasivas[0]?.nombre !== CAPTURADOS[id]).join(","));
check("pero ahora los sirve la fuente automática, no la captura",
  Object.keys(CAPTURADOS).every((id) => EGOS.find((e) => e.id === Number(id))?.pasivas[0]?.fuente === "eldritchtools"));
check("no queda ninguna captura en uso, en E.G.O ni en Identities",
  EGOS.every((e) => e.pasivas.every((p) => p.fuente !== "captura")) &&
  IDENTITIES.every((i) => [...i.pasivas.combate, ...i.pasivas.soporte].every((p) => p.fuente !== "captura")));

console.log(fallos === 0 ? "\nTodo verde." : `\n${fallos} chequeo(s) fallando.`);
