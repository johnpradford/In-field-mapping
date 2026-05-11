import { useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/**
 * "Pin dropped — Undo" toast. Auto-dismisses after 4 seconds.
 * Mirrors the undo banner in the Swift version.
 */
export default function UndoToast() {
  const show = useAppStore((s) => s.showUndoToast);
  const lastPin = useAppStore((s) => s.lastCreatedPin);
  const undo = useAppStore((s) => s.undoLastPin);
  const hide = useAppStore((s) => s.hideToast);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => hide(), 4000);
    return () => clearTimeout(t);
  }, [show, hide]);

  if (!show || !lastPin) return null;

  return (
    <div className="absolute left-4 right-4 bottom-28 flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-lg">
      <span className="font-medium text-teal-dark">Pin {lastPin.number} dropped</span>
      <button
        type="button"
        onClick={undo}
        className="flex items-center gap-1 text-accent font-semibold"
      >
        <Undo2 size={18} /> Undo
      </button>
    </div>
  );
}
