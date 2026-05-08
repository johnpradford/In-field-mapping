import { useMemo, useState } from 'react';
import { Search, Share2, Trash2, Check, Pencil, Folder } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import RenameDialog from '@/components/RenameDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import ShareFormatPicker from '@/components/ShareFormatPicker';
import { useAppStore } from '@/store/appStore';
import { saveLayer } from '@/services/databaseService';
import { shareFeatureCollection } from '@/services/fileExportService';
import { colors } from '@/theme';
import {
  FILL_PATTERNS,
  POINT_SHAPES,
  fillPatternLabel,
  pointShapeLabel,
  type FillPattern,
  type Layer,
  type PointShape,
} from '@/models/Layer';
import type { Feature, FeatureCollection } from 'geojson';

/** Editor for one layer. Mirrors LayerDetailView.swift but with more
 *  going on:
 *
 *  1. Rename (pencil icon → dialog).
 *  2. Project — move this layer to a different project, or to "Unfiled".
 *  3. Colour — six brand swatches (existing).
 *  4. Symbol — six point shapes (point layers only).
 *  5. Fill — six polygon fill patterns (polygon / mixed layers only).
 *  6. Line width / Fill opacity — sliders.
 *  7. Features — searchable list of every feature with select / select-all
 *     / share / delete actions.
 */
export default function LayerDetailScreen({ layerId }: { layerId: string }) {
  const layers = useAppStore((s) => s.layers);
  const setLayers = useAppStore((s) => s.setLayers);
  const updateLayerData = useAppStore((s) => s.updateLayerData);
  const moveLayerToProject = useAppStore((s) => s.moveLayerToProject);
  const renameLayerInStore = useAppStore((s) => s.renameLayer);
  const projects = useAppStore((s) => s.projects);
  const showToast = useAppStore((s) => s.showToast);

  const layer = layers.find((l) => l.id === layerId);

  const [renaming, setRenaming] = useState(false);
  const [movingProject, setMovingProject] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFeatureKeys, setSelectedFeatureKeys] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [confirmDeleteFeatures, setConfirmDeleteFeatures] = useState(false);

  // Build a "feature key" — a stable identifier for each feature inside
  // a layer. GeoJSON features don't have a guaranteed id field, so we
  // fall back to the array index when needed. Keys live for as long
  // as the layer's data array reference is stable.
  const featureItems = useMemo(() => {
    if (!layer) return [];
    return layer.data.features.map((f, i) => ({
      key: featureKey(f, i),
      name: featureName(f, i),
      feature: f,
      index: i,
    }));
  }, [layer]);

  const filteredFeatures = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return featureItems;
    return featureItems.filter((it) => it.name.toLowerCase().includes(q));
  }, [featureItems, search]);

  if (!layer) {
    return (
      <div className="flex flex-col h-full bg-greylight">
        <ScreenHeader title="Layer not found" />
      </div>
    );
  }

  function update(patch: Partial<Layer>) {
    if (!layer) return;
    const updated: Layer = {
      ...layer,
      ...patch,
      style: { ...layer.style, ...(patch.style ?? {}) },
    };
    const next = layers.map((l) => (l.id === layer.id ? updated : l));
    setLayers(next);
    saveLayer(updated);
  }

  function handleRename(newName: string) {
    if (!layer) return;
    renameLayerInStore(layer.id, newName);
    saveLayer({ ...layer, name: newName });
    setRenaming(false);
    showToast('Layer renamed');
  }

  function handleMove(toProjectId: string | undefined) {
    if (!layer) return;
    moveLayerToProject(layer.id, toProjectId);
    saveLayer({ ...layer, projectId: toProjectId });
    setMovingProject(false);
    showToast(
      toProjectId
        ? `Moved to ${projects.find((p) => p.id === toProjectId)?.name ?? 'project'}`
        : 'Moved to Unfiled',
    );
  }

  function toggleFeatureSelected(key: string) {
    setSelectedFeatureKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelectedFeatureKeys(new Set(filteredFeatures.map((f) => f.key)));
  }

  function deselectAll() {
    setSelectedFeatureKeys(new Set());
  }

  function selectedFeatures(): Feature[] {
    if (!layer) return [];
    return featureItems
      .filter((it) => selectedFeatureKeys.has(it.key))
      .map((it) => it.feature);
  }

  async function shareWithFormat(format: 'geojson' | 'gpx' | 'kml') {
    if (!layer) return;
    setSharing(false);
    const features = selectedFeatures();
    if (features.length === 0) {
      showToast('No features selected');
      return;
    }
    try {
      await shareFeatureCollection(
        `${layer.name}-selection`,
        features,
        format,
        `${layer.name} (${features.length} feature${features.length === 1 ? '' : 's'})`,
      );
    } catch (err) {
      showToast(`Share failed: ${(err as Error).message}`);
    }
  }

  function deleteSelectedFeatures() {
    if (!layer) return;
    const remaining = featureItems
      .filter((it) => !selectedFeatureKeys.has(it.key))
      .map((it) => it.feature);
    const newData: FeatureCollection = {
      ...layer.data,
      features: remaining,
    };
    updateLayerData(layer.id, newData);
    saveLayer({ ...layer, data: newData });
    setSelectedFeatureKeys(new Set());
    setConfirmDeleteFeatures(false);
    showToast(
      `Removed ${featureItems.length - remaining.length} feature${
        featureItems.length - remaining.length === 1 ? '' : 's'
      }`,
    );
  }

  // Two palettes: brand colours (top row) and high-visibility colours
  // (bottom row). The bright row is for symbols that need to pop on
  // satellite imagery — handy when several layers overlap.
  const brandSwatches = [
    colors.accent,
    colors.pink,
    colors.lavender,
    colors.skyBlue,
    colors.olive,
    colors.tealMid,
  ];
  const highVisSwatches = [
    colors.brightCyan,
    colors.royalBlue,
    colors.hotMagenta,
    colors.limeGreen,
    colors.brightOrange,
    colors.white,
  ];
  const allSwatches = [...brandSwatches, ...highVisSwatches];

  const isPoint = layer.geometryType === 'point' || layer.geometryType === 'mixed';
  const isPolygon = layer.geometryType === 'polygon' || layer.geometryType === 'mixed';
  const isLine = layer.geometryType === 'line' || layer.geometryType === 'mixed';
  const currentShape: PointShape = layer.style.pointShape ?? 'circle';
  const currentPattern: FillPattern = layer.style.fillPattern ?? 'solid';
  const currentProjectName =
    layer.projectId
      ? projects.find((p) => p.id === layer.projectId)?.name ?? 'Unknown project'
      : 'Unfiled';

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader
        title={layer.name}
        rightAction={
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="p-2 rounded-full active:bg-teal-mid"
            aria-label="Rename layer"
            title="Rename layer"
          >
            <Pencil size={18} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Project assignment */}
        <Section title="Project">
          <button
            type="button"
            onClick={() => setMovingProject(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-greylight active:bg-greylight"
          >
            <span className="flex items-center gap-2 text-teal-dark">
              <Folder size={16} className="text-teal-mid" />
              {currentProjectName}
            </span>
            <span className="text-xs text-teal-mid">Change</span>
          </button>
        </Section>

        <Section title="Colour">
          <div className="text-[11px] text-teal-mid mb-1">Brand</div>
          <div className="flex gap-2 flex-wrap mb-3">
            {brandSwatches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ style: { ...layer.style, color: c } })}
                className={`w-10 h-10 rounded-full ${
                  layer.style.color === c ? 'ring-4 ring-teal-dark' : 'ring-1 ring-greylight'
                }`}
                style={{ background: c }}
                aria-label={`Set colour ${c}`}
              />
            ))}
          </div>
          <div className="text-[11px] text-teal-mid mb-1">High visibility</div>
          <div className="flex gap-2 flex-wrap">
            {highVisSwatches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ style: { ...layer.style, color: c } })}
                className={`w-10 h-10 rounded-full ${
                  layer.style.color === c ? 'ring-4 ring-teal-dark' : 'ring-1 ring-greylight'
                }`}
                style={{ background: c }}
                aria-label={`Set colour ${c}`}
              />
            ))}
          </div>
        </Section>

        <Section title="Outline colour">
          <div className="flex gap-2 flex-wrap items-center">
            {/* "None" option — clears the outline so the symbol renders
                as a solid fill / the polygon outline matches its fill. */}
            <button
              type="button"
              onClick={() => update({ style: { ...layer.style, outlineColor: undefined } })}
              className={`w-10 h-10 rounded-full bg-white relative ${
                layer.style.outlineColor === undefined
                  ? 'ring-4 ring-teal-dark'
                  : 'ring-1 ring-greylight'
              }`}
              aria-label="No outline"
              title="No outline"
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-teal-mid font-semibold">
                None
              </span>
            </button>
            {allSwatches.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => update({ style: { ...layer.style, outlineColor: c } })}
                className={`w-10 h-10 rounded-full ${
                  layer.style.outlineColor === c ? 'ring-4 ring-teal-dark' : 'ring-1 ring-greylight'
                }`}
                style={{ background: c }}
                aria-label={`Set outline ${c}`}
              />
            ))}
          </div>
          <p className="text-xs text-teal-mid mt-2 leading-snug">
            Adds a contrasting border around point symbols and along
            polygon edges. Pick "None" for a clean solid fill.
          </p>
        </Section>

        {isPoint && (
          <Section title="Symbol">
            <div className="grid grid-cols-6 gap-2">
              {POINT_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => update({ style: { ...layer.style, pointShape: shape } })}
                  className={`aspect-square rounded-lg flex items-center justify-center bg-white ${
                    currentShape === shape ? 'ring-4 ring-teal-dark' : 'ring-1 ring-greylight'
                  }`}
                  aria-label={pointShapeLabel(shape)}
                  title={pointShapeLabel(shape)}
                >
                  <ShapePreview
                    shape={shape}
                    color={layer.style.color}
                    outline={layer.style.outlineColor}
                    size={20}
                  />
                </button>
              ))}
            </div>
          </Section>
        )}

        {isPolygon && (
          <Section title="Fill">
            <div className="grid grid-cols-3 gap-2">
              {FILL_PATTERNS.map((pattern) => (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => update({ style: { ...layer.style, fillPattern: pattern } })}
                  className={`h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center text-[11px] text-teal-dark ${
                    currentPattern === pattern ? 'ring-4 ring-teal-dark' : 'ring-1 ring-greylight'
                  }`}
                  aria-label={fillPatternLabel(pattern)}
                  title={fillPatternLabel(pattern)}
                >
                  <FillPreview
                    pattern={pattern}
                    color={layer.style.color}
                    opacity={layer.style.fillOpacity}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs text-teal-mid mt-1">{fillPatternLabel(currentPattern)}</div>
          </Section>
        )}

        {(isPoint || isPolygon) && (
          <Section title="Labels">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-teal-dark">
                {isPolygon
                  ? 'Show subtle ID watermark on each polygon'
                  : 'Show feature name next to each point'}
              </span>
              <input
                type="checkbox"
                checked={layer.style.showLabels === true}
                onChange={(e) =>
                  update({ style: { ...layer.style, showLabels: e.target.checked } })
                }
                className="w-5 h-5 accent-accent flex-shrink-0"
              />
            </label>
            <p className="text-xs text-teal-mid mt-2 leading-snug">
              Labels are drawn in black with a white outline. Pulled from the
              feature's <code>name</code>, <code>NAME</code>, <code>title</code>{' '}
              or ID property — whichever is set.
            </p>
          </Section>
        )}

        {(isLine || isPolygon) && (
          <Section title="Line width">
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={layer.style.lineWidth}
              onChange={(e) =>
                update({ style: { ...layer.style, lineWidth: Number(e.target.value) } })
              }
              className="w-full"
            />
            <div className="text-sm text-teal-mid mt-1">{layer.style.lineWidth} px</div>
          </Section>
        )}

        {isPolygon && (
          <Section title="Fill opacity">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layer.style.fillOpacity}
              onChange={(e) =>
                update({ style: { ...layer.style, fillOpacity: Number(e.target.value) } })
              }
              className="w-full"
            />
            <div className="text-sm text-teal-mid mt-1">
              {Math.round(layer.style.fillOpacity * 100)}%
            </div>
          </Section>
        )}

        {/* Feature list */}
        <Section
          title={`Features (${featureItems.length})`}
          rightAccessory={
            selectedFeatureKeys.size > 0 ? (
              <span className="text-xs text-accent font-semibold">
                {selectedFeatureKeys.size} selected
              </span>
            ) : null
          }
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-greylight rounded-lg mb-2">
            <Search size={14} className="text-teal-mid" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features by name…"
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
                disabled={selectedFeatureKeys.size === 0}
                className="flex items-center gap-1 text-accent font-semibold disabled:opacity-40"
              >
                <Share2 size={14} /> Share
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteFeatures(true)}
                disabled={selectedFeatureKeys.size === 0}
                className="flex items-center gap-1 text-pink font-semibold disabled:opacity-40"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          {/* Feature rows */}
          {filteredFeatures.length === 0 ? (
            <p className="text-xs text-teal-mid py-2 italic">
              {search.length > 0
                ? 'No features match your search.'
                : 'No features in this layer.'}
            </p>
          ) : (
            <ul className="border border-greylight rounded-lg divide-y divide-greylight max-h-72 overflow-y-auto">
              {filteredFeatures.map((it) => {
                const checked = selectedFeatureKeys.has(it.key);
                return (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => toggleFeatureSelected(it.key)}
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
                        {it.name}
                      </span>
                      <span className="text-[11px] text-teal-mid">{it.feature.geometry?.type}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <RenameDialog
        open={renaming}
        title="Rename layer"
        initialName={layer.name}
        placeholder="Layer name"
        onSave={handleRename}
        onCancel={() => setRenaming(false)}
      />

      <ProjectPickerDialog
        open={movingProject}
        currentProjectId={layer.projectId}
        projects={projects}
        onPick={handleMove}
        onCancel={() => setMovingProject(false)}
      />

      <ShareFormatPicker
        open={sharing}
        title="Share selected features"
        message={`${selectedFeatureKeys.size} feature${selectedFeatureKeys.size === 1 ? '' : 's'} from "${layer.name}"`}
        onPick={shareWithFormat}
        onCancel={() => setSharing(false)}
      />

      <ConfirmDialog
        open={confirmDeleteFeatures}
        title="Delete selected features?"
        message={`${selectedFeatureKeys.size} feature${
          selectedFeatureKeys.size === 1 ? '' : 's'
        } will be removed from "${layer.name}". This can't be undone.`}
        onConfirm={deleteSelectedFeatures}
        onCancel={() => setConfirmDeleteFeatures(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function Section({
  title,
  rightAccessory,
  children,
}: {
  title: string;
  rightAccessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-teal-mid uppercase tracking-wide">{title}</h3>
        {rightAccessory}
      </div>
      {children}
    </div>
  );
}

/** A best-effort human-readable name for a GeoJSON feature. Tries
 *  Site-ID columns first (Biologic's typical shapefile schema) before
 *  generic name / title properties. */
function featureName(f: Feature, fallbackIndex: number): string {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const candidates = [
    'Site ID', 'Site_ID', 'SiteID', 'site_id', 'siteId', 'siteID',
    'SITE_ID', 'SITEID',
    'name', 'Name', 'NAME', 'title', 'Title', 'label',
  ];
  for (const k of candidates) {
    const v = props[k];
    if (typeof v === 'string' && v.trim().length > 0) return v;
    if (typeof v === 'number') return String(v);
  }
  // Fall back to numeric ids commonly found in shapefiles.
  const idCandidates = ['id', 'ID', 'fid', 'FID', 'OBJECTID'];
  for (const k of idCandidates) {
    const v = props[k];
    if (v !== undefined && v !== null && String(v).length > 0)
      return `Feature ${v}`;
  }
  return `Feature ${fallbackIndex + 1}`;
}

/** Stable key for use in React lists + selection sets. */
function featureKey(f: Feature, index: number): string {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  for (const k of ['id', 'ID', 'fid', 'FID', 'OBJECTID']) {
    const v = props[k];
    if (v !== undefined && v !== null) return `${k}=${v}`;
  }
  if (f.id !== undefined) return `gjid=${f.id}`;
  return `idx=${index}`;
}

/** Tiny SVG preview of a point shape for the swatch grid. */
function ShapePreview({
  shape,
  color,
  outline,
  size = 20,
}: {
  shape: PointShape;
  color: string;
  /** When set, the shape gets a contrasting border. */
  outline?: string;
  size?: number;
}) {
  const half = size / 2;
  // No outline → no stroke (transparent). Stroke width = 1.5 so a
  // light outline still reads on small previews.
  const stroke = outline ?? 'none';
  const strokeWidth = outline ? 1.5 : 0;
  switch (shape) {
    case 'circle':
      return (
        <svg width={size} height={size}>
          <circle cx={half} cy={half} r={half - 2} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size}>
          <rect x={2} y={2} width={size - 4} height={size - 4} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size}>
          <polygon
            points={`${half},2 ${size - 2},${size - 2} 2,${size - 2}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size}>
          <polygon
            points={`${half},2 ${size - 2},${half} ${half},${size - 2} 2,${half}`}
            fill={color}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'star': {
      const r1 = half - 2;
      const r2 = r1 * 0.45;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? r1 : r2;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        points.push(`${half + r * Math.cos(a)},${half + r * Math.sin(a)}`);
      }
      return (
        <svg width={size} height={size}>
          <polygon points={points.join(' ')} fill={color} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    }
    case 'cross':
      // Cross strokes are the colour itself; outline (when set) is a
      // thicker contrasting stroke beneath.
      return (
        <svg width={size} height={size}>
          {outline && (
            <>
              <line x1={2} y1={2} x2={size - 2} y2={size - 2} stroke={outline} strokeWidth={5} />
              <line x1={size - 2} y1={2} x2={2} y2={size - 2} stroke={outline} strokeWidth={5} />
            </>
          )}
          <line x1={2} y1={2} x2={size - 2} y2={size - 2} stroke={color} strokeWidth={3} />
          <line x1={size - 2} y1={2} x2={2} y2={size - 2} stroke={color} strokeWidth={3} />
        </svg>
      );
  }
}

/** Tiny SVG preview of a polygon fill pattern for the swatch grid. */
function FillPreview({
  pattern,
  color,
  opacity,
}: {
  pattern: FillPattern;
  color: string;
  opacity: number;
}) {
  const fill = pattern === 'solid' ? color : 'transparent';
  void fill;
  const id = `pat-${pattern}-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={48} height={36}>
      <defs>
        {pattern !== 'solid' && (
          <pattern id={id} patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="white" />
            {pattern === 'hatch-left' && <path d="M0,0 L6,6" stroke={color} strokeWidth={1} />}
            {pattern === 'hatch-right' && <path d="M6,0 L0,6" stroke={color} strokeWidth={1} />}
            {pattern === 'horizontal' && <path d="M0,3 L6,3" stroke={color} strokeWidth={1} />}
            {pattern === 'vertical' && <path d="M3,0 L3,6" stroke={color} strokeWidth={1} />}
            {pattern === 'dots' && <circle cx={3} cy={3} r={1} fill={color} />}
          </pattern>
        )}
      </defs>
      <rect
        x={2}
        y={2}
        width={44}
        height={32}
        fill={pattern === 'solid' ? color : `url(#${id})`}
        fillOpacity={pattern === 'solid' ? opacity : 1}
        stroke={color}
        strokeWidth={1}
      />
    </svg>
  );
}

function ProjectPickerDialog({
  open,
  currentProjectId,
  projects,
  onPick,
  onCancel,
}: {
  open: boolean;
  currentProjectId: string | undefined;
  projects: { id: string; name: string }[];
  onPick: (projectId: string | undefined) => void;
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
        <h2 className="text-lg font-semibold text-teal-dark mb-3">Move layer to…</h2>
        <ul className="border border-greylight rounded-lg divide-y divide-greylight max-h-80 overflow-y-auto">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className={`w-full flex items-center justify-between px-3 py-3 active:bg-greylight ${
                  currentProjectId === p.id ? 'text-accent font-semibold' : 'text-teal-dark'
                }`}
              >
                <span>{p.name}</span>
                {currentProjectId === p.id && <Check size={16} />}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => onPick(undefined)}
              className={`w-full flex items-center justify-between px-3 py-3 active:bg-greylight ${
                !currentProjectId ? 'text-accent font-semibold' : 'text-teal-dark'
              }`}
            >
              <span>Unfiled (no project)</span>
              {!currentProjectId && <Check size={16} />}
            </button>
          </li>
        </ul>
        <div className="flex justify-end mt-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-teal-mid">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
