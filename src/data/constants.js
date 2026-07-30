/*
  Constantes del dominio.

  Decisión de diseño (arreglo del bug de afinidades):
  el dataset original mezclaba idiomas —"Pride" en una ID y "Orgullo" en otra
  para el MISMO Sin—, así que el conteo de afinidades los contaba por separado
  y los umbrales daban mal. Acá las claves internas son SIEMPRE en inglés
  (que es como las nombra la comunidad y como vienen en cualquier dataset que
  importemos), y la traducción al español vive solo en la capa de UI.
*/

export const SINS = ["Wrath", "Lust", "Sloth", "Gluttony", "Gloom", "Envy", "Pride"];

export const SIN_LABEL = {
  Wrath: "Ira",
  Lust: "Lujuria",
  Sloth: "Pereza",
  Gluttony: "Gula",
  Gloom: "Abatimiento",
  Envy: "Envidia",
  Pride: "Orgullo",
};

/*
  Los 12 Sinners, fijos. Antes esta lista se derivaba del dataset, así que la
  pestaña Colección mostraba solo los Sinners que tenían datos cargados (2 de 12).
*/
export const SINNERS = [
  "Yi Sang",
  "Faust",
  "Don Quixote",
  "Ryōshū",
  "Meursault",
  "Hong Lu",
  "Heathcliff",
  "Ishmael",
  "Rodion",
  "Sinclair",
  "Outis",
  "Gregor",
];

export const DAMAGE_TYPES = ["slash", "pierce", "blunt"];

export const DAMAGE_LABEL = {
  slash: "Cortante",
  pierce: "Perforante",
  blunt: "Contundente",
};

/*
  Escala de resistencias. Negativo = recibe más daño, positivo = lo aguanta.
  Se guarda como número para poder promediar y comparar sin mapear a mano
  en cada cálculo del motor.
*/
export const RES_VALUE = { fatal: -1, weak: -0.5, normal: 0, endure: 0.5, immune: 1 };

export const RES_LABEL = {
  fatal: "Fatal",
  weak: "Débil",
  normal: "Normal",
  endure: "Resiste",
  immune: "Inmune",
};

/* Un miembro cuenta como "punto blando" del equipo si está en weak o peor. */
export const WEAK_THRESHOLD = -0.5;
