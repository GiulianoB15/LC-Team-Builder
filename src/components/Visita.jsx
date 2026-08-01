import React from "react";

const contar = (mapa) => Object.values(mapa ?? {}).filter(Boolean).length;

/*
  Aviso de que se abrió un link con una colección compartida. No se aplica sola:
  el usuario decide. Así un link que te mandan nunca te cambia nada de golpe.
*/
export function PropuestaVisita({ propuesta, onAceptar, onDescartar }) {
  if (!propuesta) return null;

  if (propuesta.error) {
    return (
      <div className="propuesta">
        <div>El link traía una colección, pero no se pudo leer: {propuesta.error}</div>
        <button onClick={onDescartar} className="boton">Cerrar</button>
      </div>
    );
  }

  const nIds = contar(propuesta.identities);
  const nEgos = contar(propuesta.egos);

  return (
    <div className="propuesta">
      <div>
        Te compartieron una colección con <strong>{nIds}</strong> Identities y{" "}
        <strong>{nEgos}</strong> E.G.O. Verla no toca la tuya.
      </div>
      <div className="compartir-botones">
        <button onClick={() => onAceptar({ identities: propuesta.identities, egos: propuesta.egos })} className="boton-primario">
          Verla sin tocar la mía
        </button>
        <button onClick={onDescartar} className="boton">No, gracias</button>
      </div>
    </div>
  );
}

/* Barra permanente mientras se mira una colección ajena. */
export function BannerVisita({ visita, onSalir, onAdoptar }) {
  if (!visita) return null;

  return (
    <div className="banner-visita">
      <div>
        Estás viendo una <strong>colección compartida</strong> ({contar(visita.identities)} Identities,{" "}
        {contar(visita.egos)} E.G.O). La tuya está intacta.
      </div>
      <div className="compartir-botones">
        <button onClick={onSalir} className="boton-primario">Volver a la mía</button>
        <button
          onClick={() => {
            if (window.confirm("Esto reemplaza tu colección por la que estás viendo. ¿Seguro?")) onAdoptar();
          }}
          className="boton"
        >
          Adoptarla como mía
        </button>
      </div>
    </div>
  );
}
