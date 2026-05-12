# Contributing to Fieldmap

Thanks for working on Fieldmap. This guide covers the essentials:
where code lives, how to verify changes locally, and how pull requests
are reviewed.

## Repo layout

```text
.
- fieldmap-app/   # the only application package (Capacitor + React + TS)
- docs/           # design references, handoff guide, phone deployment
- .github/        # CI workflows + PR template
```

**There is one and only one npm package in this repository:
`fieldmap-app/`.** Do not add new `package.json` files at the repo root
or under sibling folders unless we explicitly move to a workspace
setup.

## Prerequisites

- **Node.js** `>= 20` (LTS recommended; Node 22 also works).
  - On Windows, if you hit "Invalid Version:" errors during install,
    use Node 22 LTS and let `.npmrc` apply `legacy-peer-deps=true`.
- npm (bundled with Node).

## Local setup

```bash
cd fieldmap-app
npm ci
```

`fieldmap-app/package-lock.json` is committed and is the source of
truth for dependency versions. CI installs with `npm ci`, so keep the
lockfile in sync whenever you change dependencies (use `npm install`
locally only when you intentionally add or update a dep).

## Day-to-day commands

All commands run from `fieldmap-app/`:

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Vite dev server on http://localhost:5173              |
| `npm run typecheck`    | TypeScript project references, no emit                |
| `npm run build`        | Production build to `dist/`                           |
| `npm run verify`       | `typecheck` followed by `build`; run before every PR  |
| `npm run preview`      | Preview the production build locally                  |
| `npm run cap:sync`     | Build + copy web assets into iOS/Android shells       |
| `npm run cap:ios`      | `cap:sync` then open Xcode (Mac only)                 |
| `npm run cap:android`  | `cap:sync` then open Android Studio                   |

## Where code belongs

Inside `fieldmap-app/src/`:

```text
src/
- App.tsx            # top-level screen router
- main.tsx           # entry point
- theme.ts           # colour constants + map style + tile URL
- index.css          # global styles + MapLibre CSS
- components/        # reusable UI (MapLibreMap, BottomBar, etc.)
- screens/           # one file per top-level screen
- services/          # GPS, DB, autosave, import/export
- store/             # zustand store
- models/            # TypeScript domain types
```

Do **not** create new top-level `.ts` / `.tsx` files at the repo root.
All application source lives under `fieldmap-app/src/`.

## Pull requests

1. Branch from `main`.
2. Make your change. Keep PRs small and focused.
3. Run `npm run verify` from `fieldmap-app/`. It must pass.
4. Fill out the PR template (see `.github/pull_request_template.md`).
5. CI (`pr-checks.yml`) runs typecheck + build; it must be green
   before merge.

## Style notes

- TypeScript everywhere; prefer interfaces over types for object
  shapes.
- Functional, declarative React. No class components.
- File / folder names use `kebab-case` for folders and the existing
  `PascalCase.tsx` convention for React components.
- Avoid inline imports; imports stay at the top of the file.
- For TS unions and string-literal switches, prefer exhaustive
  `switch` handling.

## Reporting issues

Open a GitHub issue with:

- What you expected to happen
- What actually happened (paste the exact error text if any)
- Steps to reproduce (browser? device? which screen?)
