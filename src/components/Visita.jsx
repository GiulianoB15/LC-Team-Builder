import React from "react";
import { styles } from "../styles.js";

const contar = (mapa) => Object.values(mapa ?? {}).filter(Boolean).length;

/*
  Aviso de que se abrió un link con una colección compartida. No se aplica sola:
  el usuario decide. Así un link que te mandan nunca te cambia nada de golpe.
*/
export function PropuestaVisita({ propuesta, onAceptar, onDescartar }) {
  if (!propuesta) return null;

  if (propuesta.error) {
    return (
      <div style={styles.propuesta}>
        <div>El link traía una colección, pero no se pudo leer: {propuesta.error}</div>
        <button onClick={onDescartar} style={styles.boton}>Cerrar</button>
      </div>
    );
  }

  const nIds = contar(propuesta.identities);
  const nEgos = contar(propuesta.egos);

  return (
    <div style={styles.propuesta}>
      <div>
        Te compartieron una colección con <strong>{nIds}</strong> Identities y{" "}
        <strong>{nEgos}</strong> E.G.O. Verla no toca la tuya.
      </div>
      <div style={styles.compartirBotones}>
        <button onClick={() => onAceptar({ identities: propuesta.identities, egos: propuesta.egos })} style={styles.botonPrimario}>
          Verla sin tocar la mía
        </button>
        <button onClick={onDescartar} style={styles.boton}>No, gracias</button>
      </div>
    </div>
  );
}

/* Barra permanente mientras se mira una colección ajena. */
export function BannerVisita({ visita, onSalir, onAdoptar }) {
  if (!visita) return null;

  return (
    <div style={styles.bannerVisita}>
      <div>
        Estás viendo una <strong>colección compartida</strong> ({contar(visita.identities)} Identities,{" "}
        {contar(visita.egos)} E.G.O). La tuya está intacta.
      </div>
      <div style={styles.compartirBotones}>
        <button onClick={onSalir} style={styles.botonPrimario}>Volver a la mía</button>
        <button
          onClick={() => {
            if (window.confirm("Esto reemplaza tu colección por la que estás viendo. ¿Seguro?")) onAdoptar();
          }}
          style={styles.boton}
        >
          Adoptarla como mía
        </button>
      </div>
    </div>
  );
}
