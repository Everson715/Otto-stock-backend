import { z } from "zod";

export const perfilEnum = z.enum(["ADMIN", "ESTOQUISTA", "ATENDENTE", "GESTOR"]);

export const createUsuarioSchema = z
  .object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    perfis: z.array(perfilEnum).min(1, "Informe pelo menos um perfil").optional(),
    perfil: perfilEnum.optional()
  })
  .transform((data) => {
    const perfis = data.perfis?.length
      ? Array.from(new Set(data.perfis))
      : data.perfil
        ? [data.perfil]
        : (["ATENDENTE"] as const);

    return {
      nome: data.nome,
      email: data.email,
      senha: data.senha,
      perfis: [...perfis]
    };
  });

export const updateUsuarioSchema = z
  .object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").optional(),
    email: z.string().email("E-mail inválido").optional(),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional(),
    perfis: z.array(perfilEnum).min(1, "Informe pelo menos um perfil").optional(),
    perfil: perfilEnum.optional(),
    ativo: z.boolean().optional()
  })
  .transform((data) => {
    const perfis = data.perfis?.length
      ? Array.from(new Set(data.perfis))
      : data.perfil
        ? [data.perfil]
        : undefined;

    return {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.senha !== undefined && { senha: data.senha }),
      ...(perfis !== undefined && { perfis }),
      ...(data.ativo !== undefined && { ativo: data.ativo })
    };
  });

export const updatePerfisSchema = z.object({
  perfis: z
    .array(perfilEnum)
    .min(1, "O usuário deve possuir pelo menos um perfil")
    .transform((perfis) => Array.from(new Set(perfis)))
});
