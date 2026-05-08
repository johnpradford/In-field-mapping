/** One sample of the user's location during track recording. */
export interface TrackPoint {
  /** [longitude, latitude] */
  coordinate: [number, number];
  altitude?: number;
  /** Horizontal accuracy in metres. */
  accuracy: number;
  /** Time the sample was taken. */
  timestamp: string; // ISO 8601
  /** Speed in metres/second, if available. */
  speed?: number;
}

/** A recorded GPS track. Mirrors Track.swift. */
export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  /** Time recording started. */
  startTime: string;
  /** Time recording stopped (or last point if still recording). */
  endTime: string;
  /** Total distance in metres (computed from points). */
  totalDistance: number;
  /** Lowest altitude reached during the track, in metres. Undefined
   *  when no point in the track has altitude data. */
  minAltitude?: number;
  /** Highest altitude reached during the track, in metres. */
  maxAltitude?: number;
  /** Total cumulative climb in metres — sum of all positive altitude
   *  deltas between consecutive points. Useful as a hiking-effort
   *  summary; ignores descents. */
  elevationGain?: number;
  projectId?: string;
}

/** Compute the per-track altitude summary from its points. Returns
 *  undefined for fields if no point has altitude data. */
export function computeAltitudeSummary(
  points: TrackPoint[],
): { minAltitude?: number; maxAltitude?: number; elevationGain?: number } {
  let min: number | undefined;
  let max: number | undefined;
  let gain = 0;
  let prev: number | undefined;
  let anyAltitude = false;

  for (const p of points) {
    if (p.altitude === undefined || !Number.isFinite(p.altitude)) {
      prev = undefined;
      continue;
    }
    anyAltitude = true;
    const a = p.altitude;
    if (min === undefined || a < min) min = a;
    if (max === undefined || a > max) max = a;
    if (prev !== undefined && a > prev) gain += a - prev;
    prev = a;
  }

  if (!anyAltitude) return {};
  return {
    minAltitude: min,
    maxAltitude: max,
    elevationGain: gain,
  };
}
