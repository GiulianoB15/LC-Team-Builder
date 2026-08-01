/*
  Preferencias de visualización. Hoy es una sola: la densidad de la lista.

  POR QUÉ NO VAN EN EL MISMO GUARDADO QUE LA COLECCIÓN

  `storage.js` guarda qué Identidades tenés, con versión y migraciones, y ese
  dato es el que se comparte por código y el que dolería perder. La densidad es
  una preferencia de esta pantalla: si se pierde no pasa nada, y no tiene
  sentido que un cambio de densidad haga subir la versión del guardado ni que
  viaje dentro de un código compartido.

  Por eso va en su propia clave, sin envoltorio ni migración. Si mañana hay más
  preferencias, entran en el mismo objeto.
*/

const CLAVE = "limbus-docket:preferencias";

export const DENSIDADES = [
  { key: "comoda", label: "Cómoda" },
  { key: "compacta", label: "Compacta" },
];

const POR_DEFECTO = { densidad: "comoda" };

const valida = (p) => ({
  densidad: DENSIDADES.some((d) => d.key === p?.densidad) ? p.densidad : POR_DEFECTO.densidad,
});

export function cargarPreferencias() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? valida(JSON.parse(crudo)) : { ...POR_DEFECTO };
  } catch {
    /* JSON roto, o localStorage bloqueado: se sigue con lo de fábrica. */
    return { ...POR_DEFECTO };
  }
}

export function guardarPreferencias(p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(valida(p)));
    return true;
  } catch {
    return false;
  }
}
