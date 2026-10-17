import { Request, Response } from "express";
import { PacienteService } from "./paciente.service";
import { pacienteSchema, pacientePaginationQuerySchema } from "./dto/paciente.schema";

const service = new PacienteService();

export class PacienteController {
  async create(req: Request, res: Response) {
    const data = pacienteSchema.parse(req.body);
    const paciente = await service.create(data);
    return res.status(201).json(paciente);
  }

  async findAll(req: Request, res: Response) {
    const hasPaginationOrSearch =
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      req.query.search !== undefined;

    if (!hasPaginationOrSearch) {
      const pacientes = await service.findAll();
      return res.json(pacientes);
    }

    const { page, limit } = pacientePaginationQuerySchema.parse({
      page: req.query.page,
      limit: req.query.limit,
    });
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = await service.findAllPaginated({ page, limit, search });
    return res.json(result);
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
