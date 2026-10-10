import { z } from 'zod';

export const pacienteSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().length(11, "CPF deve conter exatamente 11 dígitos numéricos"),
  dataNascimento: z.string().datetime().optional().or(z.date().optional()),
  contato: z.string().optional()
});
