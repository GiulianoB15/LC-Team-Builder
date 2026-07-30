# Datos pendientes

Generado por `scripts/pendientes.mjs`. **No editar a mano** — se regenera.

Faltan **37 Identities** y **14 E.G.O**. Casi todas son
posteriores al corte de LCTeamBuilder (2025-08-06), la única fuente que publica pasivas con
su tipo y su costo en recursos de Sin.

Excepción: **Thoracalgia** (Faust, 2025-02-20) — anterior al corte, pero LCTeamBuilder nunca la agregó a su dataset.

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

### Tanda 1 — 10 ítems (2025-02-20 a 2025-10-09)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| E.G.O | Faust | Thoracalgia | 2025-02-20 | `20208` | ☐ |
| Identity | Hong Lu | The Lord of Hongyuan | 2025-08-14 | `10613` | ☐ |
| Identity | Yi Sang | Heishou Pack - Wu Branch Adept | 2025-08-28 | `10114` | ☐ |
| Identity | Sinclair | Heishou Pack - You Branch | 2025-08-28 | `11014` | ☐ |
| Identity | Ryōshū | N Corp. E.G.O:: Contempt, Awe | 2025-09-11 | `10412` | ☐ |
| E.G.O | Faust | Command : Meltdown | 2025-09-25 | `20209` | ☐ |
| E.G.O | Hong Lu | To Remain Oneself [宁作吾] | 2025-09-25 | `20609` | ☐ |
| E.G.O | Ishmael | Tidal Elegy | 2025-09-25 | `20810` | ☐ |
| E.G.O | Gregor | Unbrilliant Glory | 2025-09-25 | `21209` | ☐ |
| Identity | Faust | Shi Assoc. East Section 3 | 2025-10-09 | `10213` | ☐ |

### Tanda 2 — 10 ítems (2025-10-23 a 2025-12-31)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| Identity | Heathcliff | W Corp. L4 Cleanup Agent - CCA | 2025-10-23 | `10713` | ☐ |
| Identity | Meursault | The Prince of La Manchaland | 2025-10-30 | `10513` | ☐ |
| Identity | Ishmael | Jeong's Office Rep | 2025-11-06 | `10813` | ☐ |
| Identity | Gregor | Night Awls Capitano | 2025-11-06 | `11213` | ☐ |
| Identity | Don Quixote | Heishou Pack - Wei Branch | 2025-11-20 | `10313` | ☐ |
| Identity | Heathcliff | Heishou Pack - You Branch Adept | 2025-11-20 | `10714` | ☐ |
| Identity | Ryōshū | Drifting Blade of Hongyuan | 2025-12-04 | `10413` | ☐ |
| Identity | Rodion | R Corp. 4th Pack Reindeer | 2025-12-18 | `10914` | ☐ |
| Identity | Faust | The Index Proselyte: 【Paper Slip】 | 2025-12-31 | `10214` | ☐ |
| Identity | Outis | LCA Udjat Vanguard Team 3 Leader | 2025-12-31 | `11114` | ☐ |

### Tanda 3 — 10 ítems (2026-01-08 a 2026-03-05)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| Identity | Don Quixote | The Index Proxy -  Effloresced E.G.O:: Procuration | 2026-01-08 | `10314` | ☐ |
| E.G.O | Heathcliff | Move-in Reg. | 2026-01-08 | `20709` | ☐ |
| E.G.O | Outis | I'll Go fer Scissors. How 'Bout You? | 2026-01-08 | `21109` | ☐ |
| E.G.O | Yi Sang | Great Trichiliocosm [三千大世界] | 2026-01-15 | `20108` | ☐ |
| E.G.O | Ryōshū | Great Trichiliocosm [三千大世界] | 2026-01-15 | `20409` | ☐ |
| Identity | Ishmael | The House of Spiders: The Middle Apprentice | 2026-01-22 | `10814` | ☐ |
| Identity | Sinclair | The House of Spiders: The Pinky Apprentice | 2026-02-05 | `11015` | ☐ |
| Identity | Gregor | Lobotomy E.G.O::Lamp | 2026-02-05 | `11214` | ☐ |
| Identity | Yi Sang | The House of Spiders: The Index Nursefather | 2026-02-19 | `10115` | ☐ |
| Identity | Ryōshū | Lobotomy E.G.O:: Faint Aroma & Solitude | 2026-03-05 | `10414` | ☐ |

### Tanda 4 — 10 ítems (2026-03-05 a 2026-04-30)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| Identity | Meursault | Lobotomy E.G.O:: Hornet 【Alteration】 | 2026-03-05 | `10514` | ☐ |
| E.G.O | Sinclair | Harmony | 2026-03-05 | `21009` | ☐ |
| Identity | Gregor | LCE E.G.O:: AEDD | 2026-03-19 | `11215` | ☐ |
| E.G.O | Faust | Ardor Blossom Star | 2026-03-19 | `20210` | ☐ |
| Identity | Faust | The House of Spiders: The Ring Apprentice | 2026-04-02 | `10215` | ☐ |
| Identity | Hong Lu | The House of Spiders: The Ring Nursefather | 2026-04-02 | `10614` | ☐ |
| Identity | Meursault | The Ring Fauvist Student | 2026-04-16 | `10515` | ☐ |
| Identity | Rodion | The Ring Fauvist Docent | 2026-04-16 | `10915` | ☐ |
| Identity | Heathcliff | The Middle Big Brother | 2026-04-30 | `10715` | ☐ |
| E.G.O | Rodion | Into the Sunset | 2026-04-30 | `20909` | ☐ |

### Tanda 5 — 10 ítems (2026-05-14 a 2026-07-09)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| Identity | Ryōshū | Blade of the House of Spiders | 2026-05-14 | `10415` | ☐ |
| Identity | Outis | The House of Spiders: The Middle Nursefather | 2026-05-28 | `11115` | ☐ |
| Identity | Hong Lu | S Corp. Ch'unokkun | 2026-06-11 | `10615` | ☐ |
| Identity | Ishmael | LCD OSIR Team | 2026-06-11 | `10815` | ☐ |
| E.G.O | Meursault | Shadow-vested Bladesinger [着影揮刀] | 2026-06-11 | `20509` | ☐ |
| Identity | Heathcliff | The House of Spiders: The Thumb Apprentice | 2026-06-25 | `10716` | ☐ |
| Identity | Rodion | The House of Spiders: The Thumb Nursefather | 2026-06-25 | `10916` | ☐ |
| Identity | Faust | Dawn Office Fixer | 2026-07-09 | `10216` | ☐ |
| Identity | Gregor | Dawn Office Rep | 2026-07-09 | `11216` | ☐ |
| E.G.O | Yi Sang | Solemn Lament | 2026-07-09 | `20109` | ☐ |

### Tanda 6 — 1 ítem (2026-07-23 a 2026-07-23)

| Tipo | Sinner | Nombre | Estreno | id | Listo |
|---|---|---|---|---|---|
| Identity | Yi Sang | LCE E.G.O:: Dimension Shredder | 2026-07-23 | `10116` | ☐ |

## Ya resuelto sin capturas

- **Números de skills** (poder base, monedas, valor de moneda): recuperados de
  LCTeamBuilder para 417 de 618 skills.
  Las que faltan son de estas mismas Identities nuevas.
- **Arquetipos**: los 184 vienen del `skillKeywordList` oficial del dump.
- **Resistencias, stats, afinidades y copias de skill**: completos en las 184.
