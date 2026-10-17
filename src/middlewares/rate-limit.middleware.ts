import { Request } from "express";
import rateLimit, { ipKeyGenerator, Options } from "express-rate-limit";
import jwt from "jsonwebtoken";

export const GENERAL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const DEFAULT_PROD_RATE_LIMIT_MAX = 600;
export const DEFAULT_DEV_RATE_LIMIT_MAX = 3000;

export const LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
export const LOGIN_RATE_LIMIT_MAX = 5;

export const GENERAL_RATE_LIMIT_MESSAGE = {
  error: true,
  message: "Muitas requisições deste IP, tente novamente mais tarde."
};

export const LOGIN_RATE_LIMIT_MESSAGE = {
  error: true,
  message: "Muitas tentativas de login. Tente novamente mais tarde."
};

export const resolveGeneralRateLimitMax = (
  envRateLimitMax: number | string | undefined = process.env.RATE_LIMIT_MAX,
  nodeEnv: string | undefined = process.env.NODE_ENV
): number => {
  const parsed =
    typeof envRateLimitMax === "number"
      ? envRateLimitMax
      : envRateLimitMax !== undefined && String(envRateLimitMax).trim() !== ""
        ? Number(envRateLimitMax)
        : NaN;

  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return (nodeEnv || "development") === "development"
    ? DEFAULT_DEV_RATE_LIMIT_MAX
    : DEFAULT_PROD_RATE_LIMIT_MAX;
};

export const extractAuthenticatedUserId = (req: Request): number | string | null => {
  if (req.usuario?.id !== undefined && req.usuario?.id !== null) {
    return req.usuario.id;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (!scheme || !token || !/^Bearer$/i.test(scheme)) {
    return null;
  }

  const secret = process.env.JWT_SECRET || "default_dev_secret_123";
  try {
    const decoded = jwt.verify(token, secret) as { id?: number | string };
    if (decoded && typeof decoded === "object" && decoded.id !== undefined && decoded.id !== null) {
      return decoded.id;
    }
  } catch {
    return null;
  }

  return null;
};

export const generalKeyGenerator = (req: Request): string => {
  const userId = extractAuthenticatedUserId(req);
  if (userId !== null) {
    return `user:${userId}`;
  }

  const normalizedIp = ipKeyGenerator(req.ip || req.socket?.remoteAddress || "127.0.0.1");
  return `ip:${normalizedIp}`;
};

export const loginKeyGenerator = (req: Request): string => {
  const normalizedIp = ipKeyGenerator(req.ip || req.socket?.remoteAddress || "127.0.0.1");
  const rawEmail =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const emailKey = rawEmail || "unknown";
  return `login:${normalizedIp}:${emailKey}`;
};

export const createGeneralLimiter = (
  options?: Partial<Options> & { rateLimitMax?: number; nodeEnv?: string }
) => {
  const { rateLimitMax, nodeEnv, ...rateLimitOptions } = options || {};
  const max = resolveGeneralRateLimitMax(rateLimitMax, nodeEnv);

  return rateLimit({
    windowMs: GENERAL_RATE_LIMIT_WINDOW_MS,
    max,
    keyGenerator: generalKeyGenerator,
    // Requisições ao POST /auth/login já possuem o loginLimiter estrito próprio
    skip: (req) =>
      req.method === "POST" &&
      (req.originalUrl?.startsWith("/api/auth/login") || req.path === "/auth/login" || req.path === "/api/auth/login"),
    message: GENERAL_RATE_LIMIT_MESSAGE,
    ...rateLimitOptions
  });
};

export const createLoginLimiter = (options?: Partial<Options>) => {
  return rateLimit({
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    max: LOGIN_RATE_LIMIT_MAX,
    keyGenerator: loginKeyGenerator,
    message: LOGIN_RATE_LIMIT_MESSAGE,
    ...options
  });
};
