/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ThemeProvider } from './contexts/ThemeContext';
import { save } from '@tauri-apps/plugin-dialog';
import { saveVetourFile } from '@/lib/vetourFile';
import { Titlebar } from './components/Titlebar';
import { EditorLayout } from './components/Editor/EditorLayout';
import { HomePage } from './components/Home/HomePage';
import { PresentWindow } from './components/Present/PresentWindow';
import { ToastContainer } from './components/ui/Toast';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/button';
import { useTourStore } from './store/useTourStore';
import { useProjectListStore } from './store/projectListStore';
import { useToastStore } from './store/toastStore';
import { markSave } from '@/lib/useFileWatch';
import { lockProjectFile, unlockProjectFile } from './lib/fileLock';
import { DEFAULT_PROJECT_NAME, FILE_FILTER_NAME, FILE_FILTER_EXTENSIONS } from './constants';

const appWindow = getCurrentWindow();

function App() {
  const [page, setPage] = useState<'home' | 'editor'>('home');
  const [isPresent, setIsPresent] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showPresentActiveModal, setShowPresentActiveModal] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const isPresentModeActive = useTourStore((state) => state.isPresentMode);
  const closeAfterSave = useRef(false);

  const pageRef = useRef(page);
  const isPresentRef = useRef(isPresent);

  useEffect(() => {
    pageRef.current = page;
    isPresentRef.current = isPresent;
  }, [page, isPresent]);

  // Suppress browser default context menu everywhere
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  // Sync project changes to Present Window live
  useEffect(() => {
    const unsub = useTourStore.subscribe((state, prevState) => {
      // Only emit from Editor window to Present window
      if (state.isPresentMode) return;
      if (state.project && state.project !== prevState.project) {
        import('@tauri-apps/api/event').then(({ emit }) => {
          emit('sync-present-data', JSON.stringify(state.project));
        });
      }
    });
    return unsub;
  }, []);

  // Detect present mode from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'present') {
      setIsPresent(true);
      return;
    }

    // Main window initialization
    if (dataReady) {
      const init = async () => {
        const isVisible = await appWindow.isVisible();
        if (isVisible) return;
        await appWindow.maximize();
        await appWindow.show();
      };
      init();
    }
  }, [dataReady]);

  // Intercept window close (Alt+F4 / OS close button)
  useEffect(() => {
    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      event.preventDefault(); // Always prevent default, we will destroy manually

      if (isPresentRef.current) {
        // Let Present window close normally, but notify main window
        const { emit } = await import('@tauri-apps/api/event');
        await emit('present-closed');
        appWindow.destroy();
        return;
      }

      const state = useTourStore.getState();
      if (state.isPresentMode) {
        setShowPresentActiveModal(true);
        return;
      }
      
      if (pageRef.current === 'editor' && state.project && state.unsavedChanges) {
        closeAfterSave.current = true;
        setShowExitModal(true);
      } else {
        if (pageRef.current === 'editor') {
          await unlockProjectFile();
        }
        appWindow.destroy();
      }
    });
    return () => { unlistenPromise.then(fn => fn()); };
  }, []);

  const performSaveAndContinue = async () => {
    const state = useTourStore.getState();
    const project = state.project;
    if (!project) return true;

    try {
      if (state.savedPath) {
        const updated = { ...project, updatedAt: new Date().toISOString() };
        markSave();
        await unlockProjectFile();
        await saveVetourFile(state.savedPath, updated);
        await lockProjectFile(state.savedPath);
        useTourStore.getState().updateProject(updated);
        useTourStore.getState().setUnsavedChanges(false);
        const addProject = useProjectListStore.getState().addProject;
        const fileName = state.savedPath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || project.name;
        addProject({
          id: project.id,
          name: project.name === DEFAULT_PROJECT_NAME ? fileName : project.name,
          folderPath: state.savedPath,
          createdAt: project.createdAt,
          lastOpenedAt: new Date().toISOString(),
        });
      } else {
        const selected = await save({
          filters: [{ name: FILE_FILTER_NAME, extensions: [...FILE_FILTER_EXTENSIONS] }],
          defaultPath: `${project.name}.vetour`,
        });
        if (!selected) return false;
        const fileName = selected.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || project.name;
        const name = project.name === DEFAULT_PROJECT_NAME ? fileName : project.name;
        const updated = { ...project, name, updatedAt: new Date().toISOString() };
        markSave();
        await unlockProjectFile();
        await saveVetourFile(selected, updated);
        await lockProjectFile(selected);
        useTourStore.getState().updateProject(updated);
        useTourStore.getState().setSavedPath(selected);
        useTourStore.getState().setUnsavedChanges(false);
        const addProject = useProjectListStore.getState().addProject;
        addProject({
          id: updated.id,
          name,
          folderPath: selected,
          createdAt: updated.createdAt,
          lastOpenedAt: new Date().toISOString(),
        });
      }
      return true;
    } catch (e) {
      console.error('Save error', e);
      useToastStore.getState().addToast({ type: 'danger', message: 'Failed to save project.' });
      return false;
    }
  };

  const handleCloseRequest = () => {
    appWindow.close();
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleDiscardExit = () => {
    setShowExitModal(false);
    if (closeAfterSave.current) {
      // Clear unsaved changes so the interceptor doesn't prevent closing again
      useTourStore.getState().setUnsavedChanges(false);
      // Wait a bit to let the modal close animation finish
      setTimeout(async () => {
        await unlockProjectFile();
        appWindow.destroy();
      }, 150);
    }
  };

  const handleSaveExit = async () => {
    const ok = await performSaveAndContinue();
    if (!ok) return;
    setShowExitModal(false);
    if (closeAfterSave.current) {
      // Unsaved changes is already cleared inside performSaveAndContinue
      setTimeout(() => {
        appWindow.destroy();
      }, 150);
    }
  };

  const handleNavigateToEditor = useCallback(() => {
    setPage('editor');
  }, []);

  const handleNavigateHome = useCallback(async () => {
    const state = useTourStore.getState();
    if (state.isPresentMode) {
      setShowPresentActiveModal(true);
      return;
    }
    await unlockProjectFile();
    setPage('home');
  }, []);

  if (isPresent) {
    return (
      <ThemeProvider>
        <div className="h-screen flex flex-col bg-background overflow-hidden">
          <Titlebar page="present" onCloseRequest={async () => {
            const { emit } = await import('@tauri-apps/api/event');
            await emit('present-closed');
            appWindow.destroy();
          }} />
          <div className="flex-1 min-h-0 relative">
            <PresentWindow />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col">
        <Titlebar page={page} onCloseRequest={handleCloseRequest} />
        <div className="flex-1 min-h-0 relative">
          {page === 'home' ? (
            <HomePage 
              onNavigateToEditor={handleNavigateToEditor} 
              onReady={() => setDataReady(true)} 
            />
          ) : (
            <EditorLayout onNavigateHome={handleNavigateHome} />
          )}

          {isPresentModeActive && page === 'editor' && (
            <div 
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
              onClick={() => setShowPresentActiveModal(true)}
            />
          )}
        </div>
      </div>

      <Modal
        open={showExitModal}
        onOpenChange={(open) => { if (!open) handleCancelExit(); }}
        title="Unsaved Changes"
        description="You have unsaved changes. What would you like to do?"
        size="sm"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={handleCancelExit}>Cancel</Button>
            <Button variant="ghost" onClick={handleDiscardExit}>Discard</Button>
            <Button onClick={handleSaveExit}>Save</Button>
          </div>
        }
      >
        <></>
      </Modal>

      <Modal
        open={showPresentActiveModal}
        onOpenChange={setShowPresentActiveModal}
        title="Present Mode is Active"
        description="You cannot edit the project or close the application while Present Mode is active. Please close the Present window first."
        size="sm"
        actions={
          <div className="flex w-full justify-end">
            <Button onClick={() => setShowPresentActiveModal(false)}>Got it</Button>
          </div>
        }
      >
        <></>
      </Modal>

      <ToastContainer />
    </ThemeProvider>
  );
}

export default App;