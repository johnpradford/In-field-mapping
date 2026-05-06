import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { useAppStore } from '@/store/appStore';
import { getAllProjects, saveProject } from '@/services/databaseService';
import type { Project } from '@/models/Project';

/** Project list. Mirrors ProjectsView.swift. */
export default function ProjectsScreen() {
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const setActiveProject = useAppStore((s) => s.setActiveProject);
  const navigate = useAppStore((s) => s.navigate);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    getAllProjects().then(setProjects);
  }, [setProjects]);

  async function createProject() {
    const project: Project = {
      id: crypto.randomUUID(),
      name: newName.trim() || 'Untitled project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(project);
    setProjects([project, ...projects]);
    setActiveProject(project);
    setCreating(false);
    setNewName('');
    navigate({ name: 'projectDetail', projectId: project.id });
  }

  return (
    <div className="flex flex-col h-full bg-greylight">
      <ScreenHeader
        title="Projects"
        rightAction={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 text-white"
          >
            <Plus size={18} /> New
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <p className="p-6 text-teal-mid text-center">
            No projects yet. Tap "New" to create one.
          </p>
        ) : (
          <ul className="divide-y divide-greylight bg-white">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-4 active:bg-greylight"
                  onClick={() => {
                    setActiveProject(p);
                    navigate({ name: 'projectDetail', projectId: p.id });
                  }}
                >
                  <div className="font-medium text-teal-dark">{p.name}</div>
                  <div className="text-xs text-teal-mid">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <div
          className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center px-6"
          onClick={() => setCreating(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-teal-dark mb-3">New project</h2>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 border border-greylight rounded-lg text-base"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 text-teal-mid"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createProject}
                className="px-4 py-2 bg-accent text-white rounded-lg font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
