import React, { useState, useMemo } from "react";
import { IDENTITIES } from "../data/identities.js";
import { ARQUETIPOS, SLOTS_DESPLIEGUE, colorArquetipo } from "../data/constants.js";
import { analizarArquetipo } from "../lib/engine.js";
import { ChipArquetipo } from "./Chips.jsx";
import Retrato from "./Retrato.jsx";
import { styles } from "../styles.js";

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
    <div style={styles.barraSinners} aria-label={`${cubiertos} de ${total} Sinners`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={i < cubiertos ? styles.barraLlena : styles.barraVacia} />
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
      <p style={styles.helpText}>
        Elegí un arquetipo y te digo qué te falta para armar un equipo de eso. Lo que manda
        no es cuántas Identidades tenés sino de cuántos <strong>Sinners distintos</strong>:
        se despliegan {SLOTS_DESPLIEGUE} y no puede haber dos del mismo.
      </p>

      <div style={styles.filtroRow}>
        {ARQUETIPOS.map((a) => (
          <ChipArquetipo
            key={a}
            arquetipo={a}
            onClick={(x) => setArquetipo((prev) => (prev === x ? null : x))}
            activo={arquetipo === a}
          />
        ))}
      </div>

      {!analisis && <p style={styles.helpText}>Elegí uno de los siete para ver el análisis.</p>}

      {analisis && (
        <>
          <h2 style={styles.sectionTitle}>Cómo estás de {analisis.arquetipo}</h2>

          <div style={styles.resumenFaltan}>
            <div>
              <div style={styles.numeroGrande}>
                {analisis.sinnersCubiertos.length}
                <span style={styles.numeroChico}> / {SLOTS_DESPLIEGUE}</span>
              </div>
              <div style={styles.reasonText}>Sinners cubiertos</div>
              <Barra cubiertos={Math.min(analisis.sinnersCubiertos.length, SLOTS_DESPLIEGUE)} total={SLOTS_DESPLIEGUE} />
            </div>
            <div>
              <div style={styles.numeroGrande}>{analisis.tuyas.length}</div>
              <div style={styles.reasonText}>
                Identidades tuyas de {analisis.arquetipo}
                {analisis.tuyas.length > analisis.sinnersCubiertos.length && (
                  <> — algunas comparten Sinner, así que no suman lugar</>
                )}
              </div>
            </div>
          </div>

          {analisis.faltanSinners === 0 ? (
            <div style={styles.avisoOk}>
              ✔ Podés armar un equipo entero de {analisis.arquetipo}: tenés{" "}
              {analisis.sinnersCubiertos.length} Sinners distintos.
            </div>
          ) : (
            <div style={styles.aviso}>
              Te faltan <strong>{analisis.faltanSinners}</strong>{" "}
              {analisis.faltanSinners === 1 ? "Sinner" : "Sinners"} para llenar los{" "}
              {SLOTS_DESPLIEGUE} lugares con este arquetipo.
            </div>
          )}

          {/* El rol es lo que aportó la capa de sinergia; sin eso esto sería solo un conteo. */}
          <p style={styles.helpText}>
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

          <h2 style={styles.sectionTitle}>Qué te convendría conseguir</h2>
          {analisis.candidatas.length === 0 ? (
            <p style={styles.helpText}>
              Ya tenés todas las Identidades de {analisis.arquetipo} que existen en el dataset.
            </p>
          ) : (
            <div style={styles.candidateList}>
              {analisis.candidatas.slice(0, CANDIDATAS_VISIBLES).map(({ id, motivos, sinnerNuevo }) => (
                <div
                  key={id.id}
                  style={{
                    ...styles.candidateCard,
                    borderLeft: `3px solid ${colorArquetipo(analisis.arquetipo).borde}`,
                    ...(sinnerNuevo ? {} : styles.candidataTibia),
                  }}
                >
                  <div style={styles.candidateHeader}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                      <Retrato id={id.id} nombre={id.nombre} arquetipos={id.arquetipos} tamano={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={styles.idName}>{id.nombre}</div>
                        <div style={styles.idTags}>
                          {id.sinner} · {"★".repeat(id.rareza)}
                          {id.fecha ? ` · ${id.fecha}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onVerDetalle(id)}
                      style={styles.botonFicha}
                      aria-label={`Ver la ficha de ${id.nombre}`}
                    >
                      ficha
                    </button>
                  </div>
                  {motivos.map((m, i) => (
                    <div key={i} style={styles.reasonText}>{m}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <p style={styles.helpText}>
            Esto sale del arquetipo oficial y del rol derivado de las pasivas. No sabe nada de
            qué banner está activo ni de cuál es el meta: te dice qué le falta a tu colección,
            no qué conviene sacar este mes.
          </p>
        </>
      )}
    </section>
  );
}
