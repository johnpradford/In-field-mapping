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
  projectId?: string;
}
