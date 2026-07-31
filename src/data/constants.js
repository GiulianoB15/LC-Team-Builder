/*
  Constantes del dominio.

  Las claves internas son SIEMPRE en inglés —así vienen del dataset y así las
  nombra la comunidad—; la traducción al español vive solo en la capa de UI.
*/

export const SINS = ["Wrath", "Lust", "Sloth", "Gluttony", "Gloom", "Pride", "Envy"];

export const SIN_LABEL = {
  Wrath: "Ira",
  Lust: "Lujuria",
  Sloth: "Pereza",
  Gluttony: "Gula",
  Gloom: "Abatimiento",
  Pride: "Orgullo",
  Envy: "Envidia",
};

export const SINNERS = [
  "Yi Sang", "Faust", "Don Quixote", "Ryōshū", "Meursault", "Hong Lu",
  "Heathcliff", "Ishmael", "Rodion", "Sinclair", "Outis", "Gregor",
];

export const DAMAGE_TYPES = ["slash", "pierce", "blunt"];

export const DAMAGE_LABEL = {
  slash: "Cortante",
  pierce: "Perforante",
  blunt: "Contundente",
};

/*
  Los 7 arquetipos oficiales, tal como los declara `skillKeywordList` en el
  dataset. Antes se derivaban del texto de las skills y esa lista incluía
  "Bloodfeast", que el juego no expone como keyword de arquetipo.
*/
export const ARQUETIPOS = [
  "Bleed", "Burn", "Rupture", "Tremor", "Sinking", "Poise", "Charge",
];

/*
  Color por arquetipo. Es una decisión de diseño, no un dato del juego: se
  eligieron tonos que evocan cada estado y que se distinguen entre sí sobre el
  fondo oscuro. Si no coinciden con los del juego, se cambian solo acá.

  `borde` se usa como acento lateral de la tarjeta y `chip` como fondo de la
  etiqueta, con el texto en `borde` para que contraste.
*/
export const ARQUETIPO_COLOR = {
  Bleed:   { borde: "#c8556a", chip: "#3a1a22" },
  Burn:    { borde: "#d4813f", chip: "#3a2416" },
  Rupture: { borde: "#c9a53f", chip: "#332b14" },
  Tremor:  { borde: "#8b8fa8", chip: "#25262f" },
  Sinking: { borde: "#5a86c4", chip: "#182436" },
  Poise:   { borde: "#69a97c", chip: "#18291d" },
  Charge:  { borde: "#8e7cc8", chip: "#232036" },
};

export const colorArquetipo = (a) => ARQUETIPO_COLOR[a] ?? { borde: "#5c5852", chip: "#1c1b20" };

/*
  Facciones que no aportan nada al escanear: las tiene medio roster. Se ocultan
  en la tarjeta, pero siguen siendo buscables.
*/
export const FACCIONES_GENERICAS = new Set(["Base Identity", "LCB", "Limbus Company"]);

/*
  Las resistencias son el MULTIPLICADOR de daño recibido que usa el juego, tal
  como viene del dataset: 0.5 resiste, 1 normal, 2 fatal. Más bajo es mejor.

  El prototipo usaba etiquetas de texto ("weak", "endure") y una escala propia
  invertida. Guardar el número del juego evita tener que mapear en cada cálculo
  y permite promediar.
*/
export const MULT_NORMAL = 1;

export function etiquetaResistencia(mult) {
  if (mult == null) return "—";
  if (mult <= 0.5) return "Resiste";
  if (mult < 1) return "Aguanta";
  if (mult === 1) return "Normal";
  if (mult < 2) return "Débil";
  return "Fatal";
}

/* Un miembro es punto blando de un tipo de daño si recibe más que lo normal. */
export const esPuntoBlando = (mult) => mult > MULT_NORMAL;

/* Cupos de despliegue. Ver §3.1: los 6 primeros combaten, el resto es banca. */
export const SLOTS_DESPLIEGUE = 6;
