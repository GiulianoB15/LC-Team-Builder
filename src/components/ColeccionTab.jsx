import React, { useState, useMemo } from "react";
import { IDENTITIES, EGOS } from "../data/identities.js";
import { SINNERS } from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import EgoCard from "./EgoCard.jsx";
import { styles } from "../styles.js";

const SECCIONES = [
  { key: "identities", label: "Identities" },
  { key: "egos", label: "E.G.O" },
];

const coincide = (texto, q) => texto.toLowerCase().includes(q);

export default function ColeccionTab({ owned, toggleOwned, toggleOwnedEgo, saveError }) {
  const [seccion, setSeccion] = useState("identities");
  const [filtro, setFiltro] = useState("");

  const esEgo = seccion === "egos";
  const lista = esEgo ? EGOS : IDENTITIES;
  const marcadas = esEgo ? owned.egos : owned.identities;
  const toggle = esEgo ? toggleOwnedEgo : toggleOwned;

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (x) =>
        coincide(x.nombre, q) ||
        coincide(x.sinner, q) ||
        x.arquetipos.some((a) => coincide(a, q)) ||
        (esEgo && coincide(x.rango ?? "", q))
    );
  }, [filtro, lista, esEgo]);

  const total = lista.filter((x) => marcadas[x.id]).length;

  return (
    <section>
      <div style={styles.subTabBar}>
        {SECCIONES.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSeccion(s.key); setFiltro(""); }}
            style={{ ...styles.subTab, ...(seccion === s.key ? styles.subTabActiva : {}) }}
          >
            {s.label}
            <span style={styles.subTabCount}>
              {(s.key === "egos" ? EGOS : IDENTITIES).filter((x) => (s.key === "egos" ? owned.egos : owned.identities)[x.id]).length}
            </span>
          </button>
        ))}
      </div>

      <p style={styles.helpText}>
        Marcá qué {esEgo ? "E.G.O" : "Identidades"} tenés. Se guarda automáticamente en este
        navegador. <strong>{total}</strong> de {lista.length} marcados.
      </p>

      {saveError && (
        <div style={styles.errorBanner}>No se pudo guardar el último cambio. Probá de nuevo.</div>
      )}

      <input
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder={
          esEgo
            ? "Buscar por nombre, Sinner, rango (HE, WAW…) o arquetipo"
            : "Buscar por nombre, Sinner o arquetipo (Bleed, Rupture…)"
        }
        style={styles.buscador}
      />

      {/* Lista fija de 12 Sinners: así se nota cuáles no tienen datos. */}
      {SINNERS.map((sinner) => {
        const delSinner = visibles.filter((x) => x.sinner === sinner);
        if (filtro && delSinner.length === 0) return null;

        const tenidas = delSinner.filter((x) => marcadas[x.id]).length;
        return (
          <div key={sinner} style={styles.sinnerBlock}>
            <div style={styles.sinnerHeader}>
              <span>{sinner}</span>
              <span style={styles.sinnerCount}>
                {tenidas}/{delSinner.length}
              </span>
            </div>
            {delSinner.length === 0 ? (
              <div style={styles.sinnerVacio}>Sin datos cargados todavía.</div>
            ) : (
              <div style={styles.idGrid}>
                {delSinner.map((x) =>
                  esEgo ? (
                    <EgoCard
                      key={x.id}
                      ego={x}
                      checked={!!marcadas[x.id]}
                      onChange={() => toggle(x.id)}
                    />
                  ) : (
                    <IdCard
                      key={x.id}
                      id={x}
                      checked={!!marcadas[x.id]}
                      onChange={() => toggle(x.id)}
                      estiloActivo={styles.idCardOwned}
                    />
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
