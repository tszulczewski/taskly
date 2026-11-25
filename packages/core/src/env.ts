import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
  // 32+ chars ≈ 32 random bytes once encoded; generate with `openssl rand -base64 32`.
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
  ALLOW_SIGN_UP: z.stringbool().default(false),
});

export type Env = z.infer<typeof envSchema>;

// What maintenance commands that only open the database (`auth:set-password`) need, so their
// env file holds no app secret.
const databaseEnvSchema = envSchema.pick({ DATABASE_URL: true, DATABASE_POOL_MAX: true });

/** Validates a raw env map. Throws a ZodError listing every invalid variable. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  return envSchema.parse(raw);
}

/** Validates only the database variables. Throws a ZodError listing every invalid one. */
export function parseDatabaseEnv(raw: Record<string, string | undefined>) {
  return databaseEnvSchema.parse(raw);
}

let cached: Env | undefined;

/** Validated process env, read lazily so `next build` does not need secrets. */
export function getEnv(): Env {
  return (cached ??= parseEnv(process.env));
}
