import { z } from 'zod';

export const UNIDADES_MEDIDA_NEGOCIO = [
  "UN",
  "CX",
  "AMPOLA",
  "FRASCO",
  "ML",
  "PAR",
  "PACOTE",
  "ROLO",
  "KIT",
] as const;

export const unidadeMedidaNegocioSchema = z.enum(UNIDADES_MEDIDA_NEGOCIO, {
  message:
    "Unidade de medida obrigatória e deve ser um valor válido (UN, CX, AMPOLA, FRASCO, ML, PAR, PACOTE, ROLO, KIT)",
});

export const createInsumoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  sku: z.string().trim().min(1).optional(),
  unidade: unidadeMedidaNegocioSchema,
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

