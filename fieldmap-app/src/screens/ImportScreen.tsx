import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { importFile } from '@/services/fileImportService';
import { saveLayer } from '@/services/databaseService';

/** Pick a file → parse → save as a Layer. Mirrors ImportView.swift. */
export default function ImportScreen() {
  const layers = useAppStore((s) => s.layers);
  const setLayers = useAppStore((s) => s.setLayers);
  const activeProject = useAppStore((s) => s.activeProject);
  const showToast = useAppStore((s) => s.showToast);
  const goBack = useAppStore((s) => s.goBack);
  const [busy, setBusy] = useState(false);

  async function pickAndImport() {
    setBusy(true);
    try {
      const result = await FilePicker.pickFiles({
        types: [
          'application/json',
          'application/geo+json',
          'application/vnd.google-earth.kml+xml',
          'application/gpx+xml',
          'application/zip',
        ],
        readData: true,
        limit: 1,
      });
      const file = result.files[0];
      if (!file) return;

      // file.data is base64-encoded
      const bytes = base64ToArrayBuffer(file.data ?? '');
      const layer = await importFile(file.name, bytes, activeProject?.id);
      setLayers([...layers, layer]);
      await saveLayer(layer);
      showToast(`Imported ${layer.name}`);
      goBack();
    } catch (err) {
      showToast(`Import failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title="Import data" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-2xl p-6 text-center">
          <FileText size={40} className="text-teal-mid mx-auto mb-3" />
          <p className="text-teal-dark mb-4">
            Choose a GeoJSON, GPX, KML, or zipped Shapefile from your phone.
          </p>
          <button
            type="button"
            onClick={pickAndImport}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-xl font-medium disabled:opacity-50"
          >
            <Upload size={18} />
            {busy ? 'Importing…' : 'Choose file'}
          </button>
        </div>
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
