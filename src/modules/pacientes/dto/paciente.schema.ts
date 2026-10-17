import { z } from 'zod';

export const pacienteSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().length(11, "CPF deve conter exatamente 11 dígitos numéricos"),
  dataNascimento: z.string().datetime().optional().or(z.date().optional()),
  contato: z.string().optional()
});

export const pacientePaginationQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === undefined ? 1 : val),
    z.coerce
      .number({ message: "O parâmetro 'page' deve ser um número válido" })
      .int("O parâmetro 'page' deve ser um número inteiro")
      .min(1, "O parâmetro 'page' deve ser maior ou igual a 1")
  ),
  limit: z.preprocess(
    (val) => (val === undefined ? 10 : val),
    z.coerce
      .number({ message: "O parâmetro 'limit' deve ser um número válido" })
      .int("O parâmetro 'limit' deve ser um número inteiro")
      .min(1, "O parâmetro 'limit' deve estar entre 1 e 100")
      .max(100, "O parâmetro 'limit' deve estar entre 1 e 100")
  ),
});

