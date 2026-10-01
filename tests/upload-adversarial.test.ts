import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { mkdtemp, readdir, lstat, readFile, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storeUpload, deleteStoredMedia, promoteStoredMedia } from '../src/storage.js';

const tinyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082','hex');

describe('upload adversarial boundary', () => {
  it('rejects a content-length lie at the storage boundary by counting streamed bytes', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    await expect(storeUpload(Readable.from([tinyPng,tinyPng]),'a.png','image/png',root,tinyPng.length)).rejects.toThrow('UPLOAD_TOO_LARGE');
    expect(await readdir(join(root,'quarantine'))).toEqual([]);
  });
  it('rejects MIME spoofing', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    await expect(storeUpload(Readable.from(tinyPng),'a.jpg','image/jpeg',root,1024*1024)).rejects.toThrow('MIME_MISMATCH');
  });
  it('does not trust an executable-looking extension', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    const media=await storeUpload(Readable.from(tinyPng),'../../payload.exe','image/png',root,1024*1024);
    expect(media.mime).toBe('image/png');
    expect(media.originalFilename).toBe('payload.exe');
    expect(media.path).not.toContain('..');
  });
  it('bounds huge filename metadata', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    const media=await storeUpload(Readable.from(tinyPng),'x'.repeat(10000)+'.png','image/png',root,1024*1024);
    expect(media.originalFilename.length).toBeLessThanOrEqual(180);
  });
  it('cleans interrupted uploads', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    const broken=new Readable({read(){this.push(tinyPng.subarray(0,10));this.destroy(new Error('INTERRUPTED'));}});
    await expect(storeUpload(broken,'a.png','image/png',root,1024*1024)).rejects.toThrow('INTERRUPTED');
    expect(await readdir(join(root,'quarantine'))).toEqual([]);
  });
  it('rejects a symlink masquerading as quarantined media', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    await mkdir(join(root,'quarantine'),{recursive:true});
    const outside=join(root,'outside.png'); await writeFile(outside,tinyPng);
    const link=join(root,'quarantine','link.png'); await symlink(outside,link);
    await expect(promoteStoredMedia({id:'x',path:link,sha256:'0'.repeat(64),sizeBytes:tinyPng.length,mime:'image/png',kind:'image',originalFilename:'link.png'},root)).rejects.toThrow('UNSAFE_MEDIA_FILE');
  });
  it('rejects an image/archive polyglot', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    const polyglot=Buffer.concat([tinyPng,Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.alloc(32),Buffer.from([0x50,0x4b,0x05,0x06])]);
    await expect(storeUpload(Readable.from(polyglot),'polyglot.png','image/png',root,1024*1024)).rejects.toThrow('ARCHIVE_POLYGLOT_REJECTED');
    expect(await readdir(join(root,'quarantine'))).toEqual([]);
  });
  it('rejects a pure archive before any decompression or parser expansion', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    const zip=Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]),Buffer.alloc(256)]);
    await expect(storeUpload(Readable.from(zip),'bomb.png','application/octet-stream',root,1024*1024)).rejects.toThrow('UNSUPPORTED_MEDIA_TYPE');
  });
  it('refuses deletion outside the configured storage root', async () => {
    const root=await mkdtemp(join(tmpdir(),'constellation-upload-'));
    await expect(deleteStoredMedia('/etc/passwd',root)).rejects.toThrow('Unsafe storage path');
  });
});
