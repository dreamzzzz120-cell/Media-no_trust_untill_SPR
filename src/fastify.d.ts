import type { ApiIdentity } from './db.js';

declare module 'fastify' {
  interface FastifyRequest {
    mediaAuth: ApiIdentity | null;
  }
}
