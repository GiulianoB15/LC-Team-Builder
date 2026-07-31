import React, { useState, useMemo } from "react";
import { IDENTITIES, EGOS } from "../data/identities.js";
import { SINNERS, ARQUETIPOS } from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import EgoCard from "./EgoCard.jsx";
import CompartirPanel from "./CompartirPanel.jsx";
import { ChipArquetipo, ChipFaccion } from "./Chips.jsx";
import { styles } from "../styles.js";

const SECCIONES = [
  { key: "identities", label: "Identities" },
  { key: "egos", label: "E.G.O" },
];

const coincide = (texto, q) => String(texto ?? "").toLowerCase().includes(q);

export default function ColeccionTab({ owned, propia, toggleOwned, toggleOwnedEgo, saveError, enVisita, onVisitar, onVerDetalle }) {
  const [seccion, setSeccion] = useState("identities");
  const [filtro, setFiltro] = useState("");
  const [arquetiposActivos, setArquetipos] = useState(new Set());
  const [faccionActiva, setFaccion] = useState(null);
  const [abiertos, setAbiertos] = useState(new Set());

  const esEgo = seccion === "egos";
  const lista = esEgo ? EGOS : IDENTITIES;
  const marcadas = esEgo ? owned.egos : owned.identities;
  const toggle = esEgo ? toggleOwnedEgo : toggleOwned;

  const hayFiltro = filtro.trim() !== "" || arquetiposActivos.size > 0 || faccionActiva !== null;

  const toggleArquetipo = (a) =>
    setArquetipos((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  const toggleFaccion = (f) => setFaccion((prev) => (prev === f ? null : f));

  const limpiar = () => {
    setFiltro("");
    setArquetipos(new Set());
    setFaccion(null);
  };

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return lista.filter((x) => {
      // Los chips de arquetipo suman (OR): "mostrame Bleed o Rupture".
      if (arquetiposActivos.size > 0 && !x.arquetipos.some((a) => arquetiposActivos.has(a))) return false;
      if (faccionActiva && !(x.etiquetas ?? []).includes(faccionActiva)) return false;
      if (!q) return true;
      return (
        coincide(x.nombre, q) ||
        coincide(x.sinner, q) ||
        x.arquetipos.some((a) => coincide(a, q)) ||
        (x.etiquetas ?? []).some((f) => coincide(f, q)) ||
        (esEgo && coincide(x.rango, q))
      );
    });
  }, [filtro, lista, esEgo, arquetiposActivos, faccionActiva]);

  const total = lista.filter((x) => marcadas[x.id]).length;
  const cuenta = (k) => (k === "egos" ? EGOS : IDENTITIES).filter((x) => (k === "egos" ? owned.egos : owned.identities)[x.id]).length;

  const estaAbierto = (sinner) => hayFiltro || abiertos.has(sinner);
  const alternarSinner = (sinner) =>
    setAbiertos((prev) => {
      const next = new Set(prev);
      next.has(sinner) ? next.delete(sinner) : next.add(sinner);
      return next;
    });

  const todosAbiertos = abiertos.size === SINNERS.length;

  return (
    <section>
      <div style={styles.subTabBar}>
        {SECCIONES.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSeccion(s.key); limpiar(); }}
            style={{ ...styles.subTab, ...(seccion === s.key ? styles.subTabActiva : {}) }}
          >
            {s.label}
            <span style={styles.subTabCount}>{cuenta(s.key)}</span>
          </button>
        ))}
      </div>

      <p style={styles.helpText}>
        {enVisita
          ? `Colección compartida: ${total} de ${lista.length} marcados. No se puede editar.`
          : null}
        {!enVisita && (
          <>
            Marcá qué {esEgo ? "E.G.O" : "Identidades"} tenés. Se guarda automáticamente en este
            navegador. <strong>{total}</strong> de {lista.length} marcados.
          </>
        )}
      </p>

      <CompartirPanel propia={propia} onVisitar={onVisitar} modoVisita={enVisita} />

      {saveError && (
        <div style={styles.errorBanner}>No se pudo guardar el último cambio. Probá de nuevo.</div>
      )}

      <input
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder={esEgo ? "Buscar por nombre, Sinner o rango (HE, WAW…)" : "Buscar por nombre, Sinner o facción"}
        style={styles.buscador}
      />

      {/* Filtros rápidos: evitan tipear para lo que más se busca. */}
      <div style={styles.filtroRow}>
        {ARQUETIPOS.map((a) => (
          <ChipArquetipo key={a} arquetipo={a} onClick={toggleArquetipo} activo={arquetiposActivos.has(a)} />
        ))}
        {faccionActiva && <ChipFaccion faccion={faccionActiva} onClick={toggleFaccion} activo />}
      </div>

      <div style={styles.barraAcciones}>
        <span style={styles.resultado}>
          {hayFiltro ? `${visibles.length} de ${lista.length}` : `${lista.length} en total`}
        </span>
        <span style={styles.compartirBotones}>
          {hayFiltro && <button onClick={limpiar} style={styles.botonChico}>Limpiar filtros</button>}
          {!hayFiltro && (
            <button
              onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(SINNERS))}
              style={styles.botonChico}
            >
              {todosAbiertos ? "Cerrar todos" : "Abrir todos"}
            </button>
          )}
        </span>
      </div>

      {/* Lista fija de 12 Sinners: así se nota cuáles no tienen datos. */}
      {SINNERS.map((sinner) => {
        const delSinner = visibles.filter((x) => x.sinner === sinner);
        if (hayFiltro && delSinner.length === 0) return null;

        const tenidas = delSinner.filter((x) => marcadas[x.id]).length;
        const abierto = estaAbierto(sinner);

        return (
          <div key={sinner} style={styles.sinnerBlock}>
            <button
              onClick={() => alternarSinner(sinner)}
              style={styles.sinnerHeaderBtn}
              aria-expanded={abierto}
            >
              <span>
                <span style={styles.flecha}>{abierto ? "▾" : "▸"}</span> {sinner}
              </span>
              <span style={styles.sinnerCount}>
                {tenidas}/{delSinner.length}
              </span>
            </button>

            {abierto && (
              delSinner.length === 0 ? (
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
                        deshabilitado={enVisita}
                        onFiltrarArquetipo={toggleArquetipo}
                        arquetiposActivos={arquetiposActivos}
                      />
                    ) : (
                      <IdCard
                        key={x.id}
                        id={x}
                        checked={!!marcadas[x.id]}
                        onChange={() => toggle(x.id)}
                        estiloActivo={styles.idCardOwned}
                        deshabilitado={enVisita}
                        onFiltrarArquetipo={toggleArquetipo}
                        onFiltrarFaccion={toggleFaccion}
                        arquetiposActivos={arquetiposActivos}
                        faccionActiva={faccionActiva}
                        onVerDetalle={onVerDetalle}
                      />
                    )
                  )}
                </div>
              )
            )}
          </div>
        );
      })}

      {hayFiltro && visibles.length === 0 && (
        <p style={styles.helpText}>Nada coincide con esos filtros.</p>
      )}
    </section>
  );
}
