import { useEffect, useRef, useState } from 'react';

/**
 * Reusable rename modal — pops up a centered dialog with one text
 * input, plus Cancel + Save buttons. Used by the Projects and Layers
 * screens to rename items inline (swipe-left → Rename).
 *
 * `initialName` seeds the input on every open; the parent decides what
 * to do with the trimmed result by handling onSave. The dialog auto-
 * closes itself after Save (the parent doesn't need to flip `open`).
 */
export default function RenameDialog({
  open,
  title,
  initialName,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  placeholder,
  onSave,
  onCancel,
}: {
  open: boolean;
  title: string;
  initialName: string;
  saveLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refresh the input each time the dialog opens with a different name.
  useEffect(() => {
    if (open) {
      setDraft(initialName);
      // Focus + select-all on next tick so the user can either edit or replace.
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [open, initialName]);

  if (!open) return null;

  function commit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return; // Don't allow empty names; user must Cancel.
    onSave(trimmed);
  }

  return (
    <div
      className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-teal-dark mb-3">{title}</h2>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') onCancel();
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-greylight rounded-lg text-base"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-teal-mid">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={draft.trim().length === 0}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium disabled:opacity-50"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
