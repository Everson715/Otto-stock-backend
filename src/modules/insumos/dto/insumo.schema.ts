import { z } from 'zod';

export const createInsumoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  sku: z.string().trim().min(1).optional(),
  unidade: z.string().trim().min(1).optional().default("un"),
  categoria: z.string().trim().optional(),
  fabricante: z.string().trim().optional(),
  quantidadeMinima: z.number().int().nonnegative("A quantidade mínima não pode ser negativa").optional().default(0),
});

export const updateInsumoSchema = createInsumoSchema.partial().extend({
  ativo: z.boolean().optional(),
});

export const listInsumosQuerySchema = z.object({
  ativo: z
    .enum(["true", "false", "all"], {
      message: "O parâmetro 'ativo' deve ser 'true', 'false' ou 'all'",
    })
    .optional()
    .default("true"),
});

export type AtivoFilter = z.infer<typeof listInsumosQuerySchema>["ativo"];

