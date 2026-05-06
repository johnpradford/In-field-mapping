import { useEffect } from 'react';
import { Eye, EyeOff, ChevronRight } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { getLayersForProject } from '@/services/databaseService';

/** All layers for the active project, with a visibility toggle. Mirrors LayersView.swift. */
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
      <ScreenHeader title="Layers" />
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <p className="p-6 text-teal-mid text-center">
            No layers yet. Use the Import screen to add a file.
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
