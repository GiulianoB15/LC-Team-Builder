import React from "react";
import { SINNERS_TOTALES } from "../data/constants.js";
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
        Marcá las que ya tenés decididas —de 1 a {max}, una por Sinner— y el motor recomienda
        con qué seguir, usando solo tu colección.{" "}
        <strong>Cuantas más marques, más se ajusta</strong>: cada una cambia el perfil de
        arquetipos, de recursos y de resistencias contra el que se puntúa.
      </p>

      {baseIds.length > 0 && (
        <p style={styles.helpText}>
          Elegidas: <strong>{baseIds.length}</strong> de {max}.
        </p>
      )}

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
          {/*
            Dos motivos distintos para no tener candidatas, y conviene
            distinguirlos: con los 12 Sinners ocupados no queda ninguno libre
            por definición, y eso no es un problema sino el final del camino.
          */}
          {candidatas.length === 0 ? (
            baseIds.length >= SINNERS_TOTALES ? (
              <p style={styles.helpText}>
                Ya cubriste los {SINNERS_TOTALES} Sinners, así que no queda lugar para sumar.
                Si querés probar otra cosa, destildá a alguna y te recomiendo el reemplazo.
              </p>
            ) : (
              <p style={styles.helpText}>
                No te quedan Identidades de los Sinners libres en tu colección. Los que faltan
                los podés ver en «Qué me falta».
              </p>
            )
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
