import { Request, Response } from "express"
import { MedicoService } from "./medico.service"
import { medicoSchema, medicoPaginationQuerySchema } from "./dto/medico.schema"

const service = new MedicoService()

export class MedicoController {
  async create(req: Request, res: Response) {
    const data = medicoSchema.parse(req.body)
    const medico = await service.create(data)
    return res.status(201).json(medico)
  }

  async findAll(req: Request, res: Response) {
    const hasPaginationOrSearch =
      req.query.page !== undefined ||
      req.query.limit !== undefined ||
      req.query.search !== undefined

    if (!hasPaginationOrSearch) {
      const medicos = await service.findAll()
      return res.json(medicos)
    }

    const { page, limit } = medicoPaginationQuerySchema.parse({
      page: req.query.page,
      limit: req.query.limit,
    })
    const search = typeof req.query.search === "string" ? req.query.search : undefined

    const result = await service.findAllPaginated({ page, limit, search })
    return res.json(result)
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
