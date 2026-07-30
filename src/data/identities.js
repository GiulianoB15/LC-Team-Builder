import dataset from "./identities.json";
import egosDataset from "./egos.json";
import { SINS, SINNERS, DAMAGE_TYPES } from "./constants.js";

/*
  El dataset lo genera scripts/build-dataset.mjs desde el repo de LCTeamBuilder
  (MIT, © 2024 SuenoImposible). No se edita a mano: si hay que corregir algo,
  se corrige el conversor y se vuelve a generar.

  Regla del proyecto: no se completan datos de memoria. Todo lo que hay acá sale
  de esa fuente, incluidos los arquetipos, que se derivan del texto de skills y
  pasivas del propio juego.
*/
export const META = dataset.meta;
export const IDENTITIES = dataset.identities;
export const EGOS = egosDataset.egos;

export const identityPorId = (id) => IDENTITIES.find((i) => i.id === id) ?? null;

/*
  Índice por nombre+sinner, para migrar guardados viejos que usaban claves de
  texto. La comparación normaliza espacios y mayúsculas: las fuentes escriben el
  mismo nombre distinto ("LCE E.G.O::Dimension Shredder" vs "LCE E.G.O:: …").
*/
const normalizar = (s) => String(s).replace(/\s+/g, " ").replace(/\s*::\s*/g, "::").trim().toLowerCase();

export function identityPorNombre(nombre, sinner) {
  const objetivo = normalizar(nombre);
  return IDENTITIES.find(
    (i) => normalizar(i.nombre) === objetivo && (!sinner || i.sinner === sinner)
  ) ?? null;
}

export function validateIdentities(list = IDENTITIES) {
  const problemas = [];
  const vistos = new Set();

  list.forEach((id) => {
    if (vistos.has(id.id)) problemas.push(`id duplicado: ${id.id}`);
    vistos.add(id.id);

    if (!SINNERS.includes(id.sinner)) {
      problemas.push(`${id.id}: sinner "${id.sinner}" no está en la lista de 12`);
    }
    DAMAGE_TYPES.forEach((t) => {
      const v = id.resistencias?.[t];
      if (typeof v !== "number" || v <= 0) {
        problemas.push(`${id.id}: resistencia "${t}" inválida ("${v}")`);
      }
    });
    id.skills.forEach((s) => {
      if (s.sin && !SINS.includes(s.sin)) {
        problemas.push(`${id.id}: skill "${s.nombre}" con Sin inválido ("${s.sin}")`);
      }
    });
    [...id.pasivas.combate, ...id.pasivas.soporte].forEach((p) => {
      p.costo.forEach((c) => {
        if (c.sin && !SINS.includes(c.sin)) {
          problemas.push(`${id.id}: pasiva "${p.nombre}" con Sin de costo inválido ("${c.sin}")`);
        }
      });
    });
  });

  return problemas;
}

if (import.meta.env?.DEV) {
  const problemas = validateIdentities();
  if (problemas.length) {
    console.warn("[Limbus Docket] Problemas en el dataset:\n" + problemas.join("\n"));
  }
}
