import React, { useState } from "react";
import {
  DAMAGE_TYPES, DAMAGE_LABEL, SIN_LABEL, SLOTS_POSIBLES, SINNERS_TOTALES, etiquetaResistencia,
} from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import Retrato from "./Retrato.jsx";
import { CostoSin } from "./EgoCard.jsx";
import { descargarEquipo } from "../lib/estampa.js";
import { styles } from "../styles.js";

export default function EquipoTab({
  ownedIdentities, equipoIds, onToggle, orden, recursos, resistencias, arquetipos, pasivas,
  egosEquipo, tieneEgos, max, sinergia, velocidad, onVerDetalle, banca, slots, onCambiarSlots,
}) {
  if (ownedIdentities.length === 0) {
    return (
      <p style={styles.helpText}>
        Todavía no marcaste Identidades como propias en la pestaña Colección.
      </p>
    );
  }

  /*
    La estampa se arma con canvas en el navegador: nada sale de la máquina. El
    estado es solo para no dejar el botón mudo mientras cargan los retratos.
  */
  const [estampando, setEstampando] = useState(false);
  const exportar = async () => {
    setEstampando(true);
    try {
      await descargarEquipo(orden, { baseUrl: import.meta.env.BASE_URL });
    } finally {
      setEstampando(false);
    }
  };

  const arquetiposActivos = Object.entries(arquetipos).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const sinsActivos = Object.entries(recursos).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

  return (
    <section>
      <p style={styles.helpText}>
        Elegí hasta {max} Identidades (una por Sinner). Las primeras <strong>{slots}</strong> del
        orden entran a combate; el resto queda en banca y sigue aportando su pasiva de soporte.
      </p>

      {/*
        El cupo lo define cada encuentro, no es un número del juego: el Mirror
        Dungeon actual va con 7 y otros capítulos con 6 o menos. Por eso se elige.
      */}
      <div style={styles.selectorSlots}>
        <span style={styles.detalleSubtitulo}>Entran a pelear</span>
        <div style={{ display: "flex", gap: 6 }}>
          {SLOTS_POSIBLES.map((n) => (
            <button
              key={n}
              onClick={() => onCambiarSlots(n)}
              style={{ ...styles.chipRol, ...(slots === n ? styles.chipRolActivo : {}) }}
              aria-pressed={slots === n}
            >
              {n}
            </button>
          ))}
        </div>
        <span style={styles.reasonText}>
          Mirror Dungeon y Canto IX van con 7; el Canto VII y el Intervallo V, con 6. Los otros{" "}
          {SINNERS_TOTALES - slots} quedan de banca.
        </span>
      </div>

      <div style={styles.idGrid}>
        {ownedIdentities.map((id) => (
          <IdCard
            key={id.id}
            id={id}
            checked={equipoIds.includes(id.id)}
            onChange={() => onToggle(id.id, id.sinner)}
            estiloActivo={styles.idCardSelected}
            mostrarSinner
            onVerDetalle={onVerDetalle}
          />
        ))}
      </div>

      {equipoIds.length > 0 && (
        <>
          <div style={styles.tituloConAccion}>
            <h2 style={styles.sectionTitle}>Orden tentativo</h2>
            <button onClick={exportar} disabled={estampando} style={styles.botonChico}>
              {estampando ? "Armando…" : "Descargar imagen"}
            </button>
          </div>
          <div style={styles.aviso}>
            ⚠️ Heurística, no dato verificado. Quién actúa primero lo decide la{" "}
            <strong>velocidad</strong>, no este orden: el slot solo desempata cuando dos sacan el
            mismo valor. Donde el slot sí manda es en las pasivas que buffean por posición, y esas
            se respetan primero. El resto va por cuántos recursos de Sin aporta a las pasivas que el
            equipo necesita.
            {velocidad.max != null && (
              <>
                {" "}Velocidad del equipo: <strong>{velocidad.min}–{velocidad.max}</strong>.
              </>
            )}
          </div>
          <ol style={styles.orderList}>
            {orden.map((entrada, idx) => (
              <li
                key={entrada.id.id}
                style={{ ...styles.orderItem, ...(entrada.banca ? styles.orderItemBanca : {}) }}
              >
                <div style={styles.orderNumber}>{idx + 1}</div>
                <div>
                  <div style={styles.idName}>
                    {entrada.id.nombre}
                    {entrada.banca && <span style={styles.bancaTag}>banca</span>}
                  </div>
                  {entrada.motivoPosicion && (
                    <div style={styles.reasonPosicion}>📍 {entrada.motivoPosicion}</div>
                  )}
                  <div style={styles.reasonText}>{entrada.motivo}</div>
                </div>
              </li>
            ))}
          </ol>

          <h2 style={styles.sectionTitle}>Quién aplica y quién cobra</h2>
          <p style={styles.helpText}>
            El arquetipo dice a qué familia pertenece cada Identidad, no qué hace adentro. Esto sale
            de leer el texto de las pasivas, así que es <strong>observación, no dato oficial</strong>.
          </p>

          {Object.keys(sinergia.porArquetipo).length === 0 ? (
            <p style={styles.helpText}>
              Ninguna pasiva de este equipo menciona estados de arquetipo, así que no hay nada que
              cruzar.
            </p>
          ) : (
            <ul style={styles.listaSinergia}>
              {Object.entries(sinergia.porArquetipo)
                .sort((a, b) => b[1].aplican.length + b[1].leen.length - (a[1].aplican.length + a[1].leen.length))
                .map(([arquetipo, { aplican, leen }]) => {
                  const huerfano = leen.length > 0 && aplican.length === 0;
                  return (
                    <li key={arquetipo} style={styles.filaSinergia}>
                      <strong>{arquetipo}</strong>
                      <span style={styles.reasonText}>
                        {aplican.length} lo aplica{aplican.length === 1 ? "" : "n"} ·{" "}
                        {leen.length} lo aprovecha{leen.length === 1 ? "" : "n"}
                      </span>
                      {huerfano && (
                        <span style={styles.sinDatos} title="Nadie del equipo lo inflige">
                          nadie lo aplica
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}

          {sinergia.huerfanos.length > 0 && (
            <div style={styles.aviso}>
              ⚠️ Hay {sinergia.huerfanos.length === 1 ? "un arquetipo" : `${sinergia.huerfanos.length} arquetipos`} que el
              equipo aprovecha pero nadie inflige:{" "}
              <strong>{sinergia.huerfanos.map((h) => h.arquetipo).join(", ")}</strong>. La pestaña
              «Completar equipo» prioriza a quienes lo tapan.
            </div>
          )}

          {sinergia.sinSenal.length > 0 && (
            <p style={styles.helpText}>
              De {equipoIds.length}, {sinergia.sinSenal.length} no dice nada sobre estados de
              arquetipo en sus pasivas. No es que no sirvan: es que este análisis no las alcanza.
            </p>
          )}

          <h2 style={styles.sectionTitle}>Quiénes conviene tener en la banca</h2>
          <p style={styles.helpText}>
            De un suplente lo único que llega a la mesa es su <strong>pasiva de soporte</strong>:
            la de combate solo corre si está desplegado. Y como el equipo son {SINNERS_TOTALES}{" "}
            Sinners con uno cada uno, la banca no es "cinco cualesquiera" sino{" "}
            <strong>uno por cada Sinner que no entró</strong>.
          </p>

          {banca.length === 0 ? (
            <p style={styles.helpText}>
              Los {SINNERS_TOTALES} Sinners están desplegados, así que no queda banca.
            </p>
          ) : (
            <div style={styles.candidateList}>
              {banca.map(({ sinner, mejor, opciones }) => (
                <div key={sinner} style={styles.candidateCard}>
                  <div style={styles.candidateHeader}>
                    <div style={styles.idName}>{sinner}</div>
                    {opciones.length > 1 && (
                      <span style={styles.reasonText}>{opciones.length} opciones tuyas</span>
                    )}
                  </div>

                  {!mejor ? (
                    <div style={styles.reasonText}>
                      No tenés ninguna Identidad de {sinner} en tu colección.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, minWidth: 0 }}>
                        <Retrato
                          id={mejor.id.id}
                          nombre={mejor.id.nombre}
                          arquetipos={mejor.id.arquetipos}
                          tamano={34}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={styles.idName}>{mejor.id.nombre}</div>
                          {mejor.soporte[0] && (
                            <div style={styles.idTags}>{mejor.soporte[0].nombre}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onVerDetalle(mejor.id)}
                          style={styles.botonFicha}
                          aria-label={`Ver la ficha de ${mejor.id.nombre}`}
                        >
                          ficha
                        </button>
                      </div>
                      {mejor.motivos.map((m, i) => (
                        <div key={i} style={styles.reasonText}>{m}</div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <h2 style={styles.sectionTitle}>Pasivas que se activan</h2>
          <p style={styles.helpText}>
            <strong>{pasivas.activas}</strong> de {pasivas.totales} pasivas del equipo llegan a su
            costo de recursos de Sin. Es una estimación basada en las afinidades de las skills.
          </p>

          <h2 style={styles.sectionTitle}>E.G.O disponibles</h2>
          {!tieneEgos ? (
            <p style={styles.helpText}>
              No marcaste ningún E.G.O en tu colección todavía.
            </p>
          ) : egosEquipo.length === 0 ? (
            <p style={styles.helpText}>
              Ninguno de tus E.G.O pertenece a los {slots} Sinners desplegados. Los de la
              banca no se pueden usar.
            </p>
          ) : (
            <>
              <p style={styles.helpText}>
                Solo los de Sinners desplegados. Si alcanza o no es una estimación sobre los
                recursos que genera el equipo, igual que con las pasivas.
              </p>
              <div style={styles.candidateList}>
                {egosEquipo.map(({ ego, alcanza, faltantes }) => (
                  <div
                    key={ego.id}
                    style={{ ...styles.candidateCard, ...(alcanza ? {} : styles.egoNoAlcanza) }}
                  >
                    <div style={styles.candidateHeader}>
                      <div style={styles.idName}>{ego.nombre}</div>
                      <div style={alcanza ? styles.egoOk : styles.egoFalta}>
                        {alcanza ? "alcanza" : "no alcanza"}
                      </div>
                    </div>
                    <div style={styles.idTags}>
                      {[ego.sinner, ego.rango, ...ego.arquetipos].join(" · ")}
                    </div>
                    <CostoSin costo={ego.costo} faltantes={faltantes} />
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 style={styles.sectionTitle}>Recursos de Sin ({slots} desplegados)</h2>
          {sinsActivos.length === 0 ? (
            <p style={styles.helpText}>Sin recursos todavía.</p>
          ) : (
            <div style={styles.resRow}>
              {sinsActivos.map(([sin, count]) => (
                <div key={sin} style={styles.resPill}>
                  <span>{SIN_LABEL[sin] ?? sin}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}

          <h2 style={styles.sectionTitle}>Resistencias ({slots} desplegados)</h2>
          <div style={styles.resRow}>
            {DAMAGE_TYPES.map((t) => (
              <div key={t} style={styles.resPill}>
                <span>{DAMAGE_LABEL[t]}</span>
                <strong>{etiquetaResistencia(resistencias[t].peor)}</strong>
                {resistencias[t].blandos > 0 && (
                  <span style={styles.resDetalle}>
                    ({resistencias[t].blandos} de {resistencias[t].total} flojos)
                  </span>
                )}
              </div>
            ))}
          </div>

          <h2 style={styles.sectionTitle}>Arquetipos del equipo</h2>
          {arquetiposActivos.length === 0 ? (
            <p style={styles.helpText}>Ninguna de las elegidas tiene arquetipo marcado.</p>
          ) : (
            <div style={styles.resRow}>
              {arquetiposActivos.map(([a, c]) => (
                <div key={a} style={styles.resPill}>
                  <span>{a}</span>
                  <strong>{c}</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
