import React, { useState, useMemo, useCallback } from "react";
import { SINNERS } from "../data/constants.js";
import { colorSinner } from "../data/colores.js";
import IdCard from "./IdCard.jsx";
import Vacio from "./Vacio.jsx";
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
const coincide = (texto, q) => String(texto ?? "").toLowerCase().includes(q);

export default function ListaPorSinner({
  identities, seleccionadas, onToggle, claseActiva, onVerDetalle,
}) {
  const [abiertos, setAbiertos] = useState(new Set());
  const [filtro, setFiltro] = useState("");

  const q = filtro.trim().toLowerCase();
  const hayFiltro = q !== "";

  /*
    Buscar acá y no solo en Colección: con más de cien Identidades propias,
    elegir era scrollear hasta encontrar. Colección tenía buscador, chips de
    arquetipo, de rol y de facción; las dos pestañas donde realmente DECIDÍS
    no tenían nada.

    Alcanza con nombre, Sinner, arquetipo y facción, que es por donde uno busca
    a alguien. Los chips de rol se quedan en Colección: ahí explorás, acá ya
    sabés a quién querés.
  */
  const visibles = useMemo(() => {
    if (!hayFiltro) return identities;
    return identities.filter(
      (x) =>
        coincide(x.nombre, q) ||
        coincide(x.sinner, q) ||
        x.arquetipos.some((a) => coincide(a, q)) ||
        (x.etiquetas ?? []).some((f) => coincide(f, q))
    );
  }, [identities, q, hayFiltro]);

  /* Solo los Sinners con algo, en el orden oficial y no en el del dataset. */
  const grupos = useMemo(() => {
    const porSinner = new Map();
    visibles.forEach((i) => {
      if (!porSinner.has(i.sinner)) porSinner.set(i.sinner, []);
      porSinner.get(i.sinner).push(i);
    });
    return SINNERS.filter((s) => porSinner.has(s)).map((s) => [s, porSinner.get(s)]);
  }, [visibles]);

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

  /*
    Buscando, los bloques se abren solos. Filtrar y que igual haya que abrir a
    mano cada Sinner para ver el resultado sería pedir dos veces lo mismo.
  */
  const estaAbierto = (sinner) => hayFiltro || abiertos.has(sinner);

  return (
    <>
      <input
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar entre las tuyas por nombre, Sinner, arquetipo o facción"
        className="buscador"
      />

      <div className="barra-acciones">
        <span className="resultado">
          {hayFiltro
            ? `${visibles.length} de ${identities.length} tuyas`
            : `${identities.length} ${identities.length === 1 ? "Identidad tuya" : "Identidades tuyas"}`}
          {" en "}
          {grupos.length} {grupos.length === 1 ? "Sinner" : "Sinners"}
        </span>
        {hayFiltro ? (
          <button onClick={() => setFiltro("")} className="boton-chico">Limpiar búsqueda</button>
        ) : (
          <button
            onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(grupos.map(([s]) => s)))}
            className="boton-chico"
          >
            {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
          </button>
        )}
      </div>

      {grupos.length === 0 && (
        <Vacio
          marca="◇"
          titulo="Nada tuyo coincide con esa búsqueda"
          accion={<button onClick={() => setFiltro("")} className="boton-primario">Limpiar búsqueda</button>}
        >
          Se busca solo entre las Identidades que tenés. Si esperabas encontrar una que no
          marcaste todavía, está en Colección.
        </Vacio>
      )}

      {grupos.map(([sinner, delSinner]) => {
        const abierto = estaAbierto(sinner);
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
