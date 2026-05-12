import { create } from 'zustand';
import type { Pin } from '@/models/Pin';
import { computeAltitudeSummary, type Track, type TrackPoint } from '@/models/Track';
import type { Layer } from '@/models/Layer';
import type { Project } from '@/models/Project';

/**
 * Central app state. Anything the whole app needs to read or write
 * lives here.
 */

export type Screen =
  | { name: 'map' }
  | { name: 'projects' }
  | { name: 'projectDetail'; projectId: string }
  | { name: 'layers' }
  | { name: 'layerDetail'; layerId: string }
  /** Synthetic "Pins" layer view — lists every pin for a given project
   *  (or the unfiled bucket when projectId is omitted). The parent
   *  screen synthesises this row in the Layers list because pins live
   *  in their own table, not as a Layer. */
  | { name: 'pinsLayer'; projectId?: string }
  | { name: 'import' }
  | { name: 'export' }
  | { name: 'settings' };

export type MapTool = 'none' | 'pin' | 'record' | 'measure';

/** A point picked while measuring — in lng/lat order. */
export interface MeasurePoint {
  coordinate: [number, number];
}

interface AppState {
  // ----- Navigation -----
  currentScreen: Screen;
  navigationStack: Screen[];
  navigate: (screen: Screen) => void;
  goBack: () => void;

  // ----- Active tool -----
  activeTool: MapTool;
  setActiveTool: (tool: MapTool) => void;

  // ----- Recording -----
  isRecording: boolean;
  recordingStartTime: string | null;
  recordingDistance: number;
  currentTrackPoints: TrackPoint[];
  /**
   * Whether the prominent "Start Recording" button is currently visible.
   * Two-step start: 1st tap on Record toggles this (true), and the user
   * confirms by tapping the big on-map "Start Recording" pill — that's
   * what actually begins the recording. Same finger-graze protection as
   * the stop side.
   */
  showStartRecordingButton: boolean;
  /**
   * Whether the prominent "Stop Recording" button is currently visible.
   * Two-step stop: 1st tap on Record (while recording) reveals the stop
   * button. The big Stop button is what actually finishes the recording.
   */
  showStopRecordingButton: boolean;
  startRecording: () => void;
  stopRecording: () => Track | null;
  toggleStartRecordingButton: () => void;
  toggleStopRecordingButton: () => void;
  appendTrackPoint: (point: TrackPoint) => void;

  // ----- More menu -----
  showMoreMenu: boolean;
  setShowMoreMenu: (show: boolean) => void;

  // ----- Info panel -----
  showInfoPanel: boolean;
  selectedPin: Pin | null;
  selectPin: (pin: Pin | null) => void;

  // ----- Measure tool -----
  measurePoints: MeasurePoint[];
  isMeasuring: boolean;
  addMeasurePoint: (p: MeasurePoint) => void;
  clearMeasure: () => void;

  // ----- Toasts -----
  toastMessage: string | null;
  showUndoToast: boolean;
  lastCreatedPin: Pin | null;
  showToast: (msg: string) => void;
  hideToast: () => void;

  // ----- Projects -----
  projects: Project[];
  activeProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  /** Rename a project — updates the in-memory list AND activeProject if it matches. Persistence is handled by the autosave service. */
  renameProject: (projectId: string, newName: string) => void;
  /** Toggle whether a project's contents draw on the map. Affects every
   *  layer, pin and track belonging to the project. Persisted via
   *  autosave. */
  toggleProjectVisibility: (projectId: string) => void;
  /** Remove a project from the in-memory list. Cascading delete of pins/tracks/layers is handled by the database service. */
  deleteProjectFromState: (projectId: string) => void;

  // ----- Pins -----
  pins: Pin[];
  nextPinNumber: number;
  addPin: (pin: Pin) => void;
  undoLastPin: () => void;
  setPins: (pins: Pin[]) => void;
  /** Patch a single pin in place — used to back-fill altitude and
   *  accuracy after the GPS fix arrives on pin drop. */
  updatePin: (pinId: string, patch: Partial<Pin>) => void;
  /** Remove a single pin from the in-memory list. Persistence (the
   *  IndexedDB delete) is the caller's responsibility — usually
   *  databaseService.deletePin. */
  deletePinFromState: (pinId: string) => void;

  // ----- Tracks -----
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;

  // ----- Layers -----
  layers: Layer[];
  setLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  /** Rename a layer in-memory. Persistence handled by autosave service. */
  renameLayer: (layerId: string, newName: string) => void;
  /** Move a layer to a different project (or to "unfiled" with
   *  projectId=undefined). Persisted via autosave. */
  moveLayerToProject: (layerId: string, projectId: string | undefined) => void;
  /** Remove a layer from the in-memory list. */
  deleteLayerFromState: (layerId: string) => void;
  /** Replace one feature inside a layer (used when editing/deleting a
   *  single feature from the layer detail screen). The caller passes
   *  the updated FeatureCollection — we just slot it into the matching
   *  layer. */
  updateLayerData: (layerId: string, data: Layer['data']) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentScreen: { name: 'map' },
  navigationStack: [],
  navigate: (screen) =>
    set((s) => ({
      navigationStack: [...s.navigationStack, s.currentScreen],
      currentScreen: screen,
    })),
  goBack: () =>
    set((s) => {
      const stack = [...s.navigationStack];
      const previous = stack.pop();
      return {
        navigationStack: stack,
        currentScreen: previous ?? { name: 'map' },
      };
    }),

  // Tool
  activeTool: 'none',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Recording
  isRecording: false,
  recordingStartTime: null,
  recordingDistance: 0,
  currentTrackPoints: [],
  showStartRecordingButton: false,
  showStopRecordingButton: false,
  startRecording: () =>
    set({
      isRecording: true,
      recordingStartTime: new Date().toISOString(),
      recordingDistance: 0,
      currentTrackPoints: [],
      activeTool: 'record',
      // Both confirmation buttons start hidden once recording is live.
      showStartRecordingButton: false,
      showStopRecordingButton: false,
    }),
  toggleStartRecordingButton: () =>
    set((s) => ({ showStartRecordingButton: !s.showStartRecordingButton })),
  toggleStopRecordingButton: () =>
    set((s) => ({ showStopRecordingButton: !s.showStopRecordingButton })),
  stopRecording: () => {
    const state = get();
    if (!state.isRecording) return null;
    let track: Track | null = null;
    if (state.currentTrackPoints.length > 0) {
      const altitudeSummary = computeAltitudeSummary(state.currentTrackPoints);
      track = {
        id: crypto.randomUUID(),
        name: `Track ${state.tracks.length + 1}`,
        points: state.currentTrackPoints,
        startTime: state.recordingStartTime ?? new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalDistance: state.recordingDistance,
        ...altitudeSummary,
        projectId: state.activeProject?.id,
      };
    }
    set((s) => ({
      isRecording: false,
      activeTool: 'none',
      recordingStartTime: null,
      currentTrackPoints: [],
      showStartRecordingButton: false,
      showStopRecordingButton: false,
      tracks: track ? [...s.tracks, track] : s.tracks,
    }));
    return track;
  },
  appendTrackPoint: (point) =>
    set((s) => ({
      currentTrackPoints: [...s.currentTrackPoints, point],
      recordingDistance: s.recordingDistance + distanceFromLastPoint(s.currentTrackPoints, point),
    })),

  // More menu
  showMoreMenu: false,
  setShowMoreMenu: (show) => set({ showMoreMenu: show }),

  // Info panel
  showInfoPanel: false,
  selectedPin: null,
  selectPin: (pin) => set({ selectedPin: pin, showInfoPanel: pin !== null }),

  // Measure
  measurePoints: [],
  isMeasuring: false,
  addMeasurePoint: (p) =>
    set((s) => ({
      measurePoints: [...s.measurePoints, p],
      isMeasuring: true,
    })),
  clearMeasure: () => set({ measurePoints: [], isMeasuring: false }),

  // Toasts
  toastMessage: null,
  showUndoToast: false,
  lastCreatedPin: null,
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) set({ toastMessage: null });
    }, 3000);
  },
  hideToast: () => set({ toastMessage: null, showUndoToast: false }),

  // Projects
  projects: [],
  activeProject: null,
  setProjects: (projects) => set({ projects }),
  setActiveProject: (project) => set({ activeProject: project }),
  renameProject: (projectId, newName) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, name: newName, updatedAt: new Date().toISOString() }
          : p,
      ),
      activeProject:
        s.activeProject?.id === projectId
          ? { ...s.activeProject, name: newName, updatedAt: new Date().toISOString() }
          : s.activeProject,
    })),
  toggleProjectVisibility: (projectId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          // visible defaults to true when undefined — first toggle makes it false.
          ? { ...p, visible: p.visible === false ? true : false, updatedAt: new Date().toISOString() }
          : p,
      ),
      activeProject:
        s.activeProject?.id === projectId
          ? {
              ...s.activeProject,
              visible: s.activeProject.visible === false ? true : false,
              updatedAt: new Date().toISOString(),
            }
          : s.activeProject,
    })),
  deleteProjectFromState: (projectId) =>
    set((s) => {
      const wasActive = s.activeProject?.id === projectId;
      // Cascade in memory: drop everything that belonged to this project.
      // Items belonging to other projects (or unfiled) are kept untouched.
      const remainingPins = s.pins.filter((p) => p.projectId !== projectId);
      const remainingTracks = s.tracks.filter((t) => t.projectId !== projectId);
      const remainingLayers = s.layers.filter((l) => l.projectId !== projectId);
      return {
        projects: s.projects.filter((p) => p.id !== projectId),
        activeProject: wasActive ? null : s.activeProject,
        pins: remainingPins,
        tracks: remainingTracks,
        layers: remainingLayers,
        nextPinNumber:
          remainingPins.length > 0
            ? Math.max(...remainingPins.map((p) => p.number)) + 1
            : 1,
      };
    }),

  // Pins
  pins: [],
  nextPinNumber: 1,
  addPin: (pin) =>
    set((s) => ({
      pins: [...s.pins, pin],
      lastCreatedPin: pin,
      nextPinNumber: s.nextPinNumber + 1,
      showUndoToast: true,
      // Note: we deliberately do NOT reset activeTool here, so the
      // operator can drop several pins in a row while in pin-place mode.
      // They tap the Pin button again to exit.
    })),
  updatePin: (pinId, patch) =>
    set((s) => ({
      pins: s.pins.map((p) => (p.id === pinId ? { ...p, ...patch } : p)),
      // Keep selectedPin in sync so the open info panel reflects the patch.
      selectedPin:
        s.selectedPin?.id === pinId ? { ...s.selectedPin, ...patch } : s.selectedPin,
      lastCreatedPin:
        s.lastCreatedPin?.id === pinId
          ? { ...s.lastCreatedPin, ...patch }
          : s.lastCreatedPin,
    })),
  undoLastPin: () =>
    set((s) => {
      if (!s.lastCreatedPin) return s;
      const pins = s.pins.filter((p) => p.id !== s.lastCreatedPin?.id);
      return {
        pins,
        nextPinNumber: Math.max(1, s.nextPinNumber - 1),
        lastCreatedPin: null,
        showUndoToast: false,
      };
    }),
  setPins: (pins) =>
    set({
      pins,
      nextPinNumber: pins.length > 0 ? Math.max(...pins.map((p) => p.number)) + 1 : 1,
    }),
  deletePinFromState: (pinId) =>
    set((s) => {
      const remaining = s.pins.filter((p) => p.id !== pinId);
      return {
        pins: remaining,
        // If the panel was showing this pin, dismiss it.
        selectedPin: s.selectedPin?.id === pinId ? null : s.selectedPin,
        showInfoPanel: s.selectedPin?.id === pinId ? false : s.showInfoPanel,
        // Keep the next pin number monotonic; deleting a pin doesn't
        // free its number for reuse (avoids mid-survey number reshuffles).
        nextPinNumber: s.nextPinNumber,
        // If the just-undone pin was deleted, drop the undo target too.
        lastCreatedPin: s.lastCreatedPin?.id === pinId ? null : s.lastCreatedPin,
        showUndoToast: s.lastCreatedPin?.id === pinId ? false : s.showUndoToast,
      };
    }),

  // Tracks
  tracks: [],
  setTracks: (tracks) => set({ tracks }),

  // Layers
  layers: [],
  setLayers: (layers) => set({ layers }),
  toggleLayerVisibility: (layerId) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l,
      ),
    })),
  renameLayer: (layerId, newName) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId ? { ...l, name: newName } : l,
      ),
    })),
  moveLayerToProject: (layerId, projectId) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId ? { ...l, projectId } : l,
      ),
    })),
  deleteLayerFromState: (layerId) =>
    set((s) => ({
      layers: s.layers.filter((l) => l.id !== layerId),
    })),
  updateLayerData: (layerId, data) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === layerId ? { ...l, data } : l,
      ),
    })),
}));

/** Haversine distance in metres between the previous track point and a new one. */
function distanceFromLastPoint(points: TrackPoint[], next: TrackPoint): number {
  if (points.length === 0) return 0;
  const prev = points[points.length - 1];
  return haversineMetres(prev.coordinate, next.coordinate);
}

function haversineMetres(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
