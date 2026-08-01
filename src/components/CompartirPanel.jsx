import React, { useState, useMemo } from "react";
import { codificar, decodificar } from "../lib/codigo.js";

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
    <details className="compartir">
      <summary className="compartir-titulo">Compartir colección</summary>

      {modoVisita ? (
        <p className="ayuda">
          Estás viendo una colección compartida. Volvé a la tuya para poder exportarla.
        </p>
      ) : (
        <>
          <p className="ayuda">
            Tu colección entera entra en un código de {codigo.length} caracteres. Sirve de respaldo
            y para pasársela a alguien.
          </p>
          <div className="codigo-caja">{codigo}</div>
          <div className="compartir-botones">
            <button onClick={() => copiar(codigo, "codigo")} className="boton">
              {copiado === "codigo" ? "¡Copiado!" : "Copiar código"}
            </button>
            <button onClick={() => copiar(link, "link")} className="boton">
              {copiado === "link" ? "¡Copiado!" : "Copiar link"}
            </button>
          </div>
          {copiado === "falló" && (
            <p className="ayuda">
              El navegador no dejó copiar solo. Seleccioná el código de arriba y copialo a mano.
            </p>
          )}
        </>
      )}

      <h3 className="compartir-sub">Ver la de otro</h3>
      <p className="ayuda">
        Pegá un código para mirarla. <strong>No toca la tuya</strong>: entrás en modo visita y salís
        cuando quieras.
      </p>
      <textarea
        value={pegado}
        onChange={(e) => { setPegado(e.target.value); setError(null); }}
        placeholder="Pegá acá el código que te pasaron"
        rows={2}
        className="pegar-caja"
      />
      {error && <div className="aviso-error">{error}</div>}
      <button onClick={importar} className="boton" disabled={!pegado.trim()}>
        Ver esa colección
      </button>
    </details>
  );
}
