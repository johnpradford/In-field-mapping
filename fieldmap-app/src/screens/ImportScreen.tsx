import { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import {
  importFile,
  importShapefileFromComponents,
  isShapefileComponentExt,
  stripExtension,
} from '@/services/fileImportService';
import { saveLayer } from '@/services/databaseService';
import type { Layer } from '@/models/Layer';

/**
 * Pick a file → parse → save as a Layer. Mirrors ImportView.swift.
 *
 * Multi-file shapefile handling:
 *   - When the user selects several files at once, we group them by basename
 *     (case-insensitive). Any group whose extensions are recognised
 *     shapefile components (.shp + .dbf + .shx + optional .prj / .cpg / …)
 *     is assembled into ONE Layer named after the basename.
 *   - Standalone .geojson / .gpx / .kml / .zip files are processed normally.
 *   - A .zip that contains multiple shapefiles produces multiple Layers
 *     (one per inner .shp), each with its own default colour for editing.
 *   - Each newly-created Layer gets a different default colour from the
 *     brand palette so they're visually distinguishable on the map.
 *
 * In the browser dev environment we use a plain HTML <input type="file">
 * (rather than the Capacitor FilePicker) because FilePicker's web fallback
 * has been flaky for some browsers. In native iOS/Android builds the
 * Capacitor file picker still works because Capacitor intercepts file
 * inputs.
 *
 * Detailed errors are kept on screen — not just in a brief toast — so
 * the user can read them when something goes wrong with parsing.
 */

// Default colour palette for newly-imported Layers (brand colours minus
// orange #E87D2F which is the accent, used elsewhere; the user can edit).
const LAYER_PALETTE = [
  '#9B8EC4', // lavender
  '#E6007E', // pink
  '#577A7A', // teal mid
  '#AFA96E', // olive
  '#B8D4E3', // sky blue
  '#E87D2F', // accent orange (last resort if many layers)
];

export default function ImportScreen() {
  const layers = useAppStore((s) => s.layers);
  const setLayers = useAppStore((s) => s.setLayers);
  const activeProject = useAppStore((s) => s.activeProject);
  const showToast = useAppStore((s) => s.showToast);
  const goBack = useAppStore((s) => s.goBack);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  async function onFilesChosen(fileList: FileList | null) {
    setErrors([]);
    setLastSummary(null);
    if (!fileList || fileList.length === 0) return;

    setBusy(true);
    const newLayers: Layer[] = [];
    const failures: string[] = [];

    try {
      // ---- Step 1: group files by basename + extension ----
      type ShpGroup = { basename: string; files: { ext: string; file: File }[] };
      const shpGroups = new Map<string, ShpGroup>();
      const standaloneFiles: File[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const ext = (file.name.split('.').pop() ?? '').toLowerCase();
        const basename = stripExtension(file.name);

        if (isShapefileComponentExt(ext)) {
          const key = basename.toLowerCase();
          let group = shpGroups.get(key);
          if (!group) {
            group = { basename, files: [] };
            shpGroups.set(key, group);
          }
          group.files.push({ ext, file });
        } else {
          standaloneFiles.push(file);
        }
      }

      // ---- Step 2: process each shapefile component group ----
      for (const group of shpGroups.values()) {
        try {
          const components = await Promise.all(
            group.files.map(async ({ ext, file }) => ({
              ext,
              bytes: await file.arrayBuffer(),
            })),
          );
          const layer = await importShapefileFromComponents(
            group.basename,
            components,
            activeProject?.id,
          );
          if (layer.data.features.length === 0) {
            failures.push(
              `${group.basename}: parsed but contains 0 features — file may be empty or invalid.`,
            );
            continue;
          }
          newLayers.push(layer);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Fieldmap] shapefile group failed:', group.basename, err);
          failures.push(`${group.basename}: ${(err as Error).message}`);
        }
      }

      // ---- Step 3: process each standalone file ----
      for (const file of standaloneFiles) {
        try {
          const bytes = await file.arrayBuffer();
          const result = await importFile(file.name, bytes, activeProject?.id);
          for (const layer of result) {
            if (layer.data.features.length === 0) {
              failures.push(
                `${file.name}: parsed but contains 0 features — file may be empty or invalid.`,
              );
              continue;
            }
            newLayers.push(layer);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Fieldmap] import failed for', file.name, err);
          failures.push(`${file.name}: ${(err as Error).message}`);
        }
      }

      // ---- Step 4: assign distinct colours so layers are visually distinguishable ----
      const startIdx = layers.length;
      newLayers.forEach((layer, i) => {
        layer.style = {
          ...layer.style,
          color: LAYER_PALETTE[(startIdx + i) % LAYER_PALETTE.length],
        };
      });

      // ---- Step 5: persist + push into store ----
      for (const layer of newLayers) {
        try {
          await saveLayer(layer);
        } catch (saveErr) {
          // Saving to IndexedDB failed but the layer is still useful in-memory.
          // eslint-disable-next-line no-console
          console.warn('[Fieldmap] saveLayer failed (non-fatal):', saveErr);
        }
      }
      if (newLayers.length > 0) {
        setLayers([...layers, ...newLayers]);
      }

      const summary =
        newLayers.length > 0 && failures.length === 0
          ? newLayers.length === 1
            ? `Imported "${newLayers[0].name}" (${newLayers[0].data.features.length} features)`
            : `Imported ${newLayers.length} layers`
          : newLayers.length > 0
          ? `Imported ${newLayers.length} layers, ${failures.length} failed`
          : `All ${failures.length} imports failed`;
      setLastSummary(summary);
      showToast(summary);
      setErrors(failures);

      if (newLayers.length > 0 && failures.length === 0) {
        // Give the user a beat to see the success message, then go to the map
        setTimeout(() => goBack(), 600);
      }
    } finally {
      setBusy(false);
      // Reset input so picking the same file again re-triggers onChange
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title="Import data" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl p-6 text-center">
          <FileText size={40} className="text-teal-mid mx-auto mb-3" />
          <p className="text-teal-dark mb-2">
            Choose one or more files — GeoJSON, GPX, KML, zipped Shapefile, or
            the raw Shapefile components.
          </p>
          <p className="text-teal-mid text-sm mb-4">
            For Shapefiles you can either pick a single <strong>.zip</strong> or
            select all the components together (e.g.{' '}
            <em>bat_sites.shp + .dbf + .shx + .prj</em>). Files sharing a
            basename are grouped into one layer; different basenames become
            different layers, each with its own colour.
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".geojson,.json,.gpx,.kml,.zip,.shp,.dbf,.shx,.prj,.cpg,.qmd,.sbn,.sbx,application/json,application/geo+json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/zip"
            onChange={(e) => onFilesChosen(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50"
          >
            <Upload size={18} />
            {busy ? 'Importing…' : 'Choose files'}
          </button>
        </div>

        {lastSummary && errors.length === 0 && (
          <div className="bg-white rounded-2xl p-4 border border-greylight text-teal-dark">
            {lastSummary}
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-pink/40">
            <div className="flex items-center gap-2 text-pink font-semibold mb-2">
              <AlertCircle size={18} />
              <span>Problems importing</span>
            </div>
            <ul className="space-y-2 text-sm text-teal-dark">
              {errors.map((e, i) => (
                <li key={i} className="leading-snug break-words">
                  {e}
                </li>
              ))}
            </ul>
            <p className="text-xs text-teal-mid mt-3">
              Tip: open the browser DevTools (press F12 → Console tab) for the
              full technical error.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
