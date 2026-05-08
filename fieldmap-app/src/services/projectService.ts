import { Preferences } from '@capacitor/preferences';
import { useAppStore } from '@/store/appStore';
import {
  getAllLayers,
  getAllPins,
  getAllProjects,
  getAllTracks,
} from '@/services/databaseService';
import type { Project } from '@/models/Project';

/**
 * Project loader. The Fieldmap data model is "everything in memory at
 * once": pins / tracks / layers from EVERY project (and any unfiled
 * entities) are loaded into the Zustand store on app start. The
 * map and Layers screen read from the store directly and filter by
 * `projectId` only when needed (e.g. for export).
 *
 * Why this shape:
 *   - The user wants a per-project visibility toggle that hides ALL of
 *     a project's shapes from the map, including projects that aren't
 *     currently "active". That's only meaningful if the data for those
 *     projects is in memory — otherwise the eye icon would do nothing
 *     for the inactive ones.
 *   - It also fixes the data-loss bug where loading a freshly-created
 *     project replaced any previously-imported (unfiled) layers in
 *     memory with an empty list.
 *
 * The "active project" still matters: it's where new pins go, and it's
 * the default selection when you tap Export. But it no longer controls
 * what's loaded.
 *
 * Also remembers the "last active project" via Capacitor Preferences,
 * so the app re-opens to the project the user last had open instead
 * of an empty map.
 */

const LAST_PROJECT_KEY = 'fieldmap.lastActiveProjectId';

/** Pull every entity from the database into the store. Call once at
 *  app start, and again whenever something changes the universe of
 *  data (e.g. importing a new project file). */
export async function loadAllData() {
  const [pins, tracks, layers] = await Promise.all([
    getAllPins(),
    getAllTracks(),
    getAllLayers(),
  ]);
  const store = useAppStore.getState();
  store.setPins(pins);
  store.setTracks(tracks);
  store.setLayers(layers);
}

/** Mark a project as "active" — the destination for new pins, default
 *  export target — and persist that choice for next launch. Doesn't
 *  touch the data already in memory. */
export async function loadProject(project: Project) {
  await loadAllData();
  const store = useAppStore.getState();
  store.setActiveProject(project);
  await Preferences.set({ key: LAST_PROJECT_KEY, value: project.id });
}

/** Clear the active project (e.g. user is browsing without a specific
 *  project open). Data stays loaded so unfiled / other projects still
 *  show on the map. */
export async function clearActiveProject() {
  await loadAllData();
  useAppStore.getState().setActiveProject(null);
}

/**
 * Restore whichever project the user had open last time the app was
 * killed. Falls back to the most recently updated project if no
 * preference is saved. If there are no projects at all, still loads
 * any unfiled entities so they aren't invisible.
 */
export async function restoreLastProject(): Promise<Project | null> {
  const projects = await getAllProjects();
  useAppStore.getState().setProjects(projects);
  await loadAllData(); // always load every entity, regardless

  if (projects.length === 0) return null;

  const saved = await Preferences.get({ key: LAST_PROJECT_KEY });
  const target =
    projects.find((p) => p.id === saved.value) ?? projects[0]; // most recently updated
  useAppStore.getState().setActiveProject(target);
  await Preferences.set({ key: LAST_PROJECT_KEY, value: target.id });
  return target;
}
