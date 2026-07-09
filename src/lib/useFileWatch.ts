/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useEffect, useRef } from 'react';
import { watch, type WatchEvent } from '@tauri-apps/plugin-fs';
import { useTourStore } from '@/store/useTourStore';

let lastSaveTime = 0;

export function markSave() {
  lastSaveTime = Date.now();
}

export function getLastSaveTime() {
  return lastSaveTime;
}

export function useFileWatch(onModify?: () => void) {
  const savedPath = useTourStore((state) => state.savedPath);
  const setSavedPath = useTourStore((state) => state.setSavedPath);
  const setUnsavedChanges = useTourStore((state) => state.setUnsavedChanges);
  const onModifyRef = useRef(onModify);
  onModifyRef.current = onModify;

  useEffect(() => {
    if (!savedPath) return;

    let unwatch: (() => void) | null = null;
    let cancelled = false;

    const startWatch = async () => {
      try {
        unwatch = await watch(savedPath, (event: WatchEvent) => {
          if (cancelled) return;
          handleWatchEvent(event);
        });
      } catch (e) {
        console.error('Failed to watch file:', e);
      }
    };

    const handleWatchEvent = (event: WatchEvent) => {
      const type = event.type;
      if (typeof type !== 'object') return;

      if ('remove' in type) {
        console.warn('File deleted externally:', savedPath);
        setSavedPath(null);
        setUnsavedChanges(true);
        return;
      }

      if ('modify' in type) {
        const modify = type.modify;
        if (modify.kind === 'rename') {
          console.warn('File renamed externally:', savedPath);
          const newPath = event.paths?.[0];
          if (newPath) {
            setSavedPath(newPath);
          } else {
            setSavedPath(null);
          }
          setUnsavedChanges(true);
          return;
        }
        // We removed the 'data'/'any' modification watch because this is a 
        // proprietary file format and external modification warnings conflict with internal saves.
      }
    };

    startWatch();

    return () => {
      cancelled = true;
      if (unwatch) unwatch();
    };
  }, [savedPath, setSavedPath, setUnsavedChanges]);
}