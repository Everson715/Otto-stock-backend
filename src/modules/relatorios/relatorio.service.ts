import { prisma } from "../../database/prisma"

export class RelatorioService {
  async getDashboardData() {
    const totalAtendimentos = await prisma.atendimento.count()
    
    // Insumos com estoque crítico
    const insumos = await prisma.insumo.findMany()
    const movimentacoes = await prisma.movimentacaoEstoque.findMany()
    
    const estoqueCritico = insumos.filter(insumo => {
      const movs = movimentacoes.filter(m => m.insumoId === insumo.id)
      const saldo = movs.reduce((acc, curr) => acc + (curr.tipo === "ENTRADA" ? curr.quantidade : -curr.quantidade), 0)
      return saldo <= insumo.quantidadeMinima
    }).length

    // Exames mais realizados
    const examesMaisRealizados = await prisma.atendimento.groupBy({
      by: ['exameId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    })

    return {
      totalAtendimentos,
      estoqueCritico,
      examesMaisRealizados
    }
  }
}
