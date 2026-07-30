import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IDENTITIES, META } from "./data/identities.js";
import { SLOTS_DESPLIEGUE } from "./data/constants.js";
import { loadCollection, saveCollection } from "./lib/storage.js";
import {
  recursosDeSin, perfilResistencias, perfilArquetipos,
  sugerirOrden, puntuarCandidata, pasivasActivasDelEquipo,
} from "./lib/engine.js";
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

// Hasta 12: los primeros 6 combaten, el resto es banca y sigue aportando
// su pasiva de soporte (§3.1 del handoff).
const MAX_EQUIPO = 12;
const MAX_BASE_COMPLETAR = 3;

export default function App() {
  const [tab, setTab] = useState("coleccion");
  const [owned, setOwned] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [equipoIds, setEquipoIds] = useState([]);
  const [baseIds, setBaseIds] = useState([]);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    setOwned(loadCollection());
    setLoaded(true);
  }, []);

  const persist = useCallback((next) => {
    setOwned(next);
    setSaveError(!saveCollection(next));
  }, []);

  const toggleOwned = useCallback(
    (id) => persist({ ...owned, [id]: !owned[id] }),
    [owned, persist]
  );

  const ownedIdentities = useMemo(() => IDENTITIES.filter((i) => owned[i.id]), [owned]);

  const equipo = useMemo(
    () => equipoIds.map((id) => IDENTITIES.find((i) => i.id === id)).filter(Boolean),
    [equipoIds]
  );

  const base = useMemo(
    () => baseIds.map((id) => IDENTITIES.find((i) => i.id === id)).filter(Boolean),
    [baseIds]
  );

  // El análisis se hace sobre los 6 desplegados; la banca solo aporta soporte.
  const desplegados = useMemo(() => equipo.slice(0, SLOTS_DESPLIEGUE), [equipo]);

  const orden = useMemo(() => sugerirOrden(equipo), [equipo]);
  const recursos = useMemo(() => recursosDeSin(desplegados), [desplegados]);
  const resistencias = useMemo(() => perfilResistencias(desplegados), [desplegados]);
  const arquetipos = useMemo(() => perfilArquetipos(equipo), [equipo]);
  const pasivas = useMemo(() => pasivasActivasDelEquipo(equipo, recursos), [equipo, recursos]);

  const candidatas = useMemo(() => {
    const sinnersUsados = new Set(base.map((i) => i.sinner));
    return ownedIdentities
      .filter((i) => !sinnersUsados.has(i.sinner) && !baseIds.includes(i.id))
      .map((i) => ({ id: i, ...puntuarCandidata(i, base) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [ownedIdentities, base, baseIds]);

  const toggleEquipo = useCallback(
    (id, sinner) => setEquipoIds((prev) => toggleSeleccion(prev, id, sinner, MAX_EQUIPO, IDENTITIES)),
    []
  );

  const toggleBase = useCallback(
    (id, sinner) => setBaseIds((prev) => toggleSeleccion(prev, id, sinner, MAX_BASE_COMPLETAR, IDENTITIES)),
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
            equipoIds={equipoIds}
            onToggle={toggleEquipo}
            orden={orden}
            recursos={recursos}
            resistencias={resistencias}
            arquetipos={arquetipos}
            pasivas={pasivas}
            max={MAX_EQUIPO}
          />
        )}

        {loaded && tab === "completar" && (
          <CompletarTab
            ownedIdentities={ownedIdentities}
            baseIds={baseIds}
            onToggle={toggleBase}
            candidatas={candidatas}
            max={MAX_BASE_COMPLETAR}
          />
        )}
      </main>

      <footer style={styles.footer}>
        {META.conteo.identities} Identities y {META.conteo.egos} E.G.O · datos al{" "}
        <strong>{META.fuente.ultimoCommit}</strong> — las publicadas después no están.
        <br />
        Datos de <a href={META.fuente.repo} style={styles.footerLink}>LCTeamBuilder</a> ({META.fuente.licencia}, {META.fuente.copyright}).
        No afiliado a Project Moon.
      </footer>
    </div>
  );
}
