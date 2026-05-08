import { useEffect, useRef, useState } from 'react';
import { Square, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Map as MapLibreMapInstance } from 'maplibre-gl';
import MapLibreMap from '@/components/MapLibreMap';
import BottomBar from '@/components/BottomBar';
import NorthArrow from '@/components/NorthArrow';
import Toast from '@/components/Toast';
import UndoToast from '@/components/UndoToast';
import MoreMenu from '@/components/MoreMenu';
import PinInfoPanel from '@/components/PinInfoPanel';
import { useAppStore } from '@/store/appStore';
import {
  startBackgroundWatch,
  stopBackgroundWatch,
  locationToTrackPoint,
} from '@/services/locationService';

/**
 * Main map screen. Equivalent to MapScreenView.swift.
 * Where users spend ~90% of their time.
 */
export default function MapScreen() {
  const isRecording = useAppStore((s) => s.isRecording);
  const startRecording = useAppStore((s) => s.startRecording);
  const stopRecording = useAppStore((s) => s.stopRecording);
  const showStartRecordingButton = useAppStore((s) => s.showStartRecordingButton);
  const showStopRecordingButton = useAppStore((s) => s.showStopRecordingButton);
  const recordingStartTime = useAppStore((s) => s.recordingStartTime);
  const recordingDistance = useAppStore((s) => s.recordingDistance);
  const activeTool = useAppStore((s) => s.activeTool);
  const measurePoints = useAppStore((s) => s.measurePoints);
  const clearMeasure = useAppStore((s) => s.clearMeasure);
  const appendTrackPoint = useAppStore((s) => s.appendTrackPoint);
  const showToast = useAppStore((s) => s.showToast);
  const layers = useAppStore((s) => s.layers);

  const [bearing, setBearing] = useState(0);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);

  // Hold the map instance so the north-arrow tap can ease the bearing
  // back to 0. Captured via MapLibreMap's onMapReady callback below.
  const mapRef = useRef<MapLibreMapInstance | null>(null);

  function resetNorth() {
    const map = mapRef.current;
    if (!map) return;
    // 600 ms is fast enough to feel responsive but slow enough that the
    // user sees the rotation animate, which doubles as feedback that
    // their tap registered.
    map.easeTo({ bearing: 0, pitch: 0, duration: 600 });
  }

  // ----- While recording, watch GPS in the background and append every fix to the track -----
  useEffect(() => {
    if (!isRecording) return;
    startBackgroundWatch(
      (loc) => appendTrackPoint(locationToTrackPoint(loc)),
      (err) => showToast(`GPS error: ${err.message}`),
    );
    return () => {
      stopBackgroundWatch();
    };
  }, [isRecording, appendTrackPoint, showToast]);

  // ----- Live elapsed-time counter while recording -----
  useEffect(() => {
    if (!isRecording || !recordingStartTime) {
      setRecordingElapsedSec(0);
      return;
    }
    const tick = () => {
      const startMs = new Date(recordingStartTime).getTime();
      setRecordingElapsedSec(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isRecording, recordingStartTime]);

  return (
    <div className="relative h-full w-full bg-greylight">
      <MapLibreMap
        onBearingChange={setBearing}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
      />
      <NorthArrow bearing={bearing} onPress={resetNorth} />

      {/* Hint banner shown while a drawing tool is active */}
      {activeTool === 'pin' && (
        <ToolHintBanner text="Tap map to drop a pin" />
      )}
      {activeTool === 'measure' && (
        <ToolHintBanner
          text={
            measurePoints.length === 0
              ? 'Tap map to place first point'
              : `Tap to add more points · ${measurePoints.length} placed`
          }
        />
      )}

      {/* Live measure total */}
      {activeTool === 'measure' && measurePoints.length >= 2 && (
        <MeasureTotal points={measurePoints} />
      )}

      {/* Clear measurement button (visible while measuring with at least 1 point) */}
      {activeTool === 'measure' && measurePoints.length > 0 && (
        <button
          type="button"
          onClick={clearMeasure}
          className="absolute left-1/2 -translate-x-1/2 bottom-24 px-5 py-2.5 rounded-full bg-teal-dark text-white text-sm font-semibold shadow-lg z-30"
        >
          Clear measurement
        </button>
      )}

      {/* Live recording banner */}
      {isRecording && (
        <RecordingBanner
          elapsedSec={recordingElapsedSec}
          distanceM={recordingDistance}
        />
      )}

      {/*
        Prominent "Start Recording" pill — appears after the FIRST tap on
        the Record bottom-bar button (when not yet recording). The user
        confirms by tapping this pill, which actually begins recording.
        Mirror image of the Stop pattern below — same finger-graze
        protection at the start as at the end.
      */}
      {!isRecording && showStartRecordingButton && (
        <button
          type="button"
          onClick={() => startRecording()}
          className="absolute left-1/2 -translate-x-1/2 bottom-24 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-accent text-white text-base font-bold shadow-xl z-30 animate-pulse"
        >
          <Circle size={18} fill="currentColor" />
          Start Recording
        </button>
      )}

      {/*
        Prominent Stop Recording button — only revealed by tapping
        Record once recording is in progress. Tapping it actually
        finishes the track.
      */}
      {isRecording && showStopRecordingButton && (
        <button
          type="button"
          onClick={() => stopRecording()}
          className="absolute left-1/2 -translate-x-1/2 bottom-24 inline-flex items-center gap-2 px-7 py-3 rounded-full bg-recording-red text-white text-base font-bold shadow-xl z-30 animate-pulse"
        >
          <Square size={18} fill="currentColor" />
          Stop Recording
        </button>
      )}

      {/* Legend listing visible imported layers — collapsible, sits above scale bar (bottom-left) */}
      <Legend layers={layers} />

      <PinInfoPanel />
      <Toast />
      <UndoToast />
      <BottomBar />
      <MoreMenu />
    </div>
  );
}

/* Legend that lists each visible imported layer with its colour swatch.
 *
 * Position: bottom-left, sitting just above the scale bar (which is also
 * bottom-left, anchored by MapLibre).
 *
 * Collapsible: tapping the header chevron toggles between the full list
 * and a compact "Legend" pill. Choice is remembered in component state
 * for the lifetime of the MapScreen.
 *
 * Hidden when there are no visible imported layers. */
function Legend({
  layers,
}: {
  layers: { id: string; name: string; visible: boolean; style: { color: string }; geometryType: string }[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleLayers = layers.filter((l) => l.visible);
  if (visibleLayers.length === 0) return null;
  return (
    <div
      className="absolute bg-white/95 rounded-lg shadow-md z-20 text-xs overflow-hidden"
      style={{
        left: 'calc(var(--safe-left) + 12px)',
        // Sit comfortably above the scale bar. Scale bar bottom is
        // `--bottom-bar-h + --safe-bottom + 8px`; we add 56 px more
        // so the legend's lower edge clears the distance label
        // (e.g. "10 km") that sits just above the scale bar tick.
        bottom: 'calc(var(--bottom-bar-h) + var(--safe-bottom) + 56px)',
        maxWidth: 'calc(100% - 24px)',
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between gap-2 w-full px-3 py-1.5 text-teal-dark font-semibold"
        aria-label={collapsed ? 'Expand legend' : 'Collapse legend'}
      >
        <span>Legend</span>
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {!collapsed && (
        <ul className="px-3 pb-2 space-y-1">
          {visibleLayers.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <span
                className={
                  l.geometryType === 'line'
                    ? 'w-3 h-[3px] rounded-sm flex-shrink-0'
                    : l.geometryType === 'point'
                    ? 'w-3 h-3 rounded-full flex-shrink-0'
                    : 'w-3 h-3 rounded-sm flex-shrink-0'
                }
                style={{ background: l.style.color }}
              />
              <span className="text-teal-dark truncate">{l.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers, kept in this file for proximity.       */
/* ------------------------------------------------------------------ */

function ToolHintBanner({ text }: { text: string }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bg-teal-dark text-white px-3 py-2 rounded-full text-xs font-semibold shadow-lg z-30 whitespace-nowrap max-w-[60%] text-center"
      style={{ top: 'calc(var(--top-bar-y) + 4px)' }}
    >
      {text}
    </div>
  );
}

function RecordingBanner({
  elapsedSec,
  distanceM,
}: {
  elapsedSec: number;
  distanceM: number;
}) {
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');
  // The banner is centred and capped at 60% width so the GPS button
  // (top-left) and the north arrow (top-right) are not obscured.
  // Red (not the brand pink) reinforces the universal "recording"
  // colour convention used by camera apps.
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bg-recording-red text-white px-3 py-2 rounded-full text-xs font-semibold shadow-lg z-30 flex items-center justify-center gap-2 max-w-[60%]"
      style={{ top: 'calc(var(--top-bar-y) + 4px)' }}
    >
      <span className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
      <span className="truncate">
        Recording — {mm}:{ss} — {Math.round(distanceM)} m
      </span>
    </div>
  );
}

function MeasureTotal({
  points,
}: {
  points: { coordinate: [number, number] }[];
}) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMetres(points[i - 1].coordinate, points[i].coordinate);
  }
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-40 bg-white/95 px-4 py-2 rounded-xl shadow-md text-sm font-bold text-teal-dark z-30 text-center">
      Total: {total < 1000 ? `${Math.round(total)} m` : `${(total / 1000).toFixed(2)} km`}
      <div className="text-[11px] font-medium text-teal-mid mt-0.5">
        {points.length - 1} segment{points.length - 1 === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function haversineMetres(
  a: [number, number],
  b: [number, number],
): number {
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
