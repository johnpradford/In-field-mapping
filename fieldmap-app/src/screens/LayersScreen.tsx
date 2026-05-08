import { useMemo, useState } from 'react';
import { Eye, EyeOff, ChevronRight, Plus, Share2, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import SwipeableRow from '@/components/SwipeableRow';
import ConfirmDialog from '@/components/ConfirmDialog';
import RenameDialog from '@/components/RenameDialog';
import { useAppStore } from '@/store/appStore';
import { deleteLayer as dbDeleteLayer } from '@/services/databaseService';
import type { Layer } from '@/models/Layer';
import type { Pin } from '@/models/Pin';

/** All layers in the app, grouped by project (with an "Unfiled" section
 *  for layers not assigned to any project). Mirrors LayersView.swift.
 *
 * The Layers screen reads directly from the global store — every
 * project's data is loaded at app start (see projectService.loadAllData)
 * so the user can see the whole picture and toggle individual layers'
 * visibility regardless of which project is currently "active".
 *
 * Each project section is collapsible (chevron). Per layer:
 *   - Eye icon toggles map visibility.
 *   - Tap row → LayerDetailScreen for rename / restyle / move / features.
 *   - Swipe left → Rename + Delete buttons.
 *
 * The Pins layer (one virtual row per project that has pins) sits at
 * the top of its project's section so the user can drill into a list
 * of dropped pins. Same gesture set as imported layers.
 */
export default function LayersScreen() {
  const layers = useAppStore((s) => s.layers);
  const setLayers = useAppStore((s) => s.setLayers);
  const pins = useAppStore((s) => s.pins);
  const toggleVisibility = useAppStore((s) => s.toggleLayerVisibility);
  const renameLayer = useAppStore((s) => s.renameLayer);
  const deleteLayerFromState = useAppStore((s) => s.deleteLayerFromState);
  const projects = useAppStore((s) => s.projects);
  const navigate = useAppStore((s) => s.navigate);
  const showToast = useAppStore((s) => s.showToast);

  // Track which row (if any) is currently swiped open, so only one
  // shows its action buttons at a time.
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  // Track which layer the user is asking to delete (drives the confirm modal).
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Rename dialog state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  // Collapsed project sections — keyed by projectId or "__unfiled".
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const pendingLayer = layers.find((l) => l.id === pendingDeleteId);
  const renamingLayer = layers.find((l) => l.id === renamingId);

  // Group layers AND pins by project. "__unfiled" key holds entities
  // with no projectId. Each group also tracks the pin count for the
  // synthetic "Pins" row at the top of the section.
  const groups = useMemo(() => {
    const layerMap = new Map<string, Layer[]>();
    const pinMap = new Map<string, Pin[]>();
    for (const l of layers) {
      const key = l.projectId ?? '__unfiled';
      const arr = layerMap.get(key) ?? [];
      arr.push(l);
      layerMap.set(key, arr);
    }
    for (const p of pins) {
      const key = p.projectId ?? '__unfiled';
      const arr = pinMap.get(key) ?? [];
      arr.push(p);
      pinMap.set(key, arr);
    }

    // A section appears if it has at least one layer OR at least one pin.
    const hasContent = (key: string) => layerMap.has(key) || pinMap.has(key);

    // Order: each project in projects list order, Unfiled last.
    const orderedKeys: string[] = [
      ...projects.map((p) => p.id).filter(hasContent),
      ...(hasContent('__unfiled') ? ['__unfiled'] : []),
    ];
    return orderedKeys.map((key) => ({
      key,
      title:
        key === '__unfiled'
          ? 'Unfiled'
          : projects.find((p) => p.id === key)?.name ?? 'Unknown project',
      layers: layerMap.get(key) ?? [],
      pins: pinMap.get(key) ?? [],
    }));
  }, [layers, pins, projects]);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setOpenRowId(null);
    try {
      await dbDeleteLayer(id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Fieldmap] DB delete layer failed (non-fatal):', err);
    }
    deleteLayerFromState(id);
    showToast('Layer deleted');
  }

  function handleRename(newName: string) {
    if (!renamingId) return;
    renameLayer(renamingId, newName);
    setRenamingId(null);
    showToast('Layer renamed');
  }

  function toggleSectionCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Suppress an unused warning while keeping setLayers available for
  // future bulk operations from this screen.
  void setLayers;

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader
        title="Layers"
        rightAction={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate({ name: 'import' })}
              className="p-2 rounded-full active:bg-teal-mid"
              aria-label="Import layer"
              title="Import layer"
            >
              <Plus size={20} />
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: 'export' })}
              className="p-2 rounded-full active:bg-teal-mid"
              aria-label="Export / share layers"
              title="Export / share layers"
            >
              <Share2 size={18} />
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <p className="p-6 text-teal-mid text-center">
            No layers yet. Tap the <span className="font-semibold">+</span> icon
            above to import a file (Shapefile, KML, GPX or GeoJSON).
          </p>
        ) : (
          <>
            <p className="px-4 py-2 text-xs italic text-teal-mid">
              Tap the eye to hide a layer. Tap a layer to rename or restyle.
              Swipe a layer left to rename or delete.
            </p>
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key);
              const totalCount = group.layers.length + (group.pins.length > 0 ? 1 : 0);
              const projectIdForPins = group.key === '__unfiled' ? undefined : group.key;
              return (
                <div key={group.key} className="mb-2">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapsed(group.key)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-greylight text-teal-dark text-sm font-semibold uppercase tracking-wide"
                  >
                    <span>
                      {group.title}{' '}
                      <span className="text-teal-mid font-normal lowercase">
                        ({totalCount})
                      </span>
                    </span>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  {!isCollapsed && (
                    <ul className="bg-white">
                      {/* Synthetic "Pins" row — appears only if this section
                          has at least one pin. Tapping it drills into the
                          pin list with select / share / delete actions. */}
                      {group.pins.length > 0 && (
                        <li className="border-b border-greylight">
                          <button
                            type="button"
                            onClick={() => navigate({ name: 'pinsLayer', projectId: projectIdForPins })}
                            className="w-full flex items-center text-left active:bg-greylight"
                          >
                            <span className="px-4 py-4 text-teal-dark">
                              <MapPin size={20} />
                            </span>
                            <span className="flex-1 py-3">
                              <span className="font-medium text-teal-dark flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full inline-block"
                                  style={{ background: '#9B8EC4' }}
                                />
                                Pins
                              </span>
                              <span className="block text-xs text-teal-mid">
                                point · {group.pins.length} pin{group.pins.length === 1 ? '' : 's'}
                              </span>
                            </span>
                            <span className="px-4 text-teal-mid">
                              <ChevronRight size={18} />
                            </span>
                          </button>
                        </li>
                      )}
                      {group.layers.map((l) => (
                        <li key={l.id} className="border-b border-greylight last:border-b-0">
                          <SwipeableRow
                            id={l.id}
                            openId={openRowId}
                            onOpenChange={setOpenRowId}
                            onRename={() => setRenamingId(l.id)}
                            onDelete={() => setPendingDeleteId(l.id)}
                          >
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => toggleVisibility(l.id)}
                                className="px-4 py-4 text-teal-dark"
                                aria-label={l.visible ? 'Hide layer' : 'Show layer'}
                              >
                                {l.visible ? <Eye size={20} /> : <EyeOff size={20} />}
                              </button>
                              <button
                                type="button"
                                className="flex-1 text-left py-3"
                                onClick={() => navigate({ name: 'layerDetail', layerId: l.id })}
                              >
                                <div className="font-medium text-teal-dark flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full inline-block"
                                    style={{ background: l.style.color }}
                                  />
                                  {l.name}
                                </div>
                                <div className="text-xs text-teal-mid">
                                  {l.geometryType} · {l.data.features.length} features
                                </div>
                              </button>
                              <span className="px-4 text-teal-mid">
                                <ChevronRight size={18} />
                              </span>
                            </div>
                          </SwipeableRow>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete layer?"
        message={
          pendingLayer
            ? `"${pendingLayer.name}" will be permanently removed. This can't be undone.`
            : ''
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDeleteId(null);
          setOpenRowId(null);
        }}
      />

      <RenameDialog
        open={renamingId !== null}
        title="Rename layer"
        initialName={renamingLayer?.name ?? ''}
        placeholder="Layer name"
        onSave={handleRename}
        onCancel={() => setRenamingId(null)}
      />
    </div>
  );
}
