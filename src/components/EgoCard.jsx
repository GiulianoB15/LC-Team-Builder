import React from "react";
import { SIN_LABEL, colorArquetipo } from "../data/constants.js";
import { ChipArquetipo } from "./Chips.jsx";
import Retrato from "./Retrato.jsx";
import { cx } from "../lib/cx.js";

/* Costo en recursos de Sin, en el orden en que viene (de mayor a menor). */
export function CostoSin({ costo, faltantes = [] }) {
  const falta = new Set(faltantes.map((f) => f.sin));
  return (
    <span className="costo-row">
      {costo.map((c) => (
        <span
          key={c.sin}
          className={cx("costo-pill", falta.has(c.sin) && "falta")}
          title={falta.has(c.sin) ? "El equipo no llega a este costo" : undefined}
        >
          {SIN_LABEL[c.sin] ?? c.sin} {c.cantidad}
        </span>
      ))}
    </span>
  );
}

function EgoCard({
  ego, checked, onChange, mostrarSinner, deshabilitado,
  onFiltrarArquetipo, arquetiposActivos,
}) {
  const acento = ego.arquetipos.length ? colorArquetipo(ego.arquetipos[0]).borde : null;

  return (
    <label
      className={cx("id-card", checked && "tenida", deshabilitado && "solo-lectura")}
      style={acento ? { "--acento": acento } : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(ego.id, ego.sinner)}
        disabled={deshabilitado}
        className="checkbox"
      />
      <Retrato id={ego.id} nombre={ego.nombre} arquetipos={ego.arquetipos} />
      <div className="fila-crece">
        <div className="id-nombre">
          {ego.nombre}
          <span className="rango">{ego.rango}</span>
          {/*
            Hoy los 110 tienen pasiva, pero el badge se queda: si mañana entra
            un E.G.O nuevo antes de que la fuente lo publique, tiene que
            notarse en la tarjeta y no pasar por completo.
          */}
          {!ego.tienePasivas && <span className="sin-datos" title="Sin datos de pasiva">sin pasiva</span>}
        </div>

        {mostrarSinner && <div className="id-tags">{ego.sinner}</div>}

        <div className="chip-row">
          {ego.arquetipos.map((a) => (
            <ChipArquetipo
              key={a}
              arquetipo={a}
              onClick={onFiltrarArquetipo}
              activo={arquetiposActivos?.has(a)}
              navegable={false}
            />
          ))}
        </div>

        <CostoSin costo={ego.costo} />
      </div>
    </label>
  );
}

export default React.memo(EgoCard);
