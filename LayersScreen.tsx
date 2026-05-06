import { useEffect } from 'react';
import { Eye, EyeOff, ChevronRight, Plus, Share2 } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { getLayersForProject } from '@/services/databaseService';

/** All layers for the active project, with a visibility toggle. Mirrors LayersView.swift.
 *
 * Import + Export now live as small icons in this screen's header
 * (was previously two separate items in the More menu). The plus icon
 * goes to the Import screen; the share icon goes to Export.
 */
export default function LayersScreen() {
  const layers = useAppStore((s) => s.layers);
  const setLayers = useAppStore((s) => s.setLayers);
  const toggleVisibility = useAppStore((s) => s.toggleLayerVisibility);
  const activeProject = useAppStore((s) => s.activeProject);
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    if (activeProject) getLayersForProject(activeProject.id).then(setLayers);
  }, [activeProject, setLayers]);

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
          <ul className="bg-white divide-y divide-greylight">
            {layers.map((l) => (
              <li key={l.id} className="flex items-center">
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
                  <div className="font-medium text-teal-dark">{l.name}</div>
                  <div className="text-xs text-teal-mid">
                    {l.geometryType} · {l.data.features.length} features
                  </div>
                </button>
                <span className="px-4 text-teal-mid">
                  <ChevronRight size={18} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
