import React from "react";
import { colorArquetipo, FACCIONES_GENERICAS } from "../data/constants.js";
import { ChipArquetipo, ChipFaccion } from "./Chips.jsx";
import Retrato from "./Retrato.jsx";
import { cx } from "../lib/cx.js";

/*
  Tarjeta con checkbox, compartida por las pestañas.

  Va con React.memo por un motivo medido: con las 184 abiertas, marcar una
  casilla tardaba 125 ms en un celular porque se re-renderizaban las 184. Para
  que el memo sirva, `onChange` tiene que ser la MISMA función entre renders,
  así que la tarjeta le pasa su propio id en vez de recibir un closure ya
  atado — `() => toggle(x.id)` creaba una función nueva por tarjeta y por
  render, y eso solo lo hacía peor.

  `claseActiva` distingue los dos sentidos de estar marcada: en Colección
  significa "la tengo" (verde) y en las otras dos "la elegí para esto" (oro).
*/
function IdCard({
  id, checked, onChange, claseActiva = "tenida", mostrarSinner, deshabilitado,
  onFiltrarArquetipo, onFiltrarFaccion, arquetiposActivos, faccionActiva,
  onVerDetalle, insignia,
}) {
  // El acento lateral toma el color del primer arquetipo: es lo que permite
  // reconocer de qué juega una ID sin leer el texto.
  const acento = id.arquetipos.length ? colorArquetipo(id.arquetipos[0]).borde : null;

  const facciones = (id.etiquetas ?? []).filter((f) => !FACCIONES_GENERICAS.has(f));

  return (
    <label
      className={cx("id-card", checked && claseActiva, deshabilitado && "solo-lectura")}
      style={acento ? { "--acento": acento } : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(id.id, id.sinner)}
        disabled={deshabilitado}
        className="checkbox"
      />
      <Retrato id={id.id} nombre={id.nombre} arquetipos={id.arquetipos} />
      <div className="fila-crece">
        <div className="id-nombre">
          {id.nombre}
          <span className="rareza">{"★".repeat(id.rareza)}</span>
          {/*
            Tres estados, y se distinguen: completa (LCTeamBuilder trae combate
            y soporte), solo soporte (la wiki únicamente publica esa), o nada.
            Mostrarlos igual haría parecer que todas están analizadas igual.
          */}
          {insignia && <span className="insignia">{insignia}</span>}
          {!id.tienePasivas && <span className="sin-datos" title="Sin datos de pasivas">sin pasivas</span>}
          {id.tienePasivas && !id.pasivasCompletas && (
            <span className="parcial" title="Solo se conoce la pasiva de soporte; falta la de combate">
              solo soporte
            </span>
          )}
        </div>

        {mostrarSinner && <div className="id-tags">{id.sinner}</div>}

        <div className="chip-row">
          {id.arquetipos.length === 0 && <span className="chip-vacio">Sin arquetipo</span>}
          {id.arquetipos.map((a) => (
            <ChipArquetipo
              key={a}
              arquetipo={a}
              onClick={onFiltrarArquetipo}
              activo={arquetiposActivos?.has(a)}
              navegable={false}
            />
          ))}
          {facciones.map((f) => (
            <ChipFaccion
              key={f}
              faccion={f}
              onClick={onFiltrarFaccion}
              activo={faccionActiva === f}
              navegable={false}
              ex={(id.etiquetasEx ?? []).includes(f)}
            />
          ))}
        </div>
      </div>

      {/*
        Va fuera del flujo del texto y frena la propagación: toda la tarjeta es
        un <label>, así que sin preventDefault este botón también marcaría la
        casilla. Abrir la ficha y marcarla como propia son cosas distintas.
      */}
      {onVerDetalle && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVerDetalle(id);
          }}
          className="boton-ficha"
          title={`Ver la ficha de ${id.nombre}`}
          aria-label={`Ver la ficha de ${id.nombre}`}
        >
          ficha
        </button>
      )}
    </label>
  );
}

export default React.memo(IdCard);
