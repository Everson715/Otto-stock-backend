import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsuarioService } from "./usuario.service";
import { AuthService } from "../auth/auth.service";
import { prisma } from "../../database/prisma";
import { roleMiddleware } from "../../middlewares/auth.middleware";

vi.mock("../../database/prisma", () => ({
  prisma: {
    usuario: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe("UsuarioService & Multi-Perfil RBAC", () => {
  let service: UsuarioService;
  let authService: AuthService;

  beforeEach(() => {
    service = new UsuarioService();
    authService = new AuthService();
    vi.clearAllMocks();
  });

  it("deve criar um usuário com múltiplos perfis sem duplicatas", async () => {
    (prisma.usuario.create as any).mockImplementation(async ({ data }: any) => ({
      id: 1,
      nome: data.nome,
      email: data.email,
      perfis: data.perfis,
      ativo: true,
      createdAt: new Date()
    }));

    const result = await service.create({
      nome: "João Atendente Estoquista",
      email: "joao@clinica.com",
      senha: "123456",
      perfis: ["ATENDENTE", "ESTOQUISTA", "ATENDENTE"]
    });

    expect(result.perfis).toEqual(["ATENDENTE", "ESTOQUISTA"]);
    expect(prisma.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: "João Atendente Estoquista",
          email: "joao@clinica.com",
          perfis: ["ATENDENTE", "ESTOQUISTA"]
        })
      })
    );
  });

  it("deve permitir atribuir novos perfis a um atendente existente (ex: adicionar ESTOQUISTA)", async () => {
    (prisma.usuario.update as any).mockResolvedValue({
      id: 2,
      nome: "Maria",
      email: "maria@clinica.com",
      perfis: ["ATENDENTE", "ESTOQUISTA"],
      ativo: true,
      createdAt: new Date()
    });

    const updated = await service.updatePerfis(2, ["ATENDENTE", "ESTOQUISTA"]);

    expect(updated.perfis).toEqual(["ATENDENTE", "ESTOQUISTA"]);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: { perfis: ["ATENDENTE", "ESTOQUISTA"] }
      })
    );
  });

  it("roleMiddleware deve autorizar usuário que possua pelo menos um dos perfis permitidos", () => {
    const middlewareEstoque = roleMiddleware(["ADMIN", "ESTOQUISTA"]);
    const middlewareAdmin = roleMiddleware(["ADMIN"]);

    const req: any = {
      usuario: {
        id: 2,
        perfis: ["ATENDENTE", "ESTOQUISTA"]
      }
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    const next = vi.fn();

    // Deve passar para rota de estoque pois possui ESTOQUISTA além de ATENDENTE
    middlewareEstoque(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Deve bloquear para rota exclusiva de ADMIN
    const nextAdmin = vi.fn();
    middlewareAdmin(req, res, nextAdmin);
    expect(nextAdmin).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("deve autenticar usuário criado via Prisma Studio com senha em texto puro e converter para bcrypt", async () => {
    (prisma.usuario.findUnique as any).mockResolvedValue({
      id: 10,
      nome: "Usuário Studio",
      email: "studio@clinica.com",
      senha: "senha_plana_studio",
      perfis: [],
      ativo: true,
      createdAt: new Date()
    });
    (prisma.usuario.update as any).mockResolvedValue({});

    const res = await authService.login("studio@clinica.com", "senha_plana_studio");

    expect(res.usuario.email).toBe("studio@clinica.com");
    expect(res.usuario.perfis).toEqual(["ATENDENTE"]);
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: {
          senha: expect.stringMatching(/^\$2[aby]\$10\$/)
        }
      })
    );
  });
});

