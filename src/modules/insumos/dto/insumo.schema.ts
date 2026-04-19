import { z } from 'zod';

export const createInsumoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  quantidadeMinima: z.number().int().nonnegative("A quantidade mínima não pode ser negativa").optional().default(0),
});

export const updateInsumoSchema = createInsumoSchema.partial();
