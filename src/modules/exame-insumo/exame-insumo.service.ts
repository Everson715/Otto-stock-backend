import { prisma } from "../../database/prisma"

export class ExameInsumoService {
  async create(data: { exameId: number, insumoId: number, quantidade: number }) {
    return prisma.exameInsumo.create({
      data
    })
  }

  async findAll() {
    return prisma.exameInsumo.findMany({
      include: {
        exame: true,
        insumo: true
      }
    })
  }

  async findByExame(exameId: number) {
    return prisma.exameInsumo.findMany({
      where: { exameId },
      include: {
        insumo: true
      }
    })
  }

  async delete(id: number) {
    return prisma.exameInsumo.delete({
      where: { id }
    })
  }
}
