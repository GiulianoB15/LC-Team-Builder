import React, { useState, useMemo, useCallback } from "react";
import { IDENTITIES, EGOS, esIdentityBase, IDS_BASE } from "../data/identities.js";
import { SINNERS, ARQUETIPOS } from "../data/constants.js";
import { DENSIDADES } from "../lib/preferencias.js";
import IdCard from "./IdCard.jsx";
import EgoCard from "./EgoCard.jsx";
import CompartirPanel from "./CompartirPanel.jsx";
import { ChipArquetipo, ChipFaccion } from "./Chips.jsx";
import Vacio from "./Vacio.jsx";
import { cx } from "../lib/cx.js";

const SECCIONES = [
  { key: "identities", label: "Identities" },
  { key: "egos", label: "E.G.O" },
];

const coincide = (texto, q) => String(texto ?? "").toLowerCase().includes(q);

/*
  Filtro por rol: no "de qué arquetipo es" sino "qué hace con él". Sale de
  `sinergia`, derivado del texto de las pasivas en build-dataset.mjs.

  Se cruza con los chips de arquetipo cuando hay alguno activo: "Bleed" +
  "aplica" es "las que infligen sangrado", no "las de Bleed que aplican
  cualquier cosa". Sin arquetipo elegido, alcanza con que apliquen algo.

  Los E.G.O no tienen `sinergia` derivada, así que en esa sección los chips no
  se muestran.
*/
const ROLES = [
  { key: "aplica", label: "Aplica el estado" },
  { key: "lee", label: "Lo aprovecha" },
  { key: "buffea", label: "Buffea aliados" },
  { key: "posicion", label: "Le importa la posición" },
];

function cumpleRol(x, rol, arquetiposActivos) {
  const s = x.sinergia;
  if (!s) return false;
  if (rol === "buffea") return s.buffeaAliados;
  if (rol === "posicion") return s.posicion !== null;

  const lista = rol === "aplica" ? s.aplica : s.lee;
  if (arquetiposActivos.size === 0) return lista.length > 0;
  return lista.some((a) => arquetiposActivos.has(a));
}

export default function ColeccionTab({
  owned, propia, toggleOwned, toggleOwnedEgo, saveError, enVisita, onVisitar, onVerDetalle,
  densidad, onCambiarDensidad,
}) {
  const [seccion, setSeccion] = useState("identities");
  const [filtro, setFiltro] = useState("");
  const [arquetiposActivos, setArquetipos] = useState(new Set());
  const [faccionActiva, setFaccion] = useState(null);
  const [rolActivo, setRol] = useState(null);
  const [abiertos, setAbiertos] = useState(new Set());

  const esEgo = seccion === "egos";
  const lista = esEgo ? EGOS : IDENTITIES;
  const marcadas = esEgo ? owned.egos : owned.identities;
  const toggle = esEgo ? toggleOwnedEgo : toggleOwned;

  const hayFiltro = filtro.trim() !== "" || arquetiposActivos.size > 0 || faccionActiva !== null || rolActivo !== null;

  /*
    Estables a propósito: se los pasamos a las 184 tarjetas memoizadas, y una
    función nueva en cada render las invalidaría a todas.
  */
  const toggleArquetipo = useCallback((a) =>
    setArquetipos((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    }), []);

  const toggleFaccion = useCallback((f) => setFaccion((prev) => (prev === f ? null : f)), []);
  const toggleRol = useCallback((r) => setRol((prev) => (prev === r ? null : r)), []);

  const limpiar = () => {
    setFiltro("");
    setArquetipos(new Set());
    setFaccion(null);
    setRol(null);
  };

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return lista.filter((x) => {
      // Los chips de arquetipo suman (OR): "mostrame Bleed o Rupture".
      if (arquetiposActivos.size > 0 && !x.arquetipos.some((a) => arquetiposActivos.has(a))) return false;
      if (faccionActiva && !(x.etiquetas ?? []).includes(faccionActiva)) return false;
      if (rolActivo && !cumpleRol(x, rolActivo, arquetiposActivos)) return false;
      if (!q) return true;
      return (
        coincide(x.nombre, q) ||
        coincide(x.sinner, q) ||
        x.arquetipos.some((a) => coincide(a, q)) ||
        (x.etiquetas ?? []).some((f) => coincide(f, q)) ||
        (esEgo && coincide(x.rango, q))
      );
    });
  }, [filtro, lista, esEgo, arquetiposActivos, faccionActiva, rolActivo]);

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
      <div className="subtab-bar">
        {SECCIONES.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSeccion(s.key); limpiar(); }}
            className={cx("subtab", seccion === s.key && "activa")}
          >
            {s.label}
            <span className="subtab-count">{cuenta(s.key)}</span>
          </button>
        ))}
      </div>

      <p className="ayuda">
        {enVisita
          ? `Colección compartida: ${total} de ${lista.length} marcados. No se puede editar.`
          : null}
        {!enVisita && (
          <>
            Marcá qué {esEgo ? "E.G.O" : "Identidades"} tenés. Se guarda automáticamente en este
            navegador. <strong>{total}</strong> de {lista.length} marcados.
            {!esEgo && (
              <> Las {IDS_BASE.length} <strong>LCB Sinner</strong> vienen marcadas: son con las que
              arranca cualquiera.</>
            )}
          </>
        )}
      </p>

      <CompartirPanel propia={propia} onVisitar={onVisitar} modoVisita={enVisita} />

      {saveError && (
        <div className="aviso-error">No se pudo guardar el último cambio. Probá de nuevo.</div>
      )}

      <input
        type="search"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder={esEgo ? "Buscar por nombre, Sinner o rango (HE, WAW…)" : "Buscar por nombre, Sinner o facción"}
        className="buscador"
      />

      {/* Filtros rápidos: evitan tipear para lo que más se busca. */}
      <div className="filtro-row">
        {ARQUETIPOS.map((a) => (
          <ChipArquetipo key={a} arquetipo={a} onClick={toggleArquetipo} activo={arquetiposActivos.has(a)} />
        ))}
        {faccionActiva && <ChipFaccion faccion={faccionActiva} onClick={toggleFaccion} activo />}
      </div>

      {/*
        Rol dentro del arquetipo. Solo para Identities: los E.G.O no tienen
        sinergia derivada, y un chip que no filtra nada es peor que no estarlo.
      */}
      {!esEgo && (
        <div className="filtro-row">
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => toggleRol(r.key)}
              className={cx("chip-rol", rolActivo === r.key && "activo")}
              title={
                r.key === "aplica" || r.key === "lee"
                  ? "Se cruza con los arquetipos elegidos arriba"
                  : undefined
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="barra-acciones">
        <span className="resultado">
          {hayFiltro ? `${visibles.length} de ${lista.length}` : `${lista.length} en total`}
        </span>
        <span className="compartir-botones">
          {/*
            Densidad: con 184 tarjetas hay quien quiere verlas todas de un
            saque y quien quiere leerlas. Se recuerda, porque preguntarlo cada
            vez que abrís la app sería peor que no ofrecerlo.
          */}
          <span className="grupo-densidad" role="group" aria-label="Densidad de la lista">
            {DENSIDADES.map((d) => (
              <button
                key={d.key}
                onClick={() => onCambiarDensidad(d.key)}
                className={cx("chip-rol", densidad === d.key && "activo")}
                aria-pressed={densidad === d.key}
              >
                {d.label}
              </button>
            ))}
          </span>
          {hayFiltro && <button onClick={limpiar} className="boton-chico">Limpiar filtros</button>}
          {!hayFiltro && (
            <button
              onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(SINNERS))}
              className="boton-chico"
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
          <div key={sinner} className="sinner-block">
            <button
              onClick={() => alternarSinner(sinner)}
              className="sinner-header"
              aria-expanded={abierto}
            >
              <span>
                <span className="flecha">{abierto ? "▾" : "▸"}</span> {sinner}
              </span>
              <span className="sinner-count">
                {tenidas}/{delSinner.length}
              </span>
            </button>

            {abierto && (
              delSinner.length === 0 ? (
                <div className="sinner-vacio">Sin datos cargados todavía.</div>
              ) : (
                <div className="id-grid">
                  {delSinner.map((x) =>
                    esEgo ? (
                      <EgoCard
                        key={x.id}
                        ego={x}
                        checked={!!marcadas[x.id]}
                        onChange={toggle}
                        deshabilitado={enVisita}
                        onFiltrarArquetipo={toggleArquetipo}
                        arquetiposActivos={arquetiposActivos}
                      />
                    ) : (
                      <IdCard
                        key={x.id}
                        id={x}
                        checked={!!marcadas[x.id]}
                        onChange={toggle}
                        /*
                          Las base no se pueden desmarcar: las tiene todo el
                          mundo, así que dejar destildarlas sería ofrecer un
                          estado que la app va a revertir sola al recargar.
                        */
                        deshabilitado={enVisita || esIdentityBase(x.id)}
                        insignia={esIdentityBase(x.id) ? "por defecto" : null}
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
        <Vacio
          marca="◇"
          titulo="Nada coincide con esos filtros"
          accion={<button onClick={limpiar} className="boton-primario">Limpiar filtros</button>}
        >
          Probá con menos condiciones: los arquetipos suman entre sí, pero el rol y la facción
          recortan.
        </Vacio>
      )}
    </section>
  );
}
