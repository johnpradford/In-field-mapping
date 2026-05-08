import { AlertTriangle } from 'lucide-react';

/**
 * Reusable Yes/No confirmation modal.
 *
 * Used wherever a destructive action needs an explicit confirm
 * (delete a layer, delete a project, etc.). Pass null to `open` to
 * hide the dialog.
 *
 * Tap the backdrop or "Cancel" to dismiss without firing onConfirm.
 * `dangerColour` is true by default — set to false for non-destructive
 * confirmations (e.g. "Save changes?") if we ever need them.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  dangerColour = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerColour?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          {dangerColour && (
            <div className="text-pink flex-shrink-0 mt-0.5">
              <AlertTriangle size={22} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-teal-dark">{title}</h2>
            {message && (
              <p className="text-sm text-teal-mid mt-1 leading-snug whitespace-pre-line">
                {message}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-teal-mid"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-semibold text-white ${
              dangerColour ? 'bg-pink' : 'bg-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
