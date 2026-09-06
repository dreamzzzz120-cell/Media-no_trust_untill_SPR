import { createHash } from 'node:crypto';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join, resolve, basename } from 'node:path';
import { fileTypeFromFile } from 'file-type';
import { nanoid } from 'nanoid';
import type { MediaKind } from './domain/media.js';
const ALLOWED_IMAGE = new Set(['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif']);
const ALLOWED_VIDEO = new Set(['video/mp4','video/webm','video/quicktime','video/x-matroska']);
const ALLOWED_AUDIO = new Set(['audio/mpeg','audio/wav','audio/wave','audio/x-wav','audio/ogg','audio/flac','audio/mp4','audio/aac','audio/webm']);
export interface StoredMedia { id: string; path: string; sha256: string; sizeBytes: number; mime: string; kind: MediaKind; originalFilename: string; }
export function classifyMime(mime: string): MediaKind | null { if (ALLOWED_IMAGE.has(mime)) return 'image'; if (ALLOWED_VIDEO.has(mime)) return 'video'; if (ALLOWED_AUDIO.has(mime)) return 'audio'; return null; }
function safeFilename(name: string): string { const base = basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180); return base || 'upload'; }
export async function storeUpload(stream: NodeJS.ReadableStream, originalFilename: string, declaredMime: string, root: string, maxBytes: number): Promise<StoredMedia> {
  await mkdir(root, { recursive: true, mode: 0o700 }); const id = nanoid(21); const path = resolve(join(root, `${id}-${safeFilename(originalFilename)}`)); const rootResolved = resolve(root);
  if (!path.startsWith(rootResolved + '/')) throw new Error('Unsafe storage path');
  const hash = createHash('sha256'); let bytes = 0;
  const hashing = new Transform({ transform(chunk, _encoding, callback) { bytes += Buffer.byteLength(chunk); if (bytes > maxBytes) return callback(new Error('UPLOAD_TOO_LARGE')); hash.update(chunk); callback(null, chunk); } });
  try {
    await pipeline(stream, hashing, createWriteStream(path, { flags: 'wx', mode: 0o600 })); const info = await stat(path); if (info.size === 0) throw new Error('EMPTY_UPLOAD');
    const detected = await fileTypeFromFile(path); const declared = declaredMime.split(';')[0]?.toLowerCase() || 'application/octet-stream'; const mime = detected?.mime ?? declared; const kind = classifyMime(mime);
    if (!kind) throw new Error('UNSUPPORTED_MEDIA_TYPE'); if (declared !== 'application/octet-stream' && declared !== mime) throw new Error('MIME_MISMATCH');
    return { id, path, sha256: hash.digest('hex'), sizeBytes: info.size, mime, kind, originalFilename: safeFilename(originalFilename) };
  } catch (error) { await unlink(path).catch(() => undefined); throw error; }
}
export async function deleteStoredMedia(path: string, root: string): Promise<void> { const resolvedPath = resolve(path); const resolvedRoot = resolve(root); if (!resolvedPath.startsWith(resolvedRoot + '/')) throw new Error('Unsafe storage path'); await unlink(resolvedPath).catch(() => undefined); }
export function readStream(path: string): NodeJS.ReadableStream { return createReadStream(path); }
