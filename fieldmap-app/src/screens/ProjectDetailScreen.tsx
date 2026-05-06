import { useEffect, useState } from 'react';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { getLayersForProject, getPinsForProject, getTracksForProject } from '@/services/databaseService';
import type { Project } from '@/models/Project';

/**
 * Detail view of a single project — shows pin/track/layer counts and
 * lets the user jump into Layers / Import / Export. Mirrors
 * ProjectDetailView.swift.
 */
export default function ProjectDetailScreen({ projectId }: { projectId: string }) {
  const projects = useAppStore((s) => s.projects);
  const navigate = useAppStore((s) => s.navigate);
  const setActiveProject = useAppStore((s) => s.setActiveProject);

  const project: Project | undefined = projects.find((p) => p.id === projectId);

  const [counts, setCounts] = useState({ pins: 0, tracks: 0, layers: 0 });

  useEffect(() => {
    if (!project) return;
    setActiveProject(project);
    Promise.all([
      getPinsForProject(project.id),
      getTracksForProject(project.id),
      getLayersForProject(project.id),
    ]).then(([pins, tracks, layers]) =>
      setCounts({ pins: pins.length, tracks: tracks.length, layers: layers.length }),
    );
  }, [project, setActiveProject]);

  if (!project) {
    return (
      <div className="flex flex-col h-full bg-greylight">
        <ScreenHeader title="Project not found" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader title={project.name} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 grid grid-cols-3 text-center">
          <Stat label="Pins" value={counts.pins} />
          <Stat label="Tracks" value={counts.tracks} />
          <Stat label="Layers" value={counts.layers} />
        </div>

        <div className="bg-white rounded-2xl divide-y divide-greylight">
          <Row label="Open map" onPress={() => navigate({ name: 'map' })} />
          <Row label="Manage layers" onPress={() => navigate({ name: 'layers' })} />
          <Row label="Import data" onPress={() => navigate({ name: 'import' })} />
          <Row label="Export project" onPress={() => navigate({ name: 'export' })} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-teal-dark">{value}</div>
      <div className="text-xs text-teal-mid uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full text-left px-4 py-4 text-teal-dark active:bg-greylight"
    >
      {label}
    </button>
  );
}
