import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IDENTITIES, EGOS, META } from "./data/identities.js";
import { SLOTS_DESPLIEGUE } from "./data/constants.js";
import { loadCollection, saveCollection } from "./lib/storage.js";
import {
  recursosDeSin, perfilResistencias, perfilArquetipos,
  sugerirOrden, puntuarCandidata, pasivasActivasDelEquipo, egosDelEquipo,
} from "./lib/engine.js";
import { toggleSeleccion } from "./lib/seleccion.js";
import { decodificar } from "./lib/codigo.js";
import { PropuestaVisita, BannerVisita } from "./components/Visita.jsx";
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
  const [propia, setPropia] = useState({ identities: {}, egos: {} });
  const [loaded, setLoaded] = useState(false);
  const [equipoIds, setEquipoIds] = useState([]);
  const [baseIds, setBaseIds] = useState([]);
  const [saveError, setSaveError] = useState(false);

  /*
    Modo visita: una colección ajena cargada para mirar. Nunca se persiste y
    nunca pisa la propia — adoptarla es una acción aparte y explícita.
  */
  const [visita, setVisita] = useState(null);
  const [propuesta, setPropuesta] = useState(null);

  useEffect(() => {
    setPropia(loadCollection());
    setLoaded(true);
  }, []);

  /*
    Un link compartido llega como #c=<código>. No se aplica solo: se propone y
    decide el usuario. El hash se limpia enseguida para que un F5 no lo repita.
  */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const revisarHash = () => {
      const m = /^#c=(.+)$/.exec(window.location.hash);
      if (!m) return;
      const r = decodificar(decodeURIComponent(m[1]));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setPropuesta(r.ok ? { identities: r.identities, egos: r.egos } : { error: r.error });
    };

    revisarHash();
    /*
      También hay que escuchar hashchange: si la app ya está abierta, clickear
      un link compartido solo cambia el hash y el navegador no recarga, así que
      sin esto el link no haría absolutamente nada.
    */
    window.addEventListener("hashchange", revisarHash);
    return () => window.removeEventListener("hashchange", revisarHash);
  }, []);

  const owned = visita ?? propia;
  const enVisita = visita !== null;

  const persist = useCallback((next) => {
    setPropia(next);
    setSaveError(!saveCollection(next));
  }, []);

  // En modo visita no se edita: la colección es de otro.
  const toggleOwned = useCallback(
    (id) => {
      if (enVisita) return;
      persist({ ...propia, identities: { ...propia.identities, [id]: !propia.identities[id] } });
    },
    [propia, persist, enVisita]
  );

  const toggleOwnedEgo = useCallback(
    (id) => {
      if (enVisita) return;
      persist({ ...propia, egos: { ...propia.egos, [id]: !propia.egos[id] } });
    },
    [propia, persist, enVisita]
  );

  const salirDeVisita = useCallback(() => {
    setVisita(null);
    setEquipoIds([]);
    setBaseIds([]);
  }, []);

  const adoptarVisitada = useCallback(() => {
    if (!visita) return;
    persist({ identities: { ...visita.identities }, egos: { ...visita.egos } });
    salirDeVisita();
  }, [visita, persist, salirDeVisita]);

  const entrarEnVisita = useCallback((coleccion) => {
    setVisita(coleccion);
    setEquipoIds([]);
    setBaseIds([]);
    setPropuesta(null);
  }, []);

  const ownedIdentities = useMemo(() => IDENTITIES.filter((i) => owned.identities[i.id]), [owned]);
  const ownedEgos = useMemo(() => EGOS.filter((e) => owned.egos[e.id]), [owned]);

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

  // Un E.G.O solo se puede usar si su Sinner está desplegado, no en banca.
  const egosEquipo = useMemo(() => {
    const sinners = new Set(desplegados.map((i) => i.sinner));
    return egosDelEquipo(ownedEgos, sinners, recursos);
  }, [ownedEgos, desplegados, recursos]);

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

      <BannerVisita visita={visita} onSalir={salirDeVisita} onAdoptar={adoptarVisitada} />

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

        <PropuestaVisita
          propuesta={propuesta}
          onAceptar={entrarEnVisita}
          onDescartar={() => setPropuesta(null)}
        />

        {loaded && tab === "coleccion" && (
          <ColeccionTab
            owned={owned}
            propia={propia}
            toggleOwned={toggleOwned}
            toggleOwnedEgo={toggleOwnedEgo}
            saveError={saveError}
            enVisita={enVisita}
            onVisitar={entrarEnVisita}
          />
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
            egosEquipo={egosEquipo}
            tieneEgos={ownedEgos.length > 0}
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
        {META.conteo.identities} Identities y {META.conteo.egos} E.G.O · última al{" "}
        <strong>{META.ultimaIdentity}</strong>.
        <br />
        {/*
          Mientras la cobertura de pasivas fue parcial, el pie la reportaba
          siempre. Ahora está completa, así que la línea solo aparece si vuelve
          a faltar algo: un "0 y 0" permanente no informa nada.
        */}
        {META.conteo.soloSoporte + META.conteo.sinPasivas > 0 && (
          <>
            {META.conteo.soloSoporte} con solo pasiva de soporte y {META.conteo.sinPasivas} sin pasivas.
            <br />
          </>
        )}
        Pasivas y retratos de{" "}
        <a href="https://limbus.eldritchtools.com" style={styles.footerLink}>
          eldritchtools
        </a>
        ; números de skills de{" "}
        <a href="https://github.com/LCTeamBuilder/LCTeamBuilder.github.io" style={styles.footerLink}>
          LCTeamBuilder
        </a>{" "}
        (MIT, © 2024 SuenoImposible). No afiliado a Project Moon.
      </footer>
    </div>
  );
}
