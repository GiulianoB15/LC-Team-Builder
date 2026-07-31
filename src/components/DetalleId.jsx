import React, { useEffect } from "react";
import {
  SIN_LABEL, DAMAGE_LABEL, DAMAGE_TYPES, etiquetaResistencia, colorArquetipo, FACCIONES_GENERICAS,
} from "../data/constants.js";
import Retrato from "./Retrato.jsx";
import { styles } from "../styles.js";

/*
  Ficha completa de una Identidad, y comparador de dos.

  POR QUÉ EXISTE

  Todo esto ya estaba en el dataset y no se mostraba en ningún lado: el texto de
  las pasivas, el costo de cada una, los números de las skills, la velocidad.
  El motor los usaba para puntuar, pero no había forma de mirarlos.

  POR QUÉ ES UNA TABLA Y NO DOS TARJETAS

  Comparando dos, lo que importa es la fila —"velocidad de esta contra la de
  aquella"—, no la tarjeta. Con dos tarjetas al lado hay que ir y volver con la
  vista buscando el mismo campo. Además una tabla de dos columnas entra en un
  celular; dos fichas completas, no.
*/

const val = (x, sufijo = "") => (x == null ? "—" : `${x}${sufijo}`);

/* Los tres números de una skill se leen juntos: 5 + 3×2 es "poder 5, 3 monedas de 2". */
const formatoPoder = (s) =>
  s.poderBase == null ? "—" : `${s.poderBase}${s.monedas ? ` + ${s.monedas}×${s.valorMoneda}` : ""}`;

/*
  El costo de una pasiva es "4 de Lujuria (propios)". `tipoCosto` distingue si
  cuentan los recursos que la ID tiene o los del equipo entero (resonancia).
*/
function CostoPasiva({ pasiva }) {
  if (!pasiva.costo?.length) return <span style={styles.reasonText}>sin costo</span>;
  const tipo = pasiva.tipoCosto === "resonance" ? "resonancia" : pasiva.tipoCosto === "owned" ? "propios" : null;
  return (
    <span style={styles.reasonText}>
      {pasiva.costo.map((c) => `${c.cantidad} de ${SIN_LABEL[c.sin] ?? c.sin}`).join(", ")}
      {tipo ? ` (${tipo})` : ""}
    </span>
  );
}

function Pasivas({ id }) {
  const bloques = [
    ["De combate", id.pasivas.combate],
    ["De soporte", id.pasivas.soporte],
  ];

  return (
    <>
      {bloques.map(([titulo, lista]) => (
        <div key={titulo} style={{ marginTop: 10 }}>
          <div style={styles.detalleSubtitulo}>{titulo}</div>
          {lista.length === 0 ? (
            <div style={styles.reasonText}>Sin datos.</div>
          ) : (
            lista.map((p, i) => (
              <div key={i} style={styles.pasivaBloque}>
                <div style={styles.pasivaNombre}>{p.nombre}</div>
                <CostoPasiva pasiva={p} />
                {/*
                  El texto viene con los tokens del juego entre corchetes
                  ([Bleed], [AttackDmgUp]). Se deja crudo: es el original, y
                  reescribirlo sería inventar.
                */}
                <div style={styles.pasivaTexto}>{p.descripcion}</div>
              </div>
            ))
          )}
        </div>
      ))}
    </>
  );
}

/* Las filas que se pueden comparar entre dos IDs, en el orden en que se leen. */
function filas(id) {
  const facciones = (id.etiquetas ?? []).filter((f) => !FACCIONES_GENERICAS.has(f));
  return [
    ["Sinner", id.sinner],
    ["Rareza", "★".repeat(id.rareza)],
    ["Estreno", id.fecha ?? "—"],
    ["Arquetipos", id.arquetipos.length ? id.arquetipos.join(", ") : "sin arquetipo"],
    ["Facciones", facciones.length ? facciones.join(", ") : "—"],
    /* La velocidad se tira dentro de este rango cada turno, no es un valor fijo. */
    ["Velocidad", id.velocidad?.max == null ? "—" : `${id.velocidad.min}–${id.velocidad.max}`],
    ["Salud base", val(id.saludBase)],
    ["Nivel de defensa", val(id.nivelDefensa)],
    ...DAMAGE_TYPES.map((t) => [
      `Resistencia ${DAMAGE_LABEL[t].toLowerCase()}`,
      `${id.resistencias[t]}× · ${etiquetaResistencia(id.resistencias[t])}`,
    ]),
    ["Afinidad dominante", id.afinidadDominante ? SIN_LABEL[id.afinidadDominante] : "—"],
  ];
}

function Skills({ id }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={styles.detalleSubtitulo}>Skills</div>
      <div style={styles.tablaScroll}>
        <table style={styles.tabla}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Sin</th>
              <th style={styles.th}>Daño</th>
              <th style={styles.th}>Copias</th>
              <th style={styles.th}>Poder</th>
            </tr>
          </thead>
          <tbody>
            {id.skills.map((s) => (
              <tr key={s.id}>
                <td style={styles.td}>{s.tier}</td>
                <td style={styles.td}>{s.nombre ?? "—"}</td>
                <td style={styles.td}>{s.sin ? SIN_LABEL[s.sin] : "—"}</td>
                <td style={styles.td}>{s.tipoDanio ? DAMAGE_LABEL[s.tipoDanio] : "—"}</td>
                <td style={styles.td}>{s.copias}</td>
                <td style={styles.td}>{formatoPoder(s)}</td>
              </tr>
            ))}
            {id.skillsDefensa.map((s) => (
              <tr key={s.id}>
                <td style={styles.td}>D</td>
                <td style={styles.td} colSpan={2}>
                  {s.tipo === "guard" ? "Defensa (guardia)" : s.tipo === "evade" ? "Defensa (esquiva)" : "Defensa"}
                </td>
                <td style={styles.td} colSpan={3}>{s.sin ? SIN_LABEL[s.sin] : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Rol dentro del arquetipo. Derivado del texto: se dice, no se disimula. */
function Sinergia({ id }) {
  const s = id.sinergia;
  if (!s) return null;
  const nada = !s.aplica.length && !s.lee.length && !s.buffeaAliados && !s.posicion;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={styles.detalleSubtitulo}>Rol en el equipo</div>
      {nada ? (
        <div style={styles.reasonText}>
          Sus pasivas no mencionan estados de arquetipo, así que este análisis no la alcanza.
        </div>
      ) : (
        <ul style={styles.listaSinergia}>
          {s.aplica.length > 0 && (
            <li style={styles.filaSinergia}>Aplica <strong>{s.aplica.join(", ")}</strong></li>
          )}
          {s.lee.length > 0 && (
            <li style={styles.filaSinergia}>Aprovecha <strong>{s.lee.join(", ")}</strong></li>
          )}
          {s.buffeaAliados && <li style={styles.filaSinergia}>Reparte buffs al resto del equipo</li>}
          {s.posicion === "temprano" && <li style={styles.filaSinergia}>📍 Conviene desplegarla temprano</li>}
          {s.posicion === "medio" && <li style={styles.filaSinergia}>📍 Conviene desplegarla al medio</li>}
          {s.posicion === "tarde" && <li style={styles.filaSinergia}>📍 Conviene desplegarla tarde</li>}
        </ul>
      )}
      <div style={styles.reasonText}>
        Derivado del texto de las pasivas, no es un campo oficial del juego.
      </div>
    </div>
  );
}

function Encabezado({ id }) {
  const color = id.arquetipos.length ? colorArquetipo(id.arquetipos[0]).borde : null;
  return (
    <div style={{ ...styles.detalleEncabezado, ...(color ? { borderLeft: `3px solid ${color}` } : {}) }}>
      <Retrato id={id.id} nombre={id.nombre} arquetipos={id.arquetipos} tamano={64} />
      <div style={{ minWidth: 0 }}>
        <div style={styles.idName}>{id.nombre}</div>
        <div style={styles.idTags}>
          {id.sinner} · {"★".repeat(id.rareza)}
        </div>
      </div>
    </div>
  );
}

/*
  Selector de la segunda ID. Es un <select> y no un modo aparte ("ahora elegí
  otra") para no meter un estado más en la app: entra en un celular, se opera
  con una mano y no hay nada que cancelar.

  Se ofrecen las 184, no solo las propias, porque comparar contra una que NO
  tenés es justo lo que sirve para decidir si te conviene sacarla.
*/
function SelectorComparar({ id, comparar, candidatas, onComparar }) {
  const mismoSinner = candidatas.filter((x) => x.sinner === id.sinner && x.id !== id.id);
  const resto = candidatas.filter((x) => x.sinner !== id.sinner);

  return (
    <label style={styles.selectorComparar}>
      <span style={styles.detalleSubtitulo}>Comparar con</span>
      <select
        value={comparar?.id ?? ""}
        onChange={(e) => onComparar(e.target.value ? Number(e.target.value) : null)}
        style={styles.select}
      >
        <option value="">— ninguna —</option>
        <optgroup label={`Del mismo Sinner (${id.sinner})`}>
          {mismoSinner.map((x) => (
            <option key={x.id} value={x.id}>{x.nombre}</option>
          ))}
        </optgroup>
        <optgroup label="Otras">
          {resto.map((x) => (
            <option key={x.id} value={x.id}>{x.sinner} — {x.nombre}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

export default function DetalleId({ id, comparar, candidatas = [], onCerrar, onComparar }) {
  /* Escape cierra: en un panel que tapa la pantalla es lo primero que uno prueba. */
  useEffect(() => {
    const alTeclear = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  if (!id) return null;
  const ids = comparar ? [id, comparar] : [id];

  return (
    <div style={styles.overlay} onClick={onCerrar}>
      {/* El click de adentro no debe cerrar; solo el del fondo. */}
      <div style={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={id.nombre}>
        <div style={styles.panelBarra}>
          <strong style={styles.panelTitulo}>{comparar ? "Comparación" : "Ficha"}</strong>
          <button onClick={onCerrar} style={styles.botonChico} aria-label="Cerrar">
            Cerrar
          </button>
        </div>

        <div style={styles.panelCuerpo}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ids.map((x) => (
              <Encabezado key={x.id} id={x} />
            ))}
          </div>

          <SelectorComparar id={id} comparar={comparar} candidatas={candidatas} onComparar={onComparar} />

          {/*
            Con una sola ID la tabla es "campo: valor". Con dos, la misma tabla
            gana una columna y ya es un comparador: no hace falta otra vista.
          */}
          <div style={styles.tablaScroll}>
            <table style={styles.tabla}>
              {comparar && (
                <thead>
                  <tr>
                    <th style={styles.th}></th>
                    {ids.map((x) => (
                      <th key={x.id} style={styles.th}>{x.nombre}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {filas(ids[0]).map(([etiqueta], i) => {
                  const valores = ids.map((x) => filas(x)[i][1]);
                  /* Con dos columnas, resaltar lo que difiere es la mitad del trabajo. */
                  const difieren = valores.length > 1 && valores[0] !== valores[1];
                  return (
                    <tr key={etiqueta}>
                      <td style={{ ...styles.td, ...styles.tdEtiqueta }}>{etiqueta}</td>
                      {valores.map((v, j) => (
                        <td key={j} style={{ ...styles.td, ...(difieren ? styles.tdDistinto : {}) }}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ids.map((x) => (
            <section key={x.id} style={styles.detalleSeccion}>
              {comparar && <div style={styles.detalleTituloId}>{x.nombre}</div>}
              <Skills id={x} />
              <Sinergia id={x} />
              <div style={{ marginTop: 10 }}>
                <div style={styles.detalleSubtitulo}>Pasivas</div>
                <Pasivas id={x} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
