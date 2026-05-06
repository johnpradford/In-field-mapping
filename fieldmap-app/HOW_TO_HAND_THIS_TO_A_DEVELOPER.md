# How to hand this off to a developer (plain language)

You don't need to read any code to do this. Follow these steps when
you're ready to bring a developer in.

## What to send them

Just send them the whole `fieldmap-app/` folder. Optionally also send:

- `../Field_Navigation_App_Brief_v1.docx` (your design brief)
- `../Fieldmap_Prototype.html` (the clickable mockup)
- `../Biologic Master Logo 2025.png` and the brand AI files

If you've put the project on GitHub, just give them the repo link.

## What to tell them

> "This is a Capacitor + React + TypeScript app — fresh start, scaffolded.
> Read `fieldmap-app/README.md` first; it lists what's done and what's
> still missing. The brief in the parent folder is the source of truth
> for behaviour."

That's it. The README inside `fieldmap-app/` answers the technical
questions for them.

## Rough cost / time guide

The Capacitor version should be **a bit faster** to finish than the
Swift version because the same code runs on iOS and Android. Earlier
estimate for the Swift version was 11–14 weeks of one developer's time.
For the Capacitor version, expect:

- 6–8 weeks to get to a polished iOS-only build
- +1–2 weeks more for Android polish
- Less if your developer has done Capacitor / Ionic before

## Key questions a developer will ask you

You don't need to answer these now, but be ready:

1. **Which base map source for offline use?** (Protomaps PMTiles,
   self-hosted, OpenFreeMap, etc.)
2. **Minimum iOS / Android version?** Newer = simpler code, but cuts
   off older phones.
3. **File size cap on imports?** (Big shapefiles can crash the
   webview if uncapped.)
4. **Do you want Apple/Google developer accounts set up under
   Biologic, or under your name?** They're $99 USD/yr for Apple, $25
   one-off for Google.

## What you (John) can do without a developer

- Look at the running app in a web browser. Anyone with Node installed
  can run `npm install && npm run dev` and click around — even if the
  GPS only works approximately in a browser.
- Tweak text, colours, and screen layouts in the `.tsx` files. They're
  more readable than the equivalent Swift would be.
- Edit the brand colours in `tailwind.config.js` and `src/theme.ts`.

## What only a developer can do

- Anything in the "What still needs developer attention" list of the
  README — those need someone who can debug native builds on Mac and
  in Android Studio.
- Submit to the App Store / Play Store.
