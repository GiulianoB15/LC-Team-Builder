import React, { useEffect } from "react";
import {
  SIN_LABEL, DAMAGE_LABEL, DAMAGE_TYPES, etiquetaResistencia, colorArquetipo, FACCIONES_GENERICAS,
} from "../data/constants.js";
import Retrato from "./Retrato.jsx";
import Rareza from "./Rareza.jsx";
import { ChipArquetipo, ChipFaccion } from "./Chips.jsx";
import { cx } from "../lib/cx.js";

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
  if (!pasiva.costo?.length) return <span className="motivo">sin costo</span>;
  const tipo = pasiva.tipoCosto === "resonance" ? "resonancia" : pasiva.tipoCosto === "owned" ? "propios" : null;
  return (
    <span className="motivo">
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
        <div key={titulo} className="detalle-bloque">
          <div className="detalle-subtitulo">{titulo}</div>
          {lista.length === 0 ? (
            <div className="motivo">Sin datos.</div>
          ) : (
            lista.map((p, i) => (
              <div key={i} className="pasiva">
                <div className="pasiva-nombre">{p.nombre}</div>
                <CostoPasiva pasiva={p} />
                {/*
                  El texto viene con los tokens del juego entre corchetes
                  ([Bleed], [AttackDmgUp]). Se deja crudo: es el original, y
                  reescribirlo sería inventar.
                */}
                <div className="pasiva-texto">{p.descripcion}</div>
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
  /*
    Las afiliaciones anteriores se marcan: la tabla es texto plano, así que acá
    no sirve el tachado que usan los chips. Sin la marca, la ficha diría que
    Thumb Nursefather está en Le Sette Famiglie, y ya no lo está.
  */
  const facciones = (id.etiquetas ?? [])
    .filter((f) => !FACCIONES_GENERICAS.has(f))
    .map((f) => ((id.etiquetasEx ?? []).includes(f) ? `${f} (ex)` : f));
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
    ["Afinidad dominante", id.afinidadDominante ? SIN_LABEL[id.afinidadDominante] : "—"],
  ];
}

/*
  Resistencias como barra y no como número.

  El dato es un multiplicador de daño recibido: 0.5 resiste, 1 normal, 2 fatal.
  Escrito así —«2× · Fatal»— hay que traducirlo mentalmente cada vez, y encima
  al revés, porque más alto es PEOR. La barra invierte eso de una: llena y
  verde es aguantar, corta y roja es que te parten.

  La escala va de 0.5 a 2, así que el ancho es (mult − 0.5) / 1.5 invertido.
*/
const ANCHO_RES = (mult) => `${Math.round((1 - (mult - 0.5) / 1.5) * 100)}%`;
const CLASE_RES = (mult) => (mult <= 0.5 ? "bien" : mult >= 2 ? "mal" : "normal");

function Resistencias({ id }) {
  return (
    <div className="detalle-bloque">
      <div className="detalle-subtitulo">Resistencias</div>
      <div className="motivo">Multiplicador de daño recibido: más barra es mejor.</div>
      <div className="res-barras">
        {DAMAGE_TYPES.map((t) => {
          const m = id.resistencias[t];
          return (
            <div key={t} className="res-fila">
              <span className="res-nombre">{DAMAGE_LABEL[t]}</span>
              <span className="res-canal">
                <span className={cx("res-relleno", CLASE_RES(m))} style={{ width: ANCHO_RES(m) }} />
              </span>
              <span className="res-valor">
                {m}× <span className="res-detalle">{etiquetaResistencia(m)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Skills({ id }) {
  return (
    <div className="detalle-bloque">
      <div className="detalle-subtitulo">Skills</div>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Sin</th>
              <th>Daño</th>
              <th>Copias</th>
              <th>Poder</th>
            </tr>
          </thead>
          <tbody>
            {id.skills.map((s) => (
              <tr key={s.id}>
                <td>{s.tier}</td>
                <td>{s.nombre ?? "—"}</td>
                <td>{s.sin ? SIN_LABEL[s.sin] : "—"}</td>
                <td>{s.tipoDanio ? DAMAGE_LABEL[s.tipoDanio] : "—"}</td>
                <td>{s.copias}</td>
                <td>{formatoPoder(s)}</td>
              </tr>
            ))}
            {id.skillsDefensa.map((s) => (
              <tr key={s.id}>
                <td>D</td>
                <td colSpan={2}>
                  {s.tipo === "guard" ? "Defensa (guardia)" : s.tipo === "evade" ? "Defensa (esquiva)" : "Defensa"}
                </td>
                <td colSpan={3}>{s.sin ? SIN_LABEL[s.sin] : "—"}</td>
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
    <div className="detalle-bloque">
      <div className="detalle-subtitulo">Rol en el equipo</div>
      {nada ? (
        <div className="motivo">
          Sus pasivas no mencionan estados de arquetipo, así que este análisis no la alcanza.
        </div>
      ) : (
        <ul className="lista-sinergia">
          {s.aplica.length > 0 && (
            <li className="fila-sinergia">Aplica <strong>{s.aplica.join(", ")}</strong></li>
          )}
          {s.lee.length > 0 && (
            <li className="fila-sinergia">Aprovecha <strong>{s.lee.join(", ")}</strong></li>
          )}
          {s.buffeaAliados && <li className="fila-sinergia">Reparte buffs al resto del equipo</li>}
          {s.posicion === "temprano" && <li className="fila-sinergia">📍 Conviene desplegarla temprano</li>}
          {s.posicion === "medio" && <li className="fila-sinergia">📍 Conviene desplegarla al medio</li>}
          {s.posicion === "tarde" && <li className="fila-sinergia">📍 Conviene desplegarla tarde</li>}
        </ul>
      )}
      <div className="motivo">
        Derivado del texto de las pasivas, no es un campo oficial del juego.
      </div>
    </div>
  );
}

function Encabezado({ id }) {
  const color = id.arquetipos.length ? colorArquetipo(id.arquetipos[0]).borde : null;
  const facciones = (id.etiquetas ?? []).filter((f) => !FACCIONES_GENERICAS.has(f));
  return (
    <div className="detalle-encabezado" style={color ? { "--acento": color } : undefined}>
      <Retrato id={id.id} nombre={id.nombre} arquetipos={id.arquetipos} variante="ficha" />
      <div className="detalle-encabezado-texto">
        <div className="detalle-nombre">{id.nombre}</div>
        <div className="id-tags">
          {id.sinner} <Rareza n={id.rareza} />
        </div>
        <div className="chip-row">
          {id.arquetipos.map((a) => <ChipArquetipo key={a} arquetipo={a} navegable={false} />)}
          {facciones.map((f) => (
            <ChipFaccion key={f} faccion={f} navegable={false} ex={(id.etiquetasEx ?? []).includes(f)} />
          ))}
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
    <label className="selector-comparar">
      <span className="detalle-subtitulo">Comparar con</span>
      <select
        value={comparar?.id ?? ""}
        onChange={(e) => onComparar(e.target.value ? Number(e.target.value) : null)}
        className="select"
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
    <div className="overlay" onClick={onCerrar}>
      {/* El click de adentro no debe cerrar; solo el del fondo. */}
      <div className="panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={id.nombre}>
        <div className="panel-barra">
          <strong className="panel-titulo">{comparar ? "Comparación" : "Ficha"}</strong>
          <button onClick={onCerrar} className="boton-chico" aria-label="Cerrar">
            Cerrar
          </button>
        </div>

        <div className="panel-cuerpo">
          <div className="detalle-encabezados">
            {ids.map((x) => (
              <Encabezado key={x.id} id={x} />
            ))}
          </div>

          <SelectorComparar id={id} comparar={comparar} candidatas={candidatas} onComparar={onComparar} />

          {/*
            Con una sola ID la tabla es "campo: valor". Con dos, la misma tabla
            gana una columna y ya es un comparador: no hace falta otra vista.
          */}
          <div className="tabla-scroll">
            <table className="tabla">
              {comparar && (
                <thead>
                  <tr>
                    <th></th>
                    {ids.map((x) => (
                      <th key={x.id}>{x.nombre}</th>
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
                      <td className="etiqueta">{etiqueta}</td>
                      {valores.map((v, j) => (
                        <td key={j} className={cx(difieren && "distinto")}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ids.map((x) => (
            <section key={x.id} className="detalle-seccion">
              {comparar && <div className="detalle-titulo-id">{x.nombre}</div>}
              <Resistencias id={x} />
              <Skills id={x} />
              <Sinergia id={x} />
              <div className="detalle-bloque">
                <div className="detalle-subtitulo">Pasivas</div>
                <Pasivas id={x} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
