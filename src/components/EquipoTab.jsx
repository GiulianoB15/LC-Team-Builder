import React, { useState } from "react";
import {
  DAMAGE_TYPES, DAMAGE_LABEL, SIN_LABEL, SLOTS_POSIBLES, SINNERS_TOTALES, etiquetaResistencia,
} from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import Retrato from "./Retrato.jsx";
import { CostoSin } from "./EgoCard.jsx";
import { descargarEquipo } from "../lib/estampa.js";
import { cx } from "../lib/cx.js";

export default function EquipoTab({
  ownedIdentities, equipoIds, onToggle, orden, recursos, resistencias, arquetipos, pasivas,
  egosEquipo, tieneEgos, max, sinergia, velocidad, onVerDetalle, banca, slots, onCambiarSlots,
}) {
  if (ownedIdentities.length === 0) {
    return (
      <p className="ayuda">
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
      <p className="ayuda">
        Elegí hasta {max} Identidades (una por Sinner). Las primeras <strong>{slots}</strong> del
        orden entran a combate; el resto queda en banca y sigue aportando su pasiva de soporte.
      </p>

      {/*
        El cupo lo define cada encuentro, no es un número del juego: el Mirror
        Dungeon actual va con 7 y otros capítulos con 6 o menos. Por eso se elige.
      */}
      <div className="selector-slots">
        <span className="detalle-subtitulo">Entran a pelear</span>
        <div className="fila">
          {SLOTS_POSIBLES.map((n) => (
            <button
              key={n}
              onClick={() => onCambiarSlots(n)}
              className={cx("chip-rol", slots === n && "activo")}
              aria-pressed={slots === n}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="motivo">
          Mirror Dungeon y Canto IX van con 7; el Canto VII y el Intervallo V, con 6. Los otros{" "}
          {SINNERS_TOTALES - slots} quedan de banca.
        </span>
      </div>

      <div className="id-grid">
        {ownedIdentities.map((id) => (
          <IdCard
            key={id.id}
            id={id}
            checked={equipoIds.includes(id.id)}
            onChange={onToggle}
            claseActiva="elegida"
            mostrarSinner
            onVerDetalle={onVerDetalle}
          />
        ))}
      </div>

      {equipoIds.length > 0 && (
        <>
          <div className="titulo-con-accion">
            <h2 className="titulo-seccion">Orden tentativo</h2>
            <button onClick={exportar} disabled={estampando} className="boton-chico">
              {estampando ? "Armando…" : "Descargar imagen"}
            </button>
          </div>
          <div className="aviso">
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
          <ol className="orden-lista">
            {orden.map((entrada, idx) => (
              <li key={entrada.id.id} className={cx("orden-item", entrada.banca && "banca")}>
                <div className="orden-numero">{idx + 1}</div>
                <div>
                  <div className="id-nombre">
                    {entrada.id.nombre}
                    {entrada.banca && <span className="banca-tag">banca</span>}
                  </div>
                  {entrada.motivoPosicion && (
                    <div className="motivo-posicion">📍 {entrada.motivoPosicion}</div>
                  )}
                  <div className="motivo">{entrada.motivo}</div>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="titulo-seccion">Quién aplica y quién cobra</h2>
          <p className="ayuda">
            El arquetipo dice a qué familia pertenece cada Identidad, no qué hace adentro. Esto sale
            de leer el texto de las pasivas, así que es <strong>observación, no dato oficial</strong>.
          </p>

          {Object.keys(sinergia.porArquetipo).length === 0 ? (
            <p className="ayuda">
              Ninguna pasiva de este equipo menciona estados de arquetipo, así que no hay nada que
              cruzar.
            </p>
          ) : (
            <ul className="lista-sinergia">
              {Object.entries(sinergia.porArquetipo)
                .sort((a, b) => b[1].aplican.length + b[1].leen.length - (a[1].aplican.length + a[1].leen.length))
                .map(([arquetipo, { aplican, leen }]) => {
                  const huerfano = leen.length > 0 && aplican.length === 0;
                  return (
                    <li key={arquetipo} className="fila-sinergia">
                      <strong>{arquetipo}</strong>
                      <span className="motivo">
                        {aplican.length} lo aplica{aplican.length === 1 ? "" : "n"} ·{" "}
                        {leen.length} lo aprovecha{leen.length === 1 ? "" : "n"}
                      </span>
                      {huerfano && (
                        <span className="sin-datos" title="Nadie del equipo lo inflige">
                          nadie lo aplica
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}

          {sinergia.huerfanos.length > 0 && (
            <div className="aviso">
              ⚠️ Hay {sinergia.huerfanos.length === 1 ? "un arquetipo" : `${sinergia.huerfanos.length} arquetipos`} que el
              equipo aprovecha pero nadie inflige:{" "}
              <strong>{sinergia.huerfanos.map((h) => h.arquetipo).join(", ")}</strong>. La pestaña
              «Completar equipo» prioriza a quienes lo tapan.
            </div>
          )}

          {sinergia.sinSenal.length > 0 && (
            <p className="ayuda">
              De {equipoIds.length}, {sinergia.sinSenal.length} no dice nada sobre estados de
              arquetipo en sus pasivas. No es que no sirvan: es que este análisis no las alcanza.
            </p>
          )}

          <h2 className="titulo-seccion">Quiénes conviene tener en la banca</h2>
          <p className="ayuda">
            De un suplente lo único que llega a la mesa es su <strong>pasiva de soporte</strong>:
            la de combate solo corre si está desplegado. Y como el equipo son {SINNERS_TOTALES}{" "}
            Sinners con uno cada uno, la banca no es "cinco cualesquiera" sino{" "}
            <strong>uno por cada Sinner que no entró</strong>.
          </p>

          {banca.length === 0 ? (
            <p className="ayuda">
              Los {SINNERS_TOTALES} Sinners están desplegados, así que no queda banca.
            </p>
          ) : (
            <div className="candidata-lista">
              {banca.map(({ sinner, mejor, opciones }) => (
                <div key={sinner} className="candidata">
                  <div className="candidata-header">
                    <div className="id-nombre">{sinner}</div>
                    {opciones.length > 1 && (
                      <span className="motivo">{opciones.length} opciones tuyas</span>
                    )}
                  </div>

                  {!mejor ? (
                    <div className="motivo">
                      No tenés ninguna Identidad de {sinner} en tu colección.
                    </div>
                  ) : (
                    <>
                      <div className="fila" style={{ marginTop: 4 }}>
                        <Retrato
                          id={mejor.id.id}
                          nombre={mejor.id.nombre}
                          arquetipos={mejor.id.arquetipos}
                          tamano={34}
                        />
                        <div className="fila-crece">
                          <div className="id-nombre">{mejor.id.nombre}</div>
                          {mejor.soporte[0] && (
                            <div className="id-tags">{mejor.soporte[0].nombre}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onVerDetalle(mejor.id)}
                          className="boton-ficha"
                          aria-label={`Ver la ficha de ${mejor.id.nombre}`}
                        >
                          ficha
                        </button>
                      </div>
                      {mejor.motivos.map((m, i) => (
                        <div key={i} className="motivo">{m}</div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <h2 className="titulo-seccion">Pasivas que se activan</h2>
          <p className="ayuda">
            <strong>{pasivas.activas}</strong> de {pasivas.totales} pasivas del equipo llegan a su
            costo de recursos de Sin. Es una estimación basada en las afinidades de las skills.
          </p>

          <h2 className="titulo-seccion">E.G.O disponibles</h2>
          {!tieneEgos ? (
            <p className="ayuda">
              No marcaste ningún E.G.O en tu colección todavía.
            </p>
          ) : egosEquipo.length === 0 ? (
            <p className="ayuda">
              Ninguno de tus E.G.O pertenece a los {slots} Sinners desplegados. Los de la
              banca no se pueden usar.
            </p>
          ) : (
            <>
              <p className="ayuda">
                Solo los de Sinners desplegados. Si alcanza o no es una estimación sobre los
                recursos que genera el equipo, igual que con las pasivas.
              </p>
              <div className="candidata-lista">
                {egosEquipo.map(({ ego, alcanza, faltantes }) => (
                  <div key={ego.id} className={cx("candidata", !alcanza && "no-alcanza")}>
                    <div className="candidata-header">
                      <div className="id-nombre">{ego.nombre}</div>
                      <div className={alcanza ? "ego-ok" : "ego-falta"}>
                        {alcanza ? "alcanza" : "no alcanza"}
                      </div>
                    </div>
                    <div className="id-tags">
                      {[ego.sinner, ego.rango, ...ego.arquetipos].join(" · ")}
                    </div>
                    <CostoSin costo={ego.costo} faltantes={faltantes} />
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="titulo-seccion">Recursos de Sin ({slots} desplegados)</h2>
          {sinsActivos.length === 0 ? (
            <p className="ayuda">Sin recursos todavía.</p>
          ) : (
            <div className="res-row">
              {sinsActivos.map(([sin, count]) => (
                <div key={sin} className="res-pill">
                  <span>{SIN_LABEL[sin] ?? sin}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}

          <h2 className="titulo-seccion">Resistencias ({slots} desplegados)</h2>
          <div className="res-row">
            {DAMAGE_TYPES.map((t) => (
              <div key={t} className="res-pill">
                <span>{DAMAGE_LABEL[t]}</span>
                <strong>{etiquetaResistencia(resistencias[t].peor)}</strong>
                {resistencias[t].blandos > 0 && (
                  <span className="res-detalle">
                    ({resistencias[t].blandos} de {resistencias[t].total} flojos)
                  </span>
                )}
              </div>
            ))}
          </div>

          <h2 className="titulo-seccion">Arquetipos del equipo</h2>
          {arquetiposActivos.length === 0 ? (
            <p className="ayuda">Ninguna de las elegidas tiene arquetipo marcado.</p>
          ) : (
            <div className="res-row">
              {arquetiposActivos.map(([a, c]) => (
                <div key={a} className="res-pill">
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
