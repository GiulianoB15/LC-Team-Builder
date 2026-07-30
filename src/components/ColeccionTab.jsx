import React from "react";
import { IDENTITIES } from "../data/identities.js";
import { SINNERS } from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import { styles } from "../styles.js";

export default function ColeccionTab({ owned, toggleOwned, saveError }) {
  return (
    <section>
      <p style={styles.helpText}>
        Marcá qué Identidades tenés de cada Sinner. Se guarda automáticamente en este navegador.
      </p>
      {saveError && (
        <div style={styles.errorBanner}>No se pudo guardar el último cambio. Probá de nuevo.</div>
      )}

      {/*
        Se recorre la lista fija de 12 Sinners, no la derivada del dataset.
        Antes solo aparecían los Sinners que tenían datos cargados (2 de 12) y
        no se notaba lo incompleto que estaba el dataset.
      */}
      {SINNERS.map((sinner) => {
        const delSinner = IDENTITIES.filter((i) => i.sinner === sinner);
        return (
          <div key={sinner} style={styles.sinnerBlock}>
            <div style={styles.sinnerHeader}>{sinner}</div>
            {delSinner.length === 0 ? (
              <div style={styles.sinnerVacio}>Sin Identidades cargadas todavía.</div>
            ) : (
              <div style={styles.idGrid}>
                {delSinner.map((id) => (
                  <IdCard
                    key={id.key}
                    id={id}
                    checked={!!owned[id.key]}
                    onChange={() => toggleOwned(id.key)}
                    estiloActivo={styles.idCardOwned}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
