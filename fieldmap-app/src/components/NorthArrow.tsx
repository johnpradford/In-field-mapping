import { Navigation } from 'lucide-react';

/**
 * North arrow — fixed widget in the top-right of the map, sitting
 * just below the device notch / iOS safe-area inset, level with the
 * GPS-centre button on the top-left.
 *
 * The arrow auto-orients with the map's bearing, and tapping it eases
 * the map back to north.
 *
 * Why the -45° base rotation: lucide's `Navigation` icon points toward
 * the upper-right (NE) at its native orientation. Adding -45° brings
 * it level with true north when bearing is 0. The bearing-driven
 * rotation is then applied on top of that base.
 */
const ICON_BASE_ROTATION_DEG = -45;

export default function NorthArrow({
  bearing = 0,
  onPress,
}: {
  bearing?: number;
  onPress?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="absolute bg-white/95 rounded-full p-2 shadow-md z-30 active:bg-greylight"
      style={{
        top: 'calc(var(--top-bar-y) + 4px)',
        right: 'calc(var(--safe-right) + 12px)',
      }}
      aria-label="Reset map to north"
      title="Tap to reset to north"
    >
      <Navigation
        size={22}
        className="text-teal-dark"
        style={{
          transform: `rotate(${ICON_BASE_ROTATION_DEG - bearing}deg)`,
          transition: 'transform 200ms ease-out',
        }}
      />
    </button>
  );
}
