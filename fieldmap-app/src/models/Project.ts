/** A project = a container for one survey site's pins, tracks, and layers. */
export interface Project {
  id: string;
  name: string;
  description?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}
