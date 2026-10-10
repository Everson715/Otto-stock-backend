import { prisma } from "../../database/prisma"

interface MovimentacaoParams {
  insumoId: number;
  quantidade: number;
  motivo?: string;
  usuarioId?: number;
}

export class EstoqueService {

  async getSaldo(insumoId: number) {
    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: { insumoId }
    })

    const saldo = movimentacoes.reduce((acc, curr) => {
      if (curr.tipo === "SAIDA") return acc - curr.quantidade;
      return acc + curr.quantidade; // ENTRADA ou AJUSTE
    }, 0)

    return saldo
  }

  async getPosicaoEstoque() {
    const insumos = await prisma.insumo.findMany({ where: { ativo: true } })
    const movimentacoes = await prisma.movimentacaoEstoque.findMany()

    return insumos.map(insumo => {
      const movsInsumo = movimentacoes.filter(m => m.insumoId === insumo.id)
      const saldo = movsInsumo.reduce((acc, curr) => {
        if (curr.tipo === "SAIDA") return acc - curr.quantidade;
        return acc + curr.quantidade;
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

  async entrada(data: MovimentacaoParams) {
    if (data.quantidade <= 0) throw new Error("A quantidade de entrada deve ser maior que zero");
    return prisma.movimentacaoEstoque.create({
      data: {
        tipo: "ENTRADA",
        quantidade: data.quantidade,
        insumoId: data.insumoId,
        motivo: data.motivo,
        usuarioId: data.usuarioId
      }
    })
  }
  
  async saida(data: MovimentacaoParams) {
    if (data.quantidade <= 0) throw new Error("A quantidade de saída deve ser maior que zero");
    const saldoAtual = await this.getSaldo(data.insumoId)

    if (saldoAtual < data.quantidade) {
      throw new Error("Estoque insuficiente para esta operação")
    }

    return prisma.movimentacaoEstoque.create({
      data: {
        tipo: "SAIDA",
        quantidade: data.quantidade,
        insumoId: data.insumoId,
        motivo: data.motivo,
        usuarioId: data.usuarioId
      }
    })
  }

  async ajuste(data: MovimentacaoParams) {
    // Quantidade no ajuste pode ser positiva (sobra detectada) ou negativa (perda/vencimento)
    return prisma.movimentacaoEstoque.create({
      data: {
        tipo: "AJUSTE",
        quantidade: data.quantidade,
        insumoId: data.insumoId,
        motivo: data.motivo || "Ajuste manual de estoque",
        usuarioId: data.usuarioId
      }
    })
  }

  async historico(params: { page?: number, limit?: number, insumoId?: number, tipo?: string, startDate?: string, endDate?: string } = {}) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.insumoId) where.insumoId = params.insumoId;
    if (params.tipo) where.tipo = params.tipo;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.movimentacaoEstoque.findMany({
        where,
        skip,
        take: limit,
        include: {
          insumo: true,
          usuario: { select: { nome: true, email: true } }
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.movimentacaoEstoque.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}