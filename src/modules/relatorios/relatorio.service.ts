import { prisma } from "../../database/prisma"

export const SERVER_TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo"

export function getDayBoundsInTimeZone(
  referenceDate: Date = new Date(),
  timeZone: string = SERVER_TIMEZONE
): { ymd: string; startOfDay: Date; endOfDay: Date } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate)

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(referenceDate)

  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-03:00"
  const offsetMatch = tzPart.match(/GMT([+-]\d{2}:\d{2})/)
  const offset = offsetMatch ? offsetMatch[1] : "-03:00"

  const startOfDay = new Date(`${ymd}T00:00:00.000${offset}`)
  const endOfDay = new Date(`${ymd}T23:59:59.999${offset}`)

  return { ymd, startOfDay, endOfDay }
}

export class RelatorioService {
  async getDashboardData(now: Date = new Date()) {
    const { startOfDay, endOfDay } = getDayBoundsInTimeZone(now, SERVER_TIMEZONE)

    const [
      totalAtendimentos,
      insumos,
      movimentacoes,
      examesMaisRealizadosRaw,
      contagemPorStatusRaw,
      finalizadosHojePorExame,
    ] = await Promise.all([
      prisma.atendimento.count(),
      prisma.insumo.findMany(),
      prisma.movimentacaoEstoque.findMany(),
      prisma.atendimento.groupBy({
        by: ["exameId"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 5,
      }),
      prisma.atendimento.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      }),
      prisma.atendimento.groupBy({
        by: ["exameId"],
        where: {
          status: "FINALIZADO",
          criadoEm: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _count: {
          id: true,
        },
      }),
    ])

    const estoqueCritico = insumos.filter((insumo) => {
      const movs = movimentacoes.filter((m) => m.insumoId === insumo.id)
      const saldo = movs.reduce(
        (acc, curr) => acc + (curr.tipo === "ENTRADA" ? curr.quantidade : -curr.quantidade),
        0
      )
      return saldo <= insumo.quantidadeMinima
    }).length

    const exameIds = examesMaisRealizadosRaw.map((item) => item.exameId)
    const examesEncontrados =
      exameIds.length > 0
        ? await prisma.exame.findMany({
            where: { id: { in: exameIds } },
            select: { id: true, nome: true },
          })
        : []

    const exameNomeMap = new Map<number, string>(
      examesEncontrados.map((exame) => [exame.id, exame.nome])
    )

    const examesMaisRealizados = examesMaisRealizadosRaw.map((item) => ({
      exameId: item.exameId,
      nome: exameNomeMap.get(item.exameId) ?? "",
      _count: item._count,
    }))

    const statusCountMap = new Map<string, number>(
      contagemPorStatusRaw.map((item) => [item.status, item._count.id])
    )

    const finalizadosHoje = finalizadosHojePorExame.reduce(
      (acc, curr) => acc + curr._count.id,
      0
    )
    const protocolosDistintosHoje = finalizadosHojePorExame.length

    const atendimentosPorStatus = {
      emAtendimento: statusCountMap.get("EM_ATENDIMENTO") ?? 0,
      finalizados: statusCountMap.get("FINALIZADO") ?? 0,
      cancelados: statusCountMap.get("CANCELADO") ?? 0,
      finalizadosHoje,
      protocolosDistintosHoje,
    }

    return {
      totalAtendimentos,
      estoqueCritico,
      examesMaisRealizados,
      atendimentosPorStatus,
    }
  }
}
