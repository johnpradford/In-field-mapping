import { useMemo, useState } from 'react';
import { Search, Share2, Trash2, Check } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import ShareFormatPicker from '@/components/ShareFormatPicker';
import { useAppStore } from '@/store/appStore';
import { deletePin as dbDeletePin } from '@/services/databaseService';
import { shareFeatureCollection } from '@/services/fileExportService';
import type { Pin } from '@/models/Pin';
import type { Feature } from 'geojson';

/** "Pins" layer detail. Synthesised — pins live in their own table,
 *  but the user sees them as if they were a layer. Lists every pin
 *  for a given project (or the unfiled bucket when projectId is
 *  undefined) with select / select-all / share / delete actions and a
 *  search field at the top to narrow by name.
 */
export default function PinsLayerScreen({ projectId }: { projectId: string | undefined }) {
  const allPins = useAppStore((s) => s.pins);
  const projects = useAppStore((s) => s.projects);
  const deletePinFromState = useAppStore((s) => s.deletePinFromState);
  const showToast = useAppStore((s) => s.showToast);

  const projectName = projectId
    ? projects.find((p) => p.id === projectId)?.name ?? 'Unknown project'
    : 'Unfiled';

  // Filter pins to just this group (project or unfiled).
  const pins = useMemo(
    () => allPins.filter((p) => (p.projectId ?? undefined) === projectId),
    [allPins, projectId],
  );

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return pins;
    return pins.filter((p) =>
      (p.name ?? `pin ${p.number}`).toLowerCase().includes(q),
    );
  }, [pins, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(filtered.map((p) => p.id)));
  }
  function deselectAll() {
    setSelected(new Set());
  }

  function pinsToFeatures(list: Pin[]): Feature[] {
    return list.map((p) => {
      // 3D coordinates when altitude is set, so GeoJSON / GPX / KML
      // exports carry the elevation data forward.
      const coords: number[] =
        p.altitude !== undefined && Number.isFinite(p.altitude)
          ? [p.coordinate[0], p.coordinate[1], p.altitude]
          : [p.coordinate[0], p.coordinate[1]];
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          name: p.name ?? `Pin ${p.number}`,
          number: p.number,
          accuracy: p.accuracy,
          altitude: p.altitude,
          timestamp: p.timestamp,
          note: p.note,
        },
      };
    });
  }

  async function shareWithFormat(format: 'geojson' | 'gpx' | 'kml') {
    setSharing(false);
    const list = pins.filter((p) => selected.has(p.id));
    if (list.length === 0) {
      showToast('No pins selected');
      return;
    }
    try {
      await shareFeatureCollection(
        `${projectName}-pins`,
        pinsToFeatures(list),
        format,
        `${projectName} — ${list.length} pin${list.length === 1 ? '' : 's'}`,
      );
    } catch (err) {
      showToast(`Share failed: ${(err as Error).message}`);
    }
  }

  async function deleteSelected() {
    setConfirmDelete(false);
    const ids = [...selected];
    for (const id of ids) {
      try {
        await dbDeletePin(id);
      } catch {
        /* non-fatal — store still removes it */
      }
      deletePinFromState(id);
    }
    setSelected(new Set());
    showToast(`${ids.length} pin${ids.length === 1 ? '' : 's'} deleted`);
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title={`Pins — ${projectName}`} />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pins.length === 0 ? (
          <p className="p-6 text-teal-mid text-center bg-white rounded-2xl">
            No pins yet. Drop one from the map screen using the Pin tool.
          </p>
        ) : (
          <div className="bg-white rounded-2xl p-4">
            {/* Search bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-greylight rounded-lg mb-2">
              <Search size={14} className="text-teal-mid" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pins by name…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>

            {/* Bulk-action row */}
            <div className="flex items-center justify-between text-xs text-teal-mid mb-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-accent font-semibold"
                  onClick={selectAll}
                >
                  Select all
                </button>
                <button type="button" className="text-teal-mid" onClick={deselectAll}>
                  Deselect all
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSharing(true)}
                  disabled={selected.size === 0}
                  className="flex items-center gap-1 text-accent font-semibold disabled:opacity-40"
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={selected.size === 0}
                  className="flex items-center gap-1 text-pink font-semibold disabled:opacity-40"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            <ul className="border border-greylight rounded-lg divide-y divide-greylight max-h-[60vh] overflow-y-auto">
              {filtered.map((p) => {
                const checked = selected.has(p.id);
                const title = p.name && p.name.trim().length > 0 ? p.name : `Pin ${p.number}`;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 active:bg-greylight"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                          checked
                            ? 'bg-accent border-accent text-white'
                            : 'bg-white border-greylight'
                        }`}
                      >
                        {checked && <Check size={14} />}
                      </span>
                      <span className="flex-1 text-left text-sm text-teal-dark truncate">
                        {title}
                      </span>
                      <span className="text-[11px] text-teal-mid font-mono">
                        #{p.number}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-xs text-teal-mid italic">
                  No pins match your search.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <ShareFormatPicker
        open={sharing}
        title="Share selected pins"
        message={`${selected.size} pin${selected.size === 1 ? '' : 's'} from ${projectName}`}
        onPick={shareWithFormat}
        onCancel={() => setSharing(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete selected pins?"
        message={`${selected.size} pin${selected.size === 1 ? '' : 's'} will be permanently removed. This can't be undone.`}
        onConfirm={deleteSelected}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
