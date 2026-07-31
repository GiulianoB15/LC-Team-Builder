import React from "react";
import { colorArquetipo } from "../data/constants.js";
import { styles } from "../styles.js";

/*
  Los chips nacieron como etiqueta decorativa y después se les colgó un onClick
  para filtrar. Un <span> clickeable no lo alcanza el tabulador ni lo anuncia un
  lector de pantalla, y en la pestaña «Qué me falta» los chips no son un atajo
  sino el ÚNICO control: sin esto, esa pantalla no se puede usar con teclado.

  Así que cuando hay onClick se comportan como botón —role, foco, Enter y
  espacio— y cuando no, siguen siendo texto y no ensucian el recorrido de
  tabulación con paradas que no hacen nada.

  `navegable` existe por una razón concreta: los chips que van DENTRO de cada
  tarjeta también filtran, pero son un atajo del mismo filtro que ya está en la
  barra de arriba. Con 184 tarjetas, meterlos a todos en el recorrido de
  tabulación lo vuelve inservible —cientos de paradas para llegar a la lista—,
  así que van con tabIndex -1: se siguen pudiendo clickear y el lector de
  pantalla los sigue anunciando como botón, pero no se tabula por ellos. La
  barra de filtros, que es la vía completa, sí es navegable.
*/
function propsClickeable(onClick, valor, navegable) {
  if (!onClick) return {};
  const activar = (e) => {
    e.preventDefault();
    onClick(valor);
  };
  return {
    onClick: activar,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") activar(e);
    },
    role: "button",
    tabIndex: navegable ? 0 : -1,
  };
}

/* Etiqueta de arquetipo, coloreada para poder escanear la lista de un vistazo. */
export function ChipArquetipo({ arquetipo, onClick, activo, navegable = true }) {
  const c = colorArquetipo(arquetipo);
  return (
    <span
      {...propsClickeable(onClick, arquetipo, navegable)}
      aria-pressed={onClick ? !!activo : undefined}
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
export function ChipFaccion({ faccion, onClick, activo, navegable = true }) {
  return (
    <span
      {...propsClickeable(onClick, faccion, navegable)}
      aria-pressed={onClick ? !!activo : undefined}
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
