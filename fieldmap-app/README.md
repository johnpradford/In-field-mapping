# Fieldmap — Capacitor + React project

Field navigation app for **Biologic Environmental** (biologicenv.com.au).
Designed for ecologists working offline in remote environments — caves,
gorges, water systems — in Western Australia.

This codebase is a Capacitor + React + TypeScript app. The same code
runs on **iOS and Android** (and in a regular browser for development),
and most day-to-day work is done in plain web tech that any React
developer can edit on Windows without touching a Mac until it's time to
build for the App Store.

---

## What's in this folder

```
fieldmap-app/
├── package.json                  — npm dependencies and scripts
├── vite.config.ts                — bundler config
├── tsconfig.json                 — TypeScript config
├── tailwind.config.js            — colours / fonts (brand palette baked in)
├── capacitor.config.ts           — app id, name, native settings
├── index.html                    — single HTML page (loaded by the webview)
├── src/
│   ├── main.tsx                  — app entry
│   ├── App.tsx                   — screen router
│   ├── index.css                 — global styles + MapLibre CSS
│   ├── theme.ts                  — colour constants + map style + tile URL
│   ├── store/
│   │   └── appStore.ts           — central app state (zustand)
│   ├── models/                   — TS types: Pin / Track / Layer / Project / FieldmapFile
│   ├── services/
│   │   ├── locationService.ts    — GPS + background recording wrapper
│   │   ├── databaseService.ts    — local DB via Dexie/IndexedDB
│   │   ├── autosaveService.ts    — auto-persist store changes to the DB
│   │   ├── fileImportService.ts  — GeoJSON / GPX / KML / Shapefile parsing
│   │   └── fileExportService.ts  — .fieldmap / GeoJSON / GPX export
│   ├── screens/                  — one file per screen (Map, Projects, Layers, Import, Export, Settings…)
│   └── components/               — MapLibreMap, BottomBar, NorthArrow, PinInfoPanel, …
└── README.md                     — this file
```

---

## How to get this running (for a developer)

You need **Node.js 20 or newer**. Everything else gets installed by
`npm install`.

### 1. Install dependencies

```bash
cd fieldmap-app
npm ci
```

`npm ci` installs exactly what `package-lock.json` says. Use
`npm install` only when intentionally adding or updating dependencies.

### 2. Run in a browser (fastest dev loop)

```bash
npm run dev
```

Open <http://localhost:5173>. The map renders, pins drop using the
browser's geolocation, and most flows are testable.
**File picker, share sheet, and background GPS** require a real device
— see step 4.

### 3. Add the native iOS and Android shells

One-time setup:

```bash
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` folders containing the native Xcode
and Android Studio projects. Treat them as build output — the source of
truth is the `src/` web code.

### 4. Build for iOS

You need a Mac for this step (Apple's restriction, not Capacitor's).

```bash
npm run cap:ios
# → builds the web app, copies it into ios/, and opens Xcode
```

In Xcode:

- Select your team under Signing & Capabilities
- Add capability **Background Modes → Location updates**
- In `Info.plist`, add `NSLocationAlwaysAndWhenInUseUsageDescription`
  and `NSLocationWhenInUseUsageDescription` strings explaining why
  the app needs location
- Build and run on a connected iPhone

### 5. Build for Android

```bash
npm run cap:android
# → builds the web app, copies it into android/, and opens Android Studio
```

In Android Studio: in `AndroidManifest.xml`, ensure these permissions
are present:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

Then click Run on a connected phone or emulator.

### 6. After every code change

```bash
npm run cap:sync
```

Copies the new web build into the iOS and Android projects.

### Live reload on a real device (optional)

Add this to `capacitor.config.ts` while developing, then `npx cap sync`:

```ts
server: {
  url: 'http://YOUR-LAPTOP-IP:5173',
  cleartext: true,
}
```

The phone app loads from the Vite dev server on your laptop —
file changes appear within a second.

---

## What's done in this codebase

- App shell, screen routing, navigation back-stack
- Brand palette (Tailwind + theme.ts)
- All ten screens scaffolded with working UI
- **MapLibre GL JS map** with PMTiles vector tile source registered
  (works the moment a real `.pmtiles` file is provided — see below)
- Pin drop using a real GPS fix (sequential numbering, undo toast)
- **Background GPS recording** — uses
  `@capacitor-community/background-geolocation` so tracks keep
  recording when the screen locks
- Measure tool — tap-to-add points, line drawn on the map
- Import GeoJSON / GPX / KML / Shapefile (.zip)
- Export as .fieldmap / GeoJSON / GPX, opens native share sheet
- Local database (Dexie / IndexedDB) for pins, tracks, layers, projects
- **Autosave service** persists every store change to the local DB
- **Editable pin notes** in the pin info panel
- **Compass-aware north arrow** that rotates as the map rotates
- Settings screen with persistent prefs (Capacitor Preferences plugin)
- Typecheck + Vite production build verified clean

---

## What still needs developer attention

### Critical — won't ship without this

1. **A real offline PMTiles archive**

   The map source URL in `src/theme.ts` (`PMTILES_URL`) currently points
   at the public Protomaps demo file. For real field use, replace it
   with a `.pmtiles` archive of the survey region — typically downloaded
   from <https://maps.protomaps.com> or self-extracted with
   <https://github.com/protomaps/PMTiles>. The archive can be:

   - **Bundled with the app** under `public/offline/wa-pilbara.pmtiles`,
     then referenced as `pmtiles:///offline/wa-pilbara.pmtiles`
   - **Downloaded into the device** at first launch via Capacitor
     Filesystem, then loaded from the local file URI

   The protocol is already registered (see `MapLibreMap.tsx`), so this
   is purely a config + asset task.

2. **App icon**

   Drop a 1024×1024 PNG into `resources/` and run
   `npx capacitor-assets generate`.

### Important — works but rough

3. **Permissions copy on iOS / Android** — generated `Info.plist` and
   `AndroidManifest.xml` need user-facing strings explaining why the
   app needs location. See steps 4 and 5 above.

4. **Code splitting** — Vite warns the main bundle is over 500 KB
   gzipped. Splitting MapLibre + maptile parsers into a separate chunk
   would speed up cold start.

5. **Layer reordering UI** — the data model has a `zIndex` field but
   no drag-to-reorder UI yet.

### Nice to have — can ship without

6. Offline region downloader UI (let users pick a polygon and download
   the matching PMTiles slice on demand)
7. Track replay and editing
8. Undo stack beyond just the last pin
9. Pin clustering when zoomed out

---

## Verifying the build yourself

Anyone with Node.js 20+ can verify:

```bash
cd fieldmap-app
npm ci
npm run verify   # → typecheck + production build, exits 0 on success
```

`npm run verify` is what CI runs on every PR.

---

## Design reference

In the repo `docs/` folder:

- `docs/design/field-navigation-app-brief-v1.docx` — full specification
- `docs/design/fieldmap-prototype.html` — clickable HTML prototype
- `docs/design/fieldmap-mobile.html` — same prototype sized for phone

Brand assets (logos, AI files) are under `docs/brand/`.

## Brand colours

```
Dark Teal (primary):  #1C4A50
Mid Teal:             #577A7A
Light Teal:           #9AAFAF
Sage:                 #C7D3D3
Grey Light:           #E4EAEA
Olive:                #AFA96E
Orange (accent):      #E87D2F
Pink:                 #E6007E
Lavender:             #9B8EC4
Light Blue:           #B8D4E3
```

## Design principles

1. **Speed** — every action in 1–2 taps
2. **One-handed use** — primary controls at the bottom, thumb-reachable
3. **Offline-first** — no internet required once data is loaded
4. **Confidence** — always show GPS accuracy

The target user is standing in a wet cave at 3am with cold fingers and
one hand free.

## Contact

- Client: John Radford — johnpradford89@gmail.com
- Company: Biologic Environmental — <https://www.biologicenv.com.au>
