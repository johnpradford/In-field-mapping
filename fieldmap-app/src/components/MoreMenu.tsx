import { Layers, FolderOpen, Settings as SettingsIcon, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { Screen } from '@/store/appStore';

/**
 * Slide-up "More" menu. Mirrors MoreMenuView.swift.
 * Opens via the More button in the bottom bar.
 *
 * Import and Export used to live here as separate menu items but have
 * been moved into the Layers screen header (small + and share icons),
 * since import/export and layer management belong together
 * conceptually and that keeps the More menu shorter.
 */
export default function MoreMenu() {
  const show = useAppStore((s) => s.showMoreMenu);
  const setShow = useAppStore((s) => s.setShowMoreMenu);
  const navigate = useAppStore((s) => s.navigate);

  if (!show) return null;

  function go(screen: Screen) {
    setShow(false);
    navigate(screen);
  }

  return (
    <div
      className="absolute inset-0 z-40 bg-black/40 flex items-end"
      onClick={() => setShow(false)}
    >
      <div
        className="w-full bg-white rounded-t-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-semibold text-teal-dark">More</h2>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="p-2 -mr-2 text-teal-dark"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <MenuRow icon={<FolderOpen size={22} />} label="Projects" onPress={() => go({ name: 'projects' })} />
        <MenuRow icon={<Layers size={22} />} label="Layers (Import / Export)" onPress={() => go({ name: 'layers' })} />
        <MenuRow icon={<SettingsIcon size={22} />} label="Settings" onPress={() => go({ name: 'settings' })} />
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full flex items-center gap-4 px-4 py-4 active:bg-greylight border-t border-greylight text-left"
    >
      <span className="text-teal-dark">{icon}</span>
      <span className="text-base text-teal-dark font-medium">{label}</span>
    </button>
  );
}
