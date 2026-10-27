# Lunch Campaign — Build Spec (v2)

Oct 27, 2026 · @Heigo Kure

## How to use this spec

Build one milestone at a time, in order, and stop for review after each one. This document is the source of truth for the game rules.

- Read **Engine architecture** and **Repository, stack and standards** before writing any code.
- Every number in **Default tuning values** is configuration. None of them appear as literals in code.
- A milestone is done only when all its acceptance criteria pass and test coverage is 100%.
- When a rule that affects game outcomes is missing or ambiguous, stop and ask. Do not invent rules.
- For naming, file layout and internal structure, decide and note the decision in the milestone summary.
- Rules marked **To confirm** are proposals. Confirm them with the project owner before the milestone that builds them.

### History

Milestones 1 to 6 built v1: four players on a fixed 16-zone map, written orders, and a web client. Playing it showed that a day was too thin and the map too small, so v2 below replaces v1's rules. v1's spec is in the git history. Its engine principles, modifier system, strength model, player views, honours, API and web foundation carry over (see **What carries over from v1**). The v1 game keeps running until Milestone 8 replaces it.

## Game overview

An async strategy game for 2 to 8 players: a small Civilization in one working week, played in 5 to 10 minutes a day. Everyone gives orders during the day; at night everything resolves at once.

- One week of five nights. Each night is one turn.
- Few decisions a day, each one costly: a shared movement pool, two city actions and a tech.
- You see where every army is and how big it is, but not what it is made of. Spies, decoys and rumours trade in that difference.
- Pacts you can break, at a public price.
- A morning gazette with the night's news, some of it planted.
- Played on the map, on a phone.

### The calendar

As in v1: the match starts when every player in the lobby has picked a commander and pressed ready. Day 1 is the start day if it is a weekday before 23:00, otherwise the next weekday. Five weekdays follow, skipping weekends. Orders close at 23:00 and each night resolves at 02:00 in the match's time zone.

## The map

- The map is a grid of hexes, generated for every match from its seed. The same seed and player count always give the same map.
- **Capitals:** every player is exactly the same number of moves from both neighbours on the ring of capitals, counting hexes and ignoring terrain (see **Capital rings**). With two players, the capitals face each other across the centre.
- Capitals sit near the edge of the map with ground behind them: every capital is at least **hexes behind a capital** from the map's edge.
- Terrain can make routes between capitals unequal. That is expected.
- The generator guarantees:
  - every passable hex can be reached from every other;
  - no impassable terrain on the map's edge;
  - no impassable terrain next to a capital;
  - towns keep a minimum distance from each other and from capitals.

### Capital rings

For each player count, `libs/content` holds a ring of capital positions. Neighbouring capitals are exactly **capital spacing** moves apart, and the ring is as close to regular as the hexes allow. Each match's seed rotates and mirrors the ring, which keeps every distance.

### Terrain

| Terrain  | Where    | Movement               | In battle (confirm before M8)                                           |
| -------- | -------- | ---------------------- | ----------------------------------------------------------------------- |
| Plain    | hex      | 2                      | none                                                                    |
| Road     | hex      | 1                      | none                                                                    |
| Forest   | hex      | 3                      | cavalry weaker; skirmishers stronger                                    |
| Hills    | hex      | 3                      | defender bonus up; cavalry weaker; artillery on the hill stronger       |
| Marsh    | hex      | 4                      | cavalry and artillery weaker                                            |
| River    | hex edge | +2 to cross            | attacking across it: attacker weaker; artillery firing over it stronger |
| Bridge   | hex edge | crossing costs nothing | none                                                                    |
| Lake     | hex      | impassable             | none                                                                    |
| Mountain | hex      | impassable             | none                                                                    |

Movement costs are in march points (see **The day**). They and the battle effects are defaults.

Roads join the capitals and towns. Where a road crosses a river there is a bridge.

### Towns

- Neutral towns produce gold for whoever holds them, and nothing else: never units.
- Every town is a kind:
  - **market town:** more gold;
  - **stud farm:** cavalry costs less to hire;
  - **ironworks:** artillery costs less to hire.
- There are about **towns per player** towns. Each player has one town nearer to them than to anyone else; the rest lie towards the centre.

### Territory

- Your territory is every hex within **capital reach** of your capital and within **town reach** of each town you hold, plus every hex one of your armies ends the night in.
- Where two players' territory overlaps, the hex goes to the nearer holder. On a tie it stays neutral.
- The map draws borders where territories meet: the lines of control.

## Economy

- One currency: gold. It pays for buildings, hiring and intrigue.
- Income each night: from your capital, and from each town you hold.

### The city

- Each player has one city: their capital.
- Unit buildings produce units, as in Heroes of Might and Magic: each adds its nightly growth to the capital's hiring pool. Units nobody hires stay in the pool.
- Each building can be built once.

| Building        | Does                                      |
| --------------- | ----------------------------------------- |
| Barracks        | line infantry growth (built at the start) |
| Stables         | cavalry growth                            |
| Skirmisher camp | skirmisher growth                         |
| Foundry         | artillery growth                          |
| Market          | more gold each night                      |
| Walls           | higher defender bonus in the capital      |
| University      | one more tech each night                  |
| Spy network     | intrigue costs less                       |

Techs unlock more buildings (**To confirm before M9**).

## The day

Players give orders until 23:00. All of them resolve that night.

### Movement

- One **movement pool** each day, shared by all your armies. Each hex an army enters costs its terrain's march points, and crossing a river costs more.
- You draw each army's path hex by hex. **To confirm before M8:** each army also has a top speed per night, the speed of its slowest unit type.
- **To confirm before M8:** an army can leave units behind as a new army, and your armies that end the night in the same hex merge.

### City actions

- Two city actions a day. Each is either:
  - **build** one building, or
  - **muster:** hire from every unit building at once, paying for each unit.
- **To confirm before M9:** a muster may hire fewer units than are available, and a second muster on the same day hires nothing more.

### Research

- Pick one tech a day, two once you have a university.
- A tech is learned at the start of that night's resolution, so it already counts in that night's battles.

### Intrigue (confirm before M10)

- Paid in gold.
- **Spies:** available from the start. A spy reveals what one army or hex is made of, for the day.
- **Decoys, rumours and sabotage:** unlocked by the intrigue techs.

### Diplomacy

Free. See **Pacts**.

## The night, in order

1. **Pacts:** pacts broken today take effect.
2. **Research:** today's techs are learned.
3. **Buildings:** buildings ordered today are finished.
4. **Musters:** recruits appear (see **Reinforcing the front**). They do not move tonight.
5. **Movement:** armies move in steps, one hex per army per step, all at the same time, until every army has used its path.
   - Armies meet when they enter the same hex on the same step, or swap hexes head-on. Armies whose paths cross on different steps do not meet.
   - Armies of players with a pact pass through each other.
   - Enemies who meet fight at once (see **Battles**).
6. **Sharing a hex:** when armies of two players with a pact end in the same hex, the stronger one holds it and the weaker stops one hex short along its path.
7. **Captures:** an army alone at the end of the night in a town, or in an enemy capital, takes it.
8. **Production:** income from the capital and held towns. Unit buildings add their nightly growth to the hiring pool.
9. **Scoring:** see **Scoring and honours**.
10. **Pacts:** tonight's pacts end and their cooldown starts.
11. **Gazette:** the morning gazette is written.

## Battles

- v1's strength model stays: each unit type's strength against each enemy type, a counter triangle (line beats cavalry, cavalry beats skirmishers, skirmishers beat line), a defender bonus, and artillery. Counters are softer than in v1, and terrain shapes them (see **Terrain**).
- The result depends on R, the stronger side's strength divided by the weaker side's. The thresholds are defaults:

| Result         | Losses                                          | Afterwards                                       |
| -------------- | ----------------------------------------------- | ------------------------------------------------ |
| **Indecisive** | both sides lose about the same                  | both halt in the hex each held before that step  |
| **Victory**    | the loser more, the winner fewer                | the loser retreats one hex; the winner continues |
| **Rout**       | the loser is destroyed; the winner loses little | the winner continues                             |

- The retreat hex is on no enemy army's remaining path.
- The winner keeps going with whatever movement it has left. It can meet another army and fight again the same night.
- **To confirm before M8:**
  - the retreat hex is the one nearest the loser's own territory, ties broken by the seed; with no such hex, the loser surrenders and is destroyed;
  - a battle costs the winner one step of movement;
  - cavalry on the winning side pursues (the loser loses more); cavalry or skirmishers on the losing side cover the retreat (it loses less); Orderly Retreat turns a rout into a retreat;
  - a battle between three or more armies works as in v1.

## Pacts

- A pact between two players covers one night: it is agreed during the day and holds for that night.
- While a pact holds, the two players' armies pass through each other. When both end the night in the same hex, the stronger army holds it.
- After a pact, the same two players must wait out a **pact cooldown** before agreeing another, so nobody stays safe all week.
- A pact can be broken. The break takes effect that same night, everyone is told at dawn, and the breaker loses the **pact break penalty** in points.
- **To confirm before M11:** a player can send gold to another during the day, for example as the price of a pact.

## Tech

- 8 techs. Without a university you learn 5 of them in a week. With a university from night 1 you can learn all 8.
- **To confirm before M10:** three branches, each tech unlocking a building, a unit improvement or an action:

| Branch   | Tech            | Gives                                                     |
| -------- | --------------- | --------------------------------------------------------- |
| Military | Bayonet Drill   | line infantry takes normal damage from skirmishers (v1)   |
| Military | Lancers         | cavalry takes normal damage from line infantry (v1)       |
| Military | Orderly Retreat | a rout becomes a retreat                                  |
| Economy  | Trade           | towns give more gold                                      |
| Economy  | Conscription    | unit buildings grow faster                                |
| Economy  | Engineering     | rivers cost less to cross; unlocks a building for bridges |
| Intrigue | Agents          | decoys and rumours                                        |
| Intrigue | Saboteurs       | sabotage: a capital or town produces half tomorrow        |

- **To confirm before M10:** who has learned what is public.

## Reinforcing the front

Mustered units join any of your armies standing in territory connected to your capital by an unbroken run of your own hexes. Without a connected army, they appear in the capital. Cut through someone's territory and you cut off their reinforcements.

Generals (your commander on the map, leading one army) are set aside until after Milestone 12.

## What you can see

- No fog of war: everyone sees the whole map, every army's position and every army's size.
- What an army is made of is hidden from other players. A spy report or a battle reveals it.
- **To confirm before M10:** a decoy shows a made-up size until it is spied on or fought.
- **To confirm before M12:** the Fog event hides other armies' sizes for one day.
- Everything a player sees passes through `filterForPlayer`, as in v1.

## Commanders

Each player picks a commander in the lobby. Picks stay secret until the match starts, and two players may pick the same one. Each commander has a passive and an ability used once a match, and each leans on a different part of the game. The effects below are **To confirm before M12**; the numbers are defaults.

| Commander      | Leans on    | Passive                                   | Once a match                                                                            |
| -------------- | ----------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Napoleon       | artillery   | artillery stronger                        | **Grand Battery:** tonight your artillery counts double                                 |
| Wellington     | defence     | defender bonus up                         | **Reverse Slope:** one army takes no artillery damage and its defender bonus doubles    |
| Murat          | cavalry     | cavalry faster                            | **Grand Charge:** tonight no defender bonus where your cavalry attacks                  |
| Blücher        | attack      | attacking armies stronger                 | **Marschall Vorwärts:** a bigger movement pool tonight                                  |
| Kutuzov        | attrition   | Orderly Retreat always                    | **Scorched Earth:** towns taken from you tonight give their captor nothing for 2 nights |
| Sir John Moore | skirmishers | skirmishers show as unidentified to spies | **Ambush:** tonight your skirmishers in forest deal double damage                       |
| Talleyrand     | diplomacy   | breaking a pact costs half                | **Turncoat:** break one pact with no penalty; only the betrayed player is told          |
| Fouché         | intrigue    | spies cost half                           | **Secret Police:** tonight you see what every army is made of                           |

## Events

One event per match, drawn from the seed, announced in Tuesday's gazette and in play on Wednesday. The effects are **To confirm before M12**.

| Event          | Effect                                                   |
| -------------- | -------------------------------------------------------- |
| Mud            | every hex costs more march points; artillery cannot move |
| Fog            | other armies' sizes are hidden; no spies                 |
| Typhus         | each player's largest army loses a share of its units    |
| Levée en masse | free line infantry join every capital                    |
| Armistice      | no battles tonight: armies that meet an enemy halt       |

## Scoring and honours

- Most points after Friday night wins.
- Points for each town you hold at the end of Wednesday's and Friday's nights.
- A capital bonus, once, for each enemy capital you take.
- Honours, as in v1. **To confirm before M12:** which v1 honours stay, and new ones such as most pacts kept or a betrayal that paid off.
- Minus the pact break penalty for each pact you break.
- Tie-breaks, as in v1: more towns held at the end, then fewer units lost in battle. Players tied on both share the victory.
- A player who loses their capital loses their city actions and research until they retake it. They are out of the match only once they have neither a capital nor an army.

## The gazette (confirm before M10)

- Every morning, a short Napoleonic newspaper reports what everyone could see overnight: battle results, captures, broken pacts and the coming event.
- A player who knows Agents can pay to plant a rumour in it. Rumours look exactly like real reports.

## The UI

- The map looks like a map: terrain, rivers, lakes, coast and the lines of control.
- An army is shown as one soldier figure per unit type, each with its number. Someone else's army is one neutral figure with its total.
- The map is how you give orders: tap an army and the hexes it can reach light up; tap one to draw the path, and see the matchup preview inline. Paths show as arrows. A bottom sheet holds the city, research, intrigue and diplomacy. The replay animates on the map. The map pans and zooms.
- The map is keyboard operable, and a list view gives screen readers the same information.

## Engine architecture

The engine is a pure, deterministic function from yesterday's state, everyone's orders and the match config to today's state plus a replay log. Everything else (server, web client) is a shell around it. Renderers never touch engine state directly: everything a player sees passes through `filterForPlayer`.

### Principles

- **Pure and deterministic.** No `Date.now()`, no `Math.random()`, no I/O. Randomness (the map, events, honours, seats) comes from the seeded PRNG using `matchSeed`. The same inputs always produce byte-identical outputs.
- **Explicit ordering.** Anything that iterates over players, hexes or modifiers sorts first: by seat, by hex id, by modifier priority. Never rely on object key or insertion order.
- **Rules as data.** `MatchConfig` holds every tuning value, the matrices, the map generation rules, the schedule, scoring and the content pools. Modes are config presets, not code branches.
- **One modifier system.** Upgrades and techs, commander passives and abilities, events and terrain are all modifiers: parameter patches the engine reads, or steps added to a resolution phase. The engine never asks "is this Napoleon?" or "is this a hill?"; it asks for the effective parameters of this player, in this hex, tonight.

### Hexes

Hexes use axial coordinates `(q, r)`. A hex's id is `"q,r"`, and lists of hexes sort by id. The distance between two hexes is the number of moves between them on open ground. A river or bridge lies on the edge between two hexes, stored as the sorted pair of their ids.

### Replay log

As in v1: an append-only list of typed events, the single source for replays, honours, the gazette and player-facing history.

## Repository, stack and standards

An Nx monorepo with Yarn and strict TypeScript. The engine library has zero framework dependencies; apps depend on libs, never the reverse.

| Project             | Contents                                                                                               | Since  |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| `libs/engine`       | Types, `resolveTurn`, combat, modifiers, seeded PRNG, hexes and the map generator                      | M1, M7 |
| `libs/content`      | Default `MatchConfig`, map generation rules and capital rings, commanders, events, honours (data only) | M1, M7 |
| `libs/honours`      | Honour queries over the replay log                                                                     | M3     |
| `libs/player-view`  | `filterForPlayer` and spy reports                                                                      | M4     |
| `libs/render-ascii` | Plain-text renderer from a `PlayerView`                                                                | M4     |
| `apps/gm-cli`       | Node CLI for v1 playtests                                                                              | M4     |
| `libs/contracts`    | DTOs shared by API and web                                                                             | M5     |
| `apps/api`          | NestJS server, persistence, nightly resolution                                                         | M5     |
| `apps/web`          | Angular client, mobile first                                                                           | M6     |

### Code standards (all projects)

- TypeScript strict. No `any`. Every function has typed parameters and return types.
- No magic numbers: tuning values live in `libs/content`, other constants are named.
- Descriptive function names. Length doesn't matter, clarity does.
- Cyclomatic complexity under 3 per function, enforced by ESLint `complexity`.
- Prefer small pure functions and `readonly` data. No mutation of inputs.
- Testing: 100% coverage as a forcing function for simplicity. If something is hard to test, refactor it. Logic first, then tests.
- Combat and resolution tests are table-driven. Resolution scenarios and generated maps also get ASCII snapshot tests.
- A determinism test runs `resolveTurn`, and the map generator, twice on identical inputs and asserts identical output.
- Follow Angular and Nx file conventions.

### Additional standards for `apps/web`

- State: signals first, RxJS where it fits, no other state libraries.
- Styling: utility classes (Tailwind) for layout and spacing, custom SCSS classes for visual styling. Never mix helper classes into styled components.
- Errors: one HTTP interceptor handles all API errors; no error handling in components. 4xx → inline validation; everything else → a snackbar. All messages translated.
- No silent failures; optional chaining is not error handling. Every caught error is reported to Sentry.
- Every data-bound component handles four states: loading, success, error, empty.
- Accessibility: the SVG map is keyboard operable, and a list view gives screen readers the same information.

## Milestones

Built in order. Each v2 milestone ends with something playable in the browser. Do not start the next milestone until the current one's criteria all pass.

**Done (v1):** M1 engine core, M2 modifiers and content, M3 replay log and honours, M4 player views, spies, ASCII and GM CLI, M5 API, M6 web client.

7. **M7 — The map.** The seeded hex map generator for 2 to 8 players, and a map lab in the web app that draws it.
   - `generateHexMap` is pure; the same seed and player count give an identical map (determinism test).
   - For every player count from 2 to 8 and a sample of seeds, the generator guarantees hold: capital ring distances, distance from the map's edge, no impassable terrain on the edge or next to a capital, every passable hex reachable, town counts and spacing, one town per player nearer them than anyone else.
   - ASCII snapshot tests for generated maps.
   - Territory at the start of a match (capitals only), with the overlap rule, is computed and tested.
   - The map lab: pick 2 to 8 players and a seed, and see the map drawn as a map: terrain, rivers, bridges, roads, coast, towns by kind, capitals by seat, territory and borders. It pans and zooms by drag, pinch, wheel and buttons, works from the keyboard, and lists the capitals and towns for screen readers.
8. **M8 — Armies and battles.** The API and web switch to v2. Armies, paths and the movement pool, stepped movement, battle results and retreats, captures, town scoring, losing your capital. Ordering on the map, unit figures, and the replay animated on the map. You can play a week of pure war.
9. **M9 — The city.** Gold, buildings, musters, reinforcing through connected territory, town kinds.
10. **M10 — Tech and intrigue.** The tech tree and university, spies, decoys, sabotage, the gazette and rumours.
11. **M11 — Diplomacy.** Pacts, cooldowns, the break penalty, sending gold.
12. **M12 — The full game.** Commanders, events, v2 honours, and a balancing pass.

## What carries over from v1

- **Stays:** the deterministic engine and seeded random draws; modifiers and effective parameters; the strength model and casualty removal; `filterForPlayer` and the leak tests; the replay log and honour queries; the API, its scheduler and the calendar; the web foundation (translations, error handling, sessions).
- **Rewritten:** the map (hexes, terrain, territory), orders (paths and city actions instead of an order list), how a night resolves (stepped movement, battle results), the economy, research, pacts, the gazette and the map-first UI.

## Default tuning values

All of these live in `libs/content` and change with play, not with code.

| Value                     | Default                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Capital spacing           | 6 moves between neighbouring capitals                                                         |
| Hexes behind a capital    | 2 (distance from a capital to the map's edge, at least)                                       |
| Towns per player          | 1.5, rounded                                                                                  |
| Town spacing              | at least 3 hexes from another town and from a capital                                         |
| Town kinds                | market town 2 : stud farm 1 : ironworks 1                                                     |
| Capital reach, town reach | 2 hexes, 1 hex                                                                                |
| Movement pool             | 24 march points a day                                                                         |
| Army speed                | line and skirmishers 6, cavalry 8, artillery 4 march points                                   |
| Terrain movement          | as in the terrain table                                                                       |
| Counter bonus             | +50% strength                                                                                 |
| Defender bonus            | +25%; hills and walls more                                                                    |
| Battle thresholds         | indecisive below R 1.25; victory from 1.25; rout from 2                                       |
| Pact cooldown             | 1 day between the same two players                                                            |
| Pact break penalty        | 5 points                                                                                      |
| Town points               | 3 a town on Wednesday, 6 on Friday                                                            |
| Capital bonus             | 10 points, once per capital                                                                   |
| Income                    | capital 8 gold; market town 4; stud farm and ironworks 2                                      |
| Starting gold             | 12                                                                                            |
| Hiring                    | line 2, skirmisher 2, cavalry 3, artillery 4 gold; a stud farm or ironworks takes 1 off       |
| Unit building growth      | barracks 3 line, stables 2 cavalry, skirmisher camp 2, foundry 1 gun a night                  |
| Building costs            | stables 6, skirmisher camp 6, foundry 8, market 5, walls 8, university 10, spy network 6 gold |
| Rumour                    | 3 gold                                                                                        |

The map generator's own amounts (outline, terrain shares, rivers, lakes, mountains) are defaults in `libs/content` too, tuned by looking at maps in the map lab.

## Out of scope

- Generals on the map
- Bots and solo play
- Matches longer than a week; weekend resolution
- Accounts beyond invite links, monetization, anything real-time

## Rule clarifications log

| Date       | Rule             | Decision                                                                                                                                        |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-27 | v2               | Replaces v1's rules after the owner's review of the v1 web client                                                                               |
| 2026-10-27 | Capital distance | Exactly equal in moves (hexes, ignoring terrain), not in straight-line distance: on hexes both cannot be exact, and moves are what players feel |
| 2026-10-27 | Map edge         | No impassable terrain on the map's edge                                                                                                         |
| 2026-10-27 | Currency         | One, gold; towns differ by kind instead, so no player can be locked out of a unit type                                                          |
| 2026-10-27 | Fog of war       | None: the whole map, every army's position and size are visible                                                                                 |
| 2026-10-27 | Elimination      | Out only with neither a capital nor an army                                                                                                     |

v1's clarifications applied to v1's rules and are in the git history with the v1 spec.
