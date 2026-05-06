import { Navigation } from 'lucide-react';

/**
 * North arrow — fixed widget in the top-right of the map.
 * For now this is a static icon. To make it auto-orient with the
 * device compass, hook into MapLibre's `bearing` and rotate the
 * icon by `-bearing` degrees.
 */
export default function NorthArrow({ bearing = 0 }: { bearing?: number }) {
  return (
    <div className="absolute top-4 right-4 bg-white/90 rounded-full p-2 shadow pt-safe">
      <Navigation
        size={22}
        className="text-teal-dark"
        style={{ transform: `rotate(${-bearing}deg)` }}
      />
    </div>
  );
}
