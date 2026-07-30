/*
  Alta/baja de una ID en una selección con dos reglas: un máximo de miembros y
  una sola ID por Sinner.

  El chequeo del máximo va DESPUÉS de sacar al Sinner repetido: si no, con el
  cupo lleno, elegir otra ID de un Sinner ya presente no hacía nada en vez de
  reemplazarla.
*/
export function toggleSeleccion(idsActuales, id, sinner, limite, identidades) {
  if (idsActuales.includes(id)) {
    return idsActuales.filter((x) => x !== id);
  }

  const sinElMismoSinner = idsActuales.filter((x) => {
    const otra = identidades.find((i) => i.id === x);
    return otra?.sinner !== sinner;
  });

  // Reemplazar a un compañero del mismo Sinner no consume cupo.
  if (sinElMismoSinner.length >= limite) return idsActuales;

  return [...sinElMismoSinner, id];
}
