import React from "react";
import { SIN_LABEL, colorArquetipo } from "../data/constants.js";
import { ChipArquetipo } from "./Chips.jsx";
import Retrato from "./Retrato.jsx";
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

export default function EgoCard({
  ego, checked, onChange, mostrarSinner, deshabilitado,
  onFiltrarArquetipo, arquetiposActivos,
}) {
  const acento = ego.arquetipos.length ? colorArquetipo(ego.arquetipos[0]).borde : null;

  return (
    <label
      style={{
        ...styles.idCard,
        ...(checked ? styles.idCardOwned : {}),
        ...(deshabilitado ? styles.cardSoloLectura : {}),
        ...(acento ? { borderLeft: `3px solid ${acento}` } : {}),
      }}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={deshabilitado} style={styles.checkbox} />
      <Retrato id={ego.id} nombre={ego.nombre} arquetipos={ego.arquetipos} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.idName}>
          {ego.nombre}
          <span style={styles.rango}>{ego.rango}</span>
          {/* Los E.G.O posteriores al corte de LCTeamBuilder no tienen pasiva. */}
          {!ego.tienePasiva && <span style={styles.sinDatos} title="Sin datos de pasiva">sin pasiva</span>}
        </div>

        {mostrarSinner && <div style={styles.idTags}>{ego.sinner}</div>}

        <div style={styles.chipRow}>
          {ego.arquetipos.map((a) => (
            <ChipArquetipo
              key={a}
              arquetipo={a}
              onClick={onFiltrarArquetipo}
              activo={arquetiposActivos?.has(a)}
            />
          ))}
        </div>

        <CostoSin costo={ego.costo} />
      </div>
    </label>
  );
}
