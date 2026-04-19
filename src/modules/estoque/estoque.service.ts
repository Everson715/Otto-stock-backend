import { prisma } from "../../database/prisma"
import { MovimentacaoDto } from "./dto/movimentacao.dto"

export class EstoqueService {

  async getSaldo(insumoId: number) {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { insumoId }
    })

    const saldo = movimentacoes.reduce((acc, curr) => {
      return curr.tipo === "ENTRADA" ? acc + curr.quantidade : acc - curr.quantidade
    }, 0)

    return saldo
  }

  async getPosicaoEstoque() {
    const insumos = await prisma.insumo.findMany()
    const movimentacoes = await prisma.movimentacaoEstoque.findMany()

    return insumos.map(insumo => {
      const movsInsumo = movimentacoes.filter(m => m.insumoId === insumo.id)
      const saldo = movsInsumo.reduce((acc, curr) => {
        return curr.tipo === "ENTRADA" ? acc + curr.quantidade : acc - curr.quantidade
      }, 0)

      return {
        id: insumo.id,
        nome: insumo.nome,
        saldo,
        quantidadeMinima: insumo.quantidadeMinima,
        alerta: saldo <= insumo.quantidadeMinima
      }
    })
  }

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
    const saldoAtual = await this.getSaldo(data.insumoId)

    if (saldoAtual < data.quantidade) {
      throw new Error("Estoque insuficiente para esta operação")
    }

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