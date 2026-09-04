import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storeUpload } from '../src/storage.js';

describe('storage boundary', () => {
  it('rejects empty uploads', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'spr-media-'));
    await expect(storeUpload(Readable.from([]), 'x.jpg', 'image/jpeg', dir, 1024 * 1024)).rejects.toThrow('EMPTY_UPLOAD');
    await rm(dir, { recursive: true, force: true });
  });
  it('rejects unsupported content', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'spr-media-'));
    await expect(storeUpload(Readable.from(['not an image']), 'x.txt', 'text/plain', dir, 1024 * 1024)).rejects.toThrow('UNSUPPORTED_MEDIA_TYPE');
    await rm(dir, { recursive: true, force: true });
  });
});
