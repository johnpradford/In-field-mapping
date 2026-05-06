import { ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

/** Standard header used at the top of all non-map screens. */
export default function ScreenHeader({
  title,
  rightAction,
}: {
  title: string;
  rightAction?: React.ReactNode;
}) {
  const goBack = useAppStore((s) => s.goBack);
  return (
    <div className="bg-teal-dark text-white pt-safe">
      <div className="flex items-center justify-between px-2 py-3">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 px-2 py-2"
          aria-label="Back"
        >
          <ChevronLeft size={22} /> <span className="text-sm">Back</span>
        </button>
        <h1 className="text-base font-semibold">{title}</h1>
        <div className="min-w-[80px] flex justify-end pr-2">{rightAction}</div>
      </div>
    </div>
  );
}
