import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import {
  createGeneralLimiter,
  createLoginLimiter,
  resolveGeneralRateLimitMax,
  DEFAULT_PROD_RATE_LIMIT_MAX,
  DEFAULT_DEV_RATE_LIMIT_MAX,
  GENERAL_RATE_LIMIT_MESSAGE,
  LOGIN_RATE_LIMIT_MESSAGE
} from "./rate-limit.middleware";

const TEST_SECRET = process.env.JWT_SECRET || "default_dev_secret_123";

describe("Rate Limit Middleware", () => {
  describe("resolveGeneralRateLimitMax", () => {
    it("deve usar 600 por padrão em produção e 3000 em desenvolvimento", () => {
      expect(resolveGeneralRateLimitMax(undefined, "production")).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      expect(resolveGeneralRateLimitMax("", "production")).toBe(DEFAULT_PROD_RATE_LIMIT_MAX);
      expect(resolveGeneralRateLimitMax(undefined, "development")).toBe(DEFAULT_DEV_RATE_LIMIT_MAX);
    });

    it("deve respeitar o valor configurável via variável de ambiente RATE_LIMIT_MAX", () => {
      expect(resolveGeneralRateLimitMax("800", "production")).toBe(800);
      expect(resolveGeneralRateLimitMax(1200, "development")).toBe(1200);
    });
  });

  describe("Limite estrito em POST /auth/login (5/min por IP + e-mail)", () => {
    it("deve bloquear na 6ª tentativa do mesmo IP + e-mail mantendo o JSON de erro atual, sem bloquear outro e-mail ou outro IP via X-Forwarded-For", async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.post("/api/auth/login", createLoginLimiter(), (_req, res) => {
        res.status(401).json({ error: true, message: "Credenciais inválidas ou usuário inativo" });
      });

      // 5 tentativas permitidas para o mesmo IP + e-mail (mesmo variando maiúsculas/espaços)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", "203.0.113.10")
          .send({ email: i % 2 === 0 ? "Admin@Clinica.com" : " admin@clinica.com ", senha: "err" });
        expect(res.status).toBe(401);
      }

      // 6ª tentativa para o mesmo IP + e-mail deve retornar 429 com a mensagem em JSON atual
      const blocked = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "203.0.113.10")
        .send({ email: "admin@clinica.com", senha: "err" });

      expect(blocked.status).toBe(429);
      expect(blocked.body).toEqual(LOGIN_RATE_LIMIT_MESSAGE);

      // Outro usuário (e-mail diferente) no mesmo IP da clínica continua podendo logar normalmente
      const otherEmailSameIp = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "203.0.113.10")
        .send({ email: "atendente@clinica.com", senha: "err" });
      expect(otherEmailSameIp.status).toBe(401);

      // Mesmo e-mail a partir de outro IP repassado pelo Nginx (X-Forwarded-For) possui contador próprio
      const sameEmailOtherIp = await request(app)
        .post("/api/auth/login")
        .set("X-Forwarded-For", "198.51.100.25")
        .send({ email: "admin@clinica.com", senha: "err" });
      expect(sameEmailOtherIp.status).toBe(401);
    });
  });

  describe("Limite geral por usuário autenticado e fallback por IP", () => {
    it("deve isolar o limite por usuário autenticado mesmo atrás do mesmo IP (NAT) e manter a mensagem JSON atual", async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.use(express.json());
      app.use(createGeneralLimiter({ rateLimitMax: 3, nodeEnv: "production" }));
      app.get("/api/insumos", (_req, res) => {
        res.status(200).json({ ok: true });
      });

      const tokenUser1 = jwt.sign({ id: 10, perfis: ["ESTOQUISTA"] }, TEST_SECRET);
      const tokenUser2 = jwt.sign({ id: 20, perfis: ["ATENDENTE"] }, TEST_SECRET);

      // Usuário 1 faz 3 requisições do mesmo IP
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .get("/api/insumos")
          .set("X-Forwarded-For", "192.0.2.50")
          .set("Authorization", `Bearer ${tokenUser1}`);
        expect(res.status).toBe(200);
      }

      // 4ª requisição do Usuário 1 é bloqueada com 429 e JSON atual
      const blockedUser1 = await request(app)
        .get("/api/insumos")
        .set("X-Forwarded-For", "192.0.2.50")
        .set("Authorization", `Bearer ${tokenUser1}`);
      expect(blockedUser1.status).toBe(429);
      expect(blockedUser1.body).toEqual(GENERAL_RATE_LIMIT_MESSAGE);

      // Usuário 2 no MESMO IP não é afetado pelo limite do Usuário 1
      const allowedUser2 = await request(app)
        .get("/api/insumos")
        .set("X-Forwarded-For", "192.0.2.50")
        .set("Authorization", `Bearer ${tokenUser2}`);
      expect(allowedUser2.status).toBe(200);
    });

    it("não deve permitir burlar o rate limit por IP usando tokens JWT falsos/inválidos", async () => {
      const app = express();
      app.set("trust proxy", 1);
      app.use(createGeneralLimiter({ rateLimitMax: 2, nodeEnv: "production" }));
      app.get("/api/public", (_req, res) => {
        res.status(200).json({ ok: true });
      });

      const fakeToken1 = jwt.sign({ id: 999 }, "wrong_secret");
      const fakeToken2 = jwt.sign({ id: 888 }, "wrong_secret");

      await request(app)
        .get("/api/public")
        .set("X-Forwarded-For", "192.0.2.99")
        .set("Authorization", `Bearer ${fakeToken1}`)
        .expect(200);

      await request(app)
        .get("/api/public")
        .set("X-Forwarded-For", "192.0.2.99")
        .set("Authorization", `Bearer ${fakeToken2}`)
        .expect(200);

      // 3ª tentativa do mesmo IP com outro token inválido deve cair no mesmo bucket de IP e bloquear
      const thirdRes = await request(app)
        .get("/api/public")
        .set("X-Forwarded-For", "192.0.2.99")
        .set("Authorization", `Bearer ${jwt.sign({ id: 777 }, "wrong_secret")}`);

      expect(thirdRes.status).toBe(429);
      expect(thirdRes.body).toEqual(GENERAL_RATE_LIMIT_MESSAGE);
    });
  });
});
