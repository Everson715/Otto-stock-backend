import { prisma } from "../../database/prisma"
import { Prisma, StatusAtendimento } from "@prisma/client"

export class AtendimentoService {

  async finalizar(id: number, usuarioId?: number) {
    const atendimento = await prisma.atendimento.findUnique({
      where: { id },
      include: {
        exame: {
          include: {
            insumos: {
              include: {
                insumo: true
              }
            }
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

    // Transação isolada (Serializable): garante atomicidade e impede saldo negativo em concorrência
    const atendimentoFinalizado = await prisma.$transaction(
      async (tx) => {
        // 1. Validar estoques
        for (const item of insumosDoExame) {
          const movimentacoes = await tx.movimentacaoEstoque.findMany({
            where: { insumoId: item.insumoId }
          })
          const saldo = movimentacoes.reduce((acc, curr) => {
            if (curr.tipo === "SAIDA") return acc - curr.quantidade
            return acc + curr.quantidade
          }, 0)

          if (saldo < item.quantidade) {
            const nomeInsumo = item.insumo?.nome || `ID ${item.insumoId}`
            throw new Error(
              `Estoque insuficiente para o insumo ${nomeInsumo} (ID ${item.insumoId}). Necessário: ${item.quantidade}, Saldo: ${saldo}`
            )
          }
        }

        // 2. Registrar movimentações de saída vinculadas ao atendimento
        for (const item of insumosDoExame) {
          await tx.movimentacaoEstoque.create({
            data: {
              tipo: "SAIDA",
              quantidade: item.quantidade,
              insumoId: item.insumoId,
              atendimentoId: id,
              usuarioId,
              motivo: `Baixa automática pelo Atendimento #${id}`
            }
          })
        }

        // 3. Atualizar status e timestamp de finalização
        return tx.atendimento.update({
          where: { id },
          data: {
            status: "FINALIZADO",
            finalizadoEm: new Date()
          },
          include: {
            paciente: true,
            medico: true,
            exame: true,
            movimentacoes: true
          }
        })
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    )

    return atendimentoFinalizado
  }

  async create(data: { medicoId: number; exameId: number; pacienteId: number; observacoes?: string }) {
    const atendimento = await prisma.atendimento.create({
      data: {
        pacienteId: data.pacienteId,
        medicoId: data.medicoId,
        exameId: data.exameId,
        observacoes: data.observacoes
      },
      include: {
        paciente: true,
        medico: true,
        exame: true
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
          exame: {
            include: {
              insumos: {
                include: {
                  insumo: true
                }
              }
            }
          },
          movimentacoes: true
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
        paciente: true,
        medico: true,
        exame: {
          include: {
            insumos: {
              include: {
                insumo: true
              }
            }
          }
        },
        movimentacoes: true
      }
    })
  }

  async cancelar(id: number, motivo?: string) {
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
        status: "CANCELADO",
        canceladoEm: new Date(),
        ...(motivo && { motivoCancelamento: motivo })
      },
      include: {
        paciente: true,
        medico: true,
        exame: true
      }
    })
  }

  async getResumo(dataStr?: string) {
    const baseDate = dataStr ? new Date(dataStr) : new Date();
    const inicioDia = new Date(baseDate);
    inicioDia.setUTCHours(0, 0, 0, 0);

    const fimDia = new Date(baseDate);
    fimDia.setUTCHours(23, 59, 59, 999);

    const [atendimentosDia, emAtendimentoAtual, movsSaidaDia] = await Promise.all([
      prisma.atendimento.findMany({
        where: {
          criadoEm: {
            gte: inicioDia,
            lte: fimDia
          }
        }
      }),
      prisma.atendimento.count({
        where: { status: "EM_ATENDIMENTO" }
      }),
      prisma.movimentacaoEstoque.findMany({
        where: {
          tipo: "SAIDA",
          createdAt: {
            gte: inicioDia,
            lte: fimDia
          }
        }
      })
    ]);

    const totalDia = atendimentosDia.length;
    const finalizadosHoje = atendimentosDia.filter((a) => a.status === "FINALIZADO").length;
    const canceladosHoje = atendimentosDia.filter((a) => a.status === "CANCELADO").length;
    const taxaCancelamento = totalDia > 0 ? Number(((canceladosHoje / totalDia) * 100).toFixed(1)) : 0;
    const insumosConsumidosHoje = movsSaidaDia.reduce((acc, curr) => acc + curr.quantidade, 0);

    return {
      dataReferencia: inicioDia.toISOString().slice(0, 10),
      totalDia,
      emAtendimento: emAtendimentoAtual,
      finalizadosHoje,
      canceladosHoje,
      taxaCancelamento,
      insumosConsumidosHoje
    };
  }

}