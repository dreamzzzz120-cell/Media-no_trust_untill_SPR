import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir, seen=new Set(), out=[]) {
  let entries=[]; try { entries=await readdir(dir,{withFileTypes:true}); } catch { return out; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    const p=join(dir,entry.name);
    if (entry.name.startsWith('@')) { await walk(p,seen,out); continue; }
    try {
      const pkg=JSON.parse(await readFile(join(p,'package.json'),'utf8'));
      const key=`${pkg.name}@${pkg.version}`;
      if (!seen.has(key)) { seen.add(key); out.push({name:pkg.name??entry.name,version:pkg.version??'UNKNOWN',license:pkg.license??'UNKNOWN'}); }
    } catch {}
    await walk(join(p,'node_modules'),seen,out);
  }
  return out;
}
const inventory=await walk('node_modules');
inventory.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
process.stdout.write(JSON.stringify({generatedAt:new Date().toISOString(),packages:inventory},null,2));
