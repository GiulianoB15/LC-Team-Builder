import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IDENTITIES } from "./data/identities.js";
import { loadCollection, saveCollection } from "./lib/storage.js";
import { resistanceProfile, sinAffinityCounts, suggestOrder, candidateScore } from "./lib/engine.js";
import { toggleSeleccion } from "./lib/seleccion.js";
import ColeccionTab from "./components/ColeccionTab.jsx";
import EquipoTab from "./components/EquipoTab.jsx";
import CompletarTab from "./components/CompletarTab.jsx";
import { styles } from "./styles.js";

const TABS = [
  { key: "coleccion", label: "Colección" },
  { key: "equipo", label: "Armar equipo" },
  { key: "completar", label: "Completar equipo" },
];

const MAX_EQUIPO = 6;
const MAX_BASE_COMPLETAR = 3;

export default function App() {
  const [tab, setTab] = useState("coleccion");
  const [owned, setOwned] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [selectedTeamKeys, setSelectedTeamKeys] = useState([]);
  const [wishlistKeys, setWishlistKeys] = useState([]);
  const [saveError, setSaveError] = useState(false);

  // localStorage es sincrónico, así que esto ya no necesita ser una promesa.
  useEffect(() => {
    setOwned(loadCollection());
    setLoaded(true);
  }, []);

  const persist = useCallback((next) => {
    setOwned(next);
    setSaveError(!saveCollection(next));
  }, []);

  const toggleOwned = useCallback(
    (key) => persist({ ...owned, [key]: !owned[key] }),
    [owned, persist]
  );

  const ownedIdentities = useMemo(() => IDENTITIES.filter((i) => owned[i.key]), [owned]);

  const selectedTeam = useMemo(
    () => selectedTeamKeys.map((k) => IDENTITIES.find((i) => i.key === k)).filter(Boolean),
    [selectedTeamKeys]
  );

  const wishlistTeam = useMemo(
    () => wishlistKeys.map((k) => IDENTITIES.find((i) => i.key === k)).filter(Boolean),
    [wishlistKeys]
  );

  const orderSuggestion = useMemo(() => suggestOrder(selectedTeam), [selectedTeam]);
  const resSummary = useMemo(() => resistanceProfile(selectedTeam), [selectedTeam]);
  const sinSummary = useMemo(() => sinAffinityCounts(selectedTeam), [selectedTeam]);

  const candidates = useMemo(() => {
    const sinnersUsados = new Set(wishlistTeam.map((i) => i.sinner));
    return ownedIdentities
      .filter((i) => !sinnersUsados.has(i.sinner) && !wishlistKeys.includes(i.key))
      .map((i) => ({ id: i, ...candidateScore(i, wishlistTeam) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [ownedIdentities, wishlistTeam, wishlistKeys]);

  const toggleEquipo = useCallback(
    (key, sinner) =>
      setSelectedTeamKeys((prev) => toggleSeleccion(prev, key, sinner, MAX_EQUIPO, IDENTITIES)),
    []
  );

  const toggleWishlist = useCallback(
    (key, sinner) =>
      setWishlistKeys((prev) =>
        toggleSeleccion(prev, key, sinner, MAX_BASE_COMPLETAR, IDENTITIES)
      ),
    []
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.docketMark}>EXP. N.º 000</div>
          <h1 style={styles.title}>LIMBUS DOCKET</h1>
          <div style={styles.subtitle}>Registro de Identidades &amp; Orden de Despliegue</div>
        </div>
      </header>

      <nav style={styles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...styles.tabButton, ...(tab === t.key ? styles.tabButtonActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {!loaded && <div style={styles.loading}>Cargando expediente…</div>}

        {loaded && tab === "coleccion" && (
          <ColeccionTab owned={owned} toggleOwned={toggleOwned} saveError={saveError} />
        )}

        {loaded && tab === "equipo" && (
          <EquipoTab
            ownedIdentities={ownedIdentities}
            selectedTeamKeys={selectedTeamKeys}
            onToggle={toggleEquipo}
            orderSuggestion={orderSuggestion}
            resSummary={resSummary}
            sinSummary={sinSummary}
            max={MAX_EQUIPO}
          />
        )}

        {loaded && tab === "completar" && (
          <CompletarTab
            ownedIdentities={ownedIdentities}
            wishlistKeys={wishlistKeys}
            onToggle={toggleWishlist}
            candidates={candidates}
            max={MAX_BASE_COMPLETAR}
          />
        )}
      </main>

      <footer style={styles.footer}>
        Set de datos de ejemplo: Yi Sang &amp; Faust ({IDENTITIES.length} Identidades).
        El resto del roster se agrega ampliando <code>src/data/identities.js</code>.
      </footer>
    </div>
  );
}
