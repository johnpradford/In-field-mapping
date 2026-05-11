import { MapPin, Circle, Ruler, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/**
 * Bottom action bar — Pin, Record, Measure, More.
 * Mirrors BottomBarView.swift.
 *
 * Designed for one-handed use: full-width, big targets, accent
 * colour for the active tool. Height is kept tight (~54px + iOS
 * safe-area inset) so it doesn't obscure the map; the related
 * --bottom-bar-h CSS variable in index.css MUST be kept in sync
 * with the real rendered height because the MapLibre scale bar,
 * attribution "i" button, and the Legend are all positioned
 * relative to it.
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
          icon={<MapPin size={22} />}
          active={activeTool === 'pin'}
          onPress={() => setActiveTool(activeTool === 'pin' ? 'none' : 'pin')}
        />
        <BarButton
          label="Record"
          icon={
            <Circle
              size={22}
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
          icon={<Ruler size={22} />}
          active={activeTool === 'measure'}
          onPress={() => setActiveTool(activeTool === 'measure' ? 'none' : 'measure')}
        />
        <BarButton
          label="More"
          icon={<MoreHorizontal size={22} />}
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
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
        active ? 'bg-accent text-white' : 'text-white active:bg-teal-mid'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
