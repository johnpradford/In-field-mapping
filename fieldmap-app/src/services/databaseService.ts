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

export async function saveLayer(layer: Layer) {
  await db.layers.put(layer);
}

export async function deleteLayer(id: string) {
  await db.layers.delete(id);
}
