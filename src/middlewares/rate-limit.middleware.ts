import { createHmac } from "node:crypto";
import { Request, Response, NextFunction, RequestHandler } from "express";
import rateLimit, { ipKeyGenerator, Options } from "express-rate-limit";
import jwt from "jsonwebtoken";

export const GENERAL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const DEFAULT_PROD_RATE_LIMIT_MAX = 600;
export const DEFAULT_DEV_RATE_LIMIT_MAX = 3000;

export const DEFAULT_PROD_ANON_RATE_LIMIT_MAX = 120;
export const DEFAULT_DEV_ANON_RATE_LIMIT_MAX = 600;

export const RATE_LIMIT_MIN_ALLOWED = 10;
export const RATE_LIMIT_MAX_ALLOWED = 100000;

export const LOGIN_IP_EMAIL_WINDOW_MS = 60 * 1000; // 1 minuto
export const LOGIN_IP_EMAIL_MAX = 5;

export const LOGIN_IP_WINDOW_MS = 60 * 1000; // 1 minuto
export const LOGIN_IP_MAX = 20;

export const LOGIN_EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
export const LOGIN_EMAIL_MAX = 10;

export const MAX_EMAIL_LENGTH = 254;

export const GENERAL_RATE_LIMIT_MESSAGE = {
  error: true,
  message: "Muitas requisições deste IP, tente novamente mais tarde."
};

export const LOGIN_RATE_LIMIT_MESSAGE = {
  error: true,
  message: "Muitas tentativas de login. Tente novamente mais tarde."
};

const getRateLimitKeySecret = (overrideSecret?: string): string => {
  return (
    overrideSecret ||
    process.env.RATE_LIMIT_KEY_SECRET ||
    process.env.JWT_SECRET ||
    "default_rate_limit_hmac_secret_key"
  );
};

export const hashForRateLimit = (value: string, secret?: string): string => {
  return createHmac("sha256", getRateLimitKeySecret(secret))
    .update(value)
    .digest("hex");
};

export const maskAndHashIp = (rawIp: string, secret?: string): string => {
  const normalized = ipKeyGenerator(rawIp || "127.0.0.1");
  const shortHash = hashForRateLimit(normalized, secret).slice(0, 12);
  if (normalized.includes(".")) {
    const parts = normalized.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24#${shortHash}`;
    }
  }
  return `ipv6#${shortHash}`;
};

export const normalizeValidEmail = (rawEmail: unknown): string | null => {
  if (typeof rawEmail !== "string") {
    return null;
  }
  const trimmed = rawEmail.trim().toLowerCase();
  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) {
    return null;
  }
  return trimmed;
};

const validateRateLimitBounds = (val: unknown, varName: string): number => {
  const num = typeof val === "number" ? val : Number(String(val).trim());
  if (
    !Number.isFinite(num) ||
    !Number.isInteger(num) ||
    num < RATE_LIMIT_MIN_ALLOWED ||
    num > RATE_LIMIT_MAX_ALLOWED
  ) {
    throw new Error(
      `${varName} inválido (${String(val)}): deve ser um inteiro entre ${RATE_LIMIT_MIN_ALLOWED} e ${RATE_LIMIT_MAX_ALLOWED}.`
    );
  }
  return num;
};

export const resolveGeneralRateLimitMax = (
  envRateLimitMax: number | string | undefined = process.env.RATE_LIMIT_MAX,
  nodeEnv: string | undefined = process.env.NODE_ENV
): number => {
  if (envRateLimitMax !== undefined && String(envRateLimitMax).trim() !== "") {
    return validateRateLimitBounds(envRateLimitMax, "RATE_LIMIT_MAX");
  }

  // Fail-safe: somente NODE_ENV === 'development' estrito recebe o limite folgado
  return nodeEnv === "development"
    ? DEFAULT_DEV_RATE_LIMIT_MAX
    : DEFAULT_PROD_RATE_LIMIT_MAX;
};

export const resolveAnonRateLimitMax = (
  envRateLimitAnonMax: number | string | undefined = process.env.RATE_LIMIT_ANON_MAX,
  nodeEnv: string | undefined = process.env.NODE_ENV
): number => {
  if (envRateLimitAnonMax !== undefined && String(envRateLimitAnonMax).trim() !== "") {
    return validateRateLimitBounds(envRateLimitAnonMax, "RATE_LIMIT_ANON_MAX");
  }

  // Fail-safe: somente NODE_ENV === 'development' estrito recebe o limite folgado
  return nodeEnv === "development"
    ? DEFAULT_DEV_ANON_RATE_LIMIT_MAX
    : DEFAULT_PROD_ANON_RATE_LIMIT_MAX;
};

export const extractAuthenticatedUserId = (req: Request): number | string | null => {
  if (req.usuario?.id !== undefined && req.usuario?.id !== null) {
    return req.usuario.id;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") {
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

export const createLoginIpEmailKeyGenerator = (keySecret?: string) => {
  return (req: Request): string => {
    const normalizedIp = ipKeyGenerator(req.ip || req.socket?.remoteAddress || "127.0.0.1");
    const validEmail = normalizeValidEmail(req.body?.email);
    if (!validEmail) {
      return `login-ip-email:${normalizedIp}`;
    }
    const emailHash = hashForRateLimit(validEmail, keySecret);
    return `login-ip-email:${normalizedIp}:${emailHash}`;
  };
};

export const loginKeyGenerator = createLoginIpEmailKeyGenerator();

export const loginIpKeyGenerator = (req: Request): string => {
  const normalizedIp = ipKeyGenerator(req.ip || req.socket?.remoteAddress || "127.0.0.1");
  return `login-ip:${normalizedIp}`;
};

export const createLoginEmailKeyGenerator = (keySecret?: string) => {
  return (req: Request): string => {
    const normalizedIp = ipKeyGenerator(req.ip || req.socket?.remoteAddress || "127.0.0.1");
    const validEmail = normalizeValidEmail(req.body?.email);
    if (!validEmail) {
      // Se o e-mail estiver ausente, não for string ou > 254 chars, usa só o IP na chave
      return `login-email-fallback-ip:${normalizedIp}`;
    }
    const emailHash = hashForRateLimit(validEmail, keySecret);
    return `login-email:${emailHash}`;
  };
};

const computeRetryAfterSeconds = (req: Request, windowMs: number): number => {
  const rateLimitInfo = (req as any).rateLimit as { resetTime?: Date } | undefined;
  const resetTime = rateLimitInfo?.resetTime;
  if (resetTime instanceof Date) {
    const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    return Math.max(1, deltaSeconds);
  }
  return Math.max(1, Math.ceil(windowMs / 1000));
};

export const logRateLimitExceeded = (
  req: Request,
  limiterName: string,
  keySecret?: string
): void => {
  const rawIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  const userId = extractAuthenticatedUserId(req);
  const route = req.originalUrl ? req.originalUrl.split("?")[0] : req.path;

  // Registra apenas rota, método, userId (se houver) e IP truncado/hasheado.
  // NUNCA registra e-mail, body, token ou Authorization.
  console.warn(
    JSON.stringify({
      event: "rate_limit_exceeded",
      limiter: limiterName,
      method: req.method,
      route,
      userId: userId ?? null,
      ip: maskAndHashIp(rawIp, keySecret)
    })
  );
};

const createRateLimitHandler = (
  baseMessage: { error: boolean; message: string },
  windowMs: number,
  limiterName: string,
  keySecret?: string
) => {
  return (req: Request, res: Response, _next: NextFunction, optionsUsed: Options) => {
    const retryAfterSeconds = computeRetryAfterSeconds(req, windowMs);
    logRateLimitExceeded(req, limiterName, keySecret);

    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(optionsUsed.statusCode).json({
      ...baseMessage,
      retryAfterSeconds
    });
  };
};

export const isExemptFromGeneralRateLimit = (req: Request): boolean => {
  if (req.method === "OPTIONS") {
    return true;
  }

  const path = req.path || "";
  const originalUrl = req.originalUrl ? req.originalUrl.split("?")[0] : "";

  if (
    req.method === "GET" &&
    (path === "/health" ||
      path === "/api/health" ||
      originalUrl === "/health" ||
      originalUrl === "/api/health")
  ) {
    return true;
  }

  if (
    req.method === "POST" &&
    (originalUrl === "/api/auth/login" ||
      path === "/auth/login" ||
      path === "/api/auth/login")
  ) {
    return true;
  }

  return false;
};

export interface GeneralLimiterConfig extends Partial<Options> {
  rateLimitMax?: number | string;
  rateLimitAnonMax?: number | string;
  nodeEnv?: string;
  keySecret?: string;
}

export const createGeneralLimiter = (options?: GeneralLimiterConfig): RequestHandler => {
  const {
    rateLimitMax,
    rateLimitAnonMax,
    nodeEnv = process.env.NODE_ENV,
    keySecret,
    ...rateLimitOptions
  } = options || {};

  const authenticatedMax = resolveGeneralRateLimitMax(rateLimitMax, nodeEnv);
  const anonMax =
    rateLimitAnonMax !== undefined || process.env.RATE_LIMIT_ANON_MAX !== undefined
      ? resolveAnonRateLimitMax(rateLimitAnonMax, nodeEnv)
      : rateLimitMax !== undefined
        ? Math.min(authenticatedMax, resolveAnonRateLimitMax(undefined, nodeEnv))
        : resolveAnonRateLimitMax(undefined, nodeEnv);

  const windowMs = rateLimitOptions.windowMs ?? GENERAL_RATE_LIMIT_WINDOW_MS;

  const authenticatedLimiter = rateLimit({
    windowMs,
    max: authenticatedMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: generalKeyGenerator,
    skip: isExemptFromGeneralRateLimit,
    handler: createRateLimitHandler(
      GENERAL_RATE_LIMIT_MESSAGE,
      windowMs,
      "general_authenticated",
      keySecret
    ),
    ...rateLimitOptions
  });

  const anonymousLimiter = rateLimit({
    windowMs,
    max: anonMax,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const normalizedIp = ipKeyGenerator(req.ip || req.socket?.remoteAddress || "127.0.0.1");
      return `anon-ip:${normalizedIp}`;
    },
    skip: isExemptFromGeneralRateLimit,
    handler: createRateLimitHandler(
      GENERAL_RATE_LIMIT_MESSAGE,
      windowMs,
      "general_anonymous",
      keySecret
    ),
    ...rateLimitOptions
  });

  return (req: Request, res: Response, next: NextFunction) => {
    if (isExemptFromGeneralRateLimit(req)) {
      return next();
    }

    const userId = extractAuthenticatedUserId(req);
    if (userId !== null) {
      return authenticatedLimiter(req, res, next);
    }
    return anonymousLimiter(req, res, next);
  };
};

export interface LoginLimiterOptions extends Partial<Options> {
  keySecret?: string;
}

export const createLoginIpEmailLimiter = (options?: LoginLimiterOptions) => {
  const { keySecret, ...rest } = options || {};
  const windowMs = rest.windowMs ?? LOGIN_IP_EMAIL_WINDOW_MS;

  return rateLimit({
    windowMs,
    max: LOGIN_IP_EMAIL_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: createLoginIpEmailKeyGenerator(keySecret),
    handler: createRateLimitHandler(
      LOGIN_RATE_LIMIT_MESSAGE,
      windowMs,
      "login_ip_email",
      keySecret
    ),
    ...rest
  });
};

export const createLoginIpLimiter = (options?: LoginLimiterOptions) => {
  const { keySecret, ...rest } = options || {};
  const windowMs = rest.windowMs ?? LOGIN_IP_WINDOW_MS;

  return rateLimit({
    windowMs,
    max: LOGIN_IP_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: loginIpKeyGenerator,
    handler: createRateLimitHandler(
      LOGIN_RATE_LIMIT_MESSAGE,
      windowMs,
      "login_ip",
      keySecret
    ),
    ...rest
  });
};

export const createLoginEmailLimiter = (options?: LoginLimiterOptions) => {
  const { keySecret, ...rest } = options || {};
  const windowMs = rest.windowMs ?? LOGIN_EMAIL_WINDOW_MS;

  return rateLimit({
    windowMs,
    max: LOGIN_EMAIL_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: createLoginEmailKeyGenerator(keySecret),
    handler: createRateLimitHandler(
      LOGIN_RATE_LIMIT_MESSAGE,
      windowMs,
      "login_email",
      keySecret
    ),
    ...rest
  });
};

export const createLoginLimiters = (options?: {
  keySecret?: string;
  ipOptions?: LoginLimiterOptions;
  emailOptions?: LoginLimiterOptions;
  ipEmailOptions?: LoginLimiterOptions;
}): RequestHandler[] => {
  const keySecret = options?.keySecret;
  return [
    createLoginIpLimiter({ keySecret, ...options?.ipOptions }),
    createLoginEmailLimiter({ keySecret, ...options?.emailOptions }),
    createLoginIpEmailLimiter({ keySecret, ...options?.ipEmailOptions })
  ];
};

export const createLoginLimiter = (options?: LoginLimiterOptions): RequestHandler => {
  const middlewares = createLoginLimiters({
    keySecret: options?.keySecret,
    ipEmailOptions: options
  });

  return (req: Request, res: Response, next: NextFunction) => {
    let idx = 0;
    const runNext = (err?: any): void => {
      if (err) return next(err);
      if (res.writableEnded || res.headersSent) return;
      const current = middlewares[idx++];
      if (!current) return next();
      current(req, res, runNext);
    };
    runNext();
  };
};

export const logRateLimitStartupConfig = (params: {
  nodeEnv?: string;
  trustProxy: number;
  rateLimitMax?: number;
  rateLimitAnonMax?: number;
  hasCustomKeySecret: boolean;
}) => {
  const effectiveAuthMax = resolveGeneralRateLimitMax(params.rateLimitMax, params.nodeEnv);
  const effectiveAnonMax = resolveAnonRateLimitMax(params.rateLimitAnonMax, params.nodeEnv);

  console.log(
    JSON.stringify({
      event: "rate_limit_configured",
      nodeEnv: params.nodeEnv === "development" ? "development" : params.nodeEnv || "production",
      trustProxy: params.trustProxy,
      generalWindowMinutes: GENERAL_RATE_LIMIT_WINDOW_MS / 60000,
      authenticatedMaxPerWindow: effectiveAuthMax,
      anonymousMaxPerWindow: effectiveAnonMax,
      loginIpEmailMaxPerMin: LOGIN_IP_EMAIL_MAX,
      loginIpMaxPerMin: LOGIN_IP_MAX,
      loginEmailMaxPer15Min: LOGIN_EMAIL_MAX,
      customKeySecretConfigured: params.hasCustomKeySecret
    })
  );
};
