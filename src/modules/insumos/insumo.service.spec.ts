import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../database/prisma";
import routes from "../../routes";
import { errorHandler } from "../../middlewares/error-handler";

vi.mock("../../database/prisma", () => ({
  prisma: {
    insumo: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const JWT_SECRET = "test_secret_123456";

function makeApp() {
  process.env.JWT_SECRET = JWT_SECRET;
  const app = express();
  app.use(express.json());
  app.use("/api", routes);
  app.use(errorHandler);
  return app;
}

function makeToken(perfis: string[]) {
  return jwt.sign({ id: 1, perfis }, JWT_SECRET, { expiresIn: "1h" });
}

describe("Módulo Insumos - Filtro ?ativo=true|false|all (Seção 5.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve aplicar ativo=true por padrão quando o parâmetro não for informado", async () => {
    const app = makeApp();
    const token = makeToken(["ESTOQUISTA"]);

    (prisma.insumo.findMany as any).mockResolvedValue([
      { id: 1, nome: "Seringa 5ml", ativo: true, quantidadeMinima: 10 },
    ]);
    (prisma.insumo.count as any).mockResolvedValue(1);

    const res = await request(app)
      .get("/api/insumos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.insumo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ativo: true },
        skip: 0,
        take: 10,
      })
    );
  });

  it("deve filtrar apenas insumos inativos quando ?ativo=false em conjunto com nome e paginação", async () => {
    const app = makeApp();
    const token = makeToken(["GESTOR"]);

    (prisma.insumo.findMany as any).mockResolvedValue([
      { id: 2, nome: "Agulha Descontinuada", ativo: false, quantidadeMinima: 50 },
    ]);
    (prisma.insumo.count as any).mockResolvedValue(1);

    const res = await request(app)
      .get("/api/insumos?ativo=false&nome=Agulha&page=2&limit=5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.insumo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: false,
          nome: { contains: "Agulha", mode: "insensitive" },
        },
        skip: 5,
        take: 5,
      })
    );
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(5);
  });

  it("deve retornar ativos e inativos (sem filtro ativo no where) quando ?ativo=all", async () => {
    const app = makeApp();
    const token = makeToken(["ADMIN"]);

    (prisma.insumo.findMany as any).mockResolvedValue([
      { id: 1, nome: "Seringa 5ml", ativo: true, quantidadeMinima: 10 },
      { id: 2, nome: "Agulha Descontinuada", ativo: false, quantidadeMinima: 50 },
    ]);
    (prisma.insumo.count as any).mockResolvedValue(2);

    const res = await request(app)
      .get("/api/insumos?ativo=all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.insumo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    );
    expect(res.body.total).toBe(2);
  });

  it("deve retornar 400 Bad Request para valores inválidos de ?ativo=", async () => {
    const app = makeApp();
    const token = makeToken(["ADMIN"]);

    const res = await request(app)
      .get("/api/insumos?ativo=invalido")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Erro de validação");
    expect(res.body.details[0]?.path).toBe("ativo");
  });

  it("deve bloquear perfil ATENDENTE em GET /api/insumos com 403 Forbidden", async () => {
    const app = makeApp();
    const token = makeToken(["ATENDENTE"]);

    const res = await request(app)
      .get("/api/insumos?ativo=all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
