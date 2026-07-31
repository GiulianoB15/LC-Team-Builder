/*
  Arma un PNG con el equipo para mandarlo por chat.

  Se dibuja en un <canvas> en el navegador: sin dependencias, sin servidor y sin
  subir nada a ningún lado. Los retratos ya están servidos por la propia app, así
  que no hay pedidos cruzados ni CORS que resolver.

  Qué sale: los 6 desplegados con su número de orden, y la banca aparte y
  apagada, porque la distinción importa —la banca solo aporta pasiva de soporte—
  y una imagen que las mezcle miente.

  El arte es de Project Moon; esto es para compartir un equipo entre amigos.
*/

const CELDA = 132;
const GAP = 8;
const COLUMNAS = 6;
const ALTO_TITULO = 44;
const ALTO_PIE = 26;
const ALTO_NOMBRE = 30;

const FONDO = "#141312";
const TEXTO = "#e8e3dc";
const TENUE = "#8d8880";
const BORDE = "#2c2926";

/* Un nombre largo no puede empujar al de al lado: se corta con puntos suspensivos. */
function recortar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1);
  return `${t}…`;
}

function cargarImagen(src) {
  return new Promise((resolve) => {
    const img = new Image();
    /* Si una falta se dibuja el hueco con iniciales; no se aborta la estampa. */
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const iniciales = (nombre) =>
  String(nombre)
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

/*
  `orden` es lo que devuelve sugerirOrden(): trae la ID y si va a la banca.
  `baseUrl` sale de import.meta.env.BASE_URL, para que ande igual en local y en
  el subdirectorio de GitHub Pages.
*/
export async function dibujarEquipo(orden, { baseUrl = "/", titulo = "Limbus Docket" } = {}) {
  if (!orden.length) return null;

  const desplegados = orden.filter((o) => !o.banca);
  const banca = orden.filter((o) => o.banca);

  const filas = (grupo) => Math.max(1, Math.ceil(grupo.length / COLUMNAS));
  const filasDesplegados = filas(desplegados);
  const filasBanca = banca.length ? filas(banca) : 0;

  const alturaGrupo = (n) => n * (CELDA + ALTO_NOMBRE + GAP);
  const ancho = COLUMNAS * CELDA + (COLUMNAS + 1) * GAP;
  const alto =
    ALTO_TITULO +
    alturaGrupo(filasDesplegados) +
    (banca.length ? 22 + alturaGrupo(filasBanca) : 0) +
    ALTO_PIE;

  const canvas = document.createElement("canvas");
  /* El doble de resolución: en pantallas densas si no se ve borroso. */
  const escala = 2;
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);

  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ancho, alto);

  ctx.fillStyle = TEXTO;
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(titulo, GAP, ALTO_TITULO / 2);

  const imagenes = await Promise.all(
    orden.map((o) => cargarImagen(`${baseUrl}retratos/${o.id.id}.webp`))
  );
  const porId = new Map(orden.map((o, i) => [o.id.id, imagenes[i]]));

  const dibujarGrupo = (grupo, y0, apagado) => {
    grupo.forEach((o, i) => {
      const col = i % COLUMNAS;
      const fila = Math.floor(i / COLUMNAS);
      const x = GAP + col * (CELDA + GAP);
      const y = y0 + fila * (CELDA + ALTO_NOMBRE + GAP);

      ctx.globalAlpha = apagado ? 0.45 : 1;

      const img = porId.get(o.id.id);
      if (img) {
        ctx.drawImage(img, x, y, CELDA, CELDA);
      } else {
        ctx.fillStyle = "#23211f";
        ctx.fillRect(x, y, CELDA, CELDA);
        ctx.fillStyle = TENUE;
        ctx.font = "600 34px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(iniciales(o.id.nombre), x + CELDA / 2, y + CELDA / 2);
        ctx.textAlign = "left";
      }

      ctx.strokeStyle = BORDE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELDA - 1, CELDA - 1);

      /* El número de orden, en una chapita, arriba a la izquierda. */
      if (!apagado) {
        ctx.fillStyle = "rgba(0,0,0,0.72)";
        ctx.fillRect(x, y, 24, 22);
        ctx.fillStyle = TEXTO;
        ctx.font = "600 13px system-ui, sans-serif";
        ctx.fillText(String(i + 1), x + 8, y + 11);
      }

      ctx.fillStyle = apagado ? TENUE : TEXTO;
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(recortar(ctx, o.id.nombre, CELDA), x, y + CELDA + 11);
      ctx.fillStyle = TENUE;
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(recortar(ctx, o.id.sinner, CELDA), x, y + CELDA + 25);

      ctx.globalAlpha = 1;
    });
  };

  let y = ALTO_TITULO;
  dibujarGrupo(desplegados, y, false);
  y += alturaGrupo(filasDesplegados);

  if (banca.length) {
    ctx.fillStyle = TENUE;
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText("BANCA — solo aportan su pasiva de soporte", GAP, y + 8);
    y += 22;
    dibujarGrupo(banca, y, true);
    y += alturaGrupo(filasBanca);
  }

  ctx.fillStyle = TENUE;
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("Arte de Project Moon · no afiliado", GAP, alto - ALTO_PIE / 2);

  return canvas;
}

/* Dispara la descarga. Se revoca la URL enseguida: si no, queda el blob colgado. */
export async function descargarEquipo(orden, opciones) {
  const canvas = await dibujarEquipo(orden, opciones);
  if (!canvas) return false;

  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "equipo.png";
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
