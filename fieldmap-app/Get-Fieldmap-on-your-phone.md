# Getting Fieldmap onto your phone — first time

This walks you from "code on a laptop" to "app on your phone". It covers Android first (which works on your Windows PC) and iPhone after (which needs access to a Mac).

If anything goes wrong, write down the exact error message — that's the single most useful thing for getting unstuck.

---

## Bit of background you need to know

Your project has TWO sides:

1. **The web side** — the React/TypeScript code in `fieldmap-app/src/`. This is what runs the app's logic.
2. **The native shells** — small wrappers (one per phone OS) that Capacitor generates. They take the web side and run it as a real Android or iPhone app. These haven't been generated yet.

Building once means: build the web side → tell Capacitor to copy it into the native shell → open the native shell in Android Studio (or Xcode) → click "Run".

---

# Part 1 — Android (Windows, your PC)

## One-time setup (about 30–45 minutes)

### 1. Install Android Studio

1. Go to [developer.android.com/studio](https://developer.android.com/studio)
2. Click "Download Android Studio"
3. Accept the licence, run the installer with all defaults
4. Open Android Studio. The "Welcome" wizard appears.
5. Click "More Actions" → "SDK Manager"
6. On the "SDK Platforms" tab, tick the latest Android version (e.g. "Android 14") then click Apply. Wait for it to download.
7. On the "SDK Tools" tab, make sure "Android SDK Build-Tools", "Android SDK Platform-Tools" and "Android Emulator" are ticked. Click Apply if anything was missing.

You can close Android Studio after this.

### 2. Tell Windows where the Android SDK lives

Android Studio installed the SDK at something like:
`C:\Users\JohnRadford\AppData\Local\Android\Sdk`

(Open Android Studio → SDK Manager and look at "Android SDK Location" at the top to confirm.)

You need to set two environment variables:

1. Press the Windows key, type "environment variables", click "Edit the system environment variables".
2. Click "Environment Variables…" at the bottom.
3. Under "User variables", click "New…":
   - Variable name: `ANDROID_HOME`
   - Variable value: paste your SDK path (e.g. `C:\Users\JohnRadford\AppData\Local\Android\Sdk`)
4. Click "New…" again:
   - Variable name: `ANDROID_SDK_ROOT`
   - Variable value: same SDK path
5. Find `Path` in the list, click "Edit…", click "New", and add:
   `%ANDROID_HOME%\platform-tools`
6. Click OK on all the dialogs.
7. **Close any open terminals.** Environment variables only show up in newly-opened ones.

### 3. Install Java (JDK 21)

Android needs a specific Java version.

1. Go to [adoptium.net](https://adoptium.net/temurin/releases/?version=21)
2. Pick "JDK 21" → Windows x64 → ".msi" installer
3. Run it, **tick "Set JAVA_HOME variable"** during the install.
4. Close any open terminals.

### 4. Get your phone ready for development

On the phone:

1. Open Settings → About phone
2. Tap "Build number" seven times. A toast will appear saying "You are now a developer".
3. Go back to Settings → System → Developer options
4. Turn on "USB debugging".
5. Plug the phone into the PC with a USB cable.
6. The phone shows a "Allow USB debugging?" prompt — tick "Always allow from this computer" and tap Allow.

To check the PC sees the phone, open a terminal and run:

```
adb devices
```

You should see one device listed, e.g. `R5CXXXXXXXX  device`. If you see "unauthorized", unplug and re-plug to re-trigger the prompt on the phone.

## Build and run Fieldmap on your phone

You only need to do these steps from the project folder. Open a terminal there:

1. Press the Windows key, type "cmd", open Command Prompt.
2. Navigate into the project:

```
cd "C:\Users\JohnRadford\Claude tools\In-field navigation app\In-field navigation app\fieldmap-app"
```

### First-time only — generate the Android shell

```
npm install
npm run build
npx cap add android
```

`npx cap add android` creates a new folder called `android/` inside `fieldmap-app/`. That's the native Android project.

### Every time after — the build/sync/run cycle

```
npm run build
npx cap sync android
npx cap open android
```

What each command does, in plain language:

- `npm run build` packages the web code for production.
- `npx cap sync android` copies that packaged web code into the Android shell.
- `npx cap open android` opens the Android shell in Android Studio.

### In Android Studio

1. Wait for the bottom-status-bar to stop saying "Indexing" or "Gradle sync". This can take 5+ minutes the very first time, less afterwards.
2. At the top of the window, find the device dropdown — your plugged-in phone should appear by name.
3. Click the green "Run" triangle (or press Shift+F10).
4. The first run takes a few minutes while it compiles and installs. Subsequent runs are quicker.
5. Fieldmap launches on your phone.

If you see "Pixel 5 API 34" or similar instead of your phone, your USB connection isn't being seen. Re-plug, reaccept the trust prompt, and run `adb devices` from a terminal to confirm.

### Permissions (do this once)

The first time the app runs on your phone, Android prompts for location permission. Tap "Allow only while using the app" or "Allow all the time" — Fieldmap needs the second option for background track recording.

If permissions don't prompt, that means the manifest is missing entries. Open this file in Android Studio:

```
fieldmap-app\android\app\src\main\AndroidManifest.xml
```

Inside `<manifest>`, add the lines below if they're not there (between the `<uses-permission ...>` block):

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

Save, then rebuild from Android Studio.

---

# Part 2 — iPhone (needs a Mac)

You **cannot build for iPhone from a Windows PC**. Apple requires their own tool, Xcode, which only runs on macOS. Three ways to get past this:

1. **Borrow / share a Mac** for build sessions. The code lives in your repo, so any Mac with the project checked out can build it.
2. **Buy a Mac mini** — the cheapest current option is around AUD$1,200 and works fine for this size of app.
3. **Rent a cloud Mac** — services like MacInCloud, MacStadium, or Codemagic let you remote-desktop into a Mac for $20–60/month. Slower workflow but works.

If you have access to a Mac, here's the iPhone process. The web-side build steps are identical — Capacitor handles both platforms from the same project.

## One-time setup (on the Mac)

### 1. Install Xcode

1. Open the App Store on the Mac.
2. Search "Xcode", install it (it's about 12 GB so allow time).
3. Open Xcode once. It'll ask to install command-line tools — let it.
4. Sign in with your Apple ID (Xcode menu → Settings → Accounts → "+"). A free Apple ID is fine for installing on your own phone — only paid accounts can publish to the App Store.

### 2. Get your iPhone ready

1. Plug iPhone into the Mac with a USB cable.
2. On the iPhone, tap "Trust this computer" when prompted.
3. On iPhone: Settings → Privacy & Security → Developer Mode → On. The phone restarts.

## Build and run Fieldmap on iPhone

Open a terminal on the Mac, navigate to the project (path will be different on the Mac of course), then:

### First-time only

```
npm install
npm run build
npx cap add ios
```

This creates a new `ios/` folder inside `fieldmap-app/`.

### Every time

```
npm run build
npx cap sync ios
npx cap open ios
```

Xcode opens with the project loaded.

### In Xcode

1. In the top-left, click the device-target dropdown and pick your iPhone (it appears once plugged in and trusted).
2. Click the project name in the left sidebar → "Signing & Capabilities" tab.
3. Under "Team", pick your Apple ID. (If "Personal Team" is the only option, that's fine for installing to your own phone.)
4. Click the play button (top-left).
5. The first build takes a few minutes.

The first time the app runs you'll get an error on the phone like "Untrusted Developer". On the iPhone:

1. Settings → General → VPN & Device Management
2. Tap your Apple ID under "Developer App"
3. Tap "Trust [your Apple ID]"
4. Re-launch Fieldmap from the home screen.

### Permissions (do this once)

Open this file in Xcode:

```
fieldmap-app/ios/App/App/Info.plist
```

Add these keys if missing (the values are the prompts shown to the user — keep them honest and short):

- `NSLocationWhenInUseUsageDescription` → "Fieldmap uses your location to drop pins and show where you are on the map."
- `NSLocationAlwaysAndWhenInUseUsageDescription` → "Fieldmap records GPS tracks while you walk, even when the screen is off."
- `UIBackgroundModes` → array containing `location`

Save, run again.

---

# Glossary — what these things actually are

- **Terminal / Command Prompt**: a text window where you type commands. On Windows, search "cmd" in the start menu.
- **`cd`**: changes which folder the terminal is "in".
- **`npm`**: the tool that manages JavaScript packages. Came with Node.js.
- **`npx cap`**: the Capacitor command-line tool. Translates between the web side and the native shells.
- **SDK**: a "Software Development Kit" — the libraries the phone OS provides for apps to use.
- **APK / IPA**: file formats. APK is what gets installed on Android; IPA is the iPhone equivalent.
- **Manifest / Info.plist**: the app's "front door". Lists what permissions it needs and how it identifies itself.
- **Signing**: a security check Apple/Google does. Both require apps to be "signed" with your developer identity before they'll run.

---

# When something breaks

- **`adb devices` shows nothing on Android.** Re-plug the cable, watch the phone's screen for the "Allow USB debugging?" prompt, accept it.
- **Gradle sync fails in Android Studio.** Almost always means JDK version is wrong — check `JAVA_HOME` points at JDK 21.
- **"Code 1" or "Code 35" build errors.** Try `npx cap sync` again, then clean: in Android Studio, Build menu → Clean Project, then Build → Rebuild Project.
- **App opens but shows a blank screen.** The web build didn't make it across. Run `npm run build` then `npx cap sync` again.
- **"Could not connect to development server".** That's the live-reload mode — for a packaged build you don't want this. Make sure `capacitor.config.ts` doesn't have a `server.url` set, then sync again.
- **Anything else.** Note the EXACT error message text and look it up — for Capacitor specifically, [capacitorjs.com/docs](https://capacitorjs.com/docs) is the official source.

---

# What to do first

If you have a Mac available, do iPhone first since that's the primary target. If you only have the Windows PC, do Android first — the workflow is the same once you're set up, and confidence with one platform makes the other one trivial.

For Android, the first session is "install Android Studio + JDK 21 + run `npx cap add android`". Don't worry if it takes an afternoon — most of that time is downloads.
