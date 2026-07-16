/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { Tooltip } from '../ui/Tooltip';
import { Toolbar } from './Toolbar';
import { PanoramaPage } from './PanoramaPage';
import { AssetsView } from './AssetsView';
import { SkeletonEditor } from './SkeletonEditor';
import { useTourStore } from '@/store/useTourStore';
import { useFileWatch } from '@/lib/useFileWatch';
import { loadDeployModule } from '@/lib/deployLoader';
import type { ComponentType } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Image, FolderArchive, Menu } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { saveVetourFile } from '@/lib/vetourFile';
import { useProjectListStore } from '@/store/projectListStore';
import { markSave } from '@/lib/useFileWatch';
import { unlockProjectFile, lockProjectFile } from '@/lib/fileLock';
import { DEFAULT_PROJECT_NAME, FILE_FILTER_NAME, FILE_FILTER_EXTENSIONS } from '@/constants';

type EditorView = 'panorama' | 'assets';

interface EditorLayoutProps {
  onNavigateHome?: () => void;
}

export const EditorLayout = ({ onNavigateHome }: EditorLayoutProps) => {
  const project = useTourStore((state) => state.project);
  const unsavedChanges = useTourStore((state) => state.unsavedChanges);
  const savedPath = useTourStore((state) => state.savedPath);
  const setUnsavedChanges = useTourStore((state) => state.setUnsavedChanges);
  const updateProject = useTourStore((state) => state.updateProject);
  const setSavedPath = useTourStore((state) => state.setSavedPath);

  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [DeployModal, setDeployModal] = useState<ComponentType<{isOpen: boolean; onClose: () => void}> | null>(null);
  const [view, setView] = useState<EditorView>('panorama');
  const [exitModal, setExitModal] = useState<{ action: () => void } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fileWarning, setFileWarning] = useState<string | null>(null);

  useEffect(() => {
    loadDeployModule().then((mod) => {
      if (mod?.DeployModal) {
        setDeployModal(() => mod.DeployModal);
      }
    });
  }, []);

  useFileWatch(() => {
    setFileWarning('File was modified externally. Reload to see changes?');
  });

  const handleNavigateHome = () => {
    if (!unsavedChanges || !project) {
      onNavigateHome?.();
      return;
    }
    setExitModal({
      action: () => onNavigateHome?.(),
    });
  };

  const handleSaveAndExit = async () => {
    // Wait for any pending debounced updates (e.g. from PropertyPanel) to flush
    await new Promise(resolve => setTimeout(resolve, 350));
    
    const currentProject = useTourStore.getState().project;
    if (!currentProject) return;
    try {
      if (savedPath) {
        const updated = { ...currentProject, updatedAt: new Date().toISOString() };
        await unlockProjectFile();
        await saveVetourFile(savedPath, updated);
        await lockProjectFile(savedPath);
        markSave();
        updateProject(updated);
        setUnsavedChanges(false);
        const fileName = savedPath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || currentProject.name;
        useProjectListStore.getState().addProject({
          id: updated.id,
          name: updated.name === DEFAULT_PROJECT_NAME ? fileName : updated.name,
          folderPath: savedPath,
          createdAt: updated.createdAt,
          lastOpenedAt: new Date().toISOString(),
        });
      } else {
        const selected = await save({
          filters: [{ name: FILE_FILTER_NAME, extensions: [...FILE_FILTER_EXTENSIONS] }],
          defaultPath: `${currentProject.name}.vetour`,
        });
        if (!selected) return;
        const fileName = selected.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || currentProject.name;
        const name = currentProject.name === DEFAULT_PROJECT_NAME ? fileName : currentProject.name;
        const updated = { ...currentProject, name, updatedAt: new Date().toISOString() };
        await unlockProjectFile();
        await saveVetourFile(selected, updated);
        await lockProjectFile(selected);
        markSave();
        updateProject(updated);
        setSavedPath(selected);
        setUnsavedChanges(false);
        useProjectListStore.getState().addProject({
          id: updated.id,
          name,
          folderPath: selected,
          createdAt: updated.createdAt,
          lastOpenedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('Save error', e);
      return;
    }
    exitModal?.action();
    setExitModal(null);
  };

  const tabs = [
    { id: 'panorama' as const, label: 'Panorama', icon: <Image className="w-5 h-5" /> },
    { id: 'assets' as const, label: 'Assets', icon: <FolderArchive className="w-5 h-5" /> },
  ];

  const projectLoading = useTourStore((s) => s.projectLoading);
  const viewerLoading = useTourStore((s) => s.viewerLoading);

  return (
    <div className="relative flex flex-col h-full w-full bg-background text-text-primary overflow-hidden">
      {(projectLoading || viewerLoading) && (
        <div className="absolute inset-0 z-[100] bg-background">
          <SkeletonEditor />
        </div>
      )}
      
      <Toolbar onOpenDeploy={DeployModal ? () => setDeployModalOpen(true) : undefined} onNavigateHome={handleNavigateHome} />

      {fileWarning && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-sm text-amber-600 shrink-0">
          <span>{fileWarning}</span>
          <button onClick={() => setFileWarning(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-1 w-full overflow-hidden">
        <div className={`shrink-0 flex flex-col bg-surface border-r border-border py-3 transition-all duration-300 overflow-hidden gap-1 ${sidebarOpen ? 'w-[200px]' : 'w-[60px]'}`}>
          {tabs.map((tab) => {
            const isActive = view === tab.id;
            return (
              <Tooltip key={tab.id} content={sidebarOpen ? '' : tab.label}>
                <button onClick={() => setView(tab.id)}
                  className={`flex items-center w-full rounded-xl text-sm transition-all shrink-0 py-2.5 pl-[20px] ${isActive ? 'bg-primary-subtle text-primary shadow-sm' : 'text-text-secondary hover:bg-surface hover:text-text-primary'}`}>
                  <span className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'mr-3' : ''}`}>{tab.icon}</span>
                  <span className={`font-medium truncate transition-all duration-300 overflow-hidden whitespace-nowrap ${sidebarOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>{tab.label}</span>
                </button>
              </Tooltip>
            );
          })}
          <div className="flex-1" />
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center w-full rounded-xl text-sm transition-all shrink-0 py-2.5 pl-[20px] text-text-secondary hover:bg-surface hover:text-text-primary mt-2">
            <span className={`shrink-0 transition-all duration-300 ${sidebarOpen ? 'mr-3' : ''}`}>
              <Menu className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-90' : ''}`} />
            </span>
            <span className={`font-medium truncate transition-all duration-300 overflow-hidden whitespace-nowrap ${sidebarOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0'}`}>Collapse</span>
          </button>
        </div>

        <div className={`flex-1 overflow-hidden ${view === 'panorama' ? 'block' : 'hidden'}`}>
          <ErrorBoundary><PanoramaPage /></ErrorBoundary>
        </div>
        <div className={`flex-1 overflow-auto ${view === 'assets' ? 'block' : 'hidden'}`}>
          <ErrorBoundary><AssetsView /></ErrorBoundary>
        </div>
      </div>

      {DeployModal && <DeployModal isOpen={deployModalOpen} onClose={() => setDeployModalOpen(false)} />}

      <Modal
        open={!!exitModal}
        onOpenChange={(open) => { if (!open) setExitModal(null); }}
        title="Unsaved Changes"
        description="You have unsaved changes. What would you like to do?"
        size="sm"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => setExitModal(null)}>Cancel</Button>
            <Button variant="ghost" onClick={() => { exitModal?.action(); setExitModal(null); }}>Discard</Button>
            <Button onClick={handleSaveAndExit}>Save</Button>
          </div>
        }
      >
        <></>
      </Modal>
    </div>
  );
};