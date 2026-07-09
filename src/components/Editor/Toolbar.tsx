/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/Tooltip';
import { useTourStore } from '@/store/useTourStore';
import { useProjectListStore } from '@/store/projectListStore';
import { Play, Save, FolderOpen, Plus, Globe, ChevronLeft } from 'lucide-react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { saveVetourFile, loadVetourFile } from '@/lib/vetourFile';

import { openPresentWindow } from '@/lib/presentWindow';
import { useToastStore } from '@/store/toastStore';
import { markSave } from '@/lib/useFileWatch';
import { lockProjectFile, unlockProjectFile } from '@/lib/fileLock';
import { DEFAULT_PROJECT_NAME, generateProjectId, FILE_FILTER_NAME, FILE_FILTER_EXTENSIONS } from '@/constants';

interface ToolbarProps {
  onOpenDeploy?: () => void;
  onOpenAuth?: () => void;
  onNavigateHome?: () => void;
}

export const Toolbar = ({ onOpenDeploy, onNavigateHome }: ToolbarProps) => {
  const project = useTourStore((state) => state.project);
  const setProject = useTourStore((state) => state.setProject);
  const loadProject = useTourStore((state) => state.loadProject);
  const unsavedChanges = useTourStore((state) => state.unsavedChanges);
  const setUnsavedChanges = useTourStore((state) => state.setUnsavedChanges);
  const savedPath = useTourStore((state) => state.savedPath);
  const setSavedPath = useTourStore((state) => state.setSavedPath);

  const handleNew = () => {
    if (useTourStore.getState().unsavedChanges) {
      if (!confirm('You have unsaved changes. Create new project anyway?')) return;
    }
    loadProject({
      id: generateProjectId(),
      name: DEFAULT_PROJECT_NAME,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scenes: [],
      assets: [],
    });
    setSavedPath(null);
  };

  const handleOpen = async () => {
    try {
      const selected = await open({
        filters: [{ name: FILE_FILTER_NAME, extensions: [...FILE_FILTER_EXTENSIONS] }]
      });
      if (selected && typeof selected === 'string') {
        const data = await loadVetourFile(selected);
        const fileName = selected.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || data.name;
        const name = data.name === DEFAULT_PROJECT_NAME ? fileName : data.name;
        const project = { ...data, name };
        loadProject(project);
        setSavedPath(selected);
        useProjectListStore.getState().addProject({
          id: project.id,
          name,
          folderPath: selected,
          createdAt: project.createdAt,
          lastOpenedAt: new Date().toISOString(),
        });
        await lockProjectFile(selected);
      }
    } catch (e) {
      console.error('Error opening project', e);
      useToastStore.getState().addToast({ type: 'danger', message: 'Failed to open project file.' });
    }
  };

  const doSave = async (targetPath: string) => {
    if (!project) return;
    const fileName = targetPath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || project.name;
    const name = project.name === DEFAULT_PROJECT_NAME ? fileName : project.name;
    const updatedProject = { ...project, name, updatedAt: new Date().toISOString() };
    markSave();
    await unlockProjectFile();
    await saveVetourFile(targetPath, updatedProject);
    await lockProjectFile(targetPath);
    setProject(updatedProject);
    setUnsavedChanges(false);
    setSavedPath(targetPath);
    useProjectListStore.getState().addProject({
      id: updatedProject.id,
      name,
      folderPath: targetPath,
      createdAt: updatedProject.createdAt,
      lastOpenedAt: new Date().toISOString(),
    });
    useToastStore.getState().addToast({ type: 'success', message: 'Project saved successfully!' });
  };

  const handleSave = async () => {
    if (!project) return;
    try {
      if (savedPath) {
        await doSave(savedPath);
      } else {
        const selected = await save({
          filters: [{ name: FILE_FILTER_NAME, extensions: [...FILE_FILTER_EXTENSIONS] }],
          defaultPath: `${project.name}.vetour`
        });
        if (selected) {
          await doSave(selected);
        }
      }
    } catch (e) {
      console.error('Error saving project', e);
      if (savedPath && String(e).includes('NotFound')) {
        setSavedPath(null);
        if (confirm('File was deleted externally. Save to a new location?')) {
          handleSave();
        }
      } else {
        useToastStore.getState().addToast({ type: 'danger', message: 'Failed to save project.' });
      }
    }
  };

  const hasPanorama = project?.scenes.some((s) => !!s.panorama) ?? false;

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card">
      <div className="flex items-center gap-2">
        {onNavigateHome && (
          <Tooltip content="Back to Home">
            <Button variant="outline" size="sm" onClick={onNavigateHome}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Home
            </Button>
          </Tooltip>
        )}
        <Tooltip content="New Project">
          <Button variant="outline" size="sm" onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" /> New
          </Button>
        </Tooltip>
        <Tooltip content="Open Project">
          <Button variant="outline" size="sm" onClick={handleOpen}>
            <FolderOpen className="w-4 h-4 mr-2" /> Open
          </Button>
        </Tooltip>
        <Tooltip content={!unsavedChanges && !!savedPath ? 'No changes to save' : 'Save Project'}>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!unsavedChanges && !!savedPath}>
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip content={hasPanorama ? 'Present Tour' : 'Add a panorama image first'}>
          <Button variant="secondary" size="sm" disabled={!hasPanorama} onClick={() => openPresentWindow(project)}>
            <Play className="w-4 h-4 mr-2" /> Present
          </Button>
        </Tooltip>
        {onOpenDeploy && (
          <Button variant="default" size="sm" onClick={onOpenDeploy}>
            <Globe className="w-4 h-4 mr-2" /> Deploy
          </Button>
        )}
      </div>
    </div>
  );
};