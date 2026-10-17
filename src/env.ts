import { z } from "zod";

const emptyToUndefined = (val: unknown) =>
  val === "" || val === undefined ? undefined : val;

export const envSchema = z.object({
  // Fail-safe: se NODE_ENV estiver ausente, assume "production" por segurança
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(["development", "production", "test"]).default("production")
  ),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(3000)),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  CORS_ORIGINS: z.preprocess(emptyToUndefined, z.string().default("*")),
  TRUST_PROXY: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(100).default(1)
  ),
  RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int("RATE_LIMIT_MAX deve ser um número inteiro")
      .min(10, "RATE_LIMIT_MAX deve ser no mínimo 10")
      .max(100000, "RATE_LIMIT_MAX deve ser no máximo 100000")
      .optional()
  ),
  RATE_LIMIT_ANON_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int("RATE_LIMIT_ANON_MAX deve ser um número inteiro")
      .min(10, "RATE_LIMIT_ANON_MAX deve ser no mínimo 10")
      .max(100000, "RATE_LIMIT_ANON_MAX deve ser no máximo 100000")
      .optional()
  ),
  RATE_LIMIT_KEY_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(10, "RATE_LIMIT_KEY_SECRET deve ter pelo menos 10 caracteres").optional()
  ),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const parseEnv = (rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig => {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    console.error("❌ Variáveis de ambiente inválidas:", parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
};

export const env: EnvConfig = process.env.VITEST
  ? (new Proxy({} as EnvConfig, {
      get(_target, prop: keyof EnvConfig) {
        return parseEnv(process.env)[prop];
      }
    }) as EnvConfig)
  : parseEnv(process.env);
