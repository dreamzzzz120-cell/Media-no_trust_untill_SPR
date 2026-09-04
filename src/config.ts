import { z } from 'zod';

const bool = z.preprocess((v) => v === 'true' || v === true, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().min(1_000_000).max(5_000_000_000).default(524_288_000),
  UPLOAD_DIR: z.string().min(1).default('.storage/uploads'),
  DATABASE_URL: z.string().url().optional(),
  API_KEY: z.string().min(32).optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(900_000).default(120_000),
  REQUIRE_API_KEY: bool.default(true),
  TRUST_PROXY: bool.default(false),
  PERSISTENT_STORAGE_CONFIRMED: bool.default(false),
  MALWARE_SCAN_URL: z.string().url().optional(),
  MALWARE_SCAN_TOKEN: z.string().min(16).optional(),
  MALWARE_SCAN_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  C2PA_VERIFY_TRUST: bool.default(true),
  C2PA_OCSP_FETCH: bool.default(false)
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid configuration: ${parsed.error.message}`);
  const c = parsed.data;
  if (c.NODE_ENV === 'production' && !c.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  if (c.REQUIRE_API_KEY && (!c.API_KEY || c.API_KEY.length < 32)) throw new Error('REQUIRE_API_KEY=true requires API_KEY with at least 32 characters');
  if (c.NODE_ENV === 'production' && c.REQUIRE_API_KEY === false) throw new Error('REQUIRE_API_KEY=false is forbidden in production');
  if (c.NODE_ENV === 'production' && !c.PERSISTENT_STORAGE_CONFIRMED) throw new Error('PERSISTENT_STORAGE_CONFIRMED=true is required in production');
  if (c.NODE_ENV === 'production' && !c.MALWARE_SCAN_URL) throw new Error('MALWARE_SCAN_URL is required in production');
  if (c.MALWARE_SCAN_URL && !c.MALWARE_SCAN_TOKEN) throw new Error('MALWARE_SCAN_TOKEN is required when MALWARE_SCAN_URL is configured');
  if (c.NODE_ENV === 'production' && c.MALWARE_SCAN_URL && new URL(c.MALWARE_SCAN_URL).protocol !== 'https:') throw new Error('MALWARE_SCAN_URL must use HTTPS in production');
  return c;
}
