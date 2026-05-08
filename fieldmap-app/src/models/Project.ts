/** A project = a container for one survey site's pins, tracks, and layers. */
export interface Project {
  id: string;
  name: string;
  description?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
  /** Whether the project's contents (pins, tracks, layers) currently
   *  draw on the map. When undefined, treat as visible. Lets the user
   *  hide an entire project from the map canvas without going into
   *  each layer one by one. */
  visible?: boolean;
}
