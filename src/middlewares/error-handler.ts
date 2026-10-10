import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  // Erros de validação do Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.issues.map((e: any) => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Conflito de unicidade',
          message: `Os campos já estão em uso.`
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Violação de relacionamento',
          message: `Não é possível alterar ou excluir o registro pois ele possui dependências (Foreign Key).`
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Não encontrado',
          message: 'O registro solicitado não foi encontrado no banco de dados.'
        });
      default:
        return res.status(400).json({
          error: 'Erro de banco de dados',
          code: err.code
        });
    }
  }

  // Erros lançados com throw new Error("...")
  const isNotFoundError = err.message && err.message.toLowerCase().includes('não encontrado');
  const status = err.status || (isNotFoundError ? 404 : 400); // Mudei fallback de 500 para 400 em erros customizados sem status, ou mantem 500? Melhor deixar 500 se não souber. Mas como as exceptions de regras de negócio dão throw Error sem status, vou colocar 400.

  const finalStatus = err.status || (isNotFoundError ? 404 : (err.message ? 400 : 500));
  const message = err.message || 'Internal Server Error';

  res.status(finalStatus).json({
    error: true,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
