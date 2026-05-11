import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { saveLayer } from '@/services/databaseService';
import { colors } from '@/theme';
import type { Layer } from '@/models/Layer';

/** Editor for a layer's display style. Mirrors LayerDetailView.swift. */
export default function LayerDetailScreen({ layerId }: { layerId: string }) {
  const layers = useAppStore((s) => s.layers);
  const setLayers = useAppStore((s) => s.setLayers);
  const layer = layers.find((l) => l.id === layerId);

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

  const swatches = [
    colors.accent,
    colors.pink,
    colors.lavender,
    colors.skyBlue,
    colors.olive,
    colors.tealMid,
  ];

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title={layer.name} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Section title="Colour">
          <div className="flex gap-2 flex-wrap">
            {swatches.map((c) => (
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
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-teal-mid uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
