import Dexie, { type EntityTable } from 'dexie';
import type { Pin } from '@/models/Pin';
import type { Track } from '@/models/Track';
import type { Layer } from '@/models/Layer';
import type { Project } from '@/models/Project';

/**
 * Local on-device database. Equivalent to DatabaseManager.swift.
 *
 * Uses Dexie (a friendly wrapper around IndexedDB). IndexedDB works
 * inside the Capacitor webview on both iOS and Android, with no
 * extra plugin needed.
 *
 * If sync to a server is added later, this is the layer to extend.
 */

class FieldmapDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  pins!: EntityTable<Pin, 'id'>;
  tracks!: EntityTable<Track, 'id'>;
  layers!: EntityTable<Layer, 'id'>;

  constructor() {
    super('fieldmap');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      pins: 'id, projectId, number, timestamp',
      tracks: 'id, projectId, startTime',
      layers: 'id, projectId, name, zIndex',
    });
  }
}

export const db = new FieldmapDB();

// ----- Project operations -----
export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function saveProject(p: Project) {
  await db.projects.put(p);
}

export async function deleteProject(id: string) {
  await db.transaction('rw', db.projects, db.pins, db.tracks, db.layers, async () => {
    await db.pins.where('projectId').equals(id).delete();
    await db.tracks.where('projectId').equals(id).delete();
    await db.layers.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  });
}

// ----- Pin operations -----
export async function getPinsForProject(projectId: string): Promise<Pin[]> {
  return db.pins.where('projectId').equals(projectId).sortBy('number');
}

/** Pins that have no projectId — i.e. dropped before any project was open
 *  or explicitly unfiled. These should always be loaded alongside the
 *  active project so data isn't lost when projects switch. */
export async function getUnfiledPins(): Promise<Pin[]> {
  // Dexie can't index `undefined`, so we fetch all and filter — fast
  // enough for the volumes Fieldmap will see in the field.
  const all = await db.pins.toArray();
  return all
    .filter((p) => !p.projectId)
    .sort((a, b) => a.number - b.number);
}

export async function savePin(pin: Pin) {
  await db.pins.put(pin);
}

export async function deletePin(id: string) {
  await db.pins.delete(id);
}

// ----- Track operations -----
export async function getTracksForProject(projectId: string): Promise<Track[]> {
  return db.tracks.where('projectId').equals(projectId).sortBy('startTime');
}

/** Tracks not assigned to any project. See getUnfiledPins for rationale. */
export async function getUnfiledTracks(): Promise<Track[]> {
  const all = await db.tracks.toArray();
  return all
    .filter((t) => !t.projectId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export async function saveTrack(track: Track) {
  await db.tracks.put(track);
}

export async function deleteTrack(id: string) {
  await db.tracks.delete(id);
}

// ----- Layer operations -----
export async function getLayersForProject(projectId: string): Promise<Layer[]> {
  return db.layers.where('projectId').equals(projectId).sortBy('zIndex');
}

/** Layers not assigned to any project. See getUnfiledPins for rationale. */
export async function getUnfiledLayers(): Promise<Layer[]> {
  const all = await db.layers.toArray();
  return all
    .filter((l) => !l.projectId)
    .sort((a, b) => a.zIndex - b.zIndex);
}

/** Every layer in the database, regardless of project. Used by the
 *  Layers screen to display all layers grouped by project. */
export async function getAllLayers(): Promise<Layer[]> {
  return db.layers.orderBy('zIndex').toArray();
}

/** Every pin in the database, regardless of project. */
export async function getAllPins(): Promise<Pin[]> {
  return db.pins.orderBy('number').toArray();
}

/** Every track in the database, regardless of project. */
export async function getAllTracks(): Promise<Track[]> {
  return db.tracks.orderBy('startTime').toArray();
}

export async function saveLayer(layer: Layer) {
  await db.layers.put(layer);
}

export async function deleteLayer(id: string) {
  await db.layers.delete(id);
}
