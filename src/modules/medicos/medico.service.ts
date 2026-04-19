import { prisma } from "../../database/prisma"

export class MedicoService {
  async create(data: { nome: string, crm?: string }) {
    return prisma.medico.create({
      data
    })
  }

  async findAll() {
    return prisma.medico.findMany()
  }

  async findById(id: number) {
    return prisma.medico.findUnique({
      where: { id }
    })
  }

  async update(id: number, data: { nome?: string, crm?: string }) {
    return prisma.medico.update({
      where: { id },
      data
    })
  }

  async delete(id: number) {
    return prisma.medico.delete({
      where: { id }
    })
  }
}
