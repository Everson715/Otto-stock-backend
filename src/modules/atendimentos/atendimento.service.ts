import { prisma } from "../../database/prisma"
import { CreateAtendimentoDto } from "./dto/create-atendimento.dto"

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

  async findAll() {

    return prisma.atendimento.findMany({
      include: {
        medico: true,
        exame: true
      }
    })

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