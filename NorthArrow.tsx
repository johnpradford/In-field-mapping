import { Navigation } from 'lucide-react';

/**
 * North arrow — fixed widget on the right side of the map.
 *
 * Position is well below the top so the red recording banner (which
 * spans the top of the screen during a track recording) cannot cover
 * it. Was top-4 (~16px); now top-20 (~80px) which clears the banner.
 *
 * The arrow auto-orients with the map's bearing — we rotate by
 * `-bearing` so the needle always points to true north regardless of
 * how the user has rotated the map.
 */
export default function NorthArrow({ bearing = 0 }: { bearing?: number }) {
  return (
    <div
      className="absolute top-20 right-4 bg-white/95 rounded-full p-2 shadow-md z-30"
      aria-label="North"
      title="North"
    >
      <Navigation
        size={22}
        className="text-teal-dark"
        style={{ transform: `rotate(${-bearing}deg)` }}
      />
    </div>
  );
}
