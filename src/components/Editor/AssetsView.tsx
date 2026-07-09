/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { useState, useCallback, useMemo } from 'react';
import { useTourStore } from '@/store/useTourStore';
import { AssetEntry, AssetType } from '@/types/tour';
import { GridCard } from '../ui/GridCard';
import { Button } from '../ui/button';
import { Modal, ConfirmModal } from '../ui/Modal';
import { ContextMenu } from '../ui/ContextMenu';
import { Upload, Image, Music, Video, FileText, Eye, Pencil, Trash2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { stat } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import { getAssetUrl } from '@/lib/panorama';
import { useToastStore } from '@/store/toastStore';
import { MAX_UPLOAD_SIZE, MAX_UPLOAD_SIZE_MB, generateAssetId } from '@/constants';

const typeConfig: Record<AssetType, { label: string; icon: React.ReactNode; accept: string }> = {
  image: { label: 'Images', icon: <Image className="w-5 h-5" />, accept: '.png,.jpg,.jpeg,.webp' },
  audio: { label: 'Audio', icon: <Music className="w-5 h-5" />, accept: '.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus' },
  video: { label: 'Videos', icon: <Video className="w-5 h-5" />, accept: '.mp4,.webm,.mov,.avi,.mkv,.wmv,.flv,.mts' },
  document: { label: 'Documents', icon: <FileText className="w-5 h-5" />, accept: '.pdf,.txt,.md' },
};

function fileIcon(name: string): React.ReactNode {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-8 h-8 text-red-500" />;
  if (ext === 'txt' || ext === 'md') return <FileText className="w-8 h-8 text-blue-400" />;
  return <FileText className="w-8 h-8 text-text-secondary" />;
}

function AudioThumb() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-full w-full p-3">
      {[4, 7, 3, 9, 5, 8, 4].map((h, i) => (
        <span
          key={i}
          className="w-[3px] bg-primary rounded-full animate-pulse"
          style={{
            height: `${h * 10}%`,
            animationDelay: `${i * 0.12}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  );
}

function VideoThumb() {
  return (
    <div className="flex items-center justify-center h-full w-full p-3">
      <Video className="w-10 h-10 text-primary" />
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AssetsView = () => {
  const project = useTourStore((s) => s.project);
  const addAsset = useTourStore((s) => s.addAsset);
  const removeAsset = useTourStore((s) => s.removeAsset);
  const renameAsset = useTourStore((s) => s.renameAsset);
  const updateAsset = useTourStore((s) => s.updateAsset);
  const deleteScene = useTourStore((s) => s.deleteScene);
  const assets = project?.assets ?? [];
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetEntry | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ asset: AssetEntry; rect: DOMRect } | null>(null);
  const [viewTarget, setViewTarget] = useState<AssetEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<AssetEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const linkedScenes = useMemo(() => {
    if (!deleteTarget || !project) return [];
    return project.scenes.filter((s) => s.assetId === deleteTarget.id);
  }, [deleteTarget, project]);

  const handleUpload = async (type: AssetType) => {
    const config = typeConfig[type];
    try {
      setUploading(true);
      const selected = await open({
        multiple: true,
        filters: [{ name: config.label, extensions: config.accept.split(',').map(s => s.replace('.', '')) }],
      });
      setUploading(false);

      if (selected && selected.length > 0) {
        const paths = Array.isArray(selected) ? selected : [selected];
        
        paths.forEach(async (path) => {
          if (typeof path !== 'string') return;

          let size = 0;
          try {
            const meta = await stat(path);
            size = meta.size;
          } catch { /* fallback to 0 */ }

          const name = path.split(/[/\\]/).pop() || 'file';

          if (size > MAX_UPLOAD_SIZE) {
            useToastStore.getState().addToast({ type: 'warning', message: `"${name}" exceeds the ${MAX_UPLOAD_SIZE_MB} MB limit and was skipped.` });
            return;
          }

          const id = generateAssetId();
          addAsset({
            id,
            name,
            path,
            type,
            size,
            addedAt: new Date().toISOString(),
          });

          try {
            const appDir = await appDataDir();
            let outputPath: string | null = null;

            if (type === 'image') {
              const outputDir = appDir.endsWith('/') || appDir.endsWith('\\') ? appDir + 'panoramas' : appDir + '/panoramas';
              const resolutions = await invoke('process_panorama', {
                sceneId: 'asset_' + id,
                sourcePath: path,
                outputDir,
              }) as Array<{ label: string; path: string }>;
              const high = resolutions.find((r) => r.label === 'high') || resolutions[0];
              if (high) outputPath = high.path;
            } else if (type === 'audio') {
              const outputDir = appDir.endsWith('/') || appDir.endsWith('\\') ? appDir + 'media' : appDir + '/media';
              outputPath = await invoke('convert_audio', { sourcePath: path, outputDir }) as string;
            } else if (type === 'video') {
              const outputDir = appDir.endsWith('/') || appDir.endsWith('\\') ? appDir + 'media' : appDir + '/media';
              outputPath = await invoke('convert_video', { sourcePath: path, outputDir }) as string;
            }

            if (outputPath && outputPath !== path) {
              updateAsset(id, { path: outputPath });
            }
          } catch (e) {
            console.warn(`Conversion failed for ${name}, using original:`, e);
          }
        });
      }
    } catch (e) {
      console.error('Upload error', e);
      setUploading(false);
    }
  };

  const handleOpenCtx = useCallback((e: React.MouseEvent, asset: AssetEntry) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCtxMenu({ asset, rect });
  }, []);

  const handleRenameOpen = useCallback((asset: AssetEntry) => {
    setCtxMenu(null);
    setRenameTarget(asset);
    setRenameValue(asset.name);
  }, []);

  const handleRenameSave = useCallback(() => {
    if (renameTarget && renameValue.trim()) {
      renameAsset(renameTarget.id, renameValue.trim());
    }
    setRenameTarget(null);
  }, [renameTarget, renameValue, renameAsset]);

  const handleView = useCallback((asset: AssetEntry) => {
    setCtxMenu(null);
    setViewTarget(asset);
  }, []);

  const handleDeleteRequest = useCallback((asset: AssetEntry) => {
    setCtxMenu(null);
    setDeleteTarget(asset);
  }, []);

  const grouped = (['image', 'audio', 'video', 'document'] as AssetType[]).map((type) => ({
    type,
    ...typeConfig[type],
    items: assets.filter((a) => a.type === type),
  }));

  return (
    <div className="flex flex-col h-full bg-background p-8 overflow-y-auto custom-scroll">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Assets</h1>
      </div>

      {grouped.map((group) => (
        <div key={group.type} className="mb-8">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
            <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
              {group.icon} {group.label}
            </h2>
            <Button variant="outline" size="sm" onClick={() => handleUpload(group.type)} disabled={uploading}>
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {group.items.length === 0 && (
              <p className="text-sm text-text-secondary col-span-full py-4">No {group.label.toLowerCase()} yet.</p>
            )}
            {group.items.map((asset) => (
              <GridCard
                key={asset.id}
                title={asset.name}
                subtitle={formatSize(asset.size)}
                image={asset.type === 'image' ? getAssetUrl(asset.path) : undefined}
                icon={asset.type === 'image' ? undefined : asset.type === 'audio' ? <AudioThumb /> : asset.type === 'video' ? <VideoThumb /> : fileIcon(asset.name)}
                onClick={() => handleView(asset)}
                onActionClick={(e) => handleOpenCtx(e, asset)}
              />
            ))}
          </div>
        </div>
      ))}

      <ContextMenu
        open={!!ctxMenu}
        onClose={() => setCtxMenu(null)}
        anchorRect={ctxMenu?.rect}
        actions={ctxMenu ? [
          { label: 'View', onClick: () => handleView(ctxMenu.asset), icon: <Eye className="w-4 h-4" /> },
          { label: 'Rename', onClick: () => handleRenameOpen(ctxMenu.asset), icon: <Pencil className="w-4 h-4" /> },
          { label: 'Delete', onClick: () => handleDeleteRequest(ctxMenu.asset), icon: <Trash2 className="w-4 h-4" />, danger: true },
        ] : []}
      />

      {viewTarget && (
        <Modal
          open={!!viewTarget}
          onOpenChange={(open) => { if (!open) setViewTarget(null); }}
          title={viewTarget.name}
          size={viewTarget.type === 'image' ? 'xl' : 'lg'}
        >
          {viewTarget.type === 'image' ? (
            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img src={getAssetUrl(viewTarget.path)} alt={viewTarget.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          ) : viewTarget.type === 'video' ? (
            <div className="flex flex-col items-center gap-6 py-8">
              <video controls className="w-full max-w-2xl rounded-lg">
                <source src={getAssetUrl(viewTarget.path)} />
              </video>
            </div>
          ) : viewTarget.type === 'audio' ? (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="w-12 h-12 text-primary" />
              </div>
              <audio controls className="w-full max-w-md">
                <source src={getAssetUrl(viewTarget.path)} />
              </audio>
            </div>
          ) : (
            <div className="w-full h-[70vh] rounded-lg overflow-hidden bg-background">
              <iframe
                src={getAssetUrl(viewTarget.path)}
                className="w-full h-full border-0"
                title={viewTarget.name}
              />
            </div>
          )}
        </Modal>
      )}

      <Modal
        open={!!renameTarget}
        onOpenChange={(open) => { if (!open) setRenameTarget(null); }}
        title="Rename Asset"
        size="sm"
        actions={
          <div className="flex w-full justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRenameSave} disabled={!renameValue.trim() || renameValue === renameTarget?.name}>Save</Button>
          </div>
        }
      >
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(); }}
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-text-primary outline-none focus:ring-[3px] focus:ring-ring text-sm"
          autoFocus
        />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Remove Asset"
        description={
          linkedScenes.length > 0
            ? `Delete "${deleteTarget?.name}"? This will also remove ${linkedScenes.length} panorama scene(s) that use this asset.`
            : `Delete "${deleteTarget?.name}" from project assets?`
        }
        confirmLabel="Remove"
        isDanger
        onConfirm={() => {
          if (deleteTarget) {
            linkedScenes.forEach((s) => deleteScene(s.id));
            removeAsset(deleteTarget.id);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
