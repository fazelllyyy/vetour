/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTourStore } from '@/store/useTourStore';
import { PSVViewer } from '../Editor/PSVViewer';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { getAssetUrl } from '@/lib/panorama';
import { DocumentRenderer } from './DocumentRenderer';
import { blobUrlCache } from '@/lib/vetourFile';
import { Play, Pause, X, Music, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface PresentModalState {
  type: 'image' | 'video' | 'text' | 'document' | null;
  title: string;
  imageSrc?: string;
  videoSrc?: string;
  documentSrc?: string;
  textContent?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export const PresentWindow = () => {
  const setProject = useTourStore((state) => state.setProject);
  const updateProject = useTourStore((state) => state.updateProject);
  const setPresentMode = useTourStore((state) => state.setPresentMode);
  const setActiveScene = useTourStore((state) => state.setActiveScene);
  const activeSceneId = useTourStore((state) => state.activeSceneId);
  const project = useTourStore((state) => state.project);

  const [modalState, setModalState] = useState<PresentModalState>({ type: null, title: '' });
  const [audioInfo, setAudioInfo] = useState<{ src: string; name: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modalStateRef = useRef(modalState);
  const audioInfoRef = useRef(audioInfo);
  modalStateRef.current = modalState;
  audioInfoRef.current = audioInfo;

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const raw = await invoke<string | null>('get_present_data');
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) {
            const data = parsed.project || parsed; // backward compatibility
            const assetMap = parsed.assetMap || {};
            
            if (Object.keys(assetMap).length > 0) {
              try {
                for (const [k, v] of Object.entries(assetMap)) {
                  blobUrlCache.set(k, v as string);
                }
              } catch (e) {
                console.error('[PresentWindow] Failed to load blobUrlCache module', e);
              }
            }

            setProject(data);
            const startSceneId = data.defaultSceneId || (data.scenes?.length > 0 ? data.scenes[0].id : null);
            if (startSceneId) setActiveScene(startSceneId);
          }
          await invoke('clear_present_data');
        }
      } catch (err) {
        console.error('[PresentWindow] Failed to load present data:', err);
      }
      if (!cancelled) setLoading(false);
    };

    loadData();
    setPresentMode(true);

    let unlisten: (() => void) | undefined;
    listen<string>('sync-present-data', (e) => {
      try {
        const data = JSON.parse(e.payload);
        updateProject(data);
        // Don't auto-change scene on sync, keep user where they are
      } catch (err) {
        console.error('[PresentWindow] Failed to sync data:', err);
      }
    }).then((f) => {
      unlisten = f;
    });

    const handleKey = async (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const ms = modalStateRef.current;
      if (ms.type) {
        setModalState({ type: null, title: '' });
        return;
      }
      if (audioInfoRef.current) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setAudioInfo(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        return;
      }
      await emit('present-closed');
      getCurrentWindow().destroy();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKey);
      if (unlisten) unlisten();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [setProject, updateProject, setPresentMode, setActiveScene]);

  const playAudio = useCallback((src: string, name: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(getAssetUrl(src));
    audio.loop = false;
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {});
    audioRef.current = audio;
    setAudioInfo({ src, name });
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioInfo(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    if (!activeSceneId || !project) return;
    const scene = project.scenes.find(s => s.id === activeSceneId);
    if (!scene) return;

    // Selalu stop audio dari scene sebelumnya saat pindah scene
    stopAudio();

    const autoPlayMarker = scene.markers.find(m => {
      const md = (m.data ?? {}) as Record<string, unknown>;
      return (md.action === 'play_sound' || !!md.audio) && md.autoPlay;
    });

    if (autoPlayMarker) {
      const md = (autoPlayMarker.data ?? {}) as Record<string, unknown>;
      const audioPath = md.audio as string | undefined;
      if (audioPath) {
        const name = project.assets.find(a => a.path === audioPath)?.name || 'Audio';
        playAudio(audioPath, name);
      }
    }
  }, [activeSceneId, project, playAudio, stopAudio]);

  const handleMarkerClick = useCallback((markerId: string) => {
    const state = useTourStore.getState();
    const activeScene = state.project?.scenes.find(s => s.id === state.activeSceneId);
    if (!activeScene) return;
    const marker = activeScene.markers.find(m => m.id === markerId);
    if (!marker) return;

    const md = (marker.data ?? {}) as Record<string, unknown>;
    const action = (md.action as string) || (marker.image ? 'show_image' : marker.content ? 'show_text' : 'show_text');
    const tooltip = typeof marker.tooltip === 'string' ? marker.tooltip : marker.tooltip?.content || '';

    switch (action) {
      case 'show_image':
        if (marker.image) {
          setModalState({ type: 'image', title: tooltip, imageSrc: getAssetUrl(marker.image) });
        }
        break;
      case 'show_video': {
        const videoPath = md.video as string | undefined;
        if (videoPath) {
          stopAudio();
          setModalState({ type: 'video', title: tooltip, videoSrc: getAssetUrl(videoPath) });
        }
        break;
      }
      case 'show_document': {
        const documentPath = md.document as string | undefined;
        if (documentPath) {
          stopAudio();
          setModalState({ type: 'document', title: tooltip, documentSrc: getAssetUrl(documentPath) });
        }
        break;
      }
      case 'play_sound': {
        const audioPath = md.audio as string | undefined;
        if (audioPath) {
          const name = state.project?.assets.find(a => a.path === audioPath)?.name || 'Audio';
          playAudio(audioPath, name);
        }
        break;
      }
      case 'show_text':
      default:
        setModalState({ 
          type: 'text', 
          title: tooltip, 
          textContent: marker.content || tooltip || 'No content provided.',
          textAlign: (md.textAlign as 'left' | 'center' | 'right') || 'center'
        });
        break;
    }
  }, [playAudio, stopAudio]);

  const closeModal = useCallback(() => {
    setModalState({ type: null, title: '' });
  }, []);



  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex-1 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-primary">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium">Loading tour data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 bg-background overflow-hidden relative">
      <PSVViewer onPresentMarkerClick={handleMarkerClick} />

      {modalState.type === 'image' && modalState.imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}>
          <div className="relative max-h-[50vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={modalState.imageSrc}
              alt={modalState.title}
              className="max-w-[90vw] max-h-[50vh] w-auto h-auto object-contain"
            />
          </div>
        </div>
      )}

      {modalState.type === 'video' && modalState.videoSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}>
          <div className="relative w-[50vw] max-w-4xl rounded-lg overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              controls
              autoPlay
              className="w-full h-[50vh] object-contain"
            >
              <source src={modalState.videoSrc} />
            </video>
          </div>
        </div>
      )}

      {modalState.type === 'document' && modalState.documentSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}>
          <div className="w-fit min-w-[300px] max-w-[90%] max-h-[70vh] rounded-lg border border-border bg-surface text-text-primary overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-lg truncate mr-4">{modalState.title}</h3>
              <button
                onClick={closeModal}
                className="text-text-secondary hover:text-text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0 bg-white">
              <DocumentRenderer
                src={modalState.documentSrc}
                title={modalState.title}
              />
            </ScrollArea>
          </div>
        </div>
      )}

      {modalState.type === 'text' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeModal}>
          <div className="w-fit min-w-[300px] max-w-[70vw] max-h-[70vh] rounded-lg border border-border bg-surface text-text-primary overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-lg truncate mr-4">{modalState.title}</h3>
              <button
                onClick={closeModal}
                className="text-text-secondary hover:text-text-primary transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5">
                <p 
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ textAlign: modalState.textAlign || 'center' }}
                >
                  {modalState.textContent}
                </p>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {audioInfo && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3 shadow-lg min-w-[280px] animate-slide-up">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Music className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{audioInfo.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-text-secondary tabular-nums shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={togglePlayPause}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={stopAudio}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};