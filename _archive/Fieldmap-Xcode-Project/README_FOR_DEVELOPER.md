# Fieldmap — iOS App Project

## What is this?

This is a field navigation app for **Biologic Environmental** (biologicenv.com.au), designed for ecologists working in remote environments (caves, gorges, water systems) in Western Australia.

The app is an offline-capable map and spatial capture tool. Think "Map Plus" but faster, simpler, and designed for one-handed use in the dark.

## What's included in this folder

```
Fieldmap-Xcode-Project/
├── Fieldmap/
│   ├── FieldmapApp.swift          — App entry point
│   ├── AppState.swift             — Central state management (pins, tracks, tools, navigation)
│   ├── ContentView.swift          — Screen router
│   ├── Views/
│   │   ├── MapScreenView.swift    — Main map screen (where users spend 90% of time)
│   │   ├── MapLibreView.swift     — MapLibre wrapper (PLACEHOLDER — see below)
│   │   ├── BottomBarView.swift    — Bottom toolbar (Pin, Record, Measure, More)
│   │   ├── MoreMenuView.swift     — Slide-up menu
│   │   ├── ProjectsView.swift     — Project list
│   │   ├── ProjectDetailView.swift— Layers within a project
│   │   ├── LayersView.swift       — All layers with toggles
│   │   ├── LayerDetailView.swift  — Layer styling editor
│   │   ├── ImportView.swift       — File import with document picker
│   │   ├── ExportView.swift       — Export via share sheet
│   │   └── SettingsView.swift     — App settings
│   ├── Components/
│   │   ├── MapComponents.swift    — North arrow, scale bar, legend, toasts, banners
│   │   ├── PinInfoPanelView.swift — Pin detail panel (slides up from bottom)
│   │   └── SharedComponents.swift — Screen header, section labels
│   ├── Models/
│   │   ├── Pin.swift              — Dropped pin with coordinates, accuracy, note
│   │   ├── Track.swift            — Recorded GPS track (array of TrackPoints)
│   │   ├── Layer.swift            — Imported spatial layer (polygon/line/point)
│   │   ├── Project.swift          — Container for layers
│   │   └── FieldmapFile.swift     — .fieldmap export format
│   ├── Services/
│   │   ├── LocationManager.swift  — GPS tracking, background recording, accuracy
│   │   ├── DatabaseManager.swift  — SQLite storage for all persistent data
│   │   ├── FileImportService.swift— Import GeoJSON, GPX, KML, Shapefile
│   │   └── FileExportService.swift— Export as GeoJSON, GPX, .fieldmap
│   ├── Assets.xcassets/           — App icon placeholder, accent colour
│   ├── Info.plist                 — Permissions, background modes, file types
│   └── Fieldmap.entitlements
├── Package.swift                  — MapLibre dependency definition
└── This README
```

## How to get this running

### Step 1: Create a fresh Xcode project

1. Open Xcode
2. File → New → Project → iOS → App
3. Product Name: `Fieldmap`
4. Team: (your Apple Developer account)
5. Organization Identifier: `com.biologicenv`
6. Interface: **SwiftUI**
7. Language: **Swift**
8. Minimum deployment: **iOS 16.0**

### Step 2: Copy source files in

1. Delete the auto-generated ContentView.swift and FieldmapApp.swift from the new project
2. Drag the entire `Fieldmap/` folder contents from this package into your Xcode project
3. Make sure "Copy items if needed" is checked and "Create groups" is selected

### Step 3: Add MapLibre dependency

1. File → Add Package Dependencies
2. Paste: `https://github.com/maplibre/maplibre-gl-native-distribution.git`
3. Version: 6.0.0 or later
4. Add to target: Fieldmap

### Step 4: Configure the project

1. Copy the `Info.plist` contents into your project's Info tab (or replace the file)
2. Under Signing & Capabilities:
   - Add "Background Modes" → tick "Location updates"
   - Ensure signing is set up with your dev team
3. Set deployment target to iOS 16.0
4. Set supported orientations to Portrait only

### Step 5: Build and run

1. Connect an iPhone or select a simulator
2. Build (⌘B) — fix any errors (see Known Issues below)
3. Run (⌘R) to test on device

## What needs developer attention

### Critical (won't work without this):

1. **MapLibre integration** (`MapLibreView.swift`)
   - The current file is a placeholder with a grey background
   - Replace the `MapLibreMapView` class with a real `MLNMapView`
   - Wire up: tile source, GeoJSON layer rendering, pin annotations, user location dot
   - Set up offline tile downloading for a chosen region
   - Decide on tile source (OpenFreeMap, Protomaps, or Esri satellite)

2. **File import parsing** (`FileImportService.swift`)
   - GeoJSON import works (basic)
   - GPX and KML need proper XMLParser implementation (currently return empty FeatureCollections)
   - Shapefile parsing needs a library (e.g., SwiftShapefileReader or GDAL bridge)

### Important (works but needs polish):

3. **App icon** — needs a 1024×1024 PNG in `Assets.xcassets/AppIcon.appiconset/`
4. **Measure tool coordinate conversion** — currently uses screen points; needs to convert to real lat/lon via MapLibre
5. **Autosave** — the database save should happen on a timer (every 30s) during track recording
6. **Settings screen** — values are currently static text; wire them to UserDefaults or the settings table

### Nice to have (can ship without):

7. Offline region download UI
8. Pin notes editing screen
9. Undo/redo stack beyond just the last pin
10. Layer reordering (drag to change draw order)

## Design reference

Also included in the parent folder:
- `Field_Navigation_App_Brief_v1.docx` — Full design specification
- `Fieldmap_Prototype.html` — Interactive clickable prototype (open in a browser)
- Brand assets (logos, colour palette)

## Branding / Colours

```
Dark Teal (primary):  #1C4A50
Mid Teal:             #577A7A
Light Teal:           #9AAFAF
Sage:                 #C7D3D3
Grey Light:           #E4EAEA
Olive:                #AFA96E
Orange:               #E87D2F
Pink:                 #E6007E
Lavender:             #9B8EC4
Light Blue:           #B8D4E3
```

## Key design principles

1. **Speed** — every action should be achievable in 1-2 taps
2. **One-handed use** — primary controls at the bottom, thumb-reachable
3. **Offline-first** — everything works without internet once data is loaded
4. **Confidence** — always show GPS accuracy, give clear feedback

The target user is standing in a wet cave at 3am with cold fingers and one hand free.

## Contact

Client: John Radford — johnpradford89@gmail.com
Company: Biologic Environmental — www.biologicenv.com.au
