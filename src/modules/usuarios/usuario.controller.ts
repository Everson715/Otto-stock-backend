import { Request, Response, NextFunction } from "express";
import { UsuarioService } from "./usuario.service";
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  updatePerfisSchema
} from "./dto/usuario.schema";

const service = new UsuarioService();

export class UsuarioController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createUsuarioSchema.parse(req.body);
      const usuario = await service.create(data);
      return res.status(201).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const usuarios = await service.findAll();
      return res.json(usuarios);
    } catch (err) {
      next(err);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const usuario = await service.findById(id);
      if (!usuario) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      return res.json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const data = updateUsuarioSchema.parse(req.body);
      const usuario = await service.update(id, data);
      return res.json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async updatePerfis(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { perfis } = updatePerfisSchema.parse(req.body);
      const usuario = await service.updatePerfis(id, perfis);
      return res.json(usuario);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await service.delete(id);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
