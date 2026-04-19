import { Request, Response } from "express"
import { ExameInsumoService } from "./exame-insumo.service"

const service = new ExameInsumoService()

export class ExameInsumoController {
  async create(req: Request, res: Response) {
    const item = await service.create(req.body)
    return res.status(201).json(item)
  }

  async findAll(req: Request, res: Response) {
    const itens = await service.findAll()
    return res.json(itens)
  }

  async findByExame(req: Request, res: Response) {
    const exameId = Number(req.params.exameId)
    const itens = await service.findByExame(exameId)
    return res.json(itens)
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id)
    await service.delete(id)
    return res.status(204).send()
  }
}
