# Lunch Campaign

Async, browser-based Napoleonic strategy for 2–4 players, about 15 minutes a day. Orders are written during
the day and resolve simultaneously overnight; a match lasts one working week.

- **Rules and milestones:** [`docs/spec.md`](docs/spec.md) is the source of truth.
- **How to work in this repo:** [`CLAUDE.md`](CLAUDE.md).

## Projects

| Project             | Contents                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `libs/engine`       | Pure, deterministic rules engine: map loading, combat, modifiers, `resolveTurn`              |
| `libs/content`      | Data only: the default `MatchConfig`, the v0 map JSON, upgrades, commanders, events, honours |
| `libs/honours`      | The 12 honours as queries over the replay log, and final scoring with tie-breaks             |
| `libs/player-view`  | `filterForPlayer`, spies and the replay as each player may see it: the only path to players  |
| `libs/render-ascii` | Plain-text rendering of a `PlayerView`: map, players, honours, spy reports, last night       |
| `apps/gm-cli`       | Runs a match from JSON files for playtests: [how to run a week](apps/gm-cli/README.md)       |
| `libs/contracts`    | Request and response shapes shared by the API and the web, error codes, request decoders     |
| `apps/api`          | NestJS API: invite lobbies, orders until the deadline, spies, nightly resolution, SQLite     |
| `apps/web`          | Angular, mobile first: lobby, SVG map and zone list, orders with matchup preview, replay     |

Upgrades, commander passives and abilities, and events are all **modifiers**: plain data that patches the
parameters the engine reads, or adds a named step to a resolution phase. The engine never asks "is this Napoleon?";
it asks for a player's effective parameters tonight. A new event needs data and, at most, one new phase-step action.

Dependencies point one way: `apps → render-ascii / contracts → player-view → honours → content → engine` (each may
also read the layers below directly, except renderers, which see `player-view` only, so they can never reach hidden
state). The
engine never imports content (enforced by `@nx/enforce-module-boundaries`), and engine tests use their own fixtures so
playtest tuning never breaks them. Fixtures shared across projects live in `src/testing` behind a
`@lunch-campaign/<project>/testing` entry point that only specs and other fixtures may import.

## Commands

```sh
yarn install
yarn verify       # format check + lint + typecheck + test (what CI runs)
yarn test         # Jest; fails below 100% coverage
yarn lint         # ESLint, including complexity ≤ 2 and engine purity rules
yarn typecheck
yarn -s gm help   # the GM CLI for playtests
npx nx serve api  # the API on http://localhost:3000
npx nx serve web  # the web app on http://localhost:4200, with /api proxied to the API
```

Single project: `npx nx test engine`, `npx nx lint content`, …

## The API

`PORT` (default 3000), `DATABASE_PATH` (default `lunch-campaign.sqlite`; `:memory:` for a throwaway database) and
`WEB_ORIGIN` (the web client's origin, for CORS). Node 22's built-in SQLite holds the matches; it still prints an
experimental-feature warning at start-up.

| Call                                  | Who                | Does                                                           |
| ------------------------------------- | ------------------ | -------------------------------------------------------------- |
| `POST /matches`                       | anyone             | Opens a lobby in a time zone; returns the invite code          |
| `POST /invites/:inviteCode/players`   | anyone with invite | Joins; returns the player token, shown once                    |
| `GET /matches/:matchId`               | player             | The lobby, or the player's view of the running match           |
| `PUT /matches/:matchId/commander`     | player             | Secret commander pick, changeable until the start              |
| `PUT /matches/:matchId/ready`         | player             | Ready or not; the last player ready starts the match           |
| `DELETE /matches/:matchId/players/me` | player             | Leaves the lobby before the start                              |
| `PUT /matches/:matchId/orders`        | player             | Replaces today's orders until 23:00; refused orders are listed |
| `POST /matches/:matchId/spies`        | player             | Sends a spy until 23:00; returns the report                    |
| `POST /matches/:matchId/preview`      | player             | What the player could know about a planned attack              |

Players send `Authorization: Bearer <player token>`. Every error is `{ statusCode, code, message, problems }`: clients
translate `code`; `problems` lists refused orders. Nights resolve at 02:00 in the match's time zone, and any night
missed while the server was down resolves as soon as it is back.

## The web app

Angular 22, zoneless and standalone, signals for state (`httpResource` for reads, a small `createAction` for writes).
Every screen works at phone width first.

- **Errors:** one HTTP interceptor handles every API error. A 4xx from a form shows inline in that form; anything
  else, network failures included, becomes a translated snackbar. Every error is reported to Sentry once (set
  `sentryDsn` in `apps/web/src/environments/environment.prod.ts`; reporting is off without one).
- **Words:** every string comes from the English catalogue in `apps/web/src/app/core/i18n/en.ts`, typed so a key
  that does not exist fails the build. Other languages are another catalogue behind the `CATALOGUE` token.
- **Accessibility:** the SVG map is one tab stop; arrow keys move between zones and Enter or Space selects one. The
  zone list shows the same zones, owners and armies as a table. Tabs follow the WAI-ARIA tabs pattern.
- **What a player sees** is the `PlayerView` from the API, never more: the client holds no rules of its own beyond
  the order rules the view carries (costs, move limit, move ranges), and the API validates every order.
- **Styling:** Tailwind utilities for layout and spacing only (its colour, type and shadow scales are removed), and
  component SCSS classes for the look. An element gets one or the other, never both.

## Standards enforced by tooling

| Standard                                  | Enforced by                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| TypeScript strict, no `any`               | `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`), ESLint              |
| Explicit return types on every function   | `@typescript-eslint/explicit-function-return-type`                               |
| No magic numbers                          | `@typescript-eslint/no-magic-numbers` (off in tests)                             |
| Cyclomatic complexity under 3             | ESLint `complexity: 2`                                                           |
| 100% coverage                             | Jest `coverageThreshold` in `jest.preset.js`                                     |
| Engine purity (no clock, randomness, I/O) | `libs/engine/eslint.config.mjs` restricted globals and properties, no Node types |
| Deterministic ordering                    | `require-array-sort-compare`, `localeCompare` banned in the engine               |
| Template type checking (web)              | `ngc` with `strictTemplates` in the web's `typecheck` target                     |
| Template accessibility (web)              | `angular-eslint` template accessibility rules                                    |
