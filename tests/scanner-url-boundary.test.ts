import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
const base={NODE_ENV:'production',DATABASE_URL:'postgres://u:p@localhost:5432/db',API_KEY:'a'.repeat(32),MALWARE_SCAN_TOKEN:'b'.repeat(32)};
describe('scanner URL SSRF boundary',()=>{
  it('accepts the exact internal scanner endpoint when explicitly enabled',()=>{
    expect(loadConfig({...base,MALWARE_SCAN_URL:'http://malware-adapter.railway.internal/scan',MALWARE_SCAN_ALLOW_PRIVATE_HTTP:'true'}).MALWARE_SCAN_URL).toContain('/scan');
  });
  it('rejects arbitrary scanner paths',()=>{
    expect(()=>loadConfig({...base,MALWARE_SCAN_URL:'http://malware-adapter.railway.internal/proxy',MALWARE_SCAN_ALLOW_PRIVATE_HTTP:'true'})).toThrow('exact /scan');
  });
  it('rejects scanner URL credentials, query strings, and fragments',()=>{
    for(const url of ['https://user:pass@scanner.example/scan','https://scanner.example/scan?url=http://127.0.0.1','https://scanner.example/scan#x'])
      expect(()=>loadConfig({...base,MALWARE_SCAN_URL:url})).toThrow('exact /scan');
  });
});
