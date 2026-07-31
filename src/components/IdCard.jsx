import React from "react";
import { colorArquetipo, FACCIONES_GENERICAS } from "../data/constants.js";
import { ChipArquetipo, ChipFaccion } from "./Chips.jsx";
import { styles } from "../styles.js";

/* Tarjeta con checkbox, compartida por las tres pestañas. */
export default function IdCard({
  id, checked, onChange, estiloActivo, mostrarSinner, deshabilitado,
  onFiltrarArquetipo, onFiltrarFaccion, arquetiposActivos, faccionActiva,
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
      <input type="checkbox" checked={checked} onChange={onChange} disabled={deshabilitado} style={styles.checkbox} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.idName}>
          {id.nombre}
          <span style={styles.rareza}>{"★".repeat(id.rareza)}</span>
          {/* Las IDs posteriores al corte de LCTeamBuilder no tienen pasivas.
              Se avisa para que no parezcan analizadas igual que el resto. */}
          {!id.tienePasivas && <span style={styles.sinDatos} title="Sin datos de pasivas">sin pasivas</span>}
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
            />
          ))}
          {facciones.map((f) => (
            <ChipFaccion key={f} faccion={f} onClick={onFiltrarFaccion} activo={faccionActiva === f} />
          ))}
        </div>
      </div>
    </label>
  );
}
