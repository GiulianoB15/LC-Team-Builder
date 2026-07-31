# Datos pendientes

Generado por `scripts/pendientes.mjs`. **No editar a mano** — se regenera.

Faltan **3 Identities** y **9 E.G.O**. Casi todas son
posteriores al corte de LCTeamBuilder (2025-08-06), la única fuente que publica pasivas con
su tipo y su costo en recursos de Sin.



## Qué hace falta capturar

Para cada una, **solo tres cosas por pasiva**. El motor no usa el texto de la
descripción, así que no hace falta capturarlo:

1. **Nombre** de la pasiva.
2. **Tipo**: de combate o de soporte.
3. **Costo en recursos de Sin** — ej. `Lujuria 4`, `Orgullo 3`. Si no tiene costo,
   decilo explícitamente; "sin costo" es un dato, no un hueco.

Las Identities suelen tener 2 pasivas de combate y 1 de soporte. Los E.G.O, una sola.

> **Regla**: si algo no se lee bien en la captura, queda en `null` y se reporta. Nunca
> se completa de memoria. Todo lo cargado así lleva `fuente: "captura"` para poder
> distinguirlo del dato automático y reemplazarlo si aparece una fuente mejor.

## Tandas

### Tanda 1 — 10 ítems (2025-08-28 a 2026-05-14)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| Identity | Sinclair | Heishou Pack - You Branch | 2025-08-28 | `11014` | ☐ |
| E.G.O | Heathcliff | Move-in Reg. | 2026-01-08 | `20709` | ☐ |
| E.G.O | Outis | I'll Go fer Scissors. How 'Bout You? | 2026-01-08 | `21109` | ☐ |
| E.G.O | Yi Sang | Great Trichiliocosm [三千大世界] | 2026-01-15 | `20108` | ☐ |
| E.G.O | Ryōshū | Great Trichiliocosm [三千大世界] | 2026-01-15 | `20409` | ☐ |
| Identity | Sinclair | The House of Spiders: The Pinky Apprentice | 2026-02-05 | `11015` | ☐ |
| E.G.O | Sinclair | Harmony | 2026-03-05 | `21009` | ☐ |
| E.G.O | Faust | Ardor Blossom Star | 2026-03-19 | `20210` | ☐ |
| E.G.O | Rodion | Into the Sunset | 2026-04-30 | `20909` | ☐ |
| Identity | Ryōshū | Blade of the House of Spiders | 2026-05-14 | `10415` | ☐ |

### Tanda 2 — 2 ítems (2026-06-11 a 2026-07-09)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| E.G.O | Meursault | Shadow-vested Bladesinger [着影揮刀] | 2026-06-11 | `20509` | ☐ |
| E.G.O | Yi Sang | Solemn Lament | 2026-07-09 | `20109` | ☐ |

## Ya resuelto sin capturas

- **Números de skills** (poder base, monedas, valor de moneda): recuperados de
  LCTeamBuilder para 417 de 618 skills.
  Las que faltan son de estas mismas Identities nuevas.
- **Arquetipos**: los 184 vienen del `skillKeywordList` oficial del dump.
- **Resistencias, stats, afinidades y copias de skill**: completos en las 184.
