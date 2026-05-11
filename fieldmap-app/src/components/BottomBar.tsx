import { MapPin, Circle, Ruler, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/**
 * Bottom action bar — Pin, Record, Measure, More.
 * Mirrors BottomBarView.swift.
 *
 * Designed for one-handed use: full-width, big targets, accent
 * colour for the active tool.
 *
 * Tool buttons (Pin, Measure) work as drawing-tool toggles: tap once to
 * arm the tool (cursor becomes a crosshair, hint banner appears), tap
 * again to exit. The actual placement of pins / measure points is done
 * by tapping the map — see MapLibreMap.tsx.
 *
 * Record button uses a SYMMETRIC two-step pattern on both ends so a
 * finger-graze in the field can't accidentally start or kill a track:
 *   - Idle, 1st tap on Record: shows the big "Start Recording" pill
 *     on the map; recording has NOT begun yet.
 *   - Tap "Start Recording" pill: recording actually begins.
 *   - Recording, 1st tap on Record: shows the big "Stop Recording" pill;
 *     recording continues.
 *   - Tap "Stop Recording" pill: recording actually ends.
 *   - Tapping Record again while a confirmation pill is shown hides
 *     the pill (cancel).
 */
export default function BottomBar() {
  const activeTool = useAppStore((s) => s.activeTool);
  const isRecording = useAppStore((s) => s.isRecording);
  const setActiveTool = useAppStore((s) => s.setActiveTool);
  const toggleStartRecordingButton = useAppStore((s) => s.toggleStartRecordingButton);
  const toggleStopRecordingButton = useAppStore((s) => s.toggleStopRecordingButton);
  const setShowMoreMenu = useAppStore((s) => s.setShowMoreMenu);

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-teal-dark text-white pb-safe">
      <div className="flex items-stretch">
        <BarButton
          label="Pin"
          icon={<MapPin size={26} />}
          active={activeTool === 'pin'}
          onPress={() => setActiveTool(activeTool === 'pin' ? 'none' : 'pin')}
        />
        <BarButton
          label="Record"
          icon={
            <Circle
              size={26}
              className={isRecording ? 'fill-pink text-pink animate-pulse' : ''}
            />
          }
          active={isRecording}
          onPress={() =>
            isRecording ? toggleStopRecordingButton() : toggleStartRecordingButton()
          }
        />
        <BarButton
          label="Measure"
          icon={<Ruler size={26} />}
          active={activeTool === 'measure'}
          onPress={() => setActiveTool(activeTool === 'measure' ? 'none' : 'measure')}
        />
        <BarButton
          label="More"
          icon={<MoreHorizontal size={26} />}
          active={false}
          onPress={() => setShowMoreMenu(true)}
        />
      </div>
    </div>
  );
}

function BarButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
        active ? 'bg-accent text-white' : 'text-white active:bg-teal-mid'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
