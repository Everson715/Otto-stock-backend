import { z } from 'zod';

export const medicoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  crm: z.string().optional(),
});
