# Lunch Campaign

Async, browser-based Napoleonic strategy for 2–6 players, about 15 minutes a day. Orders are written during
the day and resolve simultaneously overnight; a match lasts one working week.

- **Rules and milestones:** [`docs/spec.md`](docs/spec.md) is the source of truth.
- **How to work in this repo:** [`CLAUDE.md`](CLAUDE.md).

## Projects

| Project        | Contents                                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| `libs/engine`  | Pure, deterministic rules engine: types, map loading, combat, `resolveTurn`   |
| `libs/content` | Data only: the default `MatchConfig` (every tuning value) and the v0 map JSON |

Dependencies point one way: `content → engine`. The engine never imports content (enforced by
`@nx/enforce-module-boundaries`), and engine tests use their own fixtures so playtest tuning never breaks them.

## Commands

```sh
yarn install
yarn verify       # format check + lint + typecheck + test (what CI runs)
yarn test         # Jest; fails below 100% coverage
yarn lint         # ESLint, including complexity ≤ 2 and engine purity rules
yarn typecheck
```

Single project: `npx nx test engine`, `npx nx lint content`, …

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
