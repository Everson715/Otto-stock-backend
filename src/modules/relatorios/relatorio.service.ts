import { prisma } from "../../database/prisma";

export const SERVER_TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

export function formatYmdInTimeZone(
  date: Date,
  timeZone: string = SERVER_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getTimeZoneOffsetString(
  date: Date,
  timeZone: string = SERVER_TIMEZONE
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(date);

  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-03:00";
  const offsetMatch = tzPart.match(/GMT([+-]\d{2}:\d{2})/);
  return offsetMatch?.[1] ?? "-03:00";
}

export function getDayBoundsInTimeZone(
  referenceDate: Date = new Date(),
  timeZone: string = SERVER_TIMEZONE
): { ymd: string; startOfDay: Date; endOfDay: Date } {
  const ymd = formatYmdInTimeZone(referenceDate, timeZone);
  const offset = getTimeZoneOffsetString(referenceDate, timeZone);

  const startOfDay = new Date(`${ymd}T00:00:00.000${offset}`);
  const endOfDay = new Date(`${ymd}T23:59:59.999${offset}`);

  return { ymd, startOfDay, endOfDay };
}

export interface MovimentacaoGraficoDiaItem {
  data: string;
  entradasQtd: number;
  saidasQtd: number;
  ajustesLiquidoQtd: number;
  totalOperacoes: number;
}

export class RelatorioService {
  async getDashboardData(now: Date = new Date()) {
    const { startOfDay, endOfDay } = getDayBoundsInTimeZone(now, SERVER_TIMEZONE);

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
    ]);

    const estoqueCritico = insumos.filter((insumo) => {
      const movs = movimentacoes.filter((m) => m.insumoId === insumo.id);
      const saldo = movs.reduce(
        (acc, curr) => acc + (curr.tipo === "ENTRADA" ? curr.quantidade : -curr.quantidade),
        0
      );
      return saldo <= insumo.quantidadeMinima;
    }).length;

    const exameIds = examesMaisRealizadosRaw.map((item) => item.exameId);
    const examesEncontrados =
      exameIds.length > 0
        ? await prisma.exame.findMany({
            where: { id: { in: exameIds } },
            select: { id: true, nome: true },
          })
        : [];

    const exameNomeMap = new Map<number, string>(
      examesEncontrados.map((exame) => [exame.id, exame.nome])
    );

    const examesMaisRealizados = examesMaisRealizadosRaw.map((item) => ({
      exameId: item.exameId,
      nome: exameNomeMap.get(item.exameId) ?? "",
      _count: item._count,
    }));

    const statusCountMap = new Map<string, number>(
      contagemPorStatusRaw.map((item) => [item.status, item._count.id])
    );

    const finalizadosHoje = finalizadosHojePorExame.reduce(
      (acc, curr) => acc + curr._count.id,
      0
    );
    const protocolosDistintosHoje = finalizadosHojePorExame.length;

    const atendimentosPorStatus = {
      emAtendimento: statusCountMap.get("EM_ATENDIMENTO") ?? 0,
      finalizados: statusCountMap.get("FINALIZADO") ?? 0,
      cancelados: statusCountMap.get("CANCELADO") ?? 0,
      finalizadosHoje,
      protocolosDistintosHoje,
    };

    return {
      totalAtendimentos,
      estoqueCritico,
      examesMaisRealizados,
      atendimentosPorStatus,
    };
  }

  async getMovimentacoesGrafico(
    dias: number = 7,
    now: Date = new Date()
  ): Promise<MovimentacaoGraficoDiaItem[]> {
    const { ymd: todayYmd, endOfDay: endWindowUtc } = getDayBoundsInTimeZone(
      now,
      SERVER_TIMEZONE
    );
    const [yearStr, monthStr, dayStr] = todayYmd.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    const diasSequencia: string[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(year, month - 1, day - i));
      diasSequencia.push(d.toISOString().slice(0, 10));
    }

    const firstDayYmd = diasSequencia[0] ?? todayYmd;
    const offset = getTimeZoneOffsetString(now, SERVER_TIMEZONE);
    const startWindowUtc = new Date(`${firstDayYmd}T00:00:00.000${offset}`);

    const buckets = new Map<string, MovimentacaoGraficoDiaItem>();
    for (const dataStr of diasSequencia) {
      buckets.set(dataStr, {
        data: dataStr,
        entradasQtd: 0,
        saidasQtd: 0,
        ajustesLiquidoQtd: 0,
        totalOperacoes: 0,
      });
    }

    const agrupado = await prisma.movimentacaoEstoque.groupBy({
      by: ["createdAt", "tipo"],
      where: {
        createdAt: {
          gte: startWindowUtc,
          lte: endWindowUtc,
        },
      },
      _sum: {
        quantidade: true,
      },
      _count: {
        id: true,
      },
    });

    for (const row of agrupado) {
      const dataLocal = formatYmdInTimeZone(new Date(row.createdAt), SERVER_TIMEZONE);
      const bucket = buckets.get(dataLocal);
      if (!bucket) continue;

      const qtd = Number(row._sum?.quantidade ?? 0);
      const ops = Number(row._count?.id ?? 0);

      if (row.tipo === "ENTRADA") {
        bucket.entradasQtd += qtd;
      } else if (row.tipo === "SAIDA") {
        bucket.saidasQtd += qtd;
      } else if (row.tipo === "AJUSTE") {
        bucket.ajustesLiquidoQtd += qtd;
      }
      bucket.totalOperacoes += ops;
    }

    return Array.from(buckets.values());
  }
}
