import type { TrackPoint } from '@/models/Track';

/**
 * Browser-based location service. Uses the standard W3C
 * `navigator.geolocation` API directly.
 *
 * Why this is the PWA path (not Capacitor):
 *   For the PWA smoke test we want the app to work in any browser with
 *   zero native shell. The Capacitor plugins can be added back later for
 *   native iOS/Android builds — see _archive/ and `capacitor.config.ts`.
 *
 * Limitations of the browser-only path (acceptable for a smoke test):
 *   - "Background" GPS doesn't really exist on the web. iOS Safari and
 *     Android Chrome will pause `watchPosition` updates when the screen
 *     is locked or the tab is backgrounded. Track recording therefore
 *     only collects points while the screen is on. When we add the
 *     native shells back, `@capacitor-community/background-geolocation`
 *     restores true background recording.
 *   - The user must grant the browser's "Allow location" prompt the
 *     first time they tap Pin or Record. This is one extra tap vs. a
 *     native app, but works on every modern browser.
 */

export interface Location {
  coordinate: [number, number]; // [lng, lat]
  altitude?: number;
  accuracy: number;
  speed?: number;
  timestamp: string;
}

let foregroundWatchId: number | null = null;
let backgroundWatcherId: number | null = null;

/** Ask the browser for permission. There's no explicit "request" API on
 *  the web — permission is requested implicitly on the first call. We
 *  still call this at startup so that, if permission has already been
 *  granted previously, we begin warming up the GPS receiver. */
export async function requestLocationPermissions(): Promise<{ location: PermissionState | 'unsupported' }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { location: 'unsupported' };
  }
  // The Permissions API is supported on most modern browsers — Safari has
  // historically been spotty here, so guard it.
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return { location: status.state };
    }
  } catch (_err) {
    // ignore — we'll request implicitly on the first getCurrentPosition call
  }
  return { location: 'prompt' };
}

/** Get a single GPS fix — used for dropping pins. */
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(positionToLocation(pos)),
      (err) => reject(geolocationErrorToError(err)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

/** Start receiving location updates while the app is in the foreground —
 *  used for the GPS dot on the map. Stops when the screen locks. */
export async function startForegroundWatch(
  onLocation: (loc: Location) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  if (foregroundWatchId !== null) await stopForegroundWatch();
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation is not supported in this browser.'));
    return;
  }
  foregroundWatchId = navigator.geolocation.watchPosition(
    (pos) => onLocation(positionToLocation(pos)),
    (err) => onError?.(geolocationErrorToError(err)),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

export async function stopForegroundWatch(): Promise<void> {
  if (foregroundWatchId !== null) {
    navigator.geolocation.clearWatch(foregroundWatchId);
    foregroundWatchId = null;
  }
}

/**
 * Start a GPS watch for track recording.
 *
 * IMPORTANT (web-only limitation): on the PWA there is no true background
 * GPS. The watch will be throttled or paused by the browser when the
 * screen is locked or the tab is in the background. Keep the screen on
 * while recording until we ship native iOS/Android shells.
 */
export async function startBackgroundWatch(
  onLocation: (loc: Location) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  if (backgroundWatcherId !== null) await stopBackgroundWatch();
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation is not supported in this browser.'));
    return;
  }
  backgroundWatcherId = navigator.geolocation.watchPosition(
    (pos) => onLocation(positionToLocation(pos)),
    (err) => onError?.(geolocationErrorToError(err)),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

export async function stopBackgroundWatch(): Promise<void> {
  if (backgroundWatcherId !== null) {
    navigator.geolocation.clearWatch(backgroundWatcherId);
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

function positionToLocation(pos: GeolocationPosition): Location {
  return {
    coordinate: [pos.coords.longitude, pos.coords.latitude],
    altitude: pos.coords.altitude ?? undefined,
    accuracy: pos.coords.accuracy,
    speed: pos.coords.speed ?? undefined,
    timestamp: new Date(pos.timestamp).toISOString(),
  };
}

function geolocationErrorToError(err: GeolocationPositionError): Error {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new Error('Location permission was denied. Enable location for this site in your browser settings.');
    case err.POSITION_UNAVAILABLE:
      return new Error('Location is currently unavailable. Make sure GPS is on and you have a sky view.');
    case err.TIMEOUT:
      return new Error('Timed out waiting for a GPS fix. Try again in a more open area.');
    default:
      return new Error(err.message || 'Unknown GPS error.');
  }
}
