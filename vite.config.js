import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" hace que los assets se pidan con rutas relativas.
// Así el build funciona igual en GitHub Pages (que sirve desde /<repo>/),
// en Vercel/Netlify (que sirven desde /) y abriendo el index.html local.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
