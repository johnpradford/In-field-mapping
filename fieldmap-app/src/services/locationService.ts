import { Geolocation, type Position } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
import type {
  BackgroundGeolocationPlugin,
  Location as BgLocation,
  CallbackError,
} from '@capacitor-community/background-geolocation';
import type { TrackPoint } from '@/models/Track';

/**
 * Wraps the Capacitor Geolocation plugins so the rest of the app
 * doesn't need to know about Capacitor's APIs.
 *
 * Equivalent to LocationManager.swift from the Swift version.
 *
 * - For one-off fixes (drop a pin) and live cursor tracking on the
 *   map screen we use the standard `@capacitor/geolocation`.
 * - For *track recording* we switch to
 *   `@capacitor-community/background-geolocation` so points keep
 *   coming in even when the screen locks. Field workers leave the
 *   phone in a chest pocket — the recording must survive that.
 *
 * Both plugins fall back to the browser's Geolocation API when the
 * code runs in a regular browser (during dev), so the same calls
 * work with no special-casing.
 */

/** The community plugin only ships type definitions — register the
 *  runtime here exactly as the plugin's README recommends. */
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  'BackgroundGeolocation',
);

export interface Location {
  coordinate: [number, number]; // [lng, lat]
  altitude?: number;
  accuracy: number;
  speed?: number;
  timestamp: string;
}

let foregroundWatchId: string | null = null;
let backgroundWatcherId: string | null = null;

/** Ask the user for permission. Call this once at app startup. */
export async function requestLocationPermissions() {
  const result = await Geolocation.requestPermissions({
    permissions: ['location', 'coarseLocation'],
  });
  return result;
}

/** Get a single GPS fix — used for dropping pins. */
export async function getCurrentLocation(): Promise<Location> {
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
  return positionToLocation(pos);
}

/** Start receiving location updates while the app is in the foreground —
 *  used for the GPS dot on the map. Stops when the screen locks. */
export async function startForegroundWatch(
  onLocation: (loc: Location) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  if (foregroundWatchId) await stopForegroundWatch();
  foregroundWatchId = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 10000 },
    (pos, err) => {
      if (err) {
        onError?.(err as unknown as Error);
        return;
      }
      if (pos) onLocation(positionToLocation(pos));
    },
  );
}

export async function stopForegroundWatch(): Promise<void> {
  if (foregroundWatchId) {
    await Geolocation.clearWatch({ id: foregroundWatchId });
    foregroundWatchId = null;
  }
}

/**
 * Start a *background-capable* GPS watch — points keep coming in
 * when the screen is off. Use this for track recording.
 *
 * Requires these platform settings (configured by the developer in
 * the iOS/Android shells, see README "Background recording"):
 *   - iOS  Info.plist: NSLocationAlwaysAndWhenInUseUsageDescription
 *          + UIBackgroundModes location entry
 *   - Android Manifest: ACCESS_BACKGROUND_LOCATION permission
 */
export async function startBackgroundWatch(
  onLocation: (loc: Location) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  if (backgroundWatcherId) await stopBackgroundWatch();
  backgroundWatcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundMessage:
        'Fieldmap is recording your track. Tap to return to the app.',
      backgroundTitle: 'Recording in progress',
      requestPermissions: true,
      stale: false,
      distanceFilter: 2, // metres — only emit when moved ≥ 2m, saves battery
    },
    (loc?: BgLocation, err?: CallbackError) => {
      if (err) {
        onError?.(new Error(err.message ?? 'Background GPS error'));
        return;
      }
      if (!loc) return;
      onLocation({
        coordinate: [loc.longitude, loc.latitude],
        altitude: loc.altitude ?? undefined,
        accuracy: loc.accuracy,
        speed: loc.speed ?? undefined,
        timestamp: new Date(loc.time ?? Date.now()).toISOString(),
      });
    },
  );
}

export async function stopBackgroundWatch(): Promise<void> {
  if (backgroundWatcherId) {
    await BackgroundGeolocation.removeWatcher({ id: backgroundWatcherId });
    backgroundWatcherId = null;
  }
}

/** Convert a watched location into a TrackPoint for recording. */
export function locationToTrackPoint(loc: Location): TrackPoint {
  return {
    coordinate: loc.coordinate,
    altitude: loc.altitude,
    accuracy: loc.accuracy,
    timestamp: loc.timestamp,
    speed: loc.speed,
  };
}

function positionToLocation(pos: Position): Location {
  return {
    coordinate: [pos.coords.longitude, pos.coords.latitude],
    altitude: pos.coords.altitude ?? undefined,
    accuracy: pos.coords.accuracy,
    speed: pos.coords.speed ?? undefined,
    timestamp: new Date(pos.timestamp).toISOString(),
  };
}
