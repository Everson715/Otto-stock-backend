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
    movimentacaoEstoque: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    exameInsumo: {
      findMany: vi.fn(),
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

describe("Módulo Insumos - Filtro ?ativo=true|false|all (Seção 5.1) e Campo unidade (Seção 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Filtro ?ativo=true|false|all (Seção 5.1)", () => {
    it("deve aplicar ativo=true por padrão quando o parâmetro não for informado", async () => {
      const app = makeApp();
      const token = makeToken(["ESTOQUISTA"]);

      (prisma.insumo.findMany as any).mockResolvedValue([
        { id: 1, nome: "Seringa 5ml", unidade: "UN", ativo: true, quantidadeMinima: 10 },
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
      expect(res.body.items[0]?.unidade).toBe("UN");
    });

    it("deve filtrar apenas insumos inativos quando ?ativo=false em conjunto com nome e paginação", async () => {
      const app = makeApp();
      const token = makeToken(["GESTOR"]);

      (prisma.insumo.findMany as any).mockResolvedValue([
        { id: 2, nome: "Agulha Descontinuada", unidade: "CX", ativo: false, quantidadeMinima: 50 },
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
        { id: 1, nome: "Seringa 5ml", unidade: "UN", ativo: true, quantidadeMinima: 10 },
        { id: 2, nome: "Agulha Descontinuada", unidade: "NAO_INFORMADA", ativo: false, quantidadeMinima: 50 },
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

  describe("Unidade de Medida em Insumo e rotas correlatas (Seção 2)", () => {
    it("POST /api/insumos deve criar insumo quando unidade válida de negócio é informada", async () => {
      const app = makeApp();
      const token = makeToken(["ESTOQUISTA"]);

      (prisma.insumo.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 10,
          nome: data.nome,
          unidade: data.unidade,
          quantidadeMinima: data.quantidadeMinima,
          ativo: true,
        })
      );

      const res = await request(app)
        .post("/api/insumos")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Reagente Glicose 500ml",
          unidade: "ML",
          quantidadeMinima: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.unidade).toBe("ML");
    });

    it("POST /api/insumos deve rejeitar com 400 quando unidade estiver ausente ou for NAO_INFORMADA", async () => {
      const app = makeApp();
      const token = makeToken(["ADMIN"]);

      const missingRes = await request(app)
        .post("/api/insumos")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Insumo Sem Unidade",
          quantidadeMinima: 10,
        });

      expect(missingRes.status).toBe(400);
      expect(missingRes.body.error).toBe("Erro de validação");
      expect(missingRes.body.details[0]?.path).toBe("unidade");

      const naoInformadaRes = await request(app)
        .post("/api/insumos")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Insumo Com Nao Informada",
          unidade: "NAO_INFORMADA",
          quantidadeMinima: 10,
        });

      expect(naoInformadaRes.status).toBe(400);
      expect(naoInformadaRes.body.error).toBe("Erro de validação");
      expect(naoInformadaRes.body.details[0]?.path).toBe("unidade");
    });

    it("PUT /api/insumos/:id deve permitir omitir unidade (não obrigatória) e aceitar atualizar para unidade válida de negócio", async () => {
      const app = makeApp();
      const token = makeToken(["ESTOQUISTA"]);

      (prisma.insumo.update as any).mockImplementation(({ where, data }: any) =>
        Promise.resolve({
          id: where.id,
          nome: data.nome ?? "Insumo Legado",
          unidade: data.unidade ?? "NAO_INFORMADA",
          quantidadeMinima: data.quantidadeMinima ?? 10,
          ativo: true,
        })
      );

      // Sem enviar unidade: não quebra clientes atuais e não sobrescreve unidade no Prisma
      const resWithoutUnidade = await request(app)
        .put("/api/insumos/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ nome: "Insumo Legado Renomeado", quantidadeMinima: 25 });

      expect(resWithoutUnidade.status).toBe(200);
      expect(prisma.insumo.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nome: "Insumo Legado Renomeado", quantidadeMinima: 25 },
      });

      // Enviando unidade válida de negócio: atualiza normalmente
      const resWithUnidade = await request(app)
        .put("/api/insumos/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ unidade: "FRASCO" });

      expect(resWithUnidade.status).toBe(200);
      expect(resWithUnidade.body.unidade).toBe("FRASCO");

      // Enviando NAO_INFORMADA no PUT: rejeita com 400
      const resInvalidUnidade = await request(app)
        .put("/api/insumos/1")
        .set("Authorization", `Bearer ${token}`)
        .send({ unidade: "NAO_INFORMADA" });

      expect(resInvalidUnidade.status).toBe(400);
    });

    it("GET /api/estoque/saldo, GET /api/estoque/movimentacoes, GET /api/exame-insumos e GET /api/exame-insumos/exame/:exameId devem expor unidade", async () => {
      const app = makeApp();
      const token = makeToken(["GESTOR"]);

      (prisma.insumo.findMany as any).mockResolvedValue([
        { id: 1, nome: "Agulha 25x7", unidade: "CX", quantidadeMinima: 10, ativo: true },
      ]);
      (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([
        {
          id: 100,
          tipo: "ENTRADA",
          quantidade: 30,
          insumoId: 1,
          insumo: { id: 1, nome: "Agulha 25x7", unidade: "CX", quantidadeMinima: 10, ativo: true },
        },
      ]);
      (prisma.movimentacaoEstoque.count as any).mockResolvedValue(1);
      (prisma.exameInsumo.findMany as any).mockResolvedValue([
        {
          id: 1,
          exameId: 2,
          insumoId: 1,
          quantidade: 1,
          insumo: { id: 1, nome: "Agulha 25x7", unidade: "CX", quantidadeMinima: 10, ativo: true },
        },
      ]);

      const saldoRes = await request(app)
        .get("/api/estoque/saldo")
        .set("Authorization", `Bearer ${token}`);
      expect(saldoRes.status).toBe(200);
      expect(saldoRes.body[0]?.unidade).toBe("CX");

      const movsRes = await request(app)
        .get("/api/estoque/movimentacoes")
        .set("Authorization", `Bearer ${token}`);
      expect(movsRes.status).toBe(200);
      expect(movsRes.body.items[0]?.insumo?.unidade).toBe("CX");

      const exameInsumosRes = await request(app)
        .get("/api/exame-insumos")
        .set("Authorization", `Bearer ${token}`);
      expect(exameInsumosRes.status).toBe(200);
      expect(exameInsumosRes.body[0]?.insumo?.unidade).toBe("CX");

      const byExameRes = await request(app)
        .get("/api/exame-insumos/exame/2")
        .set("Authorization", `Bearer ${token}`);
      expect(byExameRes.status).toBe(200);
      expect(byExameRes.body[0]?.insumo?.unidade).toBe("CX");
    });
  });
});
