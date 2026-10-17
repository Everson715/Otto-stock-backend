import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../database/prisma";
import routes from "../../routes";
import { errorHandler } from "../../middlewares/error-handler";
import { RelatorioService } from "./relatorio.service";

vi.mock("../../database/prisma", () => ({
  prisma: {
    atendimento: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    insumo: {
      findMany: vi.fn(),
    },
    movimentacaoEstoque: {
      findMany: vi.fn(),
    },
    exame: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
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

describe("Módulo Relatórios - GET /relatorios/dashboard (Seção 5.2)", () => {
  let service: RelatorioService;

  beforeEach(() => {
    service = new RelatorioService();
    vi.clearAllMocks();
  });

  it("deve retornar examesMaisRealizados com nome e atendimentosPorStatus (sem limite de 100 registros no dia)", async () => {
    (prisma.atendimento.count as any).mockResolvedValue(250);
    (prisma.insumo.findMany as any).mockResolvedValue([
      { id: 1, nome: "Seringa", quantidadeMinima: 20 },
    ]);
    (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([
      { insumoId: 1, tipo: "ENTRADA", quantidade: 10 },
    ]);

    (prisma.atendimento.groupBy as any)
      // 1ª chamada: examesMaisRealizados
      .mockResolvedValueOnce([
        { exameId: 1, _count: { id: 90 } },
        { exameId: 3, _count: { id: 60 } },
      ])
      // 2ª chamada: contagemPorStatus
      .mockResolvedValueOnce([
        { status: "EM_ATENDIMENTO", _count: { id: 15 } },
        { status: "FINALIZADO", _count: { id: 210 } },
        { status: "CANCELADO", _count: { id: 25 } },
      ])
      // 3ª chamada: finalizadosHojePorExame (ex.: 135 finalizados hoje em 3 exames distintos, acima do antigo limite de 100)
      .mockResolvedValueOnce([
        { exameId: 1, _count: { id: 80 } },
        { exameId: 3, _count: { id: 40 } },
        { exameId: 7, _count: { id: 15 } },
      ]);

    (prisma.exame.findMany as any).mockResolvedValue([
      { id: 1, nome: "Hemograma Completo" },
      { id: 3, nome: "Glicemia em Jejum" },
    ]);

    // 2026-10-17 às 22:30 BRT (2026-10-18T01:30:00.000Z em UTC)
    const refDate = new Date("2026-10-17T22:30:00-03:00");
    const result = await service.getDashboardData(refDate);

    expect(result).toEqual({
      totalAtendimentos: 250,
      estoqueCritico: 1,
      examesMaisRealizados: [
        { exameId: 1, nome: "Hemograma Completo", _count: { id: 90 } },
        { exameId: 3, nome: "Glicemia em Jejum", _count: { id: 60 } },
      ],
      atendimentosPorStatus: {
        emAtendimento: 15,
        finalizados: 210,
        cancelados: 25,
        finalizadosHoje: 135,
        protocolosDistintosHoje: 3,
      },
    });

    // Verifica que "hoje" foi calculado no fuso America/Sao_Paulo (dia 2026-10-17 BRT, mesmo já sendo 01:30 UTC do dia 18)
    expect(prisma.atendimento.groupBy).toHaveBeenNthCalledWith(3, {
      by: ["exameId"],
      where: {
        status: "FINALIZADO",
        criadoEm: {
          gte: new Date("2026-10-17T00:00:00.000-03:00"),
          lte: new Date("2026-10-17T23:59:59.999-03:00"),
        },
      },
      _count: { id: true },
    });
  });

  it("GET /api/relatorios/dashboard deve permitir acesso aos perfis autenticados (ADMIN, GESTOR, ESTOQUISTA, ATENDENTE)", async () => {
    const app = makeApp();
    const token = makeToken(["ATENDENTE"]);

    (prisma.atendimento.count as any).mockResolvedValue(0);
    (prisma.insumo.findMany as any).mockResolvedValue([]);
    (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([]);
    (prisma.atendimento.groupBy as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .get("/api/relatorios/dashboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.atendimentosPorStatus).toEqual({
      emAtendimento: 0,
      finalizados: 0,
      cancelados: 0,
      finalizadosHoje: 0,
      protocolosDistintosHoje: 0,
    });
  });
});
