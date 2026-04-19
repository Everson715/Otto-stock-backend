import { z } from 'zod';

export const movimentacaoSchema = z.object({
  insumoId: z.number().int().positive("ID do insumo inválido"),
  quantidade: z.number().int().positive("A quantidade deve ser maior que zero"),
});
