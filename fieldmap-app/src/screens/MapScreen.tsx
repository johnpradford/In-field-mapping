import { useEffect } from 'react';
import MapLibreMap from '@/components/MapLibreMap';
import BottomBar from '@/components/BottomBar';
import NorthArrow from '@/components/NorthArrow';
import Toast from '@/components/Toast';
import UndoToast from '@/components/UndoToast';
import MoreMenu from '@/components/MoreMenu';
import PinInfoPanel from '@/components/PinInfoPanel';
import { useAppStore } from '@/store/appStore';
import {
  getCurrentLocation,
  startWatching,
  stopWatching,
  locationToTrackPoint,
} from '@/services/locationService';
import type { Pin } from '@/models/Pin';

/**
 * Main map screen. Equivalent to MapScreenView.swift.
 * Where users spend ~90% of their time.
 */
export default function MapScreen() {
  const isRecording = useAppStore((s) => s.isRecording);
  const addPin = useAppStore((s) => s.addPin);
  const appendTrackPoint = useAppStore((s) => s.appendTrackPoint);
  const showToast = useAppStore((s) => s.showToast);
  const nextPinNumber = useAppStore((s) => s.nextPinNumber);
  const activeProject = useAppStore((s) => s.activeProject);

  // ----- While recording, watch GPS and append every fix to the track -----
  useEffect(() => {
    if (!isRecording) return;
    startWatching(
      (loc) => appendTrackPoint(locationToTrackPoint(loc)),
      (err) => showToast(`GPS error: ${err.message}`),
    );
    return () => {
      stopWatching();
    };
  }, [isRecording, appendTrackPoint, showToast]);

  /** Handler for the Pin button in the bottom bar. */
  async function handleDropPin() {
    try {
      const loc = await getCurrentLocation();
      const pin: Pin = {
        id: crypto.randomUUID(),
        number: nextPinNumber,
        coordinate: loc.coordinate,
        altitude: loc.altitude,
        accuracy: loc.accuracy,
        timestamp: loc.timestamp,
        note: '',
        projectId: activeProject?.id,
      };
      addPin(pin);
    } catch (err) {
      showToast(`Could not get GPS fix: ${(err as Error).message}`);
    }
  }

  return (
    <div className="relative h-full w-full bg-greylight">
      <MapLibreMap />
      <NorthArrow bearing={0} />
      <PinInfoPanel />
      <Toast />
      <UndoToast />
      <BottomBar onPinTap={handleDropPin} />
      <MoreMenu />
    </div>
  );
}
