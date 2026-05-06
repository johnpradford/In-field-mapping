# Fieldmap — Capacitor + React project

Field navigation app for **Biologic Environmental** (biologicenv.com.au).
Designed for ecologists working offline in remote environments — caves,
gorges, water systems — in Western Australia.

This codebase is a **fresh start** in [Capacitor](https://capacitorjs.com)
+ React + TypeScript. It replaces an earlier SwiftUI-only iOS prototype,
which is preserved at `../_archive/Fieldmap-Xcode-Project/` for reference.

The big win of moving to Capacitor: the same codebase runs on **iOS and
Android** (and even in a regular browser for development), and most
day-to-day work is done in plain web tech that any React developer can
edit on Windows without touching a Mac until it's time to build for the
App Store.

---

## What's in this folder

```
fieldmap-app/
├── package.json              — npm dependencies and scripts
├── vite.config.ts            — bundler config
├── tsconfig.json             — TypeScript config
├── tailwind.config.js        — colours / fonts (brand palette baked in)
├── capacitor.config.ts       — app id, name, native settings
├── index.html                — single HTML page (loaded by the webview)
├── src/
│   ├── main.tsx              — app entry
│   ├── App.tsx               — screen router (mirrors ContentView.swift)
│   ├── index.css             — global styles + MapLibre CSS
│   ├── theme.ts              — colour constants + map defaults
│   ├── store/
│   │   └── appStore.ts       — central app state (mirrors AppState.swift)
│   ├── models/               — TypeScript types for Pin/Track/Layer/Project/FieldmapFile
│   ├── services/
│   │   ├── locationService.ts    — GPS via Capacitor Geolocation
│   │   ├── databaseService.ts    — local DB via Dexie/IndexedDB
│   │   ├── fileImportService.ts  — GeoJSON / GPX / KML / Shapefile parsing
│   │   └── fileExportService.ts  — .fieldmap / GeoJSON / GPX export
│   ├── screens/              — one file per screen (Map, Projects, Layers, Import, Export, Settings…)
│   └── components/           — MapLibreMap, BottomBar, Toast, MoreMenu, etc.
└── README.md                 — this file
```

The folder structure was deliberately mirrored on the old SwiftUI project
so a Swift developer can see the equivalent file at a glance.

---

## How to get this running (for a developer)

You need **Node.js 20 or newer** installed. Anything else gets installed
by `npm install`.

### 1. Install dependencies

```bash
cd fieldmap-app
npm install
```

### 2. Run in a browser (fastest dev loop)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome. The map
works, pins drop using the browser's geolocation, and most flows are
testable. **File picker, share sheet, and background GPS** require a real
device — see step 4.

### 3. Add the native iOS and Android shells

This is a one-time setup:

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
- Build and run on a connected iPhone

### 5. Build for Android

```bash
npm run cap:android
# → builds the web app, copies it into android/, and opens Android Studio
```

In Android Studio: just click Run on a connected phone or emulator.

### 6. After every code change

```bash
npm run cap:sync
```

…copies the new web build into the iOS and Android projects. (Or use the
live-reload mode below for faster iteration.)

### Live reload on a real device (optional)

Add this to `capacitor.config.ts` while developing, then `npx cap sync`:

```ts
server: {
  url: 'http://YOUR-LAPTOP-IP:5173',
  cleartext: true,
}
```

Now the phone app loads from the Vite dev server on your laptop —
file changes appear within a second.

---

## What's done in this codebase

- App shell, screen routing, navigation back-stack
- Brand palette (Tailwind + theme.ts)
- All ten screens scaffolded with working UI
- MapLibre GL JS map with: basemap, GPS dot, pin rendering with
  numbered labels, imported layers (point/line/polygon)
- Pin drop using a real GPS fix (sequential numbering, undo toast)
- Track recording skeleton — start/stop, points are appended, distance
  is computed, track is saved when stopped
- Measure tool — tap-to-add points, line drawn on the map
- Import GeoJSON / GPX / KML / Shapefile (.zip)
- Export as .fieldmap / GeoJSON / GPX, opens native share sheet
- Local database (Dexie / IndexedDB) for pins, tracks, layers, projects
- Settings screen with persistent prefs (Capacitor Preferences plugin)

---

## What still needs developer attention

### Critical — won't ship without this

1. **Offline base map tiles**

   The app currently uses MapLibre's public demo style URL
   (`demotiles.maplibre.org`) which **needs internet**. For the field
   use case this must change. Two solid options:

   - **Protomaps PMTiles** — single `.pmtiles` file bundled with the
     app or downloaded into the device. MapLibre supports it natively.
     <https://protomaps.com>
   - **Self-hosted MBTiles** served from a small server that the app
     can sync from over wifi.

   Edit `DEFAULT_MAP_STYLE_URL` in `src/theme.ts` once chosen.

2. **Background GPS recording**

   `@capacitor-community/background-geolocation` is in the
   dependencies but **not yet wired into the recording flow**. The
   current `locationService.ts` uses the standard plugin which stops
   when the screen locks. To support real field recording:

   - Replace the watch in `MapScreen.tsx` with the background plugin's
     `BackgroundGeolocation.addWatcher`
   - Add the `NSLocationAlwaysAndWhenInUseUsageDescription` key in iOS
     and the `ACCESS_BACKGROUND_LOCATION` permission in Android

3. **App icon**

   No icon set yet. Drop a 1024×1024 PNG into Capacitor's
   `resources/` folder and run `npx capacitor-assets generate`.

### Important — works but rough

4. **Autosave** — pins/tracks/layers update the in-memory store but
   only some flows persist to the database. Wrap the store in a
   subscription that calls `saveX` on every change.

5. **Compass-aware north arrow** — `NorthArrow.tsx` accepts a
   bearing prop but it's not yet hooked up to MapLibre's bearing
   change event.

6. **Pin notes editing** — `PinInfoPanel` shows the note but doesn't
   let the user edit it yet.

7. **Permissions copy** — iOS `Info.plist` and Android `AndroidManifest.xml`
   need user-facing strings explaining why the app needs location.
   These live in the generated `ios/` and `android/` folders after
   step 3 above.

### Nice to have — can ship without

8. Offline region downloader UI for tiles
9. Track replay and editing
10. Layer reordering (drag to change draw order)
11. Undo stack beyond just the last pin

---

## Design reference

In the parent folder:

- `Field_Navigation_App_Brief_v1.docx` — full specification
- `Fieldmap_Prototype.html` — clickable HTML prototype
- `Fieldmap_Mobile.html` — same prototype sized for phone

Brand assets (logos, AI files) are also in the parent folder.

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
