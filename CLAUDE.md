# Lunch Campaign

Async, browser-based Napoleonic strategy game. The full game rules, architecture and milestones live in `docs/spec.md`. That spec is the source of truth: read it before starting any milestone.

## How to work in this repo

- Build one milestone at a time, in the order given in `docs/spec.md`. Stop after each milestone and summarise what was built, decisions made and anything left open.
- When a rule that affects game outcomes is missing or ambiguous, stop and ask. Do not invent rules.
- For naming, file layout and internal structure, decide yourself and note the decision in the milestone summary.
- Every tuning value (costs, bonuses, multipliers, points) lives in `libs/content`. Never hard-code them.

## Stack

- Nx monorepo, Yarn, TypeScript strict
- `libs/engine`: pure TypeScript, zero framework dependencies
- `apps/api`: NestJS (Milestone 5)
- `apps/web`: Angular, mobile first (Milestone 6)
- Jest for tests

## Engine rules

- `resolveTurn` is pure and deterministic: no `Date.now()`, no `Math.random()`, no I/O.
- Randomness comes only from the seeded PRNG using `matchSeed`.
- Anything iterating over players, zones or modifiers sorts explicitly first (seat, zone id, modifier priority). Never rely on object key or insertion order.
- Upgrades, commander abilities and events are modifiers (parameter patches and phase steps). Never special-case a specific commander, upgrade or event in core phase code.
- Everything a player sees passes through `filterForPlayer`. Hidden data must never appear in a `PlayerView`.

## Code standards (all projects)

- No `any`. Every function has typed parameters and an explicit return type.
- No magic numbers. Tuning values come from config; other constants are named.
- Descriptive function names. Length doesn't matter, clarity does.
- Cyclomatic complexity under 3 per function, enforced by ESLint `complexity`.
- Small pure functions and `readonly` data. Never mutate inputs.
- Follow Angular and Nx file conventions.

## Testing

- 100% coverage. It is a forcing function for simplicity: if something is hard to test, refactor it.
- Logic first, then tests.
- Combat and resolution tests are table-driven. Resolution scenarios also get ASCII snapshot tests.
- A determinism test runs `resolveTurn` twice on identical inputs and asserts identical output.

## Additional standards for `apps/web`

- State: signals first, RxJS where it fits, no other state libraries.
- Styling: Tailwind utility classes for layout and spacing, custom SCSS classes for visual styling. Never mix helper classes into styled components.
- Errors: one HTTP interceptor handles all API errors; no error handling in components. 4xx goes to inline validation, everything else to a snackbar. All messages translated.
- No silent failures; optional chaining is not error handling. Every caught error is reported to Sentry.
- Every data-bound component handles four states: loading, success, error, empty.
- Accessibility: the SVG map is keyboard operable, and a zone list view gives screen readers the same information.
