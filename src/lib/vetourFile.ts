/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import { gzip, ungzip } from 'pako';
import type { TourProject } from '../types/tour';
import { getMime } from '@/constants';

const V1_MAGIC = new Uint8Array([0x56, 0x54, 0x00, 0x01]);
const V2_MAGIC = new Uint8Array([0x56, 0x54, 0x00, 0x02]);

function concatBuffers(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

function writeU32(v: number): Uint8Array {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, v, true);
  return new Uint8Array(b);
}

function readU32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
}

function arraysEq(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function collectPaths(project: TourProject): string[] {
  const s = new Set<string>();
  for (const sc of project.scenes) {
    if (sc.panorama && !sc.panorama.startsWith('blob:')) s.add(sc.panorama);
    if (sc.thumbnail && !sc.thumbnail.startsWith('blob:')) s.add(sc.thumbnail);
    for (const m of sc.markers) {
      if (m.image && !m.image.startsWith('blob:')) s.add(m.image);
      if (m.data) {
        const d = m.data as Record<string, unknown>;
        if (typeof d.audio === 'string' && !d.audio.startsWith('blob:')) s.add(d.audio);
        if (typeof d.video === 'string' && !d.video.startsWith('blob:')) s.add(d.video);
      }
    }
  }
  for (const a of project.assets) {
    if (a.path && !a.path.startsWith('blob:')) s.add(a.path);
  }
  return [...s];
}

function remapPaths(project: TourProject, map: Map<string, string>): TourProject {
  const r = JSON.parse(JSON.stringify(project)) as TourProject;
  const m = (p: string) => map.get(p) ?? p;
  for (const sc of r.scenes) {
    if (sc.panorama) sc.panorama = m(sc.panorama);
    if (sc.thumbnail) sc.thumbnail = m(sc.thumbnail);
    for (const mk of sc.markers) {
      if (mk.image) mk.image = m(mk.image);
      if (mk.data) {
        const d = mk.data as Record<string, unknown>;
        if (typeof d.audio === 'string') d.audio = m(d.audio);
        if (typeof d.video === 'string') d.video = m(d.video);
      }
    }
  }
  for (const a of r.assets) {
    if (a.path) a.path = m(a.path);
  }
  return r;
}

function decompressJson(data: Uint8Array): TourProject {
  let d: Uint8Array;
  try {
    d = ungzip(data);
  } catch {
    throw new Error('Project data is corrupted (gzip decompression failed).');
  }
  let s: string;
  try {
    s = new TextDecoder().decode(d);
  } catch {
    throw new Error('Project data is corrupted (text decoding failed).');
  }
  try {
    return JSON.parse(s) as TourProject;
  } catch {
    throw new Error('Project data is corrupted (JSON parse failed).');
  }
}

// ── blob URL cache ──────────────────────────────────────────────────
// Maps original path → blob URL; tracks all objects created from .vetour
// so they can be revoked on project close / next load.
const blobUrlCache = new Map<string, string>();
const blobDataCache = new Map<string, Uint8Array>(); // blob URL → raw bytes (for save)

export function revokeVetourBlobs(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
  blobDataCache.clear();
}

export function saveVetourFile(path: string, project: TourProject): Promise<void> {
  return _saveVetourFile(path, project, readFile);
}

async function _saveVetourFile(
  path: string,
  project: TourProject,
  diskRead: (p: string) => Promise<Uint8Array>,
): Promise<void> {
  // Collect paths that are STILL filesystem references (not blob: URLs)
  const assetPaths = collectPaths(project);

  const files: { p: string; bin: Uint8Array }[] = [];

  for (const p of assetPaths) {
    try {
      const bin = await diskRead(p);
      files.push({ p, bin });
    } catch {
      // skip unreadable files
    }
  }

  // Also embed blob-referenced assets from the in-memory cache
  for (const sc of project.scenes) {
    if (sc.panorama?.startsWith('blob:')) {
      const data = blobDataCache.get(sc.panorama);
      if (data) files.push({ p: sc.panorama, bin: data });
    }
  }
  for (const a of project.assets) {
    if (a.path?.startsWith('blob:') && !files.some(f => f.p === a.path)) {
      const data = blobDataCache.get(a.path);
      if (data) files.push({ p: a.path, bin: data });
    }
  }

  const chunks: Uint8Array[] = [];
  chunks.push(writeU32(files.length));
  for (const f of files) {
    const pe = new TextEncoder().encode(f.p);
    chunks.push(writeU32(pe.length), pe, writeU32(f.bin.length), f.bin);
  }
  const binSection = concatBuffers(chunks);

  const json = JSON.stringify(project);
  const gz = gzip(new TextEncoder().encode(json));

  await writeFile(path, concatBuffers([V2_MAGIC, binSection, writeU32(gz.length), gz]));
}

export async function loadVetourFile(filePath: string): Promise<TourProject> {
  const raw = await readFile(filePath);

  if (raw.length < 4) {
    throw new Error('File is too small or corrupted.');
  }

  const magic = raw.slice(0, 4);

  // ── Legacy v1 format ──
  if (arraysEq(magic, V1_MAGIC)) {
    return decompressJson(raw.slice(4));
  }

  // ── v2 format with embedded assets ──
  if (arraysEq(magic, V2_MAGIC)) {
    // Revoke any blobs from a previous load
    revokeVetourBlobs();

    let off = 4;
    const fileCount = readU32(raw, off);
    off += 4;

    const pathMap = new Map<string, string>();

    for (let i = 0; i < fileCount; i++) {
      if (off + 4 > raw.length) throw new Error('File corrupted: unexpected end while reading asset paths.');
      const plen = readU32(raw, off);
      off += 4;
      if (off + plen > raw.length) throw new Error('File corrupted: asset path truncated.');
      const origPath = new TextDecoder().decode(raw.slice(off, off + plen));
      off += plen;

      if (off + 4 > raw.length) throw new Error('File corrupted: unexpected end while reading asset data length.');
      const dlen = readU32(raw, off);
      off += 4;
      if (off + dlen > raw.length) throw new Error('File corrupted: asset data truncated.');
      const fdata = raw.slice(off, off + dlen);
      off += dlen;

      // Create blob URL instead of writing to disk
      const mime = getMime(origPath);
      const blob = new Blob([fdata], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      blobUrlCache.set(origPath, blobUrl);
      blobDataCache.set(blobUrl, fdata);
      pathMap.set(origPath, blobUrl);
    }

    if (off + 4 > raw.length) throw new Error('File corrupted: missing JSON section length.');
    const jlen = readU32(raw, off);
    off += 4;
    if (off + jlen > raw.length) throw new Error('File corrupted: JSON section truncated.');

    const project = decompressJson(raw.slice(off, off + jlen));
    return remapPaths(project, pathMap);
  }

  throw new Error('This is not a valid Vetour project file.');
}
