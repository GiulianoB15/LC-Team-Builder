import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Reset mínimo: el body trae margen por defecto y rompe el fondo a pantalla completa.
document.body.style.margin = "0";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
