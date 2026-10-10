import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";

const service = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      }

      const result = await service.login(email, senha);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async setupAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.createInitialAdmin();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
