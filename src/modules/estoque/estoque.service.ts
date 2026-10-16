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
        sku: insumo.sku,
        unidade: insumo.unidade,
        categoria: insumo.categoria,
        fabricante: insumo.fabricante,
        saldo,
        quantidadeMinima: insumo.quantidadeMinima,
        alerta: saldo <= insumo.quantidadeMinima
      }
    })
  }

  async getResumo(params: { de?: string; ate?: string } = {}) {
    const posicao = await this.getPosicaoEstoque();
    const itensAtivos = posicao.length;
    const abaixoDoMinimo = posicao.filter(item => item.saldo < item.quantidadeMinima || item.saldo <= 0).length;

    const whereMov: any = {};
    if (params.de || params.ate) {
      whereMov.createdAt = {};
      if (params.de) whereMov.createdAt.gte = new Date(params.de);
      if (params.ate) whereMov.createdAt.lte = new Date(params.ate);
    }

    const movimentacoesPeriodo = await prisma.movimentacaoEstoque.findMany({
      where: whereMov
    });

    let totalEntradas = 0;
    let quantidadeEntradas = 0;
    let totalSaidas = 0;
    let quantidadeSaidas = 0;
    let totalAjustes = 0;

    for (const mov of movimentacoesPeriodo) {
      if (mov.tipo === "ENTRADA") {
        totalEntradas += 1;
        quantidadeEntradas += mov.quantidade;
      } else if (mov.tipo === "SAIDA") {
        totalSaidas += 1;
        quantidadeSaidas += mov.quantidade;
      } else if (mov.tipo === "AJUSTE") {
        totalAjustes += 1;
      }
    }

    return {
      itensAtivos,
      abaixoDoMinimo,
      entradasPeriodo: {
        registros: totalEntradas,
        quantidadeTotal: quantidadeEntradas
      },
      saidasPeriodo: {
        registros: totalSaidas,
        quantidadeTotal: quantidadeSaidas
      },
      ajustesPeriodo: totalAjustes
    };
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
          usuario: { select: { nome: true, email: true } },
          atendimento: { select: { id: true, status: true, criadoEm: true, finalizadoEm: true } }
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