import type { Pin } from './Pin';
import type { Track } from './Track';
import type { Layer } from './Layer';
import type { Project } from './Project';

/** Format version — bump when the on-disk shape changes incompatibly. */
export const FIELDMAP_FILE_VERSION = 1;

/**
 * The .fieldmap export format. Single JSON file containing everything
 * a project needs to be opened on another device.
 *
 * Mirrors FieldmapFile.swift.
 */
export interface FieldmapFile {
  version: number;
  exportedAt: string;
  exportedBy: string; // app version, e.g. "Fieldmap 0.1.0"
  project: Project;
  pins: Pin[];
  tracks: Track[];
  layers: Layer[];
}
