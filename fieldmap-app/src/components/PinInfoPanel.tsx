import { X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/**
 * Slide-up panel with details of the selected pin.
 * Mirrors PinInfoPanelView.swift.
 */
export default function PinInfoPanel() {
  const pin = useAppStore((s) => s.selectedPin);
  const select = useAppStore((s) => s.selectPin);

  if (!pin) return null;

  return (
    <div className="absolute left-0 right-0 bottom-20 mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between bg-teal-dark text-white px-4 py-2">
        <span className="font-semibold">Pin {pin.number}</span>
        <button
          type="button"
          onClick={() => select(null)}
          className="p-1 -mr-1"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-4 py-3 text-sm text-teal-dark space-y-1">
        <div>
          <span className="font-medium">Coords:</span>{' '}
          {pin.coordinate[1].toFixed(6)}, {pin.coordinate[0].toFixed(6)}
        </div>
        <div>
          <span className="font-medium">Accuracy:</span> ±{pin.accuracy.toFixed(1)} m
        </div>
        <div>
          <span className="font-medium">Time:</span>{' '}
          {new Date(pin.timestamp).toLocaleString()}
        </div>
        {pin.note && (
          <div>
            <span className="font-medium">Note:</span> {pin.note}
          </div>
        )}
      </div>
    </div>
  );
}
