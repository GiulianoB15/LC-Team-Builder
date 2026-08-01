import React from "react";
import { SINNERS_TOTALES } from "../data/constants.js";
import IdCard from "./IdCard.jsx";
import { ChipArquetipo } from "./Chips.jsx";

export default function CompletarTab({ ownedIdentities, baseIds, onToggle, candidatas, max, onVerDetalle }) {
  if (ownedIdentities.length === 0) {
    return (
      <p className="ayuda">
        Todavía no marcaste Identidades como propias en la pestaña Colección.
      </p>
    );
  }

  return (
    <section>
      <p className="ayuda">
        Marcá las que ya tenés decididas —de 1 a {max}, una por Sinner— y el motor recomienda
        con qué seguir, usando solo tu colección.{" "}
        <strong>Cuantas más marques, más se ajusta</strong>: cada una cambia el perfil de
        arquetipos, de recursos y de resistencias contra el que se puntúa.
      </p>

      {baseIds.length > 0 && (
        <p className="ayuda">
          Elegidas: <strong>{baseIds.length}</strong> de {max}.
        </p>
      )}

      <div className="id-grid">
        {ownedIdentities.map((id) => (
          <IdCard
            key={id.id}
            id={id}
            checked={baseIds.includes(id.id)}
            onChange={onToggle}
            claseActiva="elegida"
            mostrarSinner
            onVerDetalle={onVerDetalle}
          />
        ))}
      </div>

      {baseIds.length > 0 && (
        <>
          <h2 className="titulo-seccion">Candidatas recomendadas</h2>
          {/*
            Dos motivos distintos para no tener candidatas, y conviene
            distinguirlos: con los 12 Sinners ocupados no queda ninguno libre
            por definición, y eso no es un problema sino el final del camino.
          */}
          {candidatas.length === 0 ? (
            baseIds.length >= SINNERS_TOTALES ? (
              <p className="ayuda">
                Ya cubriste los {SINNERS_TOTALES} Sinners, así que no queda lugar para sumar.
                Si querés probar otra cosa, destildá a alguna y te recomiendo el reemplazo.
              </p>
            ) : (
              <p className="ayuda">
                No te quedan Identidades de los Sinners libres en tu colección. Los que faltan
                los podés ver en «Qué me falta».
              </p>
            )
          ) : (
            <div className="candidata-lista">
              {candidatas.map(({ id, score, motivos }) => (
                <div key={id.id} className="candidata">
                  <div className="candidata-header">
                    <div className="id-nombre">{id.nombre}</div>
                    <div className="score">
                      {score >= 0 ? "+" : ""}
                      {score}
                    </div>
                  </div>
                  <div className="id-tags">{id.sinner}</div>
                  <div className="chip-row">
                    {id.arquetipos.map((a) => <ChipArquetipo key={a} arquetipo={a} />)}
                  </div>
                  {motivos.length > 0 && (
                    <ul className="motivo-lista">
                      {motivos.map((r, i) => (
                        <li key={i} className="motivo">
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
