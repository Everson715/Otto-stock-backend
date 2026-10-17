import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  createGeneralLimiter,
  createLoginLimiter,
  createLoginIpEmailKeyGenerator,
  createLoginEmailKeyGenerator,
  resolveGeneralRateLimitMax,
  resolveAnonRateLimitMax,
  DEFAULT_PROD_RATE_LIMIT_MAX,
  DEFAULT_DEV_RATE_LIMIT_MAX,
  DEFAULT_PROD_ANON_RATE_LIMIT_MAX,
  GENERAL_RATE_LIMIT_MESSAGE,
  LOGIN_RATE_LIMIT_MESSAGE
} from "./rate-limit.middleware";
import { parseEnv } from "../env";

const TEST_SECRET = process.env.JWT_SECRET || "default_dev_secret_123";

describe("Rate Limit Middleware (Hardened)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Fail-safe de ambiente e validação de RATE_LIMIT_MAX (Item F)", () => {
    it("deve usar limite de produção (600) quando NODE_ENV está ausente ou diferente de 'development'", () => {
      expect(resolveGeneralRateLimitMax(undefined, undefined)).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      expect(resolveGeneralRateLimitMax(undefined, "")).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      expect(resolveGeneralRateLimitMax(undefined, "production")).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      expect(resolveGeneralRateLimitMax(undefined, "staging")).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      expect(resolveGeneralRateLimitMax(undefined, "DEVELOPMENT")).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      // Somente 'development' exato recebe 3000
      expect(resolveGeneralRateLimitMax(undefined, "development")).toBe(DEFAULT_DEV_RATE_LIMIT_MAX);
    });

    it("deve derrubar o startup se RATE_LIMIT_MAX for inválido (< 10, > 100000 ou não numérico)", () => {
      expect(() => resolveGeneralRateLimitMax(9, "production")).toThrow(/RATE_LIMIT_MAX inválido/);
      expect(() => resolveGeneralRateLimitMax(0, "production")).toThrow(/RATE_LIMIT_MAX inválido/);
      expect(() => resolveGeneralRateLimitMax(-50, "production")).toThrow(/RATE_LIMIT_MAX inválido/);
      expect(() => resolveGeneralRateLimitMax(100001, "production")).toThrow(/RATE_LIMIT_MAX inválido/);
      expect(() => resolveGeneralRateLimitMax("abc", "production")).toThrow(/RATE_LIMIT_MAX inválido/);

      // Também via parseEnv do startup (src/env.ts), que chama process.exit(1)
      const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
      const spyExit = vi
        .spyOn(process, "exit")
        .mockImplementation(((code?: number) => {
          throw new Error(`process.exit:${code}`);
        }) as any);

      expect(() =>
        parseEnv({
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/clinica",
          JWT_SECRET: "super_secret_jwt_key_example",
          RATE_LIMIT_MAX: "5"
        })
      ).toThrow("process.exit:1");

      expect(() =>
        parseEnv({
          DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/clinica",
          JWT_SECRET: "super_secret_jwt_key_example",
          RATE_LIMIT_MAX: "200000"
        })
      ).toThrow("process.exit:1");

      // NODE_ENV ausente no parseEnv assume 'production'
      const validEnv = parseEnv({
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/clinica",
        JWT_SECRET: "super_secret_jwt_key_example"
      });
      expect(validEnv.NODE_ENV).toBe("production");
      expect(validEnv.TRUST_PROXY).toBe(1);
      spyExit.mockRestore();
      spyError.mockRestore();
    });

    it("deve validar RATE_LIMIT_ANON_MAX (padrão 120 em prod) e aceitar valores entre 10 e 100000", () => {
      expect(resolveAnonRateLimitMax(undefined, undefined)).toBe(DEFAULT_PROD_ANON_RATE_LIMIT_MAX);
      expect(resolveAnonRateLimitMax(undefined, "production")).toBe(DEFAULT_PROD_ANON_RATE_LIMIT_MAX);
      expect(resolveAnonRateLimitMax("150", "production")).toBe(150);
      expect(() => resolveAnonRateLimitMax(5, "production")).toThrow(/RATE_LIMIT_ANON_MAX inválido/);
    });
  });

  describe("Extração segura de IP via X-Forwarded-For com trust proxy = 1 (Itens B e I)", () => {
    it("deve considerar apenas a última entrada do X-Forwarded-For (adicionada pelo Nginx) e ignorar a primeira forjada pelo cliente", async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.post("/api/auth/login", createLoginLimiter({ keySecret: "test_hmac_secret_12345" }), (req, res) => {
        res.status(401).json({ error: true, message: "Credenciais inválidas", detectedIp: req.ip });
      });

      // Atacante no IP real 203.0.113.50 (repassado por último pelo Nginx) tenta forjar IPs diferentes na primeira posição do X-Forwarded-For
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", `10.0.0.${i}, 203.0.113.50`)
          .send({ email: "admin@clinica.com", senha: "err" });
        expect(res.status).toBe(401);
        expect(res.body.detectedIp).toBe("203.0.113.50");
      }

      // 6ª tentativa: mesmo mudando o IP forjado inicial (10.0.0.99), o IP real (203.0.113.50) é bloqueado
      const blocked = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "10.0.0.99, 203.0.113.50")
        .send({ email: "admin@clinica.com", senha: "err" });

      expect(blocked.status).toBe(429);
      expect(blocked.body).toMatchObject(LOGIN_RATE_LIMIT_MESSAGE);
      expect(blocked.body.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("Proteção de Login contra Força Bruta e Credential Stuffing (Itens A, E, H e I)", () => {
    it("deve gerar chave com HMAC-SHA256 sem expor o e-mail em texto e usar apenas IP se e-mail for ausente, não-string ou > 254 chars", () => {
      const keyGenIpEmail = createLoginIpEmailKeyGenerator("secret_key_for_hmac_123");
      const keyGenEmail = createLoginEmailKeyGenerator("secret_key_for_hmac_123");

      const mockReqValid: any = { ip: "203.0.113.10", body: { email: "Admin@Clinica.com" } };
      const keyValid = keyGenIpEmail(mockReqValid);
      expect(keyValid).toContain("203.0.113.10:");
      expect(keyValid.toLowerCase()).not.toContain("admin@clinica.com");
      expect(keyValid.toLowerCase()).not.toContain("clinica");

      // E-mail ausente, não-string ou > 254 caracteres -> chave contém apenas o IP
      const mockReqMissing: any = { ip: "203.0.113.10", body: {} };
      const mockReqNonString: any = { ip: "203.0.113.10", body: { email: { $ne: null } } };
      const mockReqTooLong: any = {
        ip: "203.0.113.10",
        body: { email: `${"a".repeat(250)}@clinica.com` }
      };

      expect(keyGenIpEmail(mockReqMissing)).toBe("login-ip-email:203.0.113.10");
      expect(keyGenIpEmail(mockReqNonString)).toBe("login-ip-email:203.0.113.10");
      expect(keyGenIpEmail(mockReqTooLong)).toBe("login-ip-email:203.0.113.10");

      expect(keyGenEmail(mockReqMissing)).toBe("login-email-fallback-ip:203.0.113.10");
      expect(keyGenEmail(mockReqNonString)).toBe("login-email-fallback-ip:203.0.113.10");
      expect(keyGenEmail(mockReqTooLong)).toBe("login-email-fallback-ip:203.0.113.10");
    });

    it("deve barrar atacante com 1 IP tentando 10 e-mails diferentes pelo limite por IP (20 tentativas/min)", async () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.post("/api/auth/login", createLoginLimiter({ keySecret: "test_secret_12345" }), (_req, res) => {
        res.status(401).json({ error: true, message: "Credenciais inválidas" });
      });

      // Atacante usa 10 e-mails diferentes (2 tentativas por e-mail = 20 tentativas totais no mesmo IP)
      // Nenhuma conta individual atinge o limite de 5/min por IP+e-mail nem 10/15min por e-mail
      for (let emailIdx = 1; emailIdx <= 10; emailIdx++) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          const res = await request(app)
            .post("/api/auth/login")
            .set("X-Forwarded-For", "198.51.100.77")
            .send({ email: `vitima${emailIdx}@clinica.com`, senha: "err" });
          expect(res.status).toBe(401);
        }
      }

      // 21ª tentativa a partir do mesmo IP (mesmo com um 11º e-mail inédito) é barrada pelo limite por IP (20/min)
      const blockedByIp = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "198.51.100.77")
        .send({ email: "vitima11@clinica.com", senha: "secret_password_attempt" });

      expect(blockedByIp.status).toBe(429);
      expect(blockedByIp.headers["retry-after"]).toBeDefined();
      expect(blockedByIp.headers["ratelimit"]).toBeDefined();
      expect(blockedByIp.headers["x-ratelimit-limit"]).toBeUndefined();
      expect(blockedByIp.body).toEqual({
        ...LOGIN_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: expect.any(Number)
      });

      // Verifica que o log de 429 foi emitido sem vazar e-mail, senha/body ou Authorization
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logPayload = String(warnSpy.mock.calls[0]?.[0]);
      expect(logPayload).toContain('"event":"rate_limit_exceeded"');
      expect(logPayload).toContain('"route":"/api/auth/login"');
      expect(logPayload).not.toContain("vitima11@clinica.com");
      expect(logPayload).not.toContain("secret_password_attempt");

      // Avançando 61 segundos no fake timer, a janela de 1 min do IP expira
      vi.advanceTimersByTime(61 * 1000);
      const afterReset = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "198.51.100.77")
        .send({ email: "vitima11@clinica.com", senha: "err" });
      expect(afterReset.status).toBe(401);
    });

    it("deve barrar 1 e-mail atacado a partir de vários IPs diferentes pelo limite por e-mail (10 tentativas/15 min)", async () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.post("/api/auth/login", createLoginLimiter({ keySecret: "test_secret_12345" }), (_req, res) => {
        res.status(401).json({ error: true, message: "Credenciais inválidas" });
      });

      // 10 IPs distintos fazem 1 tentativa cada contra o mesmo e-mail (não estoura 5/min por IP+email nem 20/min por IP)
      for (let i = 1; i <= 10; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", `203.0.113.${i}`)
          .send({ email: "diretor@clinica.com", senha: "err" });
        expect(res.status).toBe(401);
      }

      // 11ª tentativa vinda de um 11º IP inédito contra o mesmo e-mail deve ser barrada pelo limite por e-mail (10/15min)
      const blockedByEmail = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "203.0.113.250")
        .send({ email: "DIRETOR@clinica.com", senha: "err" });

      expect(blockedByEmail.status).toBe(429);
      expect(blockedByEmail.body).toEqual({
        ...LOGIN_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: expect.any(Number)
      });
      expect(blockedByEmail.body.retryAfterSeconds).toBeGreaterThan(60);

      warnSpy.mockRestore();
    });

    it("login bem-sucedido (200 OK) não deve consumir o limite (skipSuccessfulRequests: true)", async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.post("/api/auth/login", createLoginLimiter({ keySecret: "test_secret_12345" }), (req, res) => {
        if (req.body?.senha === "correta") {
          return res.status(200).json({ token: "jwt_ok" });
        }
        return res.status(401).json({ error: true, message: "Credenciais inválidas" });
      });

      // 10 logins bem-sucedidos seguidos para o mesmo IP + e-mail (limite de falhas é 5/min)
      for (let i = 0; i < 10; i++) {
        const okRes = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", "192.0.2.10")
          .send({ email: "admin@clinica.com", senha: "correta" });
        expect(okRes.status).toBe(200);
      }

      // Ainda deve permitir 5 falhas antes de bloquear na 6ª falha
      for (let i = 0; i < 5; i++) {
        const failRes = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", "192.0.2.10")
          .send({ email: "admin@clinica.com", senha: "errada" });
        expect(failRes.status).toBe(401);
      }

      const sixthFail = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "192.0.2.10")
        .send({ email: "admin@clinica.com", senha: "errada" });
      expect(sixthFail.status).toBe(429);
    });
  });

  describe("Limite geral: usuários autenticados vs visitantes sem token, isenções e cabeçalhos (Itens D, E, G, H e I)", () => {
    it("deve isolar o limite por usuário autenticado (RATE_LIMIT_MAX) e aplicar limite separado por IP para visitantes ou tokens inválidos/expirados (RATE_LIMIT_ANON_MAX)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.use(
        createGeneralLimiter({
          rateLimitMax: 12,
          rateLimitAnonMax: 10,
          nodeEnv: "production",
          keySecret: "test_secret_12345"
        })
      );
      app.get("/api/insumos", (_req, res) => {
        res.status(200).json({ ok: true });
      });

      const validTokenUser1 = jwt.sign({ id: 10, perfis: ["ESTOQUISTA"] }, TEST_SECRET);
      const validTokenUser2 = jwt.sign({ id: 20, perfis: ["ATENDENTE"] }, TEST_SECRET);
      const expiredToken = jwt.sign({ id: 999 }, TEST_SECRET, { expiresIn: -10 });

      // 10 requisições com tokens inválidos/expirados ou sem token a partir do mesmo IP caem no bucket anônimo (anonMax = 10)
      for (let i = 0; i < 10; i++) {
        const fakeOrExpired =
          i % 2 === 0
            ? expiredToken
            : jwt.sign({ id: 1000 + i }, "wrong_secret");
        const res = await request(app)
          .get("/api/insumos")
          .set("X-Forwarded-For", "192.0.2.50")
          .set("Authorization", `Bearer ${fakeOrExpired}`);
        expect(res.status).toBe(200);
      }

      // 11ª requisição sem token / com token inválido no mesmo IP é bloqueada pelo limite de visitantes (10)
      const blockedAnon = await request(app)
        .get("/api/insumos")
        .set("X-Forwarded-For", "192.0.2.50")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(blockedAnon.status).toBe(429);
      expect(blockedAnon.headers["retry-after"]).toBeDefined();
      expect(blockedAnon.body).toEqual({
        ...GENERAL_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: expect.any(Number)
      });

      // Verifica que o log de 429 não contém o token nem o cabeçalho Authorization
      const anonLog = String(warnSpy.mock.calls[0]?.[0]);
      expect(anonLog).toContain('"userId":null');
      expect(anonLog).not.toContain(expiredToken);
      expect(anonLog).not.toContain("Bearer");

      // Mesmo com o IP anônimo esgotado, Usuário 1 autenticado no MESMO IP possui sua própria franquia (12)
      for (let i = 0; i < 12; i++) {
        const res = await request(app)
          .get("/api/insumos")
          .set("X-Forwarded-For", "192.0.2.50")
          .set("Authorization", `Bearer ${validTokenUser1}`);
        expect(res.status).toBe(200);
      }

      // 13ª requisição do Usuário 1 é bloqueada com userId registrado no log
      const blockedUser1 = await request(app)
        .get("/api/insumos")
        .set("X-Forwarded-For", "192.0.2.50")
        .set("Authorization", `Bearer ${validTokenUser1}`);
      expect(blockedUser1.status).toBe(429);
      expect(blockedUser1.body).toEqual({
        ...GENERAL_RATE_LIMIT_MESSAGE,
        retryAfterSeconds: expect.any(Number)
      });

      const userLog = String(warnSpy.mock.calls[1]?.[0]);
      expect(userLog).toContain('"userId":10');
      expect(userLog).not.toContain(validTokenUser1);

      // Usuário 2 autenticado no mesmo IP continua livre
      const allowedUser2 = await request(app)
        .get("/api/insumos")
        .set("X-Forwarded-For", "192.0.2.50")
        .set("Authorization", `Bearer ${validTokenUser2}`);
      expect(allowedUser2.status).toBe(200);

      warnSpy.mockRestore();
    });

    it("não deve consumir limite em GET /api/health, GET /health nem em requisições OPTIONS (Item D)", async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.use(
        createGeneralLimiter({
          rateLimitMax: 10,
          rateLimitAnonMax: 10,
          nodeEnv: "production"
        })
      );
      app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));
      app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
      app.options("/api/insumos", (_req, res) => res.status(204).send());
      app.get("/api/insumos", (_req, res) => res.status(200).json({ ok: true }));

      // 25 chamadas a /api/health e 25 chamadas OPTIONS (muito acima do limite anônimo de 10)
      for (let i = 0; i < 25; i++) {
        const healthRes = await request(app)
          .get("/api/health")
          .set("X-Forwarded-For", "192.0.2.88");
        expect(healthRes.status).toBe(200);

        const optionsRes = await request(app)
          .options("/api/insumos")
          .set("X-Forwarded-For", "192.0.2.88");
        expect(optionsRes.status).toBe(204);
      }

      // As 10 requisições normais subsequentes ainda passam integralmente (nenhuma foi consumida por health/OPTIONS)
      for (let i = 0; i < 10; i++) {
        const apiRes = await request(app)
          .get("/api/insumos")
          .set("X-Forwarded-For", "192.0.2.88");
        expect(apiRes.status).toBe(200);
      }

      // A 11ª requisição normal em /api/insumos atinge o limite
      const eleventhRes = await request(app)
        .get("/api/insumos")
        .set("X-Forwarded-For", "192.0.2.88");
      expect(eleventhRes.status).toBe(429);

      // E mesmo após o IP estar bloqueado na API geral, /api/health continua respondendo 200 para o Docker healthcheck
      const healthAfterBlock = await request(app)
        .get("/api/health")
        .set("X-Forwarded-For", "192.0.2.88");
      expect(healthAfterBlock.status).toBe(200);
    });
  });
});
