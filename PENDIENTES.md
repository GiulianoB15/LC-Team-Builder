# Datos pendientes

Generado por `scripts/pendientes.mjs`. **No editar a mano** — se regenera.

**No falta ninguna pasiva.** Las 184 Identities tienen las de combate y las de
soporte, y los 110 E.G.O tienen la suya. Salen de `src/data/pasivas.json`, que baja
`scripts/fetch-datos.mjs`.

Si entra contenido nuevo antes de que la fuente lo publique, esta lista vuelve a
aparecer sola con lo que falte.

## Lo único que sigue incompleto

**Números de skills** — poder base, monedas y valor de moneda: hay
417 de 618. Los 201 que faltan son de las Identities posteriores al
corte de LCTeamBuilder, que es de donde salen hoy.

Probablemente se puedan completar igual que las pasivas: los archivos
`data/identities/<id>.json` de la fuente traen una clave `skills` que todavía no
se miró. Falta ver qué forma tiene antes de prometer nada.

No afecta al motor: no usa esos números para nada de lo que calcula hoy
(recursos de Sin, pasivas, resistencias, arquetipos). Quedan en `null`, nunca en
cero, para que se note que es un dato que falta y no un valor real.
