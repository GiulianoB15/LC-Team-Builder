import React from "react";
import IdCard from "./IdCard.jsx";
import { styles } from "../styles.js";

export default function CompletarTab({ ownedIdentities, wishlistKeys, onToggle, candidates, max }) {
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
            key={id.key}
            id={id}
            checked={wishlistKeys.includes(id.key)}
            onChange={() => onToggle(id.key, id.sinner)}
            estiloActivo={styles.idCardSelected}
            mostrarSinner
          />
        ))}
      </div>

      {wishlistKeys.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Candidatas recomendadas</h2>
          {candidates.length === 0 ? (
            <p style={styles.helpText}>
              No quedan Identidades disponibles en tu colección para sumar (sinners repetidos o
              colección agotada).
            </p>
          ) : (
            <div style={styles.candidateList}>
              {candidates.map(({ id, score, motivos }) => (
                <div key={id.key} style={styles.candidateCard}>
                  <div style={styles.candidateHeader}>
                    <div style={styles.idName}>{id.name}</div>
                    <div style={styles.scoreBadge}>
                      {score >= 0 ? "+" : ""}
                      {score}
                    </div>
                  </div>
                  <div style={styles.idTags}>
                    {id.sinner} · {id.tags.join(" · ")}
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
