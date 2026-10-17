import { z } from 'zod';

const especialidadeSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((val) => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  })
  .refine(
    (val) => val === undefined || val === null || (val.length >= 2 && val.length <= 80),
    {
      message: "A especialidade deve ter entre 2 e 80 caracteres",
    }
  );

export const medicoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  crm: z.string().optional(),
  especialidade: especialidadeSchema,
});

export const updateMedicoSchema = medicoSchema.partial();

export const medicoPaginationQuerySchema = z.object({
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


