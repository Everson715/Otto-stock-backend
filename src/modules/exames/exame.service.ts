import { prisma } from "../../database/prisma";
import { CreateExameDto } from "./dto/create-exame.dto";
import { UpdateExameDto } from "./dto/update-exame.dto";

export class ExameService {
    async create(data: CreateExameDto) {
        return prisma.exame.create({
            data: {
                nome: data.nome,
                descricao: data.descricao,
                codigo: data.codigo,
                departamento: data.departamento
            },
            include: {
                insumos: {
                    include: { insumo: true }
                }
            }
        });
    }

    async findAll() {
        return prisma.exame.findMany({
            where: { ativo: true },
            include: {
                insumos: {
                    include: { insumo: true }
                }
            },
            orderBy: { nome: "asc" }
        });
    }

    async findById(id: number) {
        return prisma.exame.findUnique({
            where: { id },
            include: {
                insumos: {
                    include: { insumo: true }
                }
            }
        });
    }

    async getDisponibilidade(id: number) {
        const exame = await prisma.exame.findUnique({
            where: { id },
            include: {
                insumos: {
                    include: { insumo: true }
                }
            }
        });

        if (!exame) {
            throw new Error("Exame não encontrado");
        }

        const insumoIds = exame.insumos.map((item) => item.insumoId);
        const movimentacoes = insumoIds.length
            ? await prisma.movimentacaoEstoque.findMany({
                  where: { insumoId: { in: insumoIds } }
              })
            : [];

        const itens = exame.insumos.map((vinculo) => {
            const movs = movimentacoes.filter((m) => m.insumoId === vinculo.insumoId);
            const saldo = movs.reduce((acc, curr) => {
                if (curr.tipo === "SAIDA") return acc - curr.quantidade;
                return acc + curr.quantidade;
            }, 0);

            const disponivel = saldo >= vinculo.quantidade;
            const saldoPosConsumo = saldo - vinculo.quantidade;
            const min = vinculo.insumo.quantidadeMinima;

            let nivel: "INSUFICIENTE" | "CRITICO" | "ATENCAO" | "CONFORME" = "CONFORME";
            if (!disponivel) {
                nivel = "INSUFICIENTE";
            } else if (saldoPosConsumo <= 0 || saldoPosConsumo < min) {
                nivel = "CRITICO";
            } else if (min > 0 && saldoPosConsumo <= min * 1.2) {
                nivel = "ATENCAO";
            }

            return {
                insumoId: vinculo.insumoId,
                nome: vinculo.insumo.nome,
                unidade: vinculo.insumo.unidade,
                quantidadeNecessaria: vinculo.quantidade,
                disponivel,
                nivel
            };
        });

        return {
            exameId: exame.id,
            nome: exame.nome,
            codigo: exame.codigo,
            disponivelParaAtendimento: itens.every((i) => i.disponivel),
            itens
        };
    }

    async update(id: number, data: UpdateExameDto) {
        return prisma.exame.update({
            where: { id },
            data: {
                ...(data.nome !== undefined && { nome: data.nome }),
                ...(data.descricao !== undefined && { descricao: data.descricao }),
                ...(data.codigo !== undefined && { codigo: data.codigo }),
                ...(data.departamento !== undefined && { departamento: data.departamento }),
                ...(data.ativo !== undefined && { ativo: data.ativo })
            },
            include: {
                insumos: {
                    include: { insumo: true }
                }
            }
        });
    }

    async delete(id: number) {
        return prisma.exame.update({
            where: { id },
            data: { ativo: false }
        });
    }
}
