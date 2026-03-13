import { prisma } from "../../database/prisma"
import { MovimentacaoDto } from "./dto/movimentacao.dto"

export class EstoqueService {

  async entrada(data: MovimentacaoDto) {
    return prisma.movimentacaoEstoque.create({
      data: {
        tipo: "ENTRADA",
        quantidade: data.quantidade,
        insumoId: data.insumoId
      }
    })
  }
  async saida(data: MovimentacaoDto) {
    return prisma.movimentacaoEstoque.create({
      data: {
        tipo: "SAIDA",
        quantidade: data.quantidade,
        insumoId: data.insumoId
      }
    })
  }
  async historico() {
    return prisma.movimentacaoEstoque.findMany({
      include: {
        insumo: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })
  }
}