import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { IDENTITIES, EGOS, META } from "./data/identities.js";
import { SLOTS_DESPLIEGUE } from "./data/constants.js";
import { loadCollection, saveCollection } from "./lib/storage.js";
import {
  recursosDeSin, perfilResistencias, perfilArquetipos,
  sugerirOrden, puntuarCandidata, pasivasActivasDelEquipo, egosDelEquipo,
  perfilSinergia, perfilVelocidad, sugerirBanca,
} from "./lib/engine.js";
import { toggleSeleccion } from "./lib/seleccion.js";
import { decodificar } from "./lib/codigo.js";
import { PropuestaVisita, BannerVisita } from "./components/Visita.jsx";
import ColeccionTab from "./components/ColeccionTab.jsx";
import EquipoTab from "./components/EquipoTab.jsx";
import CompletarTab from "./components/CompletarTab.jsx";
import FaltanTab from "./components/FaltanTab.jsx";
import DetalleId from "./components/DetalleId.jsx";
import { cargarPreferencias, guardarPreferencias } from "./lib/preferencias.js";
import { cx } from "./lib/cx.js";

const TABS = [
  { key: "coleccion", label: "Colección" },
  { key: "equipo", label: "Armar equipo" },
  { key: "completar", label: "Completar equipo" },
  { key: "faltan", label: "Qué me falta" },
];

// Hasta 12: los primeros 6 combaten, el resto es banca y sigue aportando
// su pasiva de soporte (§3.1 del handoff).
const MAX_EQUIPO = 12;
/*
  El tope de la base era 3 porque así lo pedía el handoff original ("dadas 1-3
  IDs elegidas"), no por nada del juego. Pero la recomendación se recalcula
  sobre la base entera —arquetipos, recursos, huérfanos, resistencias— así que
  cuantas más marques, más se ajusta: con una base de Bleed de 1 las mejores
  candidatas empatan en afinidad 3, y con 3 aparece una de afinidad 11.

  El tope real es 12, uno por Sinner, igual que el equipo. Al llegar ahí no
  quedan candidatas por definición, y la pestaña lo dice en vez de mostrar una
  lista vacía.
*/
const MAX_BASE_COMPLETAR = 12;

export default function App() {
  const [tab, setTab] = useState("coleccion");
  const [propia, setPropia] = useState({ identities: {}, egos: {}, equipo: [], base: [] });
  const [loaded, setLoaded] = useState(false);
  const [equipoIds, setEquipoIds] = useState([]);
  const [baseIds, setBaseIds] = useState([]);
  const [saveError, setSaveError] = useState(false);

  /*
    Ficha abierta y con quién se la compara. Se guarda el id y no el objeto: si
    mañana el dataset se regenera, un id sigue resolviendo y un objeto viejo no.
  */
  const [fichaId, setFichaId] = useState(null);
  const [compararId, setCompararId] = useState(null);

  /*
    Cuántos entran a pelear. No es fijo en el juego: lo define cada encuentro.
    El default es 7, el del Mirror Dungeon actual.
  */
  const [slots, setSlots] = useState(SLOTS_DESPLIEGUE);

  /*
    Modo visita: una colección ajena cargada para mirar. Nunca se persiste y
    nunca pisa la propia — adoptarla es una acción aparte y explícita.
  */
  const [visita, setVisita] = useState(null);
  const [propuesta, setPropuesta] = useState(null);

  /* Densidad de la lista. Preferencia de pantalla, guardada aparte de la colección. */
  const [densidad, setDensidad] = useState("comoda");

  /*
    El encabezado grande se encoge al scrollear. Se resuelve con un centinela
    de 1 px arriba de todo y un IntersectionObserver: mientras el centinela se
    ve, estamos arriba; cuando sale, el encabezado se compacta.

    Es preferible a escuchar `scroll`, que dispara decenas de veces por segundo
    y obliga a acordarse de tirar el handler y de no leer el layout en cada
    evento. El observer avisa dos veces en toda la sesión: al salir y al volver.
  */
  const [compacto, setCompacto] = useState(false);
  const centinela = useRef(null);
  const barraTabs = useRef(null);

  useEffect(() => {
    const guardada = loadCollection();
    setPropia(guardada);
    setEquipoIds(guardada.equipo);
    setBaseIds(guardada.base);
    setDensidad(cargarPreferencias().densidad);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setCompacto(!e.isIntersecting));
    obs.observe(nodo);
    return () => obs.disconnect();
  }, []);

  /*
    Los encabezados de Sinner se pegan JUSTO debajo de la barra de pestañas, y
    para eso necesitan saber cuánto mide.

    Estuvo escrito a mano como `top: 46px` hasta que se midió: la barra da 42
    en escritorio y 39 en un teléfono, porque después le cambiamos el relleno
    y nadie volvió a tocar el offset. Quedaban 4 a 7 píxeles de fuga por donde
    se veía pasar el contenido.

    Un número nuevo se volvería a desfasar con el próximo ajuste de padding,
    así que se mide. Un ResizeObserver avisa cuando cambia —al rotar el
    teléfono, al cruzar la media query— y el valor no puede mentir.
  */
  useEffect(() => {
    const nodo = barraTabs.current;
    if (!nodo || typeof ResizeObserver === "undefined") return;
    const publicar = () =>
      document.documentElement.style.setProperty("--alto-tabs", `${Math.round(nodo.getBoundingClientRect().height)}px`);
    publicar();
    const obs = new ResizeObserver(publicar);
    obs.observe(nodo);
    return () => obs.disconnect();
  }, []);

  const cambiarDensidad = useCallback((d) => {
    setDensidad(d);
    guardarPreferencias({ densidad: d });
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

  /*
    Guardar es un efecto de que algo haya cambiado, no algo que hace cada
    handler. Separarlo permite que los toggles NO dependan de `propia`, y eso
    es lo que los vuelve estables: si cambiaran de identidad en cada marca, las
    184 tarjetas se volverían a renderizar en cada click.

    Dos guards, por motivos distintos:

    - `loaded` evita pisar lo guardado con el estado vacío inicial.
    - `enVisita` evita guardar mientras mirás la colección de otro. El equipo
      que armás ahí está hecho con Identidades que no tenés, así que
      persistirlo te pisaría el tuyo con uno que no podrías jugar.
  */
  useEffect(() => {
    if (!loaded || enVisita) return;
    setSaveError(!saveCollection({ ...propia, equipo: equipoIds, base: baseIds }));
  }, [propia, equipoIds, baseIds, loaded, enVisita]);

  const persist = useCallback((next) => setPropia(next), []);

  // En modo visita no se edita: la colección es de otro.
  const toggleOwned = useCallback(
    (id) => {
      if (enVisita) return;
      setPropia((prev) => ({ ...prev, identities: { ...prev.identities, [id]: !prev.identities[id] } }));
    },
    [enVisita]
  );

  const toggleOwnedEgo = useCallback(
    (id) => {
      if (enVisita) return;
      setPropia((prev) => ({ ...prev, egos: { ...prev.egos, [id]: !prev.egos[id] } }));
    },
    [enVisita]
  );

  /*
    Al volver de una visita se recupera TU equipo, no se vacía. Vaciarlo era lo
    que hacía antes —cuando no se guardaba nada y daba igual—, pero ahora eso
    sería borrarte el trabajo por haber mirado la colección de un amigo.
  */
  const salirDeVisita = useCallback(() => {
    const guardada = loadCollection();
    setVisita(null);
    setEquipoIds(guardada.equipo);
    setBaseIds(guardada.base);
  }, []);

  /*
    Adoptar es distinto de salir: la colección visitada pasa a ser tuya, así
    que el equipo que armaste con ella también es jugable y se conserva. Por
    eso acá no se llama a salirDeVisita, que restauraría el equipo anterior.
  */
  const adoptarVisitada = useCallback(() => {
    if (!visita) return;
    persist({ identities: { ...visita.identities }, egos: { ...visita.egos } });
    setVisita(null);
  }, [visita, persist]);

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

  const orden = useMemo(() => sugerirOrden(equipo, slots), [equipo, slots]);

  /*
    Los que entran a pelear salen del ORDEN, no de los primeros N que elegiste:
    el orden puede moverlos por las pasivas posicionales, así que cortar la
    selección a mano dejaría fuera a alguien que el motor sí despliega.
    La banca aporta únicamente su pasiva de soporte.
  */
  const desplegados = useMemo(() => orden.filter((o) => !o.banca).map((o) => o.id), [orden]);
  const recursos = useMemo(() => recursosDeSin(desplegados), [desplegados]);
  const resistencias = useMemo(() => perfilResistencias(desplegados), [desplegados]);
  const arquetipos = useMemo(() => perfilArquetipos(equipo), [equipo]);
  const pasivas = useMemo(() => pasivasActivasDelEquipo(equipo, recursos), [equipo, recursos]);
  const sinergia = useMemo(() => perfilSinergia(equipo), [equipo]);
  /* La velocidad solo la tiran los que entran a combate, no la banca. */
  const velocidad = useMemo(() => perfilVelocidad(desplegados), [desplegados]);
  /*
    La banca se calcula sobre TODA la colección, no sobre el equipo elegido: la
    pregunta es a quién conviene tener ahí, y puede ser alguien que no habías
    puesto.
  */
  const banca = useMemo(
    () => sugerirBanca(desplegados, ownedIdentities, recursos),
    [desplegados, ownedIdentities, recursos]
  );

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
      /*
        Primero la afinidad temática y recién después el total. Ordenar por el
        total dejaba arriba IDs que no comparten nada con la base pero juntan
        puntos por resistencias y pasivas baratas.
      */
      .sort((a, b) => b.afinidad - a.afinidad || b.score - a.score)
      .slice(0, 8);
  }, [ownedIdentities, base, baseIds]);

  const ficha = useMemo(() => IDENTITIES.find((i) => i.id === fichaId) ?? null, [fichaId]);
  const fichaComparar = useMemo(() => IDENTITIES.find((i) => i.id === compararId) ?? null, [compararId]);

  /* Abrir otra ficha descarta la comparación anterior: comparar A con B y después
     abrir C dejaría una mezcla que nadie pidió. */
  const verDetalle = useCallback((id) => {
    setFichaId(id.id);
    setCompararId(null);
  }, []);

  const cerrarFicha = useCallback(() => {
    setFichaId(null);
    setCompararId(null);
  }, []);

  const toggleEquipo = useCallback(
    (id, sinner) => setEquipoIds((prev) => toggleSeleccion(prev, id, sinner, MAX_EQUIPO, IDENTITIES)),
    []
  );

  const toggleBase = useCallback(
    (id, sinner) => setBaseIds((prev) => toggleSeleccion(prev, id, sinner, MAX_BASE_COMPLETAR, IDENTITIES)),
    []
  );

  return (
    <div className="page" data-densidad={densidad}>
      {/* Centinela del encabezado: no se ve, solo sirve para saber si estamos arriba. */}
      <div ref={centinela} className="centinela" aria-hidden="true" />

      <header className={cx("header", compacto && "compacto")}>
        <div className="header-inner">
          <div className="docket-mark">EXP. N.º 000</div>
          <h1 className="title">LIMBUS DOCKET</h1>
          <div className="subtitle">Registro de Identidades &amp; Orden de Despliegue</div>
        </div>
      </header>

      <BannerVisita visita={visita} onSalir={salirDeVisita} onAdoptar={adoptarVisitada} />

      <nav className="tab-bar" ref={barraTabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx("tab", tab === t.key && "activa")}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {!loaded && <div className="loading">Cargando expediente…</div>}

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
            onVerDetalle={verDetalle}
            densidad={densidad}
            onCambiarDensidad={cambiarDensidad}
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
            sinergia={sinergia}
            velocidad={velocidad}
            onVerDetalle={verDetalle}
            banca={banca}
            slots={slots}
            onCambiarSlots={setSlots}
            onIrAColeccion={() => setTab("coleccion")}
          />
        )}

        {loaded && tab === "faltan" && (
          <FaltanTab ownedIdentities={ownedIdentities} onVerDetalle={verDetalle} />
        )}

        {loaded && tab === "completar" && (
          <CompletarTab
            ownedIdentities={ownedIdentities}
            baseIds={baseIds}
            onToggle={toggleBase}
            candidatas={candidatas}
            max={MAX_BASE_COMPLETAR}
            onVerDetalle={verDetalle}
            onIrAColeccion={() => setTab("coleccion")}
          />
        )}
        <DetalleId
          id={ficha}
          comparar={fichaComparar}
          candidatas={IDENTITIES}
          onComparar={setCompararId}
          onCerrar={cerrarFicha}
        />
      </main>

      <footer className="footer">
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
        <a href="https://limbus.eldritchtools.com">
          eldritchtools
        </a>
        ; números de skills de{" "}
        <a href="https://github.com/LCTeamBuilder/LCTeamBuilder.github.io">
          LCTeamBuilder
        </a>{" "}
        (MIT, © 2024 SuenoImposible). No afiliado a Project Moon.
      </footer>
    </div>
  );
}
