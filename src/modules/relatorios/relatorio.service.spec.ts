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
      groupBy: vi.fn(),
    },
    exame: {
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

describe("Módulo Relatórios - Dashboard (Seção 5.2) e Movimentações Gráfico (Seção 3)", () => {
  let service: RelatorioService;

  beforeEach(() => {
    service = new RelatorioService();
    vi.clearAllMocks();
  });

  describe("GET /relatorios/dashboard (Seção 5.2)", () => {
    it("deve retornar examesMaisRealizados com nome e atendimentosPorStatus (sem limite de 100 registros no dia)", async () => {
      (prisma.atendimento.count as any).mockResolvedValue(250);
      (prisma.insumo.findMany as any).mockResolvedValue([
        { id: 1, nome: "Seringa", quantidadeMinima: 20 },
      ]);
      (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([
        { insumoId: 1, tipo: "ENTRADA", quantidade: 10 },
      ]);

      (prisma.atendimento.groupBy as any)
        .mockResolvedValueOnce([
          { exameId: 1, _count: { id: 90 } },
          { exameId: 3, _count: { id: 60 } },
        ])
        .mockResolvedValueOnce([
          { status: "EM_ATENDIMENTO", _count: { id: 15 } },
          { status: "FINALIZADO", _count: { id: 210 } },
          { status: "CANCELADO", _count: { id: 25 } },
        ])
        .mockResolvedValueOnce([
          { exameId: 1, _count: { id: 80 } },
          { exameId: 3, _count: { id: 40 } },
          { exameId: 7, _count: { id: 15 } },
        ]);

      (prisma.exame.findMany as any).mockResolvedValue([
        { id: 1, nome: "Hemograma Completo" },
        { id: 3, nome: "Glicemia em Jejum" },
      ]);

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

  describe("GET /relatorios/movimentacoes-grafico (Seção 3)", () => {
    it("deve aplicar zero-filling contínuo, respeitar virada de dia no fuso America/Sao_Paulo (22h BRT e 00:30 UTC) e AJUSTE negativo", async () => {
      // Referência: 2026-10-17 às 22:30 BRT (2026-10-18T01:30:00.000Z)
      const refNow = new Date("2026-10-17T22:30:00-03:00");

      (prisma.movimentacaoEstoque.groupBy as any).mockResolvedValue([
        // 1) Movimentação em 2026-10-15 às 22:00 BRT (= 2026-10-16T01:00:00.000Z) -> deve cair em 2026-10-15
        {
          createdAt: new Date("2026-10-15T22:00:00-03:00"),
          tipo: "ENTRADA",
          _sum: { quantidade: 120 },
          _count: { id: 2 },
        },
        // 2) Movimentação em 2026-10-16T00:30:00.000Z (= 2026-10-15 às 21:30 BRT) -> deve cair no dia BRT anterior (2026-10-15)
        {
          createdAt: new Date("2026-10-16T00:30:00.000Z"),
          tipo: "SAIDA",
          _sum: { quantidade: 45 },
          _count: { id: 3 },
        },
        // 3) Movimentações de AJUSTE positivo (+3) e negativo (-8) em 2026-10-17 -> líquido = -5
        {
          createdAt: new Date("2026-10-17T10:00:00-03:00"),
          tipo: "AJUSTE",
          _sum: { quantidade: 3 },
          _count: { id: 1 },
        },
        {
          createdAt: new Date("2026-10-17T14:00:00-03:00"),
          tipo: "AJUSTE",
          _sum: { quantidade: -8 },
          _count: { id: 2 },
        },
      ]);

      const resultado = await service.getMovimentacoesGrafico(4, refNow);

      expect(resultado).toHaveLength(4);
      expect(resultado).toEqual([
        {
          data: "2026-10-14",
          entradasQtd: 0,
          saidasQtd: 0,
          ajustesLiquidoQtd: 0,
          totalOperacoes: 0,
        },
        {
          data: "2026-10-15",
          entradasQtd: 120,
          saidasQtd: 45,
          ajustesLiquidoQtd: 0,
          totalOperacoes: 5,
        },
        {
          data: "2026-10-16",
          entradasQtd: 0,
          saidasQtd: 0,
          ajustesLiquidoQtd: 0,
          totalOperacoes: 0,
        },
        {
          data: "2026-10-17",
          entradasQtd: 0,
          saidasQtd: 0,
          ajustesLiquidoQtd: -5,
          totalOperacoes: 3,
        },
      ]);
    });

    it("deve usar dias=7 por padrão e validar limites de dias (1..90 e inteiro), retornando 400 fora da faixa", async () => {
      const app = makeApp();
      const token = makeToken(["GESTOR"]);

      (prisma.movimentacaoEstoque.groupBy as any).mockResolvedValue([]);

      const defaultRes = await request(app)
        .get("/api/relatorios/movimentacoes-grafico")
        .set("Authorization", `Bearer ${token}`);
      expect(defaultRes.status).toBe(200);
      expect(defaultRes.body).toHaveLength(7);

      const minRes = await request(app)
        .get("/api/relatorios/movimentacoes-grafico?dias=1")
        .set("Authorization", `Bearer ${token}`);
      expect(minRes.status).toBe(200);
      expect(minRes.body).toHaveLength(1);

      const maxRes = await request(app)
        .get("/api/relatorios/movimentacoes-grafico?dias=90")
        .set("Authorization", `Bearer ${token}`);
      expect(maxRes.status).toBe(200);
      expect(maxRes.body).toHaveLength(90);

      for (const invalidDias of ["0", "-5", "91", "7.5", "abc", ""]) {
        const badRes = await request(app)
          .get(`/api/relatorios/movimentacoes-grafico?dias=${invalidDias}`)
          .set("Authorization", `Bearer ${token}`);
        expect(badRes.status).toBe(400);
      }
    });

    it("deve permitir ADMIN, ESTOQUISTA e GESTOR e bloquear ATENDENTE com 403 Forbidden", async () => {
      const app = makeApp();
      (prisma.movimentacaoEstoque.groupBy as any).mockResolvedValue([]);

      for (const perfil of ["ADMIN", "ESTOQUISTA", "GESTOR"]) {
        const resOk = await request(app)
          .get("/api/relatorios/movimentacoes-grafico?dias=7")
          .set("Authorization", `Bearer ${makeToken([perfil])}`);
        expect(resOk.status).toBe(200);
      }

      const resForbidden = await request(app)
        .get("/api/relatorios/movimentacoes-grafico?dias=7")
        .set("Authorization", `Bearer ${makeToken(["ATENDENTE"])}`);
      expect(resForbidden.status).toBe(403);
      expect(resForbidden.body).toEqual({
        error: "Acesso negado: perfil sem permissão",
      });
    });
  });
});
