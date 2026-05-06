import { Geolocation, type Position } from '@capacitor/geolocation';
import type { TrackPoint } from '@/models/Track';

/**
 * Wraps the Capacitor Geolocation plugin so the rest of the app
 * doesn't need to know about Capacitor's APIs.
 *
 * Equivalent to LocationManager.swift from the Swift version.
 *
 * NOTE: Background recording (when the screen is off) requires the
 * @capacitor-community/background-geolocation plugin instead of the
 * standard one. See the README "Background recording" section.
 */

export interface Location {
  coordinate: [number, number]; // [lng, lat]
  altitude?: number;
  accuracy: number;
  speed?: number;
  timestamp: string;
}

let watchId: string | null = null;

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

/** Start receiving location updates — used for the GPS dot and track recording. */
export async function startWatching(
  onLocation: (loc: Location) => void,
  onError?: (err: Error) => void,
): Promise<void> {
  if (watchId) await stopWatching();
  watchId = await Geolocation.watchPosition(
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

export async function stopWatching(): Promise<void> {
  if (watchId) {
    await Geolocation.clearWatch({ id: watchId });
    watchId = null;
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
