import { z } from 'zod';

export const createAtendimentoSchema = z.object({
  pacienteId: z.number().int().positive(),
  medicoId: z.number().int().positive(),
  exameId: z.number().int().positive(),
  observacoes: z.string().trim().optional()
});

export const cancelarAtendimentoSchema = z.object({
  motivo: z.string().trim().optional(),
  motivoCancelamento: z.string().trim().optional()
});
