/** A pin dropped on the map. Mirrors Pin.swift. */
export interface Pin {
  id: string;
  /** Sequential pin number (1, 2, 3, ...) shown on the map. */
  number: number;
  /** [longitude, latitude] — stored in MapLibre / GeoJSON order. */
  coordinate: [number, number];
  /** Altitude in metres. Optional — not all GPS fixes provide it. */
  altitude?: number;
  /** Horizontal accuracy in metres at time of pin drop. */
  accuracy: number;
  /** Time the pin was dropped. */
  timestamp: string; // ISO 8601 string
  /** Free-text note, default empty. */
  note: string;
  /** Project this pin belongs to. */
  projectId?: string;
}
