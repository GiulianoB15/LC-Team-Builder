import React from "react";
import IdCard from "./IdCard.jsx";
import { ChipArquetipo } from "./Chips.jsx";
import { styles } from "../styles.js";

export default function CompletarTab({ ownedIdentities, baseIds, onToggle, candidatas, max, onVerDetalle }) {
  if (ownedIdentities.length === 0) {
    return (
      <p style={styles.helpText}>
        Todavía no marcaste Identidades como propias en la pestaña Colección.
      </p>
    );
  }

  return (
    <section>
      <p style={styles.helpText}>
        Elegí de 1 a {max} Identidades como punto de partida. El motor recomienda con qué
        completar, usando solo tu colección.
      </p>

      <div style={styles.idGrid}>
        {ownedIdentities.map((id) => (
          <IdCard
            key={id.id}
            id={id}
            checked={baseIds.includes(id.id)}
            onChange={onToggle}
            estiloActivo={styles.idCardSelected}
            mostrarSinner
            onVerDetalle={onVerDetalle}
          />
        ))}
      </div>

      {baseIds.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Candidatas recomendadas</h2>
          {candidatas.length === 0 ? (
            <p style={styles.helpText}>
              No quedan Identidades disponibles en tu colección para sumar (sinners repetidos o
              colección agotada).
            </p>
          ) : (
            <div style={styles.candidateList}>
              {candidatas.map(({ id, score, motivos }) => (
                <div key={id.id} style={styles.candidateCard}>
                  <div style={styles.candidateHeader}>
                    <div style={styles.idName}>{id.nombre}</div>
                    <div style={styles.scoreBadge}>
                      {score >= 0 ? "+" : ""}
                      {score}
                    </div>
                  </div>
                  <div style={styles.idTags}>{id.sinner}</div>
                  <div style={styles.chipRow}>
                    {id.arquetipos.map((a) => <ChipArquetipo key={a} arquetipo={a} />)}
                  </div>
                  {motivos.length > 0 && (
                    <ul style={styles.reasonList}>
                      {motivos.map((r, i) => (
                        <li key={i} style={styles.reasonText}>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
