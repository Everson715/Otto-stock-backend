import { prisma } from "../../database/prisma"

export class MedicoService {
  async create(data: { nome: string; crm?: string; especialidade?: string | null }) {
    return prisma.medico.create({
      data
    })
  }

  async findAll() {
    return prisma.medico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    })
  }

  async findAllPaginated(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params
    const skip = (page - 1) * limit
    const where: any = { ativo: true }

    const trimmed = search?.trim()
    if (trimmed) {
      const unaccented = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const orConditions: any[] = [
        { nome: { contains: trimmed, mode: "insensitive" } },
        { crm: { contains: trimmed, mode: "insensitive" } },
        { especialidade: { contains: trimmed, mode: "insensitive" } },
      ]
      if (unaccented && unaccented !== trimmed) {
        orConditions.push(
          { nome: { contains: unaccented, mode: "insensitive" } },
          { especialidade: { contains: unaccented, mode: "insensitive" } }
        )
      }
      where.OR = orConditions
    }

    const [items, total] = await Promise.all([
      prisma.medico.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nome: "asc" },
      }),
      prisma.medico.count({ where }),
    ])

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findById(id: number) {
    return prisma.medico.findUnique({
      where: { id }
    })
  }

  async update(id: number, data: { nome?: string; crm?: string; especialidade?: string | null }) {
    return prisma.medico.update({
      where: { id },
      data
    })
  }

  async delete(id: number) {
    return prisma.medico.update({
      where: { id },
      data: { ativo: false }
    })
  }
}
