import React, { useState, useMemo } from "react";
import { IDENTITIES } from "../data/identities.js";
import { SINNERS } from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import { styles } from "../styles.js";

export default function ColeccionTab({ owned, toggleOwned, saveError }) {
  const [filtro, setFiltro] = useState("");

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return IDENTITIES;
    return IDENTITIES.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.sinner.toLowerCase().includes(q) ||
        i.arquetipos.some((a) => a.toLowerCase().includes(q))
    );
  }, [filtro]);

  const totalTenidas = IDENTITIES.filter((i) => owned[i.id]).length;

  return (
    <section>
      <p style={styles.helpText}>
        Marcá qué Identidades tenés. Se guarda automáticamente en este navegador.{" "}
        <strong>{totalTenidas}</strong> de {IDENTITIES.length} marcadas.
      </p>

      {saveError && (
        <div style={styles.errorBanner}>No se pudo guardar el último cambio. Probá de nuevo.</div>
      )}

      <input
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar por nombre, Sinner o arquetipo (Bleed, Rupture…)"
        style={styles.buscador}
      />

      {/* Lista fija de 12 Sinners: así se nota cuáles no tienen datos. */}
      {SINNERS.map((sinner) => {
        const delSinner = visibles.filter((i) => i.sinner === sinner);
        if (filtro && delSinner.length === 0) return null;

        const tenidas = delSinner.filter((i) => owned[i.id]).length;
        return (
          <div key={sinner} style={styles.sinnerBlock}>
            <div style={styles.sinnerHeader}>
              <span>{sinner}</span>
              <span style={styles.sinnerCount}>
                {tenidas}/{delSinner.length}
              </span>
            </div>
            {delSinner.length === 0 ? (
              <div style={styles.sinnerVacio}>Sin Identidades cargadas todavía.</div>
            ) : (
              <div style={styles.idGrid}>
                {delSinner.map((id) => (
                  <IdCard
                    key={id.id}
                    id={id}
                    checked={!!owned[id.id]}
                    onChange={() => toggleOwned(id.id)}
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
