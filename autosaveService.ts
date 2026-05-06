import { useAppStore } from '@/store/appStore';
import {
  saveLayer,
  savePin,
  saveProject,
  saveTrack,
} from '@/services/databaseService';
import type { Layer } from '@/models/Layer';
import type { Pin } from '@/models/Pin';
import type { Project } from '@/models/Project';
import type { Track } from '@/models/Track';

/**
 * Subscribes to the Zustand store and persists changed entities to
 * the local database (Dexie/IndexedDB) so users don't lose data if
 * the app is killed.
 *
 * Strategy: keep a snapshot of the previous values for pins / tracks /
 * layers / activeProject. When the store updates, diff against the
 * snapshot and only write the entities that actually changed. This
 * avoids re-writing every entity on every keystroke or toast.
 *
 * Call once at app startup — see App.tsx.
 */
export function startAutosave(): () => void {
  let prevPins: Pin[] = [];
  let prevTracks: Track[] = [];
  let prevLayers: Layer[] = [];
  let prevProject: Project | null = null;

  const unsubscribe = useAppStore.subscribe((state) => {
    // Pins
    if (state.pins !== prevPins) {
      const prevById = new Map(prevPins.map((p) => [p.id, p]));
      for (const pin of state.pins) {
        const old = prevById.get(pin.id);
        if (!old || !shallowEqual(old, pin)) savePin(pin).catch(noop);
      }
      prevPins = state.pins;
    }

    // Tracks
    if (state.tracks !== prevTracks) {
      const prevById = new Map(prevTracks.map((t) => [t.id, t]));
      for (const track of state.tracks) {
        const old = prevById.get(track.id);
        if (!old || old.totalDistance !== track.totalDistance || old.endTime !== track.endTime) {
          saveTrack(track).catch(noop);
        }
      }
      prevTracks = state.tracks;
    }

    // Layers
    if (state.layers !== prevLayers) {
      const prevById = new Map(prevLayers.map((l) => [l.id, l]));
      for (const layer of state.layers) {
        const old = prevById.get(layer.id);
        if (!old || !shallowEqual(old.style, layer.style) || old.visible !== layer.visible) {
          saveLayer(layer).catch(noop);
        }
      }
      prevLayers = state.layers;
    }

    // Active project (touch updatedAt)
    if (state.activeProject && state.activeProject !== prevProject) {
      saveProject({ ...state.activeProject, updatedAt: new Date().toISOString() }).catch(noop);
      prevProject = state.activeProject;
    }
  });

  return unsubscribe;
}

/** Shallow equality on plain objects. Treats two values as equal if
 *  they have the same set of keys with referentially-equal values. */
function shallowEqual<T extends object>(a: T, b: T): boolean {
  const ar = a as Record<string, unknown>;
  const br = b as Record<string, unknown>;
  const ak = Object.keys(ar);
  const bk = Object.keys(br);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (ar[k] !== br[k]) return false;
  return true;
}

function noop() {}
