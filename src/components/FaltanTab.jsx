import React, { useState, useMemo } from "react";
import { IDENTITIES } from "../data/identities.js";
import { ARQUETIPOS, SLOTS_DESPLIEGUE, colorArquetipo } from "../data/constants.js";
import { analizarArquetipo } from "../lib/engine.js";
import { ChipArquetipo } from "./Chips.jsx";
import Retrato from "./Retrato.jsx";
import { cx } from "../lib/cx.js";

/*
  El inverso de «Completar equipo»: esa arma con lo que tenés, esta te dice qué
  te falta. Sirve para decidir dónde gastar, no para jugar hoy.

  Se muestran Identidades que NO tenés, así que es la única vista donde el
  marcador de iniciales aparece seguido: los retratos están bajados para las 184,
  pero igual conviene que se note que son ajenas.
*/

const CANDIDATAS_VISIBLES = 8;

function Barra({ cubiertos, total }) {
  return (
    <div className="barra-sinners" aria-label={`${cubiertos} de ${total} Sinners`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx("barra-tramo", i < cubiertos && "llena")} />
      ))}
    </div>
  );
}

export default function FaltanTab({ ownedIdentities, onVerDetalle }) {
  const [arquetipo, setArquetipo] = useState(null);

  const analisis = useMemo(
    () => (arquetipo ? analizarArquetipo(arquetipo, ownedIdentities, IDENTITIES) : null),
    [arquetipo, ownedIdentities]
  );

  return (
    <section>
      <p className="ayuda">
        Elegí un arquetipo y te digo qué te falta para armar un equipo de eso. Lo que manda
        no es cuántas Identidades tenés sino de cuántos <strong>Sinners distintos</strong>:
        se despliegan {SLOTS_DESPLIEGUE} y no puede haber dos del mismo.
      </p>

      <div className="filtro-row">
        {ARQUETIPOS.map((a) => (
          <ChipArquetipo
            key={a}
            arquetipo={a}
            onClick={(x) => setArquetipo((prev) => (prev === x ? null : x))}
            activo={arquetipo === a}
          />
        ))}
      </div>

      {!analisis && <p className="ayuda">Elegí uno de los siete para ver el análisis.</p>}

      {analisis && (
        <>
          <h2 className="titulo-seccion">Cómo estás de {analisis.arquetipo}</h2>

          <div className="resumen-faltan">
            <div>
              <div className="numero-grande">
                {analisis.sinnersCubiertos.length}
                <span className="numero-chico"> / {SLOTS_DESPLIEGUE}</span>
              </div>
              <div className="motivo">Sinners cubiertos</div>
              <Barra cubiertos={Math.min(analisis.sinnersCubiertos.length, SLOTS_DESPLIEGUE)} total={SLOTS_DESPLIEGUE} />
            </div>
            <div>
              <div className="numero-grande">{analisis.tuyas.length}</div>
              <div className="motivo">
                Identidades tuyas de {analisis.arquetipo}
                {analisis.tuyas.length > analisis.sinnersCubiertos.length && (
                  <> — algunas comparten Sinner, así que no suman lugar</>
                )}
              </div>
            </div>
          </div>

          {analisis.faltanSinners === 0 ? (
            <div className="aviso-ok">
              ✔ Podés armar un equipo entero de {analisis.arquetipo}: tenés{" "}
              {analisis.sinnersCubiertos.length} Sinners distintos.
            </div>
          ) : (
            <div className="aviso">
              Te faltan <strong>{analisis.faltanSinners}</strong>{" "}
              {analisis.faltanSinners === 1 ? "Sinner" : "Sinners"} para llenar los{" "}
              {SLOTS_DESPLIEGUE} lugares con este arquetipo.
            </div>
          )}

          {/* El rol es lo que aportó la capa de sinergia; sin eso esto sería solo un conteo. */}
          <p className="ayuda">
            De las tuyas, <strong>{analisis.aplican.length}</strong> aplican {analisis.arquetipo} y{" "}
            <strong>{analisis.leen.length}</strong> lo aprovechan.
            {analisis.rolBuscado === "aplica" && (
              <> Ninguna lo inflige, así que lo que más te rinde es sumar alguien que lo aplique.</>
            )}
            {analisis.rolBuscado === "lee" && (
              <> Nadie lo cobra, así que el estado se aplica y se desaprovecha.</>
            )}
            {analisis.rolBuscado === null && analisis.tuyas.length > 0 && (
              <> Tenés los dos roles cubiertos.</>
            )}
          </p>

          <h2 className="titulo-seccion">Qué te convendría conseguir</h2>
          {analisis.candidatas.length === 0 ? (
            <p className="ayuda">
              Ya tenés todas las Identidades de {analisis.arquetipo} que existen en el dataset.
            </p>
          ) : (
            <div className="candidata-lista">
              {analisis.candidatas.slice(0, CANDIDATAS_VISIBLES).map(({ id, motivos, sinnerNuevo }) => (
                <div
                  key={id.id}
                  className={cx("candidata", !sinnerNuevo && "tibia")}
                  style={{ "--acento": colorArquetipo(analisis.arquetipo).borde }}
                >
                  <div className="candidata-header">
                    <div className="fila">
                      <Retrato id={id.id} nombre={id.nombre} arquetipos={id.arquetipos} tamano={34} />
                      <div style={{ minWidth: 0 }}>
                        <div className="id-nombre">{id.nombre}</div>
                        <div className="id-tags">
                          {id.sinner} · {"★".repeat(id.rareza)}
                          {id.fecha ? ` · ${id.fecha}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onVerDetalle(id)}
                      className="boton-ficha"
                      aria-label={`Ver la ficha de ${id.nombre}`}
                    >
                      ficha
                    </button>
                  </div>
                  {motivos.map((m, i) => (
                    <div key={i} className="motivo">{m}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <p className="ayuda">
            Esto sale del arquetipo oficial y del rol derivado de las pasivas. No sabe nada de
            qué banner está activo ni de cuál es el meta: te dice qué le falta a tu colección,
            no qué conviene sacar este mes.
          </p>
        </>
      )}
    </section>
  );
}
