import { describe,expect,it } from 'vitest';
import { createObserverStore } from '../src/observers.js';

describe('observable observers',()=>{
 it('keeps observer identity tenant scoped',async()=>{
  const store=createObserverStore();
  const observer=await store.register('tenant-a',{name:'Execution gateway',observerType:'GATEWAY',version:'1.0.0',collectionMethod:'Signed execution callback',authorityScope:'tool execution results',signingIdentity:'gateway-key-1',healthState:'HEALTHY',lastVerifiedAt:'2026-09-28T18:00:00.000Z'});
  expect((await store.get('tenant-a',observer.id))?.authorityScope).toBe('tool execution results');
  expect(await store.get('tenant-b',observer.id)).toBeNull();
  await store.close();
 });
});
