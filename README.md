# In-field-mapping

Monorepo for **Fieldmap** — an offline field-navigation app for
[Biologic Environmental](https://www.biologicenv.com.au).
Designed for ecologists working offline in remote environments in
Western Australia (caves, gorges, water systems).

The repo contains a single application package
([`fieldmap-app/`](fieldmap-app)) built with Capacitor, React, and
TypeScript, plus design/handoff documentation under [`docs/`](docs).

## Where things live

```text
.
├── fieldmap-app/           # the actual app (Capacitor + React + TypeScript)
├── docs/
│   ├── phone-deployment.md       # ship to a phone via the PWA route
│   ├── handoff-non-developer.md  # plain-language handoff guide
│   ├── design/                   # spec doc + clickable HTML prototypes
│   └── brand/                    # logos, brand AI files, palette assets
├── .github/workflows/      # CI (GitHub Pages deploy + PR checks)
├── CONTRIBUTING.md         # how to develop, verify, and contribute
└── README.md               # this file
```

## Quick start (developers)

```bash
cd fieldmap-app
npm install
npm run dev
```

Then open <http://localhost:5173>. Full developer instructions
(including iOS / Android native builds) live in
[`fieldmap-app/README.md`](fieldmap-app/README.md).

## Quick start (non-developers)

If you just want to try the app on your phone without installing any
developer tools, follow [`docs/phone-deployment.md`](docs/phone-deployment.md).

If you are about to hand the project to a developer, read
[`docs/handoff-non-developer.md`](docs/handoff-non-developer.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for canonical install / verify
commands and folder conventions.

## Contact

- Client: John Radford — johnpradford89@gmail.com
- Company: Biologic Environmental — <https://www.biologicenv.com.au>
