/*
  Alta/baja de una ID en una selección con dos reglas: un máximo de miembros y
  una sola ID por Sinner.

  Arreglo respecto del prototipo: el chequeo del máximo corría ANTES de sacar
  al Sinner repetido. Con el equipo lleno, clickear otra ID de un Sinner que ya
  estaba no hacía nada — en vez de reemplazarla, que es lo que uno espera.
  Ahora primero se saca al del mismo Sinner y recién después se mira el tope.
*/
export function toggleSeleccion(keysActuales, key, sinner, limite, identidades) {
  if (keysActuales.includes(key)) {
    return keysActuales.filter((k) => k !== key);
  }

  const sinElMismoSinner = keysActuales.filter((k) => {
    const otra = identidades.find((i) => i.key === k);
    return otra?.sinner !== sinner;
  });

  // Reemplazar a un compañero del mismo Sinner no consume cupo.
  if (sinElMismoSinner.length >= limite) return keysActuales;

  return [...sinElMismoSinner, key];
}
