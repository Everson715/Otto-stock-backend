import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "../../database/prisma";
import routes from "../../routes";
import { errorHandler } from "../../middlewares/error-handler";
import { medicoSchema } from "./dto/medico.schema";
import { MedicoService } from "./medico.service";
import { AtendimentoService } from "../atendimentos/atendimento.service";

vi.mock("../../database/prisma", () => ({
  prisma: {
    medico: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    atendimento: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

describe("Módulo Médicos - Campo especialidade (Seção 1)", () => {
  let service: MedicoService;
  let atendimentoService: AtendimentoService;

  beforeEach(() => {
    service = new MedicoService();
    atendimentoService = new AtendimentoService();
    vi.clearAllMocks();
  });

  describe("Validação do DTO (medicoSchema)", () => {
    it("deve aplicar trim e aceitar especialidade entre 2 e 80 caracteres", () => {
      const parsed = medicoSchema.parse({
        nome: "Dr. Fernando Rocha",
        crm: "123456/SP",
        especialidade: "  Cardiologia Clínica  ",
      });
      expect(parsed.especialidade).toBe("Cardiologia Clínica");
    });

    it("deve converter string vazia ou apenas espaços em null", () => {
      expect(
        medicoSchema.parse({ nome: "Dr. Fernando", especialidade: "" }).especialidade
      ).toBeNull();
      expect(
        medicoSchema.parse({ nome: "Dr. Fernando", especialidade: "   " }).especialidade
      ).toBeNull();
    });

    it("deve aceitar especialidade ausente (undefined) ou null", () => {
      expect(medicoSchema.parse({ nome: "Dr. Fernando" }).especialidade).toBeUndefined();
      expect(
        medicoSchema.parse({ nome: "Dr. Fernando", especialidade: null }).especialidade
      ).toBeNull();
    });

    it("deve rejeitar especialidade com menos de 2 caracteres (após trim) ou mais de 80 caracteres", () => {
      expect(() =>
        medicoSchema.parse({ nome: "Dr. Fernando", especialidade: "A" })
      ).toThrow();
      expect(() =>
        medicoSchema.parse({ nome: "Dr. Fernando", especialidade: " A " })
      ).toThrow();
      expect(() =>
        medicoSchema.parse({ nome: "Dr. Fernando", especialidade: "X".repeat(81) })
      ).toThrow();
    });
  });

  describe("Rotas HTTP e RBAC (/api/medicos e /api/atendimentos)", () => {
    it("POST /api/medicos deve criar médico com especialidade normalizada (trim)", async () => {
      const app = makeApp();
      const token = makeToken(["ADMIN"]);

      (prisma.medico.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 10,
          nome: data.nome,
          crm: data.crm ?? null,
          especialidade: data.especialidade ?? null,
          ativo: true,
        })
      );

      const res = await request(app)
        .post("/api/medicos")
        .set("Authorization", `Bearer ${token}`)
        .send({
          nome: "Dra. Camila Mendes",
          crm: "554433/SP",
          especialidade: "  Endocrinologia  ",
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 10,
        nome: "Dra. Camila Mendes",
        crm: "554433/SP",
        especialidade: "Endocrinologia",
        ativo: true,
      });
    });

    it("PUT /api/medicos/:id deve converter especialidade vazia em null e rejeitar tamanho inválido com 400", async () => {
      const app = makeApp();
      const token = makeToken(["GESTOR"]);

      (prisma.medico.update as any).mockImplementation(({ where, data }: any) =>
        Promise.resolve({
          id: where.id,
          nome: "Dra. Camila Mendes",
          crm: "554433/SP",
          especialidade: data.especialidade,
          ativo: true,
        })
      );

      const okRes = await request(app)
        .put("/api/medicos/10")
        .set("Authorization", `Bearer ${token}`)
        .send({ especialidade: "   " });

      expect(okRes.status).toBe(200);
      expect(okRes.body.especialidade).toBeNull();

      const badRes = await request(app)
        .put("/api/medicos/10")
        .set("Authorization", `Bearer ${token}`)
        .send({ especialidade: "Z" });

      expect(badRes.status).toBe(400);
      expect(badRes.body.error).toBe("Erro de validação");
    });

    it("deve bloquear perfil ESTOQUISTA em /api/medicos com 403 Forbidden", async () => {
      const app = makeApp();
      const token = makeToken(["ESTOQUISTA"]);

      const res = await request(app)
        .get("/api/medicos")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("GET /api/atendimentos e GET /api/atendimentos/:id devem expor especialidade no objeto medico aninhado", async () => {
      const atendimentoMock = {
        id: 1,
        pacienteId: 1,
        medicoId: 10,
        exameId: 2,
        status: "EM_ATENDIMENTO",
        criadoEm: new Date().toISOString(),
        paciente: { id: 1, nome: "Maria", cpf: "12345678901", ativo: true },
        medico: {
          id: 10,
          nome: "Dra. Camila Mendes",
          crm: "554433/SP",
          especialidade: "Endocrinologia",
          ativo: true,
        },
        exame: { id: 2, nome: "Hemograma", insumos: [] },
        movimentacoes: [],
      };

      (prisma.atendimento.findMany as any).mockResolvedValue([atendimentoMock]);
      (prisma.atendimento.count as any).mockResolvedValue(1);
      (prisma.atendimento.findUnique as any).mockResolvedValue(atendimentoMock);

      const listResult = await atendimentoService.findAll({ page: 1, limit: 10 });
      expect(listResult.items[0]?.medico.especialidade).toBe("Endocrinologia");

      const singleResult = await atendimentoService.findById(1);
      expect(singleResult?.medico.especialidade).toBe("Endocrinologia");
    });
  });
});
