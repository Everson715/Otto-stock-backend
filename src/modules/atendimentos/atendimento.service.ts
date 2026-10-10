import { prisma } from "../../database/prisma"
import { StatusAtendimento } from "@prisma/client"

export class AtendimentoService {

  async finalizar(id: number) {
    const atendimento = await prisma.atendimento.findUnique({
      where: { id },
      include: {
        exame: {
          include: {
            insumos: true
          }
        }
      }
    })

    if (!atendimento) {
      throw new Error("Atendimento não encontrado")
    }

    // Máquina de estados: só pode finalizar se estiver EM_ATENDIMENTO
    if (atendimento.status !== "EM_ATENDIMENTO") {
      throw new Error(`Não é possível finalizar um atendimento que está ${atendimento.status}`)
    }

    const insumosDoExame = atendimento.exame.insumos

    // Transação: garante que tudo seja executado de forma atômica
    const atendimentoFinalizado = await prisma.$transaction(async (tx) => {
      // 1. Validar estoques
      for (const item of insumosDoExame) {
        const movimentacoes = await tx.movimentacaoEstoque.findMany({
          where: { insumoId: item.insumoId }
        })
        const saldo = movimentacoes.reduce((acc, curr) => {
          return curr.tipo === "ENTRADA" ? acc + curr.quantidade : acc - curr.quantidade
        }, 0)

        if (saldo < item.quantidade) {
          throw new Error(`Estoque insuficiente para o insumo ID ${item.insumoId}. Necessário: ${item.quantidade}, Saldo: ${saldo}`)
        }
      }

      // 2. Registrar movimentações de saída
      for (const item of insumosDoExame) {
        await tx.movimentacaoEstoque.create({
          data: {
            tipo: "SAIDA",
            quantidade: item.quantidade,
            insumoId: item.insumoId,
            motivo: `Baixa automática pelo Atendimento #${id}`
          }
        })
      }

      // 3. Atualizar status
      return tx.atendimento.update({
        where: { id },
        data: {
          status: "FINALIZADO"
        }
      })
    })

    return atendimentoFinalizado
  }

  async create(data: { medicoId: number; exameId: number; pacienteId: number }) {
    const atendimento = await prisma.atendimento.create({
      data: {
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        exameId: data.exameId
      }
    })
    return atendimento
  }

  async findAll(params: { page?: number, limit?: number, status?: string, startDate?: string, endDate?: string, medicoId?: number, pacienteId?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (params.status) where.status = params.status as StatusAtendimento;
    if (params.medicoId) where.medicoId = params.medicoId;
    if (params.pacienteId) where.pacienteId = params.pacienteId;
    if (params.startDate || params.endDate) {
      where.criadoEm = {};
      if (params.startDate) where.criadoEm.gte = new Date(params.startDate);
      if (params.endDate) where.criadoEm.lte = new Date(params.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.atendimento.findMany({
        where,
        skip,
        take: limit,
        include: {
          paciente: true,
          medico: true,
          exame: true
        },
        orderBy: { criadoEm: 'desc' }
      }),
      prisma.atendimento.count({ where })
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id: number) {
    return prisma.atendimento.findUnique({
      where: { id },
      include: {
        medico: true,
        exame: true
      }
    })
  }

  async cancelar(id: number) {
    const atendimento = await prisma.atendimento.findUnique({
      where: { id }
    })

    if (!atendimento) {
      throw new Error("Atendimento não encontrado")
    }

    if (atendimento.status !== "EM_ATENDIMENTO") {
      throw new Error(`Não é possível cancelar um atendimento que está ${atendimento.status}`)
    }

    return prisma.atendimento.update({
      where: { id },
      data: {
        status: "CANCELADO"
      }
    })
  }

}