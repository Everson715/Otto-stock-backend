import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EstoqueService } from './estoque.service';
import { prisma } from '../../database/prisma';

vi.mock('../../database/prisma', () => ({
  prisma: {
    movimentacaoEstoque: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    insumo: {
      findMany: vi.fn(),
    }
  }
}));

describe('EstoqueService', () => {
  let service: EstoqueService;

  beforeEach(() => {
    service = new EstoqueService();
    vi.clearAllMocks();
  });

  describe('getSaldo', () => {
    it('deve calcular o saldo corretamente combinando ENTRADA, SAIDA e AJUSTE', async () => {
      const insumoId = 1;
      
      (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([
        { tipo: 'ENTRADA', quantidade: 50 },
        { tipo: 'SAIDA', quantidade: 10 },
        { tipo: 'AJUSTE', quantidade: -5 },
      ]);

      const saldo = await service.getSaldo(insumoId);
      
      // 50 - 10 - 5 = 35
      expect(saldo).toBe(35);
      expect(prisma.movimentacaoEstoque.findMany).toHaveBeenCalledWith({
        where: { insumoId }
      });
    });

    it('deve retornar 0 se não houver movimentações', async () => {
      const insumoId = 2;
      (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([]);

      const saldo = await service.getSaldo(insumoId);
      expect(saldo).toBe(0);
    });
  });

  describe('saida', () => {
    it('deve lançar erro se a quantidade for menor ou igual a zero', async () => {
      await expect(service.saida({ insumoId: 1, quantidade: 0 }))
        .rejects
        .toThrow('A quantidade de saída deve ser maior que zero');
    });

    it('deve lançar erro se o estoque for insuficiente', async () => {
      (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([
        { tipo: 'ENTRADA', quantidade: 5 }
      ]); // Saldo = 5

      await expect(service.saida({ insumoId: 1, quantidade: 10 }))
        .rejects
        .toThrow('Estoque insuficiente para esta operação');
    });

    it('deve registrar a saída se houver saldo', async () => {
      (prisma.movimentacaoEstoque.findMany as any).mockResolvedValue([
        { tipo: 'ENTRADA', quantidade: 20 }
      ]);

      (prisma.movimentacaoEstoque.create as any).mockResolvedValue({ id: 1 });

      await service.saida({ insumoId: 1, quantidade: 5 });

      expect(prisma.movimentacaoEstoque.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: 'SAIDA',
          quantidade: 5,
          insumoId: 1
        })
      });
    });
  });

  describe('getResumo', () => {
    it('deve consolidar itens ativos, abaixo do mínimo e movimentações do período', async () => {
      (prisma.insumo.findMany as any).mockResolvedValue([
        { id: 1, nome: 'Seringa 5ml', unidade: 'un', quantidadeMinima: 10, ativo: true },
        { id: 2, nome: 'Luva Látex', unidade: 'cx', quantidadeMinima: 20, ativo: true }
      ]);

      (prisma.movimentacaoEstoque.findMany as any)
        .mockResolvedValueOnce([
          { insumoId: 1, tipo: 'ENTRADA', quantidade: 15 },
          { insumoId: 2, tipo: 'ENTRADA', quantidade: 5 }
        ])
        .mockResolvedValueOnce([
          { insumoId: 1, tipo: 'ENTRADA', quantidade: 15 },
          { insumoId: 2, tipo: 'SAIDA', quantidade: 3 }
        ]);

      const resumo = await service.getResumo({ de: '2026-10-01', ate: '2026-10-31' });

      expect(resumo).toEqual({
        itensAtivos: 2,
        abaixoDoMinimo: 1,
        entradasPeriodo: { registros: 1, quantidadeTotal: 15 },
        saidasPeriodo: { registros: 1, quantidadeTotal: 3 },
        ajustesPeriodo: 0
      });
    });
  });
});
