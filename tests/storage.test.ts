import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promoteStoredMedia, storeUpload } from '../src/storage.js';

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

  it('quarantines bytes until explicitly promoted and rejects arbitrary promotion paths', async () => { const dir=await mkdtemp(join(tmpdir(),'spr-media-')); const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=','base64'); const stored=await storeUpload(Readable.from([png]),'sample.png','image/png',dir,1024*1024); expect(stored.path).toContain(join(dir,'quarantine')); await expect(access(stored.path)).resolves.toBeUndefined(); const clean=await promoteStoredMedia(stored,dir); expect(clean.path).toContain(join(dir,'clean')); await expect(access(clean.path)).resolves.toBeUndefined(); await expect(access(stored.path)).rejects.toThrow(); await expect(promoteStoredMedia({...clean,path:clean.path},dir)).rejects.toThrow('MEDIA_NOT_QUARANTINED'); await rm(dir,{recursive:true,force:true}); });
