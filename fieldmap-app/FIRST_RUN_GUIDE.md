# How to run Fieldmap on your computer (plain-language guide)

This is for you, John. No coding experience needed — just follow each
step in order. Total time the first time: about 5 minutes. After that,
launching the app is a single double-click.

## Step 1 — Install Node.js (one-time)

Node.js is a free background tool that lets the app run on your
computer. If you don't already have it:

1. Open <https://nodejs.org> in your browser.
2. You'll see two big green download buttons. Click the one labelled
   **LTS** ("Long-Term Support") — *not* the "Current" one.
3. The installer file (`node-v##.##.##-x64.msi`) will download. Run it
   when it's finished.
4. Accept every default. Just keep clicking **Next** → **Install** →
   **Finish**.
5. To check it worked: press **Windows key + R**, type `cmd`, press
   Enter. A black window opens. Type `node --version` and press Enter.
   You should see something like `v20.18.0`. Close the black window.

## Step 2 — Run the setup script (one-time)

1. In **File Explorer**, navigate to:
   `C:\Users\JohnRadford\Claude tools\In-field navigation app\In-field navigation app\fieldmap-app`
2. Find the file called `Setup-Fieldmap.bat` and **double-click it**.
3. A black window opens and you'll see lines of text scrolling. This is
   normal — it's downloading the libraries Fieldmap needs.
4. **Wait until you see "Setup complete."** Takes 1–2 minutes the first
   time, depending on your internet speed.
5. Press any key to close the window.

If something goes wrong, the error message in the black window is your
friend — copy it, paste it to me, and I'll figure it out.

## Step 3 — Start the app

1. In the same folder, **double-click `Start-Fieldmap.bat`**.
2. A black window opens. After about 4 seconds, **a browser tab will
   open automatically** at `http://localhost:5173`. That's Fieldmap.
3. Leave the black window open — that's the app's "engine." Closing it
   stops the app.

## What you'll actually see

- The map loads centred on Newman, WA. (Internet required for the demo
  basemap until we wire in a real Pilbara PMTiles file.)
- Bottom bar: **Pin · Record · Measure · More**.
- Tap **Pin** to drop a numbered pin at your laptop's approximate
  location. (Your laptop's "GPS" is just an IP-based guess in a
  browser, so the location won't be accurate — but it'll work to test
  the flow.)
- Tap **More** to get to Projects, Layers, Import, Export, Settings.
- Tap **Record** to start a fake track recording, then again to stop.
- Tap on the pin number to open its info panel — try editing the note.

The browser shows the *exact same code* that will run on iPhones and
Androids. The only differences in the real mobile build:

- Real GPS instead of laptop-IP guessing
- The native Files share sheet for export
- Background recording when the screen is off

## To stop the app

Close the black window, or press **Ctrl + C** inside it.

## To restart after stopping

Double-click `Start-Fieldmap.bat` again. (You only need to run
Setup-Fieldmap once, ever — unless I change the dependencies.)

## Troubleshooting

**"Node.js is not installed yet"** — go back to Step 1.

**Browser opens but says "This site can't be reached"** — the engine
needs another second or two to warm up. Refresh the page after 5 seconds.

**The map area is grey / no roads showing** — that's the demo basemap
not loading (network or quota issue). The pins, GPS, recording, and
file flows all still work; the basemap will be replaced with a real
Pilbara file by your developer.

**The black window says something in red** — copy the red text and
paste it to me, I'll diagnose it.

**"Permission denied" or virus warning when double-clicking** — Windows
Defender sometimes flags `.bat` files. Right-click the file →
Properties → tick **Unblock** at the bottom → OK. Then try again.

## What this gives you

This is the *exact* same app that will eventually be packaged into
iPhone/Android binaries. You can use it to:

- Show the app to colleagues without sending them anything
- Click through every screen and try every flow
- Hand the URL on your wifi (your-laptop-ip:5173) to a colleague's
  phone for them to test on a real device
- Make small text changes (in the `.tsx` files) and see them appear in
  the browser within a second

When a developer takes over, this is also the loop they'll use 90% of
the time, only switching to Xcode / Android Studio when it's time to
build for the App Store.
