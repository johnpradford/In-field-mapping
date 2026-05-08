/** A pin dropped on the map. Mirrors Pin.swift. */
export interface Pin {
  id: string;
  /** Sequential pin number (1, 2, 3, ...) shown on the map. */
  number: number;
  /** Optional human-readable name, e.g. "Cave A" or "Sample Site 7".
   *  When set, it's shown below the pin on the map and as the title in
   *  the info panel. When unset, the pin's number alone is used. */
  name?: string;
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
