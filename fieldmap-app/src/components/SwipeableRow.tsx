import { useRef, useState, useEffect } from 'react';
import { Trash2, Pencil } from 'lucide-react';

/**
 * Wraps a list item with a left-swipe-to-reveal action button(s).
 * Always shows a red "Delete" button; optionally also shows a
 * "Rename" button to its left for screens where renaming makes sense
 * (Projects, Layers).
 *
 * Implementation notes:
 *   - Pointer events (not just touch events) so it works on both
 *     touchscreens and mouse drags in the desktop preview.
 *   - We don't capture pointers — that would interfere with the
 *     row's own click handler. Instead we track `dragging` locally
 *     and only treat as a swipe if horizontal travel > vertical
 *     (so vertical scroll still works) AND the total leftward
 *     travel exceeds 8 px (so an accidental jitter on tap doesn't
 *     start a swipe).
 *   - Only one row stays open at a time per list — when the user
 *     opens row B we close row A. The parent list controls this via
 *     the optional `openId` / `onOpen` / `onClose` props.
 */
const SINGLE_REVEAL_WIDTH = 80; // px revealed when only Delete is shown
const DOUBLE_REVEAL_WIDTH = 160; // px revealed when Rename + Delete are both shown
const OPEN_THRESHOLD = 40; // px past which the row snaps open
const HORIZONTAL_INTENT_THRESHOLD = 8; // px to qualify as a horizontal swipe

export default function SwipeableRow({
  id,
  openId,
  onOpenChange,
  onDelete,
  onRename,
  children,
}: {
  /** Unique id used to coordinate "only one row open" across the list. */
  id: string;
  /** The currently-open row's id, or null if none. */
  openId: string | null;
  /** Called when this row's open state needs to change. */
  onOpenChange: (newOpenId: string | null) => void;
  /** Called when the user taps the revealed Delete button. */
  onDelete: () => void;
  /** Optional. When provided, a teal "Rename" button is shown alongside Delete. */
  onRename?: () => void;
  children: React.ReactNode;
}) {
  const REVEAL_WIDTH = onRename ? DOUBLE_REVEAL_WIDTH : SINGLE_REVEAL_WIDTH;
  const [dragX, setDragX] = useState(0);
  const isOpen = openId === id;
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isHorizontalRef = useRef(false);
  const wasDraggedRef = useRef(false);

  // When some other row opens, reset our drag offset so this row snaps closed.
  useEffect(() => {
    if (!isOpen) setDragX(0);
  }, [isOpen]);

  function onPointerDown(e: React.PointerEvent) {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalRef.current = false;
    wasDraggedRef.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startXRef.current === null || startYRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Decide direction once enough movement has happened.
    if (
      !isHorizontalRef.current &&
      Math.abs(dx) > HORIZONTAL_INTENT_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      isHorizontalRef.current = true;
    }
    if (!isHorizontalRef.current) return;

    wasDraggedRef.current = true;
    // Allow leftward drag only (negative dx). If the row is already open we
    // start at -REVEAL_WIDTH and let the user close it by dragging right.
    const base = isOpen ? -REVEAL_WIDTH : 0;
    const next = Math.max(-REVEAL_WIDTH, Math.min(0, base + dx));
    setDragX(next);
  }

  function onPointerUp() {
    startXRef.current = null;
    startYRef.current = null;
    if (!isHorizontalRef.current) {
      // Wasn't a swipe — leave the open/closed state as-is.
      isHorizontalRef.current = false;
      return;
    }
    isHorizontalRef.current = false;
    // Snap open if the row is dragged past the threshold; close otherwise.
    if (dragX <= -OPEN_THRESHOLD) {
      onOpenChange(id);
      setDragX(-REVEAL_WIDTH);
    } else {
      onOpenChange(null);
      setDragX(0);
    }
  }

  // Block click bubbling to children if we just finished a drag, so a
  // swipe doesn't also fire the row's tap-to-open handler.
  function onClickCapture(e: React.MouseEvent) {
    if (wasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      wasDraggedRef.current = false;
    }
  }

  return (
    <div className="relative overflow-hidden" onClickCapture={onClickCapture}>
      {/* Action buttons sit behind the row, revealed when the row slides left.
          When both Rename and Delete are shown, Rename sits to the LEFT of Delete. */}
      {onRename && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
            // Snap closed once the dialog opens to clear the swipe state.
            onOpenChange(null);
          }}
          aria-label="Rename"
          className="absolute right-20 top-0 bottom-0 w-20 bg-teal-mid text-white flex items-center justify-center font-semibold gap-1 text-sm"
        >
          <Pencil size={16} />
          Rename
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete"
        className="absolute right-0 top-0 bottom-0 w-20 bg-pink text-white flex items-center justify-center font-semibold gap-1 text-sm"
      >
        <Trash2 size={18} />
        Delete
      </button>

      {/* Foreground row that slides left to reveal the action buttons. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          transition:
            startXRef.current === null ? 'transform 180ms ease-out' : 'none',
          touchAction: 'pan-y',
        }}
        className="bg-white relative z-10"
      >
        {children}
      </div>
    </div>
  );
}
