import { prisma } from "../../database/prisma"
import { CreateAtendimentoDto } from "./dto/create-atendimento.dto"
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

    const insumosDoExame = atendimento.exame.insumos

    // Verificar estoque para todos os insumos antes de processar
    for (const item of insumosDoExame) {
      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: { insumoId: item.insumoId }
      })
      const saldo = movimentacoes.reduce((acc, curr) => {
        return curr.tipo === "ENTRADA" ? acc + curr.quantidade : acc - curr.quantidade
      }, 0)

      if (saldo < item.quantidade) {
        throw new Error("Estoque insuficiente para concluir o atendimento")
      }
    }

    for (const item of insumosDoExame) {

      await prisma.movimentacaoEstoque.create({
        data: {
          tipo: "SAIDA",
          quantidade: item.quantidade,
          insumoId: item.insumoId
        }
      })

    }

    const atendimentoFinalizado = await prisma.atendimento.update({
      where: { id },
      data: {
        status: "FINALIZADO"
      }
    })

    return atendimentoFinalizado
  }

  async create(data: CreateAtendimentoDto) {

    const atendimento = await prisma.atendimento.create({
      data: {
        medicoId: data.medicoId,
        exameId: data.exameId
      }
    })

    return atendimento
  }

  async findAll(page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as StatusAtendimento } : {};

    const [items, total] = await Promise.all([
      prisma.atendimento.findMany({
        where,
        skip,
        take: limit,
        include: {
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

    return prisma.atendimento.update({
      where: { id },
      data: {
        status: "CANCELADO"
      }
    })

  }

}