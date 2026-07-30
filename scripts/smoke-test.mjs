/*
  Corre los chequeos de scripts/tests.js.

  Los módulos de src/ importan JSON con la sintaxis que resuelve Vite, que Node
  solo no entiende. En vez de duplicar la lógica en el test, se bundlea con
  esbuild —ya está disponible como dependencia de Vite— y se ejecuta el bundle,
  así se prueba exactamente el código que usa la app.

    node scripts/smoke-test.mjs
*/
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(path.join(tmpdir(), "limbus-test-"));
const salida = path.join(tmp, "tests.mjs");

try {
  execFileSync(path.join(RAIZ, "node_modules/esbuild/bin/esbuild"), [
    path.join(RAIZ, "scripts/tests.js"),
    "--bundle", "--format=esm", "--platform=node",
    `--outfile=${salida}`, "--log-level=error",
  ], { stdio: "inherit" });

  const mod = await import(pathToFileURL(salida).href);
  process.exitCode = mod.fallos === 0 ? 0 : 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
