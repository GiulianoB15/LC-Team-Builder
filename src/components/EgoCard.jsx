import React from "react";
import { SIN_LABEL } from "../data/constants.js";
import { styles } from "../styles.js";

/* Costo en recursos de Sin, en el orden en que viene (de mayor a menor). */
export function CostoSin({ costo, faltantes = [] }) {
  const falta = new Set(faltantes.map((f) => f.sin));
  return (
    <span style={styles.costoRow}>
      {costo.map((c) => (
        <span
          key={c.sin}
          style={{ ...styles.costoPill, ...(falta.has(c.sin) ? styles.costoPillFalta : {}) }}
          title={falta.has(c.sin) ? "El equipo no llega a este costo" : undefined}
        >
          {SIN_LABEL[c.sin] ?? c.sin} {c.cantidad}
        </span>
      ))}
    </span>
  );
}

export default function EgoCard({ ego, checked, onChange, mostrarSinner, deshabilitado }) {
  const detalle = [
    mostrarSinner ? ego.sinner : null,
    ego.rango,
    ...(ego.arquetipos.length ? ego.arquetipos : []),
  ].filter(Boolean);

  return (
    <label style={{ ...styles.idCard, ...(checked ? styles.idCardOwned : {}), ...(deshabilitado ? styles.cardSoloLectura : {}) }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={deshabilitado} style={styles.checkbox} />
      <div style={{ flex: 1 }}>
        <div style={styles.idName}>
          {ego.nombre}
          {/* Los E.G.O posteriores al corte de LCTeamBuilder no tienen pasiva. */}
          {!ego.tienePasiva && <span style={styles.sinDatos} title="Sin datos de pasiva">sin pasiva</span>}
        </div>
        <div style={styles.idTags}>{detalle.join(" · ")}</div>
        <CostoSin costo={ego.costo} />
      </div>
    </label>
  );
}
