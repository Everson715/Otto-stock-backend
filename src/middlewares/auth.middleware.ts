import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface Payload {
  id: number;
  perfis?: string[];
  perfil?: string;
}

// Extender o objeto Request do Express para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      usuario?: Payload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({ error: "Erro de Token" });
  }

  const [scheme, token] = parts;

  if (!scheme || !token || !/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: "Token mal formatado" });
  }

  const secret = process.env.JWT_SECRET || "default_dev_secret_123";

  jwt.verify(token, secret, (err: any, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido" });
    }

    req.usuario = decoded as Payload;
    return next();
  });
};

// Middleware para restrição de perfil (RBAC) com suporte a múltiplos perfis por usuário
export const roleMiddleware = (perfisPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const usuarioPerfis = Array.isArray(req.usuario.perfis)
      ? req.usuario.perfis
      : req.usuario.perfil
        ? [req.usuario.perfil]
        : [];

    const possuiPermissao = usuarioPerfis.some((perfil) =>
      perfisPermitidos.includes(perfil)
    );

    if (!possuiPermissao) {
      return res.status(403).json({ error: "Acesso negado: perfil sem permissão" });
    }

    return next();
  };
};
