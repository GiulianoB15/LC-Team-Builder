import React from "react";
import { DAMAGE_TYPES, DAMAGE_LABEL, SIN_LABEL, WEAK_THRESHOLD } from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import { styles } from "../styles.js";

function etiquetaResistencia(perfil) {
  if (perfil.peor === null) return "—";
  if (perfil.peor <= WEAK_THRESHOLD) return "Débil";
  if (perfil.peor >= 0.5) return "Resiste";
  return "Normal";
}

export default function EquipoTab({
  ownedIdentities,
  selectedTeamKeys,
  onToggle,
  orderSuggestion,
  resSummary,
  sinSummary,
  max,
}) {
  if (ownedIdentities.length === 0) {
    return (
      <p style={styles.helpText}>
        Todavía no marcaste Identidades como propias en la pestaña Colección.
      </p>
    );
  }

  const sinsActivos = Object.entries(sinSummary).filter(([, c]) => c > 0);

  return (
    <section>
      <p style={styles.helpText}>
        Elegí hasta {max} Identidades (una por Sinner) para tu equipo desplegado.
      </p>
      <div style={styles.idGrid}>
        {ownedIdentities.map((id) => (
          <IdCard
            key={id.key}
            id={id}
            checked={selectedTeamKeys.includes(id.key)}
            onChange={() => onToggle(id.key, id.sinner)}
            estiloActivo={styles.idCardSelected}
            mostrarSinner
          />
        ))}
      </div>

      {selectedTeamKeys.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Orden de despliegue sugerido</h2>
          <ol style={styles.orderList}>
            {orderSuggestion.map((entrada, idx) => (
              <li key={entrada.id.key} style={styles.orderItem}>
                <div style={styles.orderNumber}>{idx + 1}</div>
                <div>
                  <div style={styles.idName}>{entrada.id.name}</div>
                  <div style={styles.reasonText}>{entrada.motivo}</div>
                </div>
              </li>
            ))}
          </ol>

          <h2 style={styles.sectionTitle}>Resistencias del equipo</h2>
          <div style={styles.resRow}>
            {DAMAGE_TYPES.map((t) => (
              <div key={t} style={styles.resPill}>
                <span>{DAMAGE_LABEL[t]}</span>
                <strong>{etiquetaResistencia(resSummary[t])}</strong>
                {/* Cuántos del equipo son el punto blando, no solo el peor caso. */}
                {resSummary[t].debiles > 0 && (
                  <span style={styles.resDetalle}>
                    ({resSummary[t].debiles} de {resSummary[t].total} débiles)
                  </span>
                )}
              </div>
            ))}
          </div>

          <h2 style={styles.sectionTitle}>Afinidades de Sin en el equipo</h2>
          {sinsActivos.length === 0 ? (
            <p style={styles.helpText}>Sin afinidades marcadas todavía.</p>
          ) : (
            <div style={styles.resRow}>
              {sinsActivos.map(([sin, count]) => (
                <div key={sin} style={styles.resPill}>
                  <span>{SIN_LABEL[sin] ?? sin}</span>
                  <strong>
                    {count}
                    {count >= 3 ? " (umbral activo)" : ""}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
