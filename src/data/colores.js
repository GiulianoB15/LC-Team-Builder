import datos from "./colores.json";

/*
  El color firma de cada Sinner, y su versión utilizable sobre fondo oscuro.

  POR QUÉ NO SE USA EL HEX CRUDO

  Los colores son del juego y están pensados para el arte, no para una interfaz
  negra. Cinco son muy oscuros —Rodion #820000, Meursault #293b95, Outis
  #325339, Gregor #69350b, Heathcliff #4e3076— y sobre nuestro fondo casi
  desaparecen. Otros cuatro son casi blancos y saturados, que sobre oscuro es
  el problema inverso: quedan como un flash.

  Así que el crudo se guarda tal cual —es el dato, y si mañana se quiere
  mostrar el original está— y aparte se calcula un `acento` legible.

  CÓMO SE AJUSTA, Y POR QUÉ NO ES UN SIMPLE TOPE

  El primer intento fue recortar la luminosidad a un rango fijo. No sirve:
  Rodion (#820000, burdeos) y Ryōshū (#cf0000, escarlata) tienen el mismo tono
  y ambos caían al piso del rango, o sea que quedaban del mismo color exacto.
  Dos Sinners indistinguibles es peor que dos oscuros.

  La solución es comprimir en vez de recortar: `L' = 45 + L × 0.35` mete todo
  en la banda 53–76 conservando el orden relativo, así que Rodion sigue siendo
  más oscuro que Ryōshū. La saturación se limita a 75 porque un color muy
  saturado sobre negro se ve de neón.

  El tono nunca se toca: es lo que hace que "el verde" siga siendo Sinclair.
*/

function aHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return { h: ((h * 60) % 360 + 360) % 360, s: s * 100, l: l * 100 };
}

const legible = ({ h, s, l }) => `hsl(${h.toFixed(0)} ${Math.min(s, 75).toFixed(0)}% ${(45 + l * 0.35).toFixed(0)}%)`;

/* El fondo del bloque: el mismo tono, apenas insinuado. */
const tenue = ({ h, s }) => `hsl(${h.toFixed(0)} ${Math.min(s, 60).toFixed(0)}% 50% / 0.10)`;

export const COLOR_SINNER = Object.fromEntries(
  Object.entries(datos.colores).map(([sinner, { hex, nombre }]) => {
    const hsl = aHsl(hex);
    return [sinner, { hex, nombre, acento: legible(hsl), tenue: tenue(hsl) }];
  })
);

export const colorSinner = (s) =>
  COLOR_SINNER[s] ?? { hex: "#8a847e", nombre: null, acento: "var(--oro)", tenue: "transparent" };
