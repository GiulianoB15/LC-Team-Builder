import React from "react";
import { styles } from "../styles.js";

/* Tarjeta con checkbox, compartida por las tres pestañas. */
export default function IdCard({ id, checked, onChange, estiloActivo, mostrarSinner }) {
  return (
    <label style={{ ...styles.idCard, ...(checked ? estiloActivo : {}) }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={styles.checkbox} />
      <div>
        <div style={styles.idName}>{id.name}</div>
        <div style={styles.idTags}>
          {mostrarSinner ? `${id.sinner} · ` : ""}
          {id.tags.join(" · ")}
        </div>
      </div>
    </label>
  );
}
