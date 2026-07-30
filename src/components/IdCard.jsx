import React from "react";
import { styles } from "../styles.js";

/* Tarjeta con checkbox, compartida por las tres pestañas. */
export default function IdCard({ id, checked, onChange, estiloActivo, mostrarSinner }) {
  const detalle = [
    mostrarSinner ? id.sinner : null,
    ...(id.arquetipos.length ? id.arquetipos : ["Sin arquetipo"]),
  ].filter(Boolean);

  return (
    <label style={{ ...styles.idCard, ...(checked ? estiloActivo : {}) }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={styles.checkbox} />
      <div>
        <div style={styles.idName}>
          {id.nombre}
          <span style={styles.rareza}>{"★".repeat(id.rareza)}</span>
          {/* Las IDs posteriores al corte de LCTeamBuilder no tienen pasivas.
              Se avisa para que no parezcan analizadas igual que el resto. */}
          {!id.tienePasivas && <span style={styles.sinDatos} title="Sin datos de pasivas">sin pasivas</span>}
        </div>
        <div style={styles.idTags}>{detalle.join(" · ")}</div>
      </div>
    </label>
  );
}
