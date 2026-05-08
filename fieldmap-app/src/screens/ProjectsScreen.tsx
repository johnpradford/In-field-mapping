import { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import SwipeableRow from '@/components/SwipeableRow';
import ConfirmDialog from '@/components/ConfirmDialog';
import RenameDialog from '@/components/RenameDialog';
import { useAppStore } from '@/store/appStore';
import {
  getAllProjects,
  saveProject,
  deleteProject as dbDeleteProject,
  getPinsForProject,
  getTracksForProject,
  getLayersForProject,
} from '@/services/databaseService';
import { loadProject } from '@/services/projectService';
import type { Project } from '@/models/Project';

/**
 * Project list. Mirrors ProjectsView.swift.
 *
 * Each row shows a visibility toggle on the left (eye icon) — tapping
 * it hides ALL of that project's pins / tracks / layers from the map
 * canvas without needing to drill into Layers and toggle each one
 * individually. The toggle persists with the project itself.
 *
 * Tap a row to open the project. Swipe a row left to reveal Rename and
 * Delete — Rename pops a small dialog; Delete confirms first because it
 * cascades to all of the project's pins / tracks / layers.
 */
export default function ProjectsScreen() {
  const projects = useAppStore((s) => s.projects);
  const setProjects = useAppStore((s) => s.setProjects);
  const renameProject = useAppStore((s) => s.renameProject);
  const toggleProjectVisibility = useAppStore((s) => s.toggleProjectVisibility);
  const deleteProjectFromState = useAppStore((s) => s.deleteProjectFromState);
  const navigate = useAppStore((s) => s.navigate);
  const showToast = useAppStore((s) => s.showToast);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Swipe coordination + delete confirmation state
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // For the delete-confirm message we want to tell the user how much will
  // also be removed. Counts loaded lazily when a delete is requested.
  const [pendingCounts, setPendingCounts] = useState<{
    pins: number;
    tracks: number;
    layers: number;
  } | null>(null);
  // Rename dialog state
  const [renamingId, setRenamingId] = useState<string | null>(null);

  useEffect(() => {
    getAllProjects().then(setProjects);
  }, [setProjects]);

  async function createProject() {
    const project: Project = {
      id: crypto.randomUUID(),
      name: newName.trim() || 'Untitled project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      visible: true,
    };
    await saveProject(project);
    setProjects([project, ...projects]);
    await loadProject(project); // makes this the active project; preserves unfiled data
    setCreating(false);
    setNewName('');
    navigate({ name: 'projectDetail', projectId: project.id });
  }

  async function openProject(p: Project) {
    await loadProject(p);
    navigate({ name: 'projectDetail', projectId: p.id });
  }

  async function requestDelete(p: Project) {
    // Load counts so the user sees how much they're about to remove.
    setPendingDeleteId(p.id);
    setPendingCounts(null);
    try {
      const [pins, tracks, layers] = await Promise.all([
        getPinsForProject(p.id),
        getTracksForProject(p.id),
        getLayersForProject(p.id),
      ]);
      setPendingCounts({
        pins: pins.length,
        tracks: tracks.length,
        layers: layers.length,
      });
    } catch {
      setPendingCounts({ pins: 0, tracks: 0, layers: 0 });
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setOpenRowId(null);
    setPendingCounts(null);
    try {
      await dbDeleteProject(id); // cascades pins/tracks/layers in IndexedDB
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Fieldmap] DB delete project failed (non-fatal):', err);
    }
    deleteProjectFromState(id);
    showToast('Project deleted');
  }

  function handleRename(newName: string) {
    if (!renamingId) return;
    renameProject(renamingId, newName);
    setRenamingId(null);
    showToast('Project renamed');
  }

  const pendingProject = projects.find((p) => p.id === pendingDeleteId);
  const renamingProject = projects.find((p) => p.id === renamingId);

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
          <>
            <p className="px-4 py-2 text-xs italic text-teal-mid">
              Tap the eye to hide a project from the map. Swipe a row left to
              rename or delete. Tap a row to open.
            </p>
            <ul className="bg-white">
              {projects.map((p) => {
                const hidden = p.visible === false;
                return (
                  <li key={p.id} className="border-b border-greylight last:border-b-0">
                    <SwipeableRow
                      id={p.id}
                      openId={openRowId}
                      onOpenChange={setOpenRowId}
                      onRename={() => setRenamingId(p.id)}
                      onDelete={() => requestDelete(p)}
                    >
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleProjectVisibility(p.id)}
                          className="px-4 py-4 text-teal-dark"
                          aria-label={hidden ? 'Show project on map' : 'Hide project from map'}
                          title={hidden ? 'Show project on map' : 'Hide project from map'}
                        >
                          {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <button
                          type="button"
                          className="flex-1 text-left py-4 active:bg-greylight"
                          onClick={() => openProject(p)}
                        >
                          <div className={`font-medium ${hidden ? 'text-teal-mid' : 'text-teal-dark'}`}>
                            {p.name}
                          </div>
                          <div className="text-xs text-teal-mid">
                            Updated {new Date(p.updatedAt).toLocaleDateString()}
                          </div>
                        </button>
                      </div>
                    </SwipeableRow>
                  </li>
                );
              })}
            </ul>
          </>
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

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete project?"
        message={
          pendingProject
            ? `"${pendingProject.name}" will be permanently deleted, along with ${
                pendingCounts
                  ? `${pendingCounts.pins} pin${pendingCounts.pins === 1 ? '' : 's'}, ${pendingCounts.tracks} track${
                      pendingCounts.tracks === 1 ? '' : 's'
                    }, and ${pendingCounts.layers} layer${pendingCounts.layers === 1 ? '' : 's'}`
                  : 'all of its pins, tracks, and layers'
              }. This can't be undone.`
            : ''
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDeleteId(null);
          setOpenRowId(null);
          setPendingCounts(null);
        }}
      />

      <RenameDialog
        open={renamingId !== null}
        title="Rename project"
        initialName={renamingProject?.name ?? ''}
        placeholder="Project name"
        onSave={handleRename}
        onCancel={() => setRenamingId(null)}
      />
    </div>
  );
}
