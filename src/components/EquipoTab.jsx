import React from "react";
import {
  DAMAGE_TYPES, DAMAGE_LABEL, SIN_LABEL, SLOTS_DESPLIEGUE, etiquetaResistencia,
} from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import { CostoSin } from "./EgoCard.jsx";
import { styles } from "../styles.js";

export default function EquipoTab({
  ownedIdentities, equipoIds, onToggle, orden, recursos, resistencias, arquetipos, pasivas,
  egosEquipo, tieneEgos, max,
}) {
  if (ownedIdentities.length === 0) {
    return (
      <p style={styles.helpText}>
        Todavía no marcaste Identidades como propias en la pestaña Colección.
      </p>
    );
  }

  const arquetiposActivos = Object.entries(arquetipos).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const sinsActivos = Object.entries(recursos).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

  return (
    <section>
      <p style={styles.helpText}>
        Elegí hasta {max} Identidades (una por Sinner). Las primeras{" "}
        <strong>{SLOTS_DESPLIEGUE}</strong> del orden entran a combate; el resto queda en banca y
        sigue aportando su pasiva de soporte.
      </p>

      <div style={styles.idGrid}>
        {ownedIdentities.map((id) => (
          <IdCard
            key={id.id}
            id={id}
            checked={equipoIds.includes(id.id)}
            onChange={() => onToggle(id.id, id.sinner)}
            estiloActivo={styles.idCardSelected}
            mostrarSinner
          />
        ))}
      </div>

      {equipoIds.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Orden tentativo</h2>
          <div style={styles.aviso}>
            ⚠️ Heurística, no dato verificado. El dataset no tiene ningún campo que diga qué ID
            conviene desplegar primero — eso es contenido curado, no dato del juego. El criterio
            usado acá es: primero quienes más recursos de Sin aportan a las pasivas que el equipo
            necesita.
          </div>
          <ol style={styles.orderList}>
            {orden.map((entrada, idx) => (
              <li
                key={entrada.id.id}
                style={{ ...styles.orderItem, ...(entrada.banca ? styles.orderItemBanca : {}) }}
              >
                <div style={styles.orderNumber}>{idx + 1}</div>
                <div>
                  <div style={styles.idName}>
                    {entrada.id.nombre}
                    {entrada.banca && <span style={styles.bancaTag}>banca</span>}
                  </div>
                  <div style={styles.reasonText}>{entrada.motivo}</div>
                </div>
              </li>
            ))}
          </ol>

          <h2 style={styles.sectionTitle}>Pasivas que se activan</h2>
          <p style={styles.helpText}>
            <strong>{pasivas.activas}</strong> de {pasivas.totales} pasivas del equipo llegan a su
            costo de recursos de Sin. Es una estimación basada en las afinidades de las skills.
          </p>

          <h2 style={styles.sectionTitle}>E.G.O disponibles</h2>
          {!tieneEgos ? (
            <p style={styles.helpText}>
              No marcaste ningún E.G.O en tu colección todavía.
            </p>
          ) : egosEquipo.length === 0 ? (
            <p style={styles.helpText}>
              Ninguno de tus E.G.O pertenece a los {SLOTS_DESPLIEGUE} Sinners desplegados. Los de la
              banca no se pueden usar.
            </p>
          ) : (
            <>
              <p style={styles.helpText}>
                Solo los de Sinners desplegados. Si alcanza o no es una estimación sobre los
                recursos que genera el equipo, igual que con las pasivas.
              </p>
              <div style={styles.candidateList}>
                {egosEquipo.map(({ ego, alcanza, faltantes }) => (
                  <div
                    key={ego.id}
                    style={{ ...styles.candidateCard, ...(alcanza ? {} : styles.egoNoAlcanza) }}
                  >
                    <div style={styles.candidateHeader}>
                      <div style={styles.idName}>{ego.nombre}</div>
                      <div style={alcanza ? styles.egoOk : styles.egoFalta}>
                        {alcanza ? "alcanza" : "no alcanza"}
                      </div>
                    </div>
                    <div style={styles.idTags}>
                      {[ego.sinner, ego.rango, ...ego.arquetipos].join(" · ")}
                    </div>
                    <CostoSin costo={ego.costo} faltantes={faltantes} />
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 style={styles.sectionTitle}>Recursos de Sin (6 desplegados)</h2>
          {sinsActivos.length === 0 ? (
            <p style={styles.helpText}>Sin recursos todavía.</p>
          ) : (
            <div style={styles.resRow}>
              {sinsActivos.map(([sin, count]) => (
                <div key={sin} style={styles.resPill}>
                  <span>{SIN_LABEL[sin] ?? sin}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}

          <h2 style={styles.sectionTitle}>Resistencias (6 desplegados)</h2>
          <div style={styles.resRow}>
            {DAMAGE_TYPES.map((t) => (
              <div key={t} style={styles.resPill}>
                <span>{DAMAGE_LABEL[t]}</span>
                <strong>{etiquetaResistencia(resistencias[t].peor)}</strong>
                {resistencias[t].blandos > 0 && (
                  <span style={styles.resDetalle}>
                    ({resistencias[t].blandos} de {resistencias[t].total} flojos)
                  </span>
                )}
              </div>
            ))}
          </div>

          <h2 style={styles.sectionTitle}>Arquetipos del equipo</h2>
          {arquetiposActivos.length === 0 ? (
            <p style={styles.helpText}>Ninguna de las elegidas tiene arquetipo marcado.</p>
          ) : (
            <div style={styles.resRow}>
              {arquetiposActivos.map(([a, c]) => (
                <div key={a} style={styles.resPill}>
                  <span>{a}</span>
                  <strong>{c}</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
