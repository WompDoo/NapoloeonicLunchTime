# Lunch Campaign — v0 Build Spec

Oct 26, 2026 · @Heigo Kure

## How to use this spec

Build one milestone at a time, in order, and stop for review after each one. This document is the source of truth for the game rules.

- Read **Engine architecture** and **Repository, stack and standards** before writing any code.
- Every number in **Default tuning values** is configuration. None of them appear as literals in code.
- A milestone is done only when all its acceptance criteria pass and test coverage is 100%.
- When a rule that affects game outcomes is missing or ambiguous, stop and ask. Do not invent rules.
- For naming, file layout and internal structure, decide and note the decision in the milestone summary.
- Suggested setup: save this spec as `docs/spec.md` and the code standards section as `CLAUDE.md` at the repo root.

## Game overview

Lunch Campaign is an async, browser-based Napoleonic strategy game for 2–6 players, played about 15 minutes a day. Players submit orders during the day, and every player's orders resolve simultaneously overnight. A match lasts one working week: five resolutions, Monday to Friday.

- **Identity:** mind games under hidden information. Players win by outguessing each other, not by out-producing each other.
- **Audience:** coworkers and friends, joining through an invite link.
- **Players:** 2–6 supported, 3–6 ideal. v0 ships one 4-player map.
- **Mode in v0:** Points, one week. Annihilation is out of scope.
- **Daily loop:** watch last night's replay → spy → buy → give orders → submit before the deadline.

| Day | Act | What happens |
| --- | --- | --- |
| Before Monday | Setup | Lobby fills, commanders picked, this week's 3 honours revealed |
| Monday | Expand | First orders; claim neutral land |
| Tuesday | Expand | Wednesday's event is announced at this night's resolution |
| Wednesday | Midpoint | Event active; first scoring night (city points ×1) |
| Thursday | Regroup | No scoring; reposition and spy |
| Friday | Finale | Final scoring (city points ×2); honours awarded; winner declared |

Turns resolve on weekdays only. The resolution schedule is configuration, so other schedules can be added later without engine changes.

## Core rules

The map is a graph of zones, the economy is one resource, and combat is a three-unit counter triangle plus artillery.

### Map and zones

- A zone has a kind (`plain`, `city` or `capital`), an owner (a player or neutral) and the units stationed there.
- Capitals are cities. Each player starts with one capital.
- Zones connect through an adjacency list. Movement goes only to adjacent zones.
- After resolution, a zone holds units of at most one player.
- Ownership persists while a zone is empty. A zone changes owner only when another player's units occupy it after resolution.

### Economy

- One resource: **supply**. Unspent supply carries over.
- Owned zones produce supply each night in the production phase: plain, city and capital each have a configured rate.
- Supply pays for recruits, upgrades and spies.

### Units

| Unit | Role | Beats | Loses to |
| --- | --- | --- | --- |
| Line infantry | Steady core; forms squares | Cavalry | Skirmishers |
| Cavalry | Fast strike | Skirmishers | Line infantry |
| Skirmishers | Harassment from cover | Line infantry | Cavalry |
| Artillery | Support; bombards adjacent battles | — | — (weak in direct combat) |

The counter multiplier is 2 when a unit attacks the type it beats, and 1 otherwise. Artillery sits outside the triangle: it has reduced base strength in direct combat and a multiplier of 1 in both directions. Its job is bombardment.

Default offense matrix (attacker row, target column):

| Attacker → target | Line | Cavalry | Skirmishers | Artillery |
| --- | --- | --- | --- | --- |
| Line | 1 | 2 | 1 | 1 |
| Cavalry | 1 | 1 | 2 | 1 |
| Skirmishers | 2 | 1 | 1 | 1 |
| Artillery | 1 | 1 | 1 | 1 |

### Orders

Orders are written during the day and can be edited until the deadline. The last submission counts. Units without orders hold, and a player who submits nothing holds everything.

| Order | Effect | Limits |
| --- | --- | --- |
| Recruit | New units appear at your capital in the purchase phase | They defend that night but cannot move. Only possible while you own your starting capital; captured enemy capitals score and produce but never recruit |
| Move | A group of units moves to an adjacent zone. Into your own zone = reinforce; into neutral or enemy = attack | Max 5 move orders per day |
| Support | Artillery in a zone bombards an adjacent zone if a battle involving you happens there. The order names how many artillery and the target zone, so a zone's artillery can be split across targets | Artillery that moves cannot support. Support orders don't count toward the move limit. Artillery whose own zone is attacked still supports, and still fights at home |
| Buy upgrade | Permanent upgrade, active from the purchase phase | Each upgrade once per match |
| Use ability | Your commander's one-time ability, with its target | Once per match |

Spying is not an order. It is an instant daytime action (see Hidden information and spies). The server validates every order against the current state when it is submitted, and validates again at resolution. At resolution, an order that is no longer valid is skipped and logged; the rest still resolve. Purchases are processed in the order submitted, so if a player can no longer afford everything (for example after spying), each purchase they can't afford at its turn is skipped, and a cheaper purchase listed later can still go through.

## Turn resolution

Each night, one pure function applies every player's orders through a fixed sequence of phases. The phase order is a game rule, not an implementation detail.

1. **Purchase.** Deduct costs. Place recruits at capitals. Activate upgrades. Apply purchase-phase hooks (e.g. Levée en masse).
2. **Movement.** Apply all moves at once.
   - **Head-on clash:** if A moves X→Y and B moves Y→X, the two moving groups fight a field battle first, with no defender bonus. Survivors continue to their target.
   - An empty zone entered by one player is captured without a battle.
   - Units from two or more players in one zone after movement = a battle there. The defender is the zone's owner, if the owner has units in it.
   - No defender present (e.g. two players enter an empty neutral zone) = a battle with no defender bonus.
3. **Reinforcement.** Core does nothing here; modifier hooks only (e.g. Marschall Vorwärts).
4. **Bombardment.** Each supporting artillery removes units from an enemy army in its target battle before combat. When its owner attacks, it hits the defender. When its owner defends, it hits the largest attacking army (tie: lowest seat). Artillery that fires is revealed, with its zone and count, to every player in that battle.
   - Units hit by bombardment are removed in the normal removal order (most numerous combat type first, artillery last).
   - Each hit is aimed separately: a defender's artillery hits whichever attacking army is largest at that moment, so damage spreads as armies shrink.
   - In a battle with no defender, artillery hits the largest enemy army at that moment (tie: lowest seat).
   - Hits aimed at a defender that is already destroyed are wasted; they never switch to another army.
   - All artillery present at the start of the phase fires, even if bombardment removes it before its turn. Players fire in seat order.
5. **Combat.** Resolve every battle with the formula below.
6. **Capture.** The surviving side owns the zone.
7. **Production.** Apply production-phase hooks (e.g. Typhus), then add supply for each owned zone.
8. **Scoring.** Wednesday and Friday only: award city points (Friday also awards honours).
9. **Cleanup.** Expire one-night modifiers, finish the replay log, build each player's view.

### Combat strength

In every battle, each side's effective strength is computed against the union of all its enemies' units. For side A against enemy units E:

```latex
S_A = \left(\sum_{u} n_A(u)\, b(u) \sum_{t} \frac{n_E(t)}{N_E}\, \mathrm{off}_A[u][t]\, \mathrm{vul}_E[t][u]\right)(1 + \beta_A)
```

- n\_A(u): A's count of unit type u. b(u): base strength of u.
- n\_E(t) / N\_E: share of type t among all enemy units in the battle.
- off\_A: A's offense matrix. vul\_E: the enemy's vulnerability matrix (default all 1). Upgrades patch only their owner's matrices.
- β\_A: the sum of A's bonuses that apply in this battle (defender bonus, attack bonus from commanders).

### Outcome and losses

- The side with the highest S wins.
- **Ties:** the defender wins a tie. A tie with no defender destroys all tied sides.
- **Winner's losses:** L = ceil(loss ratio × the second-highest S), removed in removal order. A winner always keeps at least 1 unit.
- **Removal order:** units are removed one at a time, each from the combat type that is most numerous at that moment; ties broken in the fixed order line, skirmishers, cavalry; artillery last. Example: 5 line + 4 cavalry losing 3 → 3 line + 3 cavalry.
- **Tied leaders without the defender:** if the highest S is shared and the defender is not among the tied sides, all tied sides are destroyed and every other side, having lost, is destroyed too. The zone ends up empty and keeps its previous owner.
- **Losers** are destroyed, artillery included. With Orderly Retreat, one unit of each combat type present survives and retreats to an adjacent zone the loser owns (lowest zone id). No such zone = destroyed.
  - A retreat can't enter a battle area: a zone with a battle tonight, or one holding another player's units. If every owned adjacent zone is a battle area, the retreating units are destroyed.
  - Orderly Retreat applies to every side that doesn't win, including mutual destruction on a tie. It doesn't apply in head-on clashes: their losers are always destroyed.
- **Multi-way battles** use the same rule: highest S wins; every other side loses.

### Counters versus numbers

Counters are strong but not absolute: numbers can beat a counter if you pay for it. With the default 2× multiplier, an army needs more than twice the units to beat the type that counters it, and more than 2.5× when attacking into a defender with the 25% bonus.

| Attack | Attacker S | Defender S | Result |
| --- | --- | --- | --- |
| 4 cavalry → 2 line (defending) | 4 × 1 = 4 | 2 × 2 × 1.25 = 5 | Line holds |
| 6 cavalry → 2 line (defending) | 6 × 1 = 6 | 5 | Cavalry wins |

### Battle replay

The outcome stays a single comparison of S; the replay tells the battle as a story. Every `BattleResolved` event records each side's S broken down by own unit type and enemy target type, plus bombardment and bonuses. Renderers use that breakdown to narrate which counter decided the battle (for example: skirmishers tore into the line; the cavalry charge broke against the squares). No engine change beyond logging the breakdown.

## Hidden information and spies

Everyone sees how many units stand in each zone; only spies reveal what those units are. The server filters hidden information before anything reaches a client.

| Information | Who sees it |
| --- | --- |
| Zone owners, unit count per zone | Everyone |
| Unit composition per zone | Owner only (others via spies) |
| Upgrades bought, commanders picked | Everyone |
| Scores and honours standings | Everyone |
| Orders, unused abilities | Owner only, until resolution |
| Supply amount | Owner only |
| Battle compositions in the replay | Players in that battle; others see each side's unit count before and after, and the outcome |

### Spies

- A spy is an instant daytime action, not an order. It costs supply and is charged immediately.
- Target: any zone except your own. The report gives that zone's exact composition.
- The world only changes at night, so the report is true for the whole day. It cannot reveal orders.
- Moore's passive: his skirmishers appear as `unidentified` in spy reports: the report counts them, but not their type (e.g. 3 line, 2 unidentified).
- The Fog event disables spies for that day. It hides unit counts only during the day: the replay of the foggy night shows them as usual, so players can see why they won or lost.
- Each report is stored in the player's private log; the Spymaster honour counts them.

### Player views

`filterForPlayer(state, log, playerId) → PlayerView` is the only path from engine state to anything a player sees. Renderers (ASCII, web) consume `PlayerView` only. Hidden data must never appear in a `PlayerView`, even in fields the UI ignores.

## Upgrades, commanders and events

All three are modifiers: data that patches parameters or adds phase steps. None of them is special-cased in the core engine.

### Upgrades

Upgrades are public, permanent and bought once each. They bend the triangle rather than add raw strength.

| Upgrade | Effect | Implemented as |
| --- | --- | --- |
| Orderly Retreat | When your army loses, one unit of each combat type present survives and retreats | Combat-phase parameter |
| Bayonet Drill | Your line infantry takes normal, not doubled, damage from skirmishers | Your vulnerability\[line\]\[skirmishers\] = 0.5 |
| Lancers | Your cavalry takes normal, not doubled, damage from line infantry | Your vulnerability\[cavalry\]\[line\] = 0.5 |

### Commanders

Each player picks a commander before the match. Picks are simultaneous, duplicates are allowed, and all picks are revealed together. The ability is used once per match, stays hidden until resolution and is revealed in the replay. An ability whose condition isn't met that night (for example, no battle to join) is still used up.

| Commander | Passive | One-time ability |
| --- | --- | --- |
| Napoleon | Artillery bombards +1 unit | **Grand Battery:** all your artillery bombards twice tonight |
| Wellington | Defender bonus +10% | **Reverse Slope:** one owned zone takes no bombardment and its defender bonus is doubled tonight. Only the base defender bonus doubles (25% → 50%, then Wellington's +10% on top = 60%). Only enemy bombardment is blocked; Wellington's own artillery still fires into that zone |
| Murat | Cavalry may move 2 zones, through owned or empty zones only. The middle zone is checked against the state when orders are given; the move then resolves under the normal rules | **Grand Charge:** tonight, no defender bonus applies in battles where you attack with cavalry |
| Blücher | Your attacking armies +10% strength, head-on clashes included | **Marschall Vorwärts:** in the reinforcement phase, one of your armies that held joins a battle in an adjacent zone where you attack or defend. It can send part of the army, but only from a zone with no battle of its own tonight |
| Kutuzov | Orderly Retreat always active, no purchase needed | **Scorched Earth:** one owned zone produces nothing, for whoever holds it, for the next 2 production phases: tonight's and tomorrow's |
| Sir John Moore | Your skirmishers appear as `unidentified` in spy reports | **Ambush:** tonight your skirmishers deal double damage to cavalry and take normal damage from cavalry |

Reserve commanders for later: Schulmeister (spies), Archduke Charles, Ney.

### Events

One event per match is drawn from the pool using the match seed. It is announced at Tuesday's resolution and is active for Wednesday's orders and Wednesday night's resolution.

| Event | Effect | Phase |
| --- | --- | --- |
| Mud | Cavalry loses its counter bonus; artillery cannot move | Parameter patch |
| Fog | Spies unavailable; unit counts hidden in player views for the day | View and spy rules |
| Typhus | Each player's largest single-zone army loses 20% (rounded down, minimum 1 if the army has 2+ units). Losses follow the removal order; if two of a player's armies tie for largest, the one in the lowest zone id is hit | Production hook |
| Levée en masse | Each player gets free line infantry at their capital. Without their starting capital, at the lowest-id city they own (captured capitals count); with no city, joining their largest army (tie: lowest zone id) | Purchase hook |
| Armistice | No combat or bombardment; moves into zones held or occupied by others bounce back. Two players moving into the same empty neutral zone both bounce | Movement and combat patch |

## Scoring and honours

Points come from holding cities on Wednesday and Friday nights, plus three honours revealed before the match starts.

- **City points:** each city held (capitals included) after Wednesday's resolution scores the Wednesday value; after Friday's, the Friday value (double). "Held" means owned: an empty city you own still scores.
- **Honours:** 3 drawn from the pool of 12 with the match seed at match creation, revealed before Monday. Each is worth a fixed number of points. Tied players each get the full points.
- **Elimination:** at the end of every night, a player who owns no city (capitals count) and has no units anywhere is eliminated. Their zones turn neutral and their orders are ignored from then on. Their points still count in the final ranking like anyone else's.
- **Winner:** highest total after Friday. Tie-breaks in order: more cities held at the end, then fewer own units lost, then a shared victory.
- **Honours are computed only from the replay log.** They add no rules; each is a query over logged events.
- **No honour for nothing:** a "most" honour whose best count is 0 is not awarded.
- **Battles** include head-on clashes. A battle in which bombardment destroys every enemy before combat is won by the side left standing.
- **Units lost** (Iron Discipline and the winner tie-break) means units lost in battle: in combat, in head-on clashes and to enemy bombardment. Typhus losses don't count, and units saved by Orderly Retreat are not lost.
- **Butcher's Bill credit:** in a battle someone wins, the winner is credited with every unit the losing sides lost in combat (units saved by retreat excluded); a mutual destruction credits nobody. Bombardment kills are credited to the player whose artillery fired.
- **The Fox and Saddle Up** count units as they stood before bombardment. Saddle Up needs cavalry to strictly outnumber every other type, artillery included.
- **Eliminated players** are eligible for honours.

| Honour | Awarded for |
| --- | --- |
| Grande Armée | Most units in total after Friday's resolution |
| Empire | Most zones owned after Friday's resolution |
| Butcher's Bill | Most enemy units destroyed (combat and bombardment) |
| Iron Discipline | Fewest own units lost; requires at least one battle fought |
| The Fox | Most battles won while having fewer units than the largest enemy side |
| Last Stand | Most battles won as defender |
| Spymaster | Most spy reports |
| Thunder of Guns | Most units removed by your bombardment |
| Saddle Up | Most battles won where cavalry was your largest unit type |
| Rearguard | Most units saved by Orderly Retreat |
| Forager | Most supply produced over the match |
| Blitz | Most zones captured in a single night |

## Engine architecture

The engine is a pure, deterministic function from yesterday's state, everyone's orders and the match config to today's state plus a replay log. Everything else (server, CLI, web client) is a shell around it.

&#91;embedded content: engine data flow · inputs, one pure function, outputs\]

Renderers never touch engine state directly: everything a player sees passes through `filterForPlayer`.

### Principles

- **Pure and deterministic.** No `Date.now()`, no `Math.random()`, no I/O. Randomness (event and honour draws) comes from a seeded PRNG using `matchSeed`. The same inputs always produce byte-identical outputs.
- **Explicit ordering.** Anything that iterates over players, zones or modifiers sorts first: by seat, by zone id, by modifier priority. Never rely on object key or insertion order.
- **Rules as data.** `MatchConfig` holds every tuning value, both matrices, the map, the schedule, scoring and the content pools. Modes are config presets, not code branches.
- **One modifier system.** Upgrades, commander passives and abilities, events and future campaign phases are all modifiers.

### Modifiers

A modifier has a scope (one player or everyone) and a duration (permanent, or until a given turn). It carries two kinds of effect:

- **Parameter patches** change values the engine reads: a bonus, a cost, a matrix cell.
- **Phase steps** add behavior at a specific phase (Marschall Vorwärts, Typhus, Levée en masse).

The engine never asks "is this Napoleon?". It asks "what are the effective parameters for this player on this turn?" and "which extra steps run in this phase?".

|  | One night | Permanent or scheduled |
| --- | --- | --- |
| **One player** | Commander ability | Upgrade, commander passive |
| **Everyone** | Event | Future campaign phases |

### Core types (sketch)

```ts
type PlayerId = string & { readonly brand: 'PlayerId' };
type ZoneId = string & { readonly brand: 'ZoneId' };
type CombatUnitType = 'line' | 'cavalry' | 'skirmishers';
type UnitType = CombatUnitType | 'artillery';
type UnitCounts = Readonly<Record<UnitType, number>>;
type MultiplierMatrix = Readonly<Record<UnitType, Readonly<Record<UnitType, number>>>>;

type ResolutionPhase =
  | 'purchase' | 'movement' | 'reinforcement' | 'bombardment'
  | 'combat' | 'capture' | 'production' | 'scoring' | 'cleanup';

interface PhaseStep {
  readonly phase: ResolutionPhase;
  readonly priority: number;
  readonly apply: (state: MatchState, context: TurnContext) => MatchState;
}

type ModifierScope = { readonly kind: 'player'; readonly playerId: PlayerId } | { readonly kind: 'global' };
type ModifierDuration = { readonly kind: 'permanent' } | { readonly kind: 'untilTurn'; readonly turn: number };

interface Modifier {
  readonly id: string;
  readonly source: 'upgrade' | 'commanderPassive' | 'commanderAbility' | 'event';
  readonly scope: ModifierScope;
  readonly duration: ModifierDuration;
  readonly parameterPatches: readonly ParameterPatch[];
  readonly phaseSteps: readonly PhaseStep[];
}

function resolveTurn(state: MatchState, orders: readonly PlayerOrders[], config: MatchConfig): TurnResult {
  // builds TurnContext (effective parameters + collected phase steps),
  // then reduces RESOLUTION_ORDER: core steps + modifier steps per phase, sorted by priority then seat
}
```

`MatchState`, `PlayerOrders`, `MatchConfig`, `ParameterPatch`, `TurnContext` and `TurnResult` are left for Milestone 1 to define. `TurnResult` = `{ state, replayLog }`.

### Replay log

The replay log is an append-only list of typed events, e.g. `UnitsRecruited`, `ArmyMoved`, `FieldBattle`, `Bombardment`, `BattleResolved`, `ZoneCaptured`, `Retreated`, `SupplyProduced`, `EventAnnounced`, `AbilityUsed`, `PointsAwarded`. It is the single source for replays, honours and player-facing history. Spy reports are logged separately because they happen during the day.

## Repository, stack and standards

An Nx monorepo with Yarn and strict TypeScript. The engine library has zero framework dependencies; apps depend on libs, never the reverse.

| Project | Contents | Milestone |
| --- | --- | --- |
| `libs/engine` | Types, `resolveTurn`, phases, combat, modifier system, seeded PRNG | M1–M2 |
| `libs/content` | Default `MatchConfig`, the v0 map JSON, upgrades, commanders, events, honours (data only) | M1–M3 |
| `libs/honours` | Honour queries over the replay log | M3 |
| `libs/player-view` | `filterForPlayer` and spy reports | M4 |
| `libs/render-ascii` | ASCII map and replay renderer from a `PlayerView` | M4 |
| `apps/gm-cli` | Node CLI: resolve a turn from JSON files, print per-player ASCII views | M4 |
| `libs/contracts` | DTOs shared by API and web | M5 |
| `apps/api` | NestJS server, persistence, nightly resolution | M5 |
| `apps/web` | Angular client, mobile first | M6 |

### Code standards (all projects)

- TypeScript strict. No `any`. Every function has typed parameters and return types.
- No magic numbers: tuning values live in `libs/content`, other constants are named.
- Descriptive function names. Length doesn't matter, clarity does.
- Cyclomatic complexity under 3 per function, enforced by ESLint `complexity`.
- Prefer small pure functions and `readonly` data. No mutation of inputs.
- Testing: 100% coverage as a forcing function for simplicity. If something is hard to test, refactor it. Logic first, then tests.
- Combat and resolution tests are table-driven. Resolution scenarios also get ASCII snapshot tests.
- A determinism test runs `resolveTurn` twice on identical inputs and asserts identical output.
- Follow Angular and Nx file conventions.

### Additional standards for `apps/web`

- State: signals first, RxJS where it fits, no other state libraries.
- Styling: utility classes (Tailwind) for layout and spacing, custom SCSS classes for visual styling. Never mix helper classes into styled components.
- Errors: one HTTP interceptor handles all API errors; no error handling in components. 4xx → inline validation; everything else → a snackbar. All messages translated.
- No silent failures; optional chaining is not error handling. Every caught error is reported to Sentry.
- Every data-bound component handles four states: loading, success, error, empty.
- Accessibility: the SVG map is keyboard operable, and a list view of zones gives screen readers the same information.

## Milestones

Six milestones, built in order, with a playtest gate after Milestone 4. Do not start the next milestone until the current one's criteria all pass.

1. **M1 — Engine core.** Types, `MatchConfig`, map loading, purchase, movement, head-on clashes, combat, losses, capture, production, scoring. No modifiers yet.
   - `resolveTurn` is pure; the determinism test passes.
   - Table-driven combat tests cover each triangle matchup, mixed armies, multi-way battles, every tie case and head-on clashes.
   - Every tuning value is read from config. 100% coverage.
2. **M2 — Modifier system and content.** Parameter patches, phase steps, effective-parameter resolution; the 3 upgrades, 6 commanders and 5 events.
   - Each upgrade, passive, ability and event has at least one scenario test.
   - Adding a new event needs only data and, at most, one new phase step. No edits to core phase code.
   - Two players using the same phase step on the same night resolve deterministically by priority, then seat.
3. **M3 — Replay log and honours.** Typed log events from every phase; the 12 honours as log queries; full scoring including honours and tie-breaks.
   - Honours read only the replay log, never `MatchState`.
   - A scripted full-week scenario produces the expected final scores.
4. **M4 — Player views, spies, ASCII and GM CLI.** `filterForPlayer`, spy reports, the ASCII renderer, and a CLI that resolves a turn from JSON files.
   - Tests assert that hidden data never appears in any `PlayerView`.
   - ASCII snapshot tests for the map, a battle replay and a spy report.
   - A full 4-player week can be run by hand from JSON order files.
5. **Gate — playtest week.** Run one real week with 4 coworkers using the CLI (orders via a form, ASCII posted to chat). Tune values in `libs/content` only. M5 does not start until this is done.
6. **M5 — API.** NestJS: lobbies with invite links, commander pick, order submission until the deadline, spy endpoint, nightly scheduled resolution, persistence.
   - An end-to-end test plays a full week through the API with a fake clock.
   - The API only ever returns `PlayerView` data to clients.
7. **M6 — Web client.** Angular, mobile first: SVG map, order screen with matchup preview, spies, replay viewer, honours board.
   - Every data component handles loading, success, error and empty.
   - Map is keyboard operable; the zone list view works with a screen reader.

## Default tuning values and the v0 map

These are starting guesses for the playtest. They live in `libs/content` and will change.

| Parameter | Default |
| --- | --- |
| Production per night | Plain 1, city 2, capital 3 supply |
| Starting supply | 6 |
| Starting units at capital | 3 line, 2 cavalry, 2 skirmishers, 1 artillery |
| Recruit cost | Line 2, skirmishers 2, cavalry 3, artillery 4 |
| Spy cost | 2 |
| Upgrade cost | 6 each |
| Base strength | Line, cavalry, skirmishers 1; artillery 0.5 |
| Counter multiplier | 2 |
| Defender bonus | 25% |
| Loss ratio (winner's losses) | 0.5 |
| Bombardment damage | 1 unit per artillery |
| Max move orders per day | 5 |
| City points | Wednesday 3, Friday 6 per city |
| Honours | 3 per match, 3 points each |
| Typhus loss | 20% of the largest army |
| Levée en masse | 3 free line infantry |
| Order deadline / resolution time | 23:00 / 02:00 in the match's time zone |

### v0 map: 4 players, 16 zones

A symmetric 4×4 grid with orthogonal adjacency. Capitals sit in the corners; the four cities in the centre start neutral and are where the fighting happens. Every capital is two moves from its nearest city.

```
        1      2      3      4
  A  [CAP-1] [     ] [     ] [CAP-2]
  B  [     ] [CITY ] [CITY ] [     ]
  C  [     ] [CITY ] [CITY ] [     ]
  D  [CAP-3] [     ] [     ] [CAP-4]
```

- Zone ids `A1`…`D4`. Seat 1 starts at `A1`, seat 2 at `A4`, seat 3 at `D1`, seat 4 at `D4`.
- Each player starts owning only their capital. All other zones start neutral and empty.
- Scoring cities: the 4 capitals plus `B2`, `B3`, `C2`, `C3`.

## Out of scope and open questions

v0 is the one-week Points mode on one 4-player map; everything else waits until the playtest shows the core loop works.

**Out of scope for v0:**

- Annihilation mode, its escalating phases and foraging (the modifier system should make these addable later)
- Bots and solo play
- Maps for 2, 3, 5 and 6 players
- Reserve commanders: Schulmeister, Archduke Charles, Ney
- Weekend resolution schedules
- Accounts beyond invite links, monetization, anything real-time

**Rule clarifications log:**

| Date | Rule | Decision |
| --- | --- | --- |
| 2026-10-26 | Casualty removal | One unit at a time from the currently most numerous combat type |
| 2026-10-26 | Tied leaders without the defender | Everyone in the battle is destroyed; the zone keeps its previous owner |
| 2026-10-26 | Recruiting without your capital | Invalid while you don't own your starting capital |
| 2026-10-26 | Unaffordable purchases at resolution | Processed in submission order; unaffordable ones are skipped and logged |
| 2026-10-26 | "City held" for scoring | Held = owned, even when empty |
| 2026-10-26 | Bombardment victims | Normal removal order |
| 2026-10-26 | Defender's artillery target | Each hit re-checks the largest attacking army |
| 2026-10-26 | Artillery in a battle with no defender | Hits the largest enemy army |
| 2026-10-26 | Overkill on a defender | Extra hits are wasted |
| 2026-10-26 | Artillery whose zone is attacked | Still supports, and still fights at home |
| 2026-10-26 | Support orders | Name a count and a target; split allowed |
| 2026-10-26 | Blücher passive | Applies in head-on clashes |
| 2026-10-26 | Murat's 2-zone move | Middle zone checked when ordering; normal resolution after |
| 2026-10-26 | Marschall Vorwärts | Part of an army; only from a zone with no battle tonight |
| 2026-10-26 | Reverse Slope with Wellington | Base bonus doubled, then +10% (60%); own artillery still fires |
| 2026-10-26 | Orderly Retreat | Not into battle areas; not in head-on clashes; applies on mutual destruction |
| 2026-10-26 | Typhus | Removal order; tie between a player's armies → lowest zone id |
| 2026-10-26 | Armistice contested entry | Both bounce |
| 2026-10-26 | Scorched Earth | Tonight and tomorrow |
| 2026-10-26 | Ability with no effect | Still used up |
| 2026-10-26 | Levée en masse without a capital | Lowest-id owned city, else largest army |
| 2026-10-26 | Elimination | No city and no units at the end of a night; zones turn neutral; points still count |
| 2026-10-26 | Honours with a best count of 0 | Not awarded |
| 2026-10-26 | Butcher's Bill credit | Winner gets losers' combat losses (minus retreats); mutual destruction credits nobody; bombardment kills go to the firer |
| 2026-10-26 | Units lost | Lost in battle: combat, head-on clashes, enemy bombardment; not Typhus; retreats not lost |
| 2026-10-26 | Head-on clashes | Count as battles for honours |
| 2026-10-26 | The Fox / Saddle Up unit counts | Before bombardment; Saddle Up needs cavalry strictly largest |
| 2026-10-26 | Battle ended by bombardment | Won by the side left standing |
| 2026-10-26 | Eliminated players and honours | Eligible |
| 2026-10-26 | Fog and the replay | Fog hides counts during the day only; the night's replay shows them |
| 2026-10-26 | Spying on your own zone | Rejected |
| 2026-10-26 | Moore's unidentified skirmishers | Counted but untyped in the report |
| 2026-10-26 | Replay for players outside a battle | Each side's unit count before and after, and the outcome |
| 2026-10-27 | Playtest gate | Skipped by the project owner: M5 is built before the playtest week |
| 2026-10-27 | Honour standings in views | Every player's value is shown, as the visibility table says |
| 2026-10-27 | Seats | Drawn at random from the match seed when the match starts |
| 2026-10-27 | Players on the v0 map | 2 to 4; capitals of unused seats start neutral and empty |
| 2026-10-27 | Match start | When every player in the lobby has picked a commander and pressed ready |
| 2026-10-27 | Day 1 | The start day if it is a weekday and before the deadline, otherwise the next weekday |
| 2026-10-27 | Match days | Five weekdays counted from day 1, skipping weekends; the schedule labels name game days, not calendar days |
| 2026-10-27 | Spying after the deadline | Closed: spies close with orders at the deadline and reopen after the night's resolution |
| 2026-10-27 | Matchup preview | A best estimate from what the player knows: today's spy report on the zone, otherwise the public count with counter hints. Public modifiers only; tonight's abilities and bombardment are never included |
| 2026-10-27 | Web languages | English, with every message in a translation catalogue |

**Open questions for the playtest:**

- [ ] Is mutual destruction on a tie with no defender too harsh?
- [ ] Should battle compositions be revealed to everyone in the replay, or only to participants?
- [ ] Should supply amounts be public?
- [ ] Does Thursday feel like tense build-up or a dead day?
- [ ] Is Wednesday overloaded with both the event and the first scoring?
- [ ] Should spies reach any zone, or only zones near your territory?
- [ ] With duplicates allowed, do commander pick rates and win rates stay balanced?
