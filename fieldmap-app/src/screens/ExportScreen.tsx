import { useState } from 'react';
import { Share2 } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { exportProject, type ExportFormat } from '@/services/fileExportService';

/** Export the active project. Mirrors ExportView.swift. */
export default function ExportScreen() {
  const activeProject = useAppStore((s) => s.activeProject);
  const pins = useAppStore((s) => s.pins);
  const tracks = useAppStore((s) => s.tracks);
  const layers = useAppStore((s) => s.layers);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function exportAs(format: ExportFormat) {
    if (!activeProject) {
      showToast('Open a project first');
      return;
    }
    setBusy(format);
    try {
      await exportProject(activeProject, pins, tracks, layers, format);
    } catch (err) {
      showToast(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title="Export project" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <ExportOption
          title=".fieldmap (full project)"
          description="Best for re-opening on another device. Includes pins, tracks, layers, and styling."
          onPress={() => exportAs('fieldmap')}
          loading={busy === 'fieldmap'}
        />
        <ExportOption
          title="GeoJSON"
          description="Standard format readable by QGIS, ArcGIS, and most GIS tools."
          onPress={() => exportAs('geojson')}
          loading={busy === 'geojson'}
        />
        <ExportOption
          title="GPX"
          description="Best for GPS devices. Pins become waypoints, tracks become tracks."
          onPress={() => exportAs('gpx')}
          loading={busy === 'gpx'}
        />
      </div>
    </div>
  );
}

function ExportOption({
  title,
  description,
  onPress,
  loading,
}: {
  title: string;
  description: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={loading}
      className="w-full bg-white rounded-2xl p-4 text-left active:bg-greylight disabled:opacity-50"
    >
      <div className="flex items-start gap-3">
        <Share2 size={22} className="text-accent flex-shrink-0 mt-1" />
        <div>
          <div className="font-semibold text-teal-dark">{title}</div>
          <div className="text-sm text-teal-mid mt-1">{description}</div>
          {loading && <div className="text-xs text-accent mt-2">Exporting…</div>}
        </div>
      </div>
    </button>
  );
}
