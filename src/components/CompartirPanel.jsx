import React, { useState, useMemo } from "react";
import { codificar, decodificar } from "../lib/codigo.js";
import { styles } from "../styles.js";

/*
  Exportar la colección propia como código, e importar la de otro.

  Importar NO pisa nada: entra en modo visita, donde se puede mirar y armar
  equipos con la colección ajena sin tocar la propia. Adoptarla es un segundo
  paso explícito.
*/
export default function CompartirPanel({ propia, onVisitar, modoVisita }) {
  const [pegado, setPegado] = useState("");
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(null);

  const { codigo } = useMemo(() => codificar(propia), [propia]);

  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#c=${codigo}`;
  }, [codigo]);

  const copiar = async (texto, cual) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sin permiso de portapapeles: el texto está a la vista para copiarlo a mano.
      setCopiado("falló");
    }
  };

  const importar = () => {
    const r = decodificar(pegado);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setPegado("");
    onVisitar({ identities: r.identities, egos: r.egos });
  };

  return (
    <details style={styles.compartir}>
      <summary style={styles.compartirTitulo}>Compartir colección</summary>

      {modoVisita ? (
        <p style={styles.helpText}>
          Estás viendo una colección compartida. Volvé a la tuya para poder exportarla.
        </p>
      ) : (
        <>
          <p style={styles.helpText}>
            Tu colección entera entra en un código de {codigo.length} caracteres. Sirve de respaldo
            y para pasársela a alguien.
          </p>
          <div style={styles.codigoCaja}>{codigo}</div>
          <div style={styles.compartirBotones}>
            <button onClick={() => copiar(codigo, "codigo")} style={styles.boton}>
              {copiado === "codigo" ? "¡Copiado!" : "Copiar código"}
            </button>
            <button onClick={() => copiar(link, "link")} style={styles.boton}>
              {copiado === "link" ? "¡Copiado!" : "Copiar link"}
            </button>
          </div>
          {copiado === "falló" && (
            <p style={styles.helpText}>
              El navegador no dejó copiar solo. Seleccioná el código de arriba y copialo a mano.
            </p>
          )}
        </>
      )}

      <h3 style={styles.compartirSub}>Ver la de otro</h3>
      <p style={styles.helpText}>
        Pegá un código para mirarla. <strong>No toca la tuya</strong>: entrás en modo visita y salís
        cuando quieras.
      </p>
      <textarea
        value={pegado}
        onChange={(e) => { setPegado(e.target.value); setError(null); }}
        placeholder="Pegá acá el código que te pasaron"
        rows={2}
        style={styles.pegarCaja}
      />
      {error && <div style={styles.errorBanner}>{error}</div>}
      <button onClick={importar} style={styles.boton} disabled={!pegado.trim()}>
        Ver esa colección
      </button>
    </details>
  );
}
