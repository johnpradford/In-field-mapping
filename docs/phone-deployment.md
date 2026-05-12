# Getting Fieldmap onto your phone — PWA route

This is the simplest possible way to test Fieldmap on your phone. No
Xcode, no Android Studio, no app store, no developer needed. About 30
minutes from start to "tapping the icon on my home screen."

If anything goes wrong, write down the exact error message — that is
the single most useful thing for getting unstuck.

---

## How this works (one minute of background)

Fieldmap is now set up to publish itself as a **web app** to a website
called **GitHub Pages**. Every time you push code changes to GitHub,
GitHub automatically rebuilds the site and updates the URL. You then
open that URL in your phone's browser and tap **"Add to Home Screen"**
— this gives you a normal-looking app icon that opens Fieldmap with no
browser bar around it.

The first time you open the app on your phone, it copies itself into
the phone's storage. After that, the app loads even with no internet
— which is the whole point of a field app.

---

## Step 1 — One-time setup on GitHub (do this once, then never again)

1. Open the repo in your browser: <https://github.com/johnpradford/In-field-mapping>
2. Click the **Settings** tab (top of the page, on the right).
3. In the left sidebar, scroll down to **Pages**.
4. Under the heading **"Build and deployment"**, find the **Source**
   dropdown.
5. Change Source from **"Deploy from a branch"** to **"GitHub Actions"**.
6. That's it. No save button — the change is automatic.

You only ever do this once for this repo.

---

## Step 2 — Push the new code to GitHub

Open a Command Prompt (Windows key, type `cmd`, press Enter). Then
copy-paste each of these lines, pressing Enter after each one. Replace
the path on the first line if your folder is somewhere different.

```
cd "C:\Users\JohnRadford\Claude tools\In-field navigation app\In-field navigation app"
git add .
git commit -m "PWA support: manifest, service worker, browser-only file IO"
git push
```

If `git push` asks for a username and password, use your GitHub
username and a **personal access token** as the password (not your
real password — GitHub doesn't accept those any more). If you've
never made a token before, GitHub will walk you through it the first
time you push from a new computer.

---

## Step 3 — Watch the deploy happen

1. Go to <https://github.com/johnpradford/In-field-mapping/actions>
2. You should see a job called **"Deploy PWA to GitHub Pages"** with
   a yellow dot next to it (still running) or a green check (done).
3. Click the job name to watch it work. It takes about 2–4 minutes
   the first time. Subsequent pushes are faster.
4. When the green check appears, your site is live at:

    **<https://johnpradford.github.io/In-field-mapping/>**

---

## Step 4 — Add Fieldmap to your phone's home screen

### On iPhone (Safari)

1. Open **Safari** (not Chrome — Chrome on iPhone can't install web
   apps because Apple blocks it). Go to
   <https://johnpradford.github.io/In-field-mapping/>
2. Wait for the map to load.
3. Tap the **Share** button (square with an up-arrow, at the bottom
   of Safari).
4. Scroll down the share menu until you see **"Add to Home Screen"**.
   Tap it.
5. The next screen lets you rename the icon if you want, then tap
   **Add** at the top right.
6. The Fieldmap icon appears on your home screen. Tap it. It opens
   without a browser bar — same as any installed app.

### On Android (Chrome)

1. Open **Chrome**. Go to
   <https://johnpradford.github.io/In-field-mapping/>
2. Wait for the map to load.
3. Tap the **three dots menu** at the top right of Chrome.
4. Tap **"Install app"** (or "Add to Home screen" on older versions).
5. Confirm. The Fieldmap icon appears on your home screen.

If Chrome shows a banner at the bottom saying "Install Fieldmap?"
you can just tap **Install** there instead of going through the menu.

---

## Step 5 — Test in the field

These are the things worth checking on a real walk:

- **Drop a pin.** Tap the **Pin** button on the bottom bar. The first
  time, your phone will ask for permission to use your location — tap
  **Allow** (or **Allow While Using App**).
- **Walk away from WiFi.** Turn off WiFi on your phone, take it
  outside, and open Fieldmap from the home screen icon. It should
  still load with the last pins and tracks you made.
- **Record a track.** Tap **Record** and walk for a minute. (See the
  known limitations below — keep the screen on.)
- **Measure.** Tap **Measure**, then tap somewhere on the map. It
  should show distance from your current GPS position.

---

## Known limitations on the PWA (vs a native app)

These are fine for a smoke test. They get fixed when we ship the
proper iOS/Android builds later.

- **Track recording pauses when the screen is off.** The browser
  cannot run GPS in the background. To record a long track, keep the
  phone awake — either hold it, or set Screen Timeout to "Never" in
  your phone settings for the walk.
- **Map tiles need to be cached first.** The first time you open a
  new area on WiFi, pan around to load the tiles you'll need. Once
  they're cached, that area works offline.
- **No native file picker.** Importing GPX / KML / shapefiles still
  works — the app uses the browser's file picker, which is slightly
  less pretty than a native one but does the same job.
- **No app store icon polish.** The "F" icon I built is functional
  but plain. We'll replace it with a proper designed icon before
  any real launch.

---

## When you push more changes later

Once Step 1 (turning on GitHub Pages) is done, you never repeat it.
For every subsequent change:

```
cd "C:\Users\JohnRadford\Claude tools\In-field navigation app\In-field navigation app"
git add .
git commit -m "describe what you changed"
git push
```

Wait 2–4 minutes, then **fully close the Fieldmap app on your phone**
(swipe it away from the recent apps list) and re-open it from the
home screen. It will pick up the new version automatically.

If it seems stuck on an old version: in your phone's browser, visit
<https://johnpradford.github.io/In-field-mapping/> directly (not via
the home-screen icon), and do a hard refresh. On iPhone Safari, that's
pull-down-to-refresh while holding for a second. On Android Chrome,
tap the three-dots menu → reload.

---

## If something goes wrong

- **The GitHub Actions job is red, not green.** Click into it to see
  which step failed. The error message at the bottom is usually
  self-explanatory ("module not found", "permission denied", etc).
  Paste it back to me.
- **The URL shows a blank page.** Open your phone browser's developer
  console (on iPhone you need to enable Web Inspector in Settings →
  Safari → Advanced; on Android Chrome you can plug into a laptop).
  The first red error in the console tells you what's broken.
- **The map loads but the GPS dot never appears.** Check that
  location permission is granted: iOS Settings → Safari → Location;
  Android Settings → Apps → Chrome → Permissions → Location.
