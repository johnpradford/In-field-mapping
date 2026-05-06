import { create } from 'zustand';
import type { Pin } from '@/models/Pin';
import type { Track, TrackPoint } from '@/models/Track';
import type { Layer } from '@/models/Layer';
import type { Project } from '@/models/Project';

/**
 * Central app state. Mirrors AppState.swift from the Swift version.
 * Anything that the whole app needs to read/write lives here.
 */

export type Screen =
  | { name: 'map' }
  | { name: 'projects' }
  | { name: 'projectDetail'; projectId: string }
  | { name: 'layers' }
  | { name: 'layerDetail'; layerId: string }
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
   * Whether the prominent "Stop Recording" button is currently visible.
   * Two-step stop: 1st tap on Record starts (false), 2nd tap reveals the
   * Stop button (true). The big Stop button is what actually finishes
   * the recording — this prevents accidental stops in the field.
   */
  showStopRecordingButton: boolean;
  startRecording: () => void;
  stopRecording: () => Track | null;
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

  // ----- Pins -----
  pins: Pin[];
  nextPinNumber: number;
  addPin: (pin: Pin) => void;
  undoLastPin: () => void;
  setPins: (pins: Pin[]) => void;

  // ----- Tracks -----
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;

  // ----- Layers -----
  layers: Layer[];
  setLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
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
  showStopRecordingButton: false,
  startRecording: () =>
    set({
      isRecording: true,
      recordingStartTime: new Date().toISOString(),
      recordingDistance: 0,
      currentTrackPoints: [],
      activeTool: 'record',
      // Stop button must be revealed by a second tap — not shown immediately.
      showStopRecordingButton: false,
    }),
  toggleStopRecordingButton: () =>
    set((s) => ({ showStopRecordingButton: !s.showStopRecordingButton })),
  stopRecording: () => {
    const state = get();
    if (!state.isRecording) return null;
    let track: Track | null = null;
    if (state.currentTrackPoints.length > 0) {
      track = {
        id: crypto.randomUUID(),
        name: `Track ${state.tracks.length + 1}`,
        points: state.currentTrackPoints,
        startTime: state.recordingStartTime ?? new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalDistance: state.recordingDistance,
        projectId: state.activeProject?.id,
      };
    }
    set((s) => ({
      isRecording: false,
      activeTool: 'none',
      recordingStartTime: null,
      currentTrackPoints: [],
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
