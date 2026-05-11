import { useAppStore } from '@/store/appStore';

/**
 * Floating toast banner. Shows the current toast message above the
 * bottom bar. Mirrors the toast logic in MapComponents.swift.
 */
export default function Toast() {
  const message = useAppStore((s) => s.toastMessage);
  if (!message) return null;
  return (
    <div className="absolute left-4 right-4 bottom-28 bg-teal-dark/95 text-white rounded-xl px-4 py-3 text-center shadow-lg">
      {message}
    </div>
  );
}
