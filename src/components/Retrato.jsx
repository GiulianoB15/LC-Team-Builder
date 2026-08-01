import React, { useState } from "react";
import { colorArquetipo } from "../data/constants.js";
import manifiesto from "../data/retratos.json";

/*
  Retrato de una Identity o E.G.O.

  Las imágenes las baja scripts/fetch-imagenes.mjs a public/retratos/<id>.webp.
  Si no están —porque nunca se corrió el script, o porque esa en particular no
  existe en la fuente— se muestra un marcador con las iniciales en el color del
  arquetipo. Nunca queda un hueco roto ni un ícono de imagen fallida.
*/

const iniciales = (nombre) =>
  String(nombre)
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

/*
  Set de ids con retrato bajado. Se consulta ANTES de renderizar el <img>: sin
  esto, con las imágenes sin descargar la app dispara ~300 pedidos fallidos y
  llena la consola de 404.
*/
const DISPONIBLES = new Set(manifiesto.ids ?? []);

export default function Retrato({ id, nombre, arquetipos = [], tamano = 44 }) {
  const [falla, setFalla] = useState(false);
  const color = arquetipos.length ? colorArquetipo(arquetipos[0]) : colorArquetipo(null);

  /* El tamaño es un dato del que llama, así que va inline; el resto es CSS. */
  const caja = { width: tamano, height: tamano, minWidth: tamano };

  if (falla || !DISPONIBLES.has(id)) {
    return (
      <div
        className="retrato retrato-vacio"
        style={{ ...caja, background: color.chip, color: color.borde, fontSize: tamano * 0.32 }}
        aria-hidden="true"
      >
        {iniciales(nombre)}
      </div>
    );
  }

  return (
    <img
      // BASE_URL respeta el subdirectorio de GitHub Pages sin hardcodearlo.
      src={`${import.meta.env.BASE_URL}retratos/${id}.webp`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFalla(true)}
      className="retrato"
      style={caja}
    />
  );
}
