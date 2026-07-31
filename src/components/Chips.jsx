import React from "react";
import { colorArquetipo } from "../data/constants.js";
import { styles } from "../styles.js";

/* Etiqueta de arquetipo, coloreada para poder escanear la lista de un vistazo. */
export function ChipArquetipo({ arquetipo, onClick, activo }) {
  const c = colorArquetipo(arquetipo);
  return (
    <span
      onClick={onClick ? (e) => { e.preventDefault(); onClick(arquetipo); } : undefined}
      style={{
        ...styles.chip,
        background: activo ? c.borde : c.chip,
        color: activo ? "#12111a" : c.borde,
        borderColor: c.borde,
        cursor: onClick ? "pointer" : "default",
        fontWeight: activo ? 600 : 400,
      }}
    >
      {arquetipo}
    </span>
  );
}

/*
  Facción. Clickeable: tocar "Blade Lineage" filtra por esa facción, que es la
  forma más rápida de encontrar un núcleo temático sin tipear.
*/
export function ChipFaccion({ faccion, onClick, activo }) {
  return (
    <span
      onClick={onClick ? (e) => { e.preventDefault(); onClick(faccion); } : undefined}
      style={{
        ...styles.chip,
        ...styles.chipFaccion,
        ...(activo ? styles.chipFaccionActiva : {}),
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {faccion}
    </span>
  );
}
