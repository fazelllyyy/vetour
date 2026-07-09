import { convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import { getMime } from '@/constants';

export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('asset:') || path.startsWith('blob:')) return path;
  try { return convertFileSrc(path); } catch { return path; }
}

const panoramaBlobCache = new Map<string, string>();

export function revokePanoramaBlobs() {
  for (const url of panoramaBlobCache.values()) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
  panoramaBlobCache.clear();
}

export async function resolvePanoramaUrl(path: string): Promise<string> {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;

  const cached = panoramaBlobCache.get(path);
  if (cached) return cached;

  try {
    const bytes = await readFile(path);
    const mime = getMime(path) || 'image/jpeg';
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    panoramaBlobCache.set(path, url);
    return url;
  } catch (err) {
    console.warn('[PSV] File read failed, falling back to asset URL:', err);
    const fallbackUrl = getAssetUrl(path);
    panoramaBlobCache.set(path, fallbackUrl);
    return fallbackUrl;
  }
}
