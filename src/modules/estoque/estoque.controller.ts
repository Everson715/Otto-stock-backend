import { Request, Response } from "express"
import { EstoqueService } from "./estoque.service"
import { movimentacaoSchema } from "./dto/estoque.schema"

const service = new EstoqueService()

export class EstoqueController {

  async entrada(req: Request, res: Response) {
    const data = movimentacaoSchema.parse(req.body)
    const movimentacao = await service.entrada(data as any)
    return res.status(201).json(movimentacao)
  }

  async saida(req: Request, res: Response) {
    const data = movimentacaoSchema.parse(req.body)
    const movimentacao = await service.saida(data as any)
    return res.status(201).json(movimentacao)
  }

  async historico(req: Request, res: Response) {
    const movimentacoes = await service.historico()
    return res.json(movimentacoes)
  }

  async saldo(req: Request, res: Response) {
    const posicao = await service.getPosicaoEstoque()
    return res.json(posicao)
  }
}