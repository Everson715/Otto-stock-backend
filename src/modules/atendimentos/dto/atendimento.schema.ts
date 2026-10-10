import { z } from 'zod';

export const createAtendimentoSchema = z.object({
  pacienteId: z.number().int().positive(),
  medicoId: z.number().int().positive(),
  exameId: z.number().int().positive()
});
