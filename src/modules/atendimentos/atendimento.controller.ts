import { Request, Response } from "express"
import { AtendimentoService } from "./atendimento.service"
import { createAtendimentoSchema } from "./dto/atendimento.schema"

const service = new AtendimentoService()

export class AtendimentoController {

  async create(req: Request, res: Response, next: any) {
    try {
      const data = createAtendimentoSchema.parse(req.body)
      const atendimento = await service.create(data)
      return res.status(201).json(atendimento)
    } catch (err) {
      next(err)
    }
  }

  async findAll(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as string;

    const result = await service.findAll(page, limit, status)
    return res.json(result)
  }

  async findById(req: Request, res: Response) {
    const id = Number(req.params.id)
    const atendimento = await service.findById(id)
    return res.json(atendimento)
  }

  async finalizar(req: Request, res: Response) {
    const id = Number(req.params.id)
    const atendimento = await service.finalizar(id)
    return res.json(atendimento)
  }

  async cancelar(req: Request, res: Response) {
    const id = Number(req.params.id)
    const atendimento = await service.cancelar(id)
    return res.json(atendimento)
  }

}