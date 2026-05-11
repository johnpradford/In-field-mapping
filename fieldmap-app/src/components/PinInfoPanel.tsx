import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { deletePin as dbDeletePin } from '@/services/databaseService';
import ConfirmDialog from '@/components/ConfirmDialog';

/**
 * Slide-up panel with details of the selected pin.
 * Mirrors PinInfoPanelView.swift.
 *
 * The user can edit BOTH the pin name and the note here. The name
 * shows up below the pin on the map (when set), and at the top of
 * this panel as the heading. Both fields commit to the store on blur,
 * which the autosave service then writes to IndexedDB.
 *
 * The header now also has a small Delete (trash) button. It pops a
 * confirm dialog because deletion is destructive and there's no undo
 * once the pin is gone from IndexedDB.
 */
export default function PinInfoPanel() {
  const pin = useAppStore((s) => s.selectedPin);
  const select = useAppStore((s) => s.selectPin);
  const pins = useAppStore((s) => s.pins);
  const setPins = useAppStore((s) => s.setPins);
  const deletePinFromState = useAppStore((s) => s.deletePinFromState);
  const showToast = useAppStore((s) => s.showToast);

  // Local copies of the editable fields while editing — committed back to
  // the store on blur and on close. Working with local state during typing
  // keeps the cursor stable and avoids one re-render per keystroke.
  const [draftName, setDraftName] = useState(pin?.name ?? '');
  const [draftNote, setDraftNote] = useState(pin?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraftName(pin?.name ?? '');
    setDraftNote(pin?.note ?? '');
  }, [pin?.id]);

  if (!pin) return null;

  function commit() {
    if (!pin) return;
    const trimmedName = draftName.trim();
    const nameChanged = (pin.name ?? '') !== trimmedName;
    const noteChanged = pin.note !== draftNote;
    if (!nameChanged && !noteChanged) return;
    const updated = pins.map((p) =>
      p.id === pin.id
        ? { ...p, name: trimmedName.length > 0 ? trimmedName : undefined, note: draftNote }
        : p,
    );
    setPins(updated);
    select({ ...pin, name: trimmedName.length > 0 ? trimmedName : undefined, note: draftNote });
  }

  async function deleteThisPin() {
    if (!pin) return;
    const id = pin.id;
    setConfirmDelete(false);
    try {
      await dbDeletePin(id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Fieldmap] DB delete pin failed (non-fatal):', err);
    }
    deletePinFromState(id);
    showToast('Pin deleted');
  }

  // Title shows name when set, falls back to "Pin <number>".
  const title = pin.name && pin.name.trim().length > 0 ? pin.name : `Pin ${pin.number}`;

  return (
    <div className="absolute left-0 right-0 bottom-20 mx-4 bg-white rounded-2xl shadow-xl overflow-hidden z-30">
      <div className="flex items-center justify-between bg-teal-dark text-white px-4 py-2">
        <span className="font-semibold truncate">{title}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="p-1"
            aria-label="Delete pin"
            title="Delete pin"
          >
            <Trash2 size={16} />
          </button>
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
      </div>
      <div className="px-4 py-3 text-sm text-teal-dark space-y-2">
        <div>
          <label className="block font-medium mb-1" htmlFor="pin-name">
            Name
          </label>
          <input
            id="pin-name"
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commit}
            placeholder={`Pin ${pin.number}`}
            className="w-full px-2 py-1 border border-greylight rounded-md text-sm"
          />
        </div>
        <div>
          <span className="font-medium">Number:</span> {pin.number}
        </div>
        <div>
          <span className="font-medium">Coords:</span>{' '}
          {pin.coordinate[1].toFixed(6)}, {pin.coordinate[0].toFixed(6)}
        </div>
        <div>
          <span className="font-medium">Accuracy:</span> ±{pin.accuracy.toFixed(1)} m
        </div>
        {pin.altitude !== undefined && Number.isFinite(pin.altitude) && (
          <div>
            <span className="font-medium">Altitude:</span> {pin.altitude.toFixed(1)} m
          </div>
        )}
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

      <ConfirmDialog
        open={confirmDelete}
        title="Delete pin?"
        message={`"${title}" will be permanently removed. This can't be undone.`}
        onConfirm={deleteThisPin}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
