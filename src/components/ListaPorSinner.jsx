import React, { useState, useMemo, useCallback } from "react";
import { SINNERS } from "../data/constants.js";
import { colorSinner } from "../data/colores.js";
import IdCard from "./IdCard.jsx";
import { cx } from "../lib/cx.js";

/*
  Las Identidades propias, agrupadas por Sinner y plegables.

  POR QUÉ NO ES LA GRILLA PELADA

  «Armar equipo» y «Completar equipo» mostraban todo lo que tenés en una sola
  grilla corrida. Con una colección chica se lee bien; con una grande es un
  muro de tarjetas donde encontrar al Sinner que buscás es scrollear hasta
  verlo. Y como en las dos pestañas la regla es UNA por Sinner, el Sinner es
  justamente la unidad con la que uno piensa.

  DOS DIFERENCIAS CON EL ACORDEÓN DE COLECCIÓN

  1. Acá se muestran solo los Sinners de los que tenés algo. En Colección la
     lista es fija de 12 a propósito, porque ahí ver el hueco es el punto; acá
     un Sinner sin nada no es información, es un renglón que no se puede usar.

  2. El encabezado dice a quién elegiste. Sin eso habría que abrir los doce
     para saber cómo viene el equipo, que es exactamente lo que el plegado
     venía a evitar.
*/
export default function ListaPorSinner({
  identities, seleccionadas, onToggle, claseActiva, onVerDetalle,
}) {
  const [abiertos, setAbiertos] = useState(new Set());

  /* Solo los Sinners con algo, en el orden oficial y no en el del dataset. */
  const grupos = useMemo(() => {
    const porSinner = new Map();
    identities.forEach((i) => {
      if (!porSinner.has(i.sinner)) porSinner.set(i.sinner, []);
      porSinner.get(i.sinner).push(i);
    });
    return SINNERS.filter((s) => porSinner.has(s)).map((s) => [s, porSinner.get(s)]);
  }, [identities]);

  const alternar = useCallback(
    (sinner) =>
      setAbiertos((prev) => {
        const next = new Set(prev);
        next.has(sinner) ? next.delete(sinner) : next.add(sinner);
        return next;
      }),
    []
  );

  const todosAbiertos = abiertos.size === grupos.length && grupos.length > 0;

  return (
    <>
      <div className="barra-acciones">
        <span className="resultado">
          {identities.length} {identities.length === 1 ? "Identidad tuya" : "Identidades tuyas"} en{" "}
          {grupos.length} {grupos.length === 1 ? "Sinner" : "Sinners"}
        </span>
        <button
          onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(grupos.map(([s]) => s)))}
          className="boton-chico"
        >
          {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
        </button>
      </div>

      {grupos.map(([sinner, delSinner]) => {
        const abierto = abiertos.has(sinner);
        const color = colorSinner(sinner);
        const elegida = delSinner.find((x) => seleccionadas.includes(x.id));

        return (
          <div key={sinner} className="sinner-block">
            <button
              onClick={() => alternar(sinner)}
              className="sinner-header"
              aria-expanded={abierto}
              style={{ "--sinner": color.acento, "--sinner-tenue": color.tenue }}
              title={color.nombre ? `${sinner} — ${color.nombre}` : sinner}
            >
              <span>
                <span className="flecha">{abierto ? "▾" : "▸"}</span> {sinner}
              </span>
              <span className="sinner-elegida">
                {elegida ? (
                  <span className="elegida-nombre">✓ {elegida.nombre}</span>
                ) : (
                  <span className="sinner-count">{delSinner.length} para elegir</span>
                )}
              </span>
            </button>

            {abierto && (
              <div className="id-grid">
                {delSinner.map((x) => (
                  <IdCard
                    key={x.id}
                    id={x}
                    checked={seleccionadas.includes(x.id)}
                    onChange={onToggle}
                    claseActiva={claseActiva}
                    onVerDetalle={onVerDetalle}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
