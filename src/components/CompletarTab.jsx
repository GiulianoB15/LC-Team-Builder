import React from "react";
import { SINNERS_TOTALES } from "../data/constants.js";
import ListaPorSinner from "./ListaPorSinner.jsx";
import { ChipArquetipo } from "./Chips.jsx";
import Vacio from "./Vacio.jsx";

export default function CompletarTab({ ownedIdentities, baseIds, onToggle, candidatas, max, onVerDetalle, onIrAColeccion }) {
  if (ownedIdentities.length === 0) {
    return (
      <Vacio
        marca="◱"
        titulo="Todavía no hay con qué completar"
        accion={<button onClick={onIrAColeccion} className="boton-primario">Ir a Colección</button>}
      >
        La recomendación sale de tu colección: sin nada marcado no hay entre qué elegir.
      </Vacio>
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

      {/*
        Agrupadas y plegadas por Sinner: la regla de esta pestaña es una por
        Sinner, así que ese es el grupo con el que se piensa. `mostrarSinner`
        ya no hace falta, porque el encabezado del bloque lo dice.
      */}
      <ListaPorSinner
        identities={ownedIdentities}
        seleccionadas={baseIds}
        onToggle={onToggle}
        claseActiva="elegida"
        onVerDetalle={onVerDetalle}
      />

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
              <Vacio marca="✔" titulo={`Los ${SINNERS_TOTALES} Sinners están cubiertos`}>
                No queda lugar para sumar, así que no hay nada que recomendar. Si querés probar
                otra cosa, destildá a alguna y te sugiero el reemplazo.
              </Vacio>
            ) : (
              <Vacio marca="◇" titulo="No te queda nada de los Sinners libres">
                Tenés Sinners sin cubrir, pero ninguna Identidad suya en tu colección. Cuáles
                convendría conseguir está en «Qué me falta».
              </Vacio>
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
