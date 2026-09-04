import { z } from 'zod';

const bool = z.preprocess((v) => v === 'true' || v === true, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1_000_000).max(5_000_000_000).default(524_288_000),
  UPLOAD_DIR: z.string().min(1).default('.storage/uploads'),
  API_KEY: z.string().min(32).optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  REQUIRE_API_KEY: bool.default(true),
  C2PA_VERIFY_TRUST: bool.default(true),
  C2PA_OCSP_FETCH: bool.default(false)
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.message}`);
  }
  if (parsed.data.REQUIRE_API_KEY && (!parsed.data.API_KEY || parsed.data.API_KEY.length < 32)) {
    throw new Error('REQUIRE_API_KEY=true requires API_KEY with at least 32 characters');
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.REQUIRE_API_KEY === false) {
    throw new Error('REQUIRE_API_KEY=false is forbidden in production');
  }
  return parsed.data;
}
