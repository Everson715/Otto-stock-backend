import { Request, Response } from "express"
import { MedicoService } from "./medico.service"
import { medicoSchema } from "./dto/medico.schema"

const service = new MedicoService()

export class MedicoController {
  async create(req: Request, res: Response) {
    const data = medicoSchema.parse(req.body)
    const medico = await service.create(data)
    return res.status(201).json(medico)
  }

  async findAll(req: Request, res: Response) {
    const medicos = await service.findAll()
    return res.json(medicos)
  }

  async findOne(req: Request, res: Response) {
    const id = Number(req.params.id)
    const medico = await service.findById(id)
    if (!medico) return res.status(404).json({ message: "Médico não encontrado" })
    return res.json(medico)
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id)
    const data = medicoSchema.partial().parse(req.body)
    const medico = await service.update(id, data)
    return res.json(medico)
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id)
    await service.delete(id)
    return res.status(204).send()
  }
}
