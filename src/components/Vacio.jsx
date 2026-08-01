import React from "react";

/*
  Estado vacío.

  Antes cada uno era un párrafo gris suelto en medio de la nada —"Nada coincide
  con esos filtros."— que se leía como un error tipográfico más que como una
  respuesta de la app.

  Un estado vacío bien hecho contesta tres cosas, y por eso el componente pide
  tres: qué pasó (`titulo`), por qué (`children`) y qué hacer al respecto
  (`accion`). La tercera es la que más falta: cuando la salida es obvia —ir a
  Colección, limpiar los filtros— dejarla a mano ahorra el viaje de descubrir
  a dónde había que ir.

  La marca de arriba es decorativa y va con aria-hidden: no aporta nada a quien
  no la ve, y leerla en voz alta sería ruido.
*/
export default function Vacio({ marca = "◇", titulo, children, accion }) {
  return (
    <div className="vacio">
      <div className="vacio-marca" aria-hidden="true">{marca}</div>
      <div className="vacio-titulo">{titulo}</div>
      {children && <div className="vacio-texto">{children}</div>}
      {accion && <div className="vacio-accion">{accion}</div>}
    </div>
  );
}
