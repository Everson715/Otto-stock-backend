import { Request, Response } from "express";
import { PacienteService } from "./paciente.service";
import { pacienteSchema } from "./dto/paciente.schema";

const service = new PacienteService();

export class PacienteController {
  async create(req: Request, res: Response) {
    const data = pacienteSchema.parse(req.body);
    const paciente = await service.create(data);
    return res.status(201).json(paciente);
  }

  async findAll(req: Request, res: Response) {
    const pacientes = await service.findAll();
    return res.json(pacientes);
  }

  async findOne(req: Request, res: Response) {
    const id = Number(req.params.id);
    const paciente = await service.findById(id);
    if (!paciente) return res.status(404).json({ message: "Paciente não encontrado" });
    return res.json(paciente);
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = pacienteSchema.partial().parse(req.body);
    const paciente = await service.update(id, data);
    return res.json(paciente);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await service.delete(id);
    return res.status(204).send();
  }
}
