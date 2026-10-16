import { Request, Response } from "express"
import { EstoqueService } from "./estoque.service"
import { movimentacaoSchema } from "./dto/estoque.schema"

const service = new EstoqueService()

export class EstoqueController {

  async entrada(req: Request, res: Response) {
    const data = movimentacaoSchema.parse(req.body)
    const movimentacao = await service.entrada({ ...data, usuarioId: req.usuario?.id } as any)
    return res.status(201).json(movimentacao)
  }

  async saida(req: Request, res: Response) {
    const data = movimentacaoSchema.parse(req.body)
    const movimentacao = await service.saida({ ...data, usuarioId: req.usuario?.id } as any)
    return res.status(201).json(movimentacao)
  }

  async ajuste(req: Request, res: Response) {
    const data = req.body // Ideally validate with a schema
    const movimentacao = await service.ajuste({ ...data, usuarioId: req.usuario?.id })
    return res.status(201).json(movimentacao)
  }

  async historico(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const insumoId = req.query.insumoId ? Number(req.query.insumoId) : undefined;
    const tipo = req.query.tipo as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const movimentacoes = await service.historico({ page, limit, insumoId, tipo, startDate, endDate });
    return res.json(movimentacoes)
  }

  async saldo(req: Request, res: Response) {
    const posicao = await service.getPosicaoEstoque()
    return res.json(posicao)
  }

  async resumo(req: Request, res: Response) {
    const de = (req.query.de || req.query.startDate) as string | undefined;
    const ate = (req.query.ate || req.query.endDate) as string | undefined;
    const result = await service.getResumo({ de, ate });
    return res.json(result);
  }
}