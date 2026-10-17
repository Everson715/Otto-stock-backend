import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../database/prisma";
import routes from "../../routes";
import { errorHandler } from "../../middlewares/error-handler";

vi.mock("../../database/prisma", () => ({
  prisma: {
    paciente: {
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

describe("Módulo Pacientes - Paginação retrocompatível e Busca (Seção 4 - Passo 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sem parâmetros na query deve retornar o array legado ordenado por nome ASC (apenas ativos)", async () => {
    const app = makeApp();
    const token = makeToken(["ATENDENTE"]);

    const mockList = [
      { id: 1, nome: "Ana Clara", cpf: "11122233344", ativo: true },
      { id: 2, nome: "Maria de Souza", cpf: "12345678901", ativo: true },
    ];
    (prisma.paciente.findMany as any).mockResolvedValue(mockList);

    const res = await request(app)
      .get("/api/pacientes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(mockList);
    expect(prisma.paciente.findMany).toHaveBeenCalledWith({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    expect(prisma.paciente.count).not.toHaveBeenCalled();
  });

  it("com cada parâmetro isolado (page, limit ou search) deve retornar o envelope paginado com totalPages correto", async () => {
    const app = makeApp();
    const token = makeToken(["ADMIN"]);

    (prisma.paciente.findMany as any).mockResolvedValue([
      { id: 1, nome: "Maria de Souza", cpf: "12345678901", ativo: true },
    ]);
    (prisma.paciente.count as any).mockResolvedValue(25);

    // 1) Apenas ?page=2 (limit default 10 -> totalPages = ceil(25/10) = 3)
    const resPage = await request(app)
      .get("/api/pacientes?page=2")
      .set("Authorization", `Bearer ${token}`);

    expect(resPage.status).toBe(200);
    expect(resPage.body).toEqual({
      items: [{ id: 1, nome: "Maria de Souza", cpf: "12345678901", ativo: true }],
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
    });

    // 2) Apenas ?limit=8 (page default 1 -> totalPages = ceil(25/8) = 4)
    const resLimit = await request(app)
      .get("/api/pacientes?limit=8")
      .set("Authorization", `Bearer ${token}`);

    expect(resLimit.status).toBe(200);
    expect(resLimit.body.page).toBe(1);
    expect(resLimit.body.limit).toBe(8);
    expect(resLimit.body.totalPages).toBe(4);

    // 3) Apenas ?search=Maria (page=1, limit=10)
    const resSearch = await request(app)
      .get("/api/pacientes?search=Maria")
      .set("Authorization", `Bearer ${token}`);

    expect(resSearch.status).toBe(200);
    expect(resSearch.body.page).toBe(1);
    expect(resSearch.body.limit).toBe(10);
    expect(Array.isArray(resSearch.body.items)).toBe(true);
  });

  it("deve buscar por CPF com máscara (123.456.789-01) e sem máscara (12345678901)", async () => {
    const app = makeApp();
    const token = makeToken(["ATENDENTE"]);

    (prisma.paciente.findMany as any).mockResolvedValue([
      { id: 1, nome: "Maria de Souza", cpf: "12345678901", ativo: true },
    ]);
    (prisma.paciente.count as any).mockResolvedValue(1);

    await request(app)
      .get("/api/pacientes?search=123.456.789-01")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(prisma.paciente.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          OR: expect.arrayContaining([{ cpf: { contains: "12345678901" } }]),
        },
      })
    );

    await request(app)
      .get("/api/pacientes?search=12345678901")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(prisma.paciente.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          OR: expect.arrayContaining([{ cpf: { contains: "12345678901" } }]),
        },
      })
    );
  });

  it("deve buscar por nome com acento e caixa diferentes (case-insensitive e normalização NFD)", async () => {
    const app = makeApp();
    const token = makeToken(["GESTOR"]);

    (prisma.paciente.findMany as any).mockResolvedValue([
      { id: 3, nome: "José Gonçalves", cpf: "99988877766", ativo: true },
    ]);
    (prisma.paciente.count as any).mockResolvedValue(1);

    const res = await request(app)
      .get("/api/pacientes?search=JOS%C3%89")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(prisma.paciente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ativo: true,
          OR: [
            { nome: { contains: "JOSÉ", mode: "insensitive" } },
            { nome: { contains: "JOSE", mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("deve rejeitar page < 1 ou limit fora de 1..100 com 400 Bad Request", async () => {
    const app = makeApp();
    const token = makeToken(["ADMIN"]);

    const badPage = await request(app)
      .get("/api/pacientes?page=0")
      .set("Authorization", `Bearer ${token}`);
    expect(badPage.status).toBe(400);

    const badLimitHigh = await request(app)
      .get("/api/pacientes?limit=101")
      .set("Authorization", `Bearer ${token}`);
    expect(badLimitHigh.status).toBe(400);

    const badLimitLow = await request(app)
      .get("/api/pacientes?limit=0")
      .set("Authorization", `Bearer ${token}`);
    expect(badLimitLow.status).toBe(400);
  });

  it("deve bloquear perfil ESTOQUISTA em GET /api/pacientes com 403 Forbidden", async () => {
    const app = makeApp();
    const token = makeToken(["ESTOQUISTA"]);

    const res = await request(app)
      .get("/api/pacientes?page=1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
