import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/**
 * Slide-up panel with details of the selected pin.
 * Mirrors PinInfoPanelView.swift.
 *
 * The note field is editable. We update the store on every keystroke
 * so the autosave service picks it up; we also commit on blur so the
 * map label refreshes immediately if the note ever shows on the pin.
 */
export default function PinInfoPanel() {
  const pin = useAppStore((s) => s.selectedPin);
  const select = useAppStore((s) => s.selectPin);
  const pins = useAppStore((s) => s.pins);
  const setPins = useAppStore((s) => s.setPins);

  // Local copy of the note while editing — committed back to the store on blur
  const [draftNote, setDraftNote] = useState(pin?.note ?? '');

  useEffect(() => {
    setDraftNote(pin?.note ?? '');
  }, [pin?.id]);

  if (!pin) return null;

  function commit() {
    if (!pin || draftNote === pin.note) return;
    const updated = pins.map((p) => (p.id === pin.id ? { ...p, note: draftNote } : p));
    setPins(updated);
    // Refresh selectedPin so the panel keeps the new value if it's reopened
    select({ ...pin, note: draftNote });
  }

  return (
    <div className="absolute left-0 right-0 bottom-20 mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between bg-teal-dark text-white px-4 py-2">
        <span className="font-semibold">Pin {pin.number}</span>
        <button
          type="button"
          onClick={() => {
            commit();
            select(null);
          }}
          className="p-1 -mr-1"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div className="px-4 py-3 text-sm text-teal-dark space-y-2">
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
        <div>
          <label className="block font-medium mb-1" htmlFor="pin-note">
            Note
          </label>
          <textarea
            id="pin-note"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            onBlur={commit}
            placeholder="Add a note…"
            rows={2}
            className="w-full px-2 py-1 border border-greylight rounded-md text-sm resize-y"
          />
        </div>
      </div>
    </div>
  );
}
