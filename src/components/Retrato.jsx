import React, { useState } from "react";
import { colorArquetipo } from "../data/constants.js";
import manifiesto from "../data/retratos.json";
import { cx } from "../lib/cx.js";

/*
  Retrato de una Identity o E.G.O.

  Las imágenes las baja scripts/fetch-imagenes.mjs a public/retratos/<id>.webp.
  Si no están —porque nunca se corrió el script, o porque esa en particular no
  existe en la fuente— se muestra un marcador con las iniciales en el color del
  arquetipo. Nunca queda un hueco roto ni un ícono de imagen fallida.

  POR QUÉ VARIANTE Y NO UN NÚMERO DE PÍXELES

  Antes recibía `tamano={44}` y lo aplicaba inline. Eso funcionaba hasta que
  apareció la densidad elegible: un estilo inline le gana a cualquier regla de
  CSS, así que con el tamaño escrito en el elemento no había forma de que el
  modo compacto lo achicara.

  Ahora la variante es una clase y el tamaño sale de una custom property, que
  el modo compacto puede redefinir desde arriba. El componente dice para qué es
  el retrato; cuánto mide lo decide el CSS.
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

export default function Retrato({ id, nombre, arquetipos = [], variante = "lista" }) {
  const [falla, setFalla] = useState(false);
  const color = arquetipos.length ? colorArquetipo(arquetipos[0]) : colorArquetipo(null);

  const clases = cx("retrato", `retrato-${variante}`);

  if (falla || !DISPONIBLES.has(id)) {
    return (
      <div
        className={cx(clases, "retrato-vacio")}
        style={{ background: color.chip, color: color.borde }}
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
      className={clases}
    />
  );
}
