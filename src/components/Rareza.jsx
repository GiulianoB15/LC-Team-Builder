import React from "react";

/*
  Las estrellas de rareza.

  Eran tres caracteres de 11 px en oro, todos del mismo color: había que
  contarlos para saber qué estabas mirando. En un juego gacha la rareza es de
  las primeras cosas que se leen —ordena el roster entero— así que cada nivel
  lleva su propio tono, que es la convención del género y se reconoce sin
  contar:

    ★     bronce   las 12 base, una por Sinner
    ★★    plata
    ★★★   oro      las más nuevas y las más buscadas

  El `title` y el `aria-label` dicen el número en palabras: el color no le
  sirve a quien no lo distingue, y contar estrellas con un lector de pantalla
  es peor todavía.
*/
export default function Rareza({ n }) {
  return (
    <span
      className={`rareza rareza-${n}`}
      title={`Rareza ${n}`}
      aria-label={`Rareza ${n} de 3`}
    >
      {"★".repeat(n)}
    </span>
  );
}
