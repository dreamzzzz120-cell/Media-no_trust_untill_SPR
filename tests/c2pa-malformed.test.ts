import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectC2pa } from '../src/provenance/c2pa.js';

describe('C2PA malformed input fail-closed', () => {
  it('never upgrades malformed bytes to verified provenance', async () => {
    const dir=await mkdtemp(join(tmpdir(),'c2pa-malformed-'));
    const path=join(dir,'malformed.jpg');
    const junk=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe1]),Buffer.alloc(4096,0x41),Buffer.from([0xff,0xd9])]);
    await writeFile(path,junk);
    const result=await inspectC2pa(path,true);
    expect(result.status).not.toBe('verified');
    expect(result.trusted).toBe(false);
  });
});
