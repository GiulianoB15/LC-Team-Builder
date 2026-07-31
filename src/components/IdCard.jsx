import React from "react";
import { colorArquetipo, FACCIONES_GENERICAS } from "../data/constants.js";
import { ChipArquetipo, ChipFaccion } from "./Chips.jsx";
import Retrato from "./Retrato.jsx";
import { styles } from "../styles.js";

/*
  Tarjeta con checkbox, compartida por las pestañas.

  Va con React.memo por un motivo medido: con las 184 abiertas, marcar una
  casilla tardaba 125 ms en un celular porque se re-renderizaban las 184. Para
  que el memo sirva, `onChange` tiene que ser la MISMA función entre renders,
  así que la tarjeta le pasa su propio id en vez de recibir un closure ya
  atado — `() => toggle(x.id)` creaba una función nueva por tarjeta y por
  render, y eso solo lo hacía peor.
*/
function IdCard({
  id, checked, onChange, estiloActivo, mostrarSinner, deshabilitado,
  onFiltrarArquetipo, onFiltrarFaccion, arquetiposActivos, faccionActiva,
  onVerDetalle,
}) {
  // El acento lateral toma el color del primer arquetipo: es lo que permite
  // reconocer de qué juega una ID sin leer el texto.
  const acento = id.arquetipos.length ? colorArquetipo(id.arquetipos[0]).borde : null;

  const facciones = (id.etiquetas ?? []).filter((f) => !FACCIONES_GENERICAS.has(f));

  return (
    <label
      style={{
        ...styles.idCard,
        ...(checked ? estiloActivo : {}),
        ...(deshabilitado ? styles.cardSoloLectura : {}),
        ...(acento ? { borderLeft: `3px solid ${acento}` } : {}),
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(id.id, id.sinner)}
        disabled={deshabilitado}
        style={styles.checkbox}
      />
      <Retrato id={id.id} nombre={id.nombre} arquetipos={id.arquetipos} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.idName}>
          {id.nombre}
          <span style={styles.rareza}>{"★".repeat(id.rareza)}</span>
          {/*
            Tres estados, y se distinguen: completa (LCTeamBuilder trae combate
            y soporte), solo soporte (la wiki únicamente publica esa), o nada.
            Mostrarlos igual haría parecer que todas están analizadas igual.
          */}
          {!id.tienePasivas && <span style={styles.sinDatos} title="Sin datos de pasivas">sin pasivas</span>}
          {id.tienePasivas && !id.pasivasCompletas && (
            <span style={styles.parcial} title="Solo se conoce la pasiva de soporte; falta la de combate">
              solo soporte
            </span>
          )}
        </div>

        {mostrarSinner && <div style={styles.idTags}>{id.sinner}</div>}

        <div style={styles.chipRow}>
          {id.arquetipos.length === 0 && <span style={styles.chipVacio}>Sin arquetipo</span>}
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
            <ChipFaccion key={f} faccion={f} onClick={onFiltrarFaccion} activo={faccionActiva === f} navegable={false} />
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
          style={styles.botonFicha}
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
