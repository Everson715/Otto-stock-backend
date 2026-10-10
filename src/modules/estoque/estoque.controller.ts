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
    const movimentacoes = await service.historico()
    return res.json(movimentacoes)
  }

  async saldo(req: Request, res: Response) {
    const posicao = await service.getPosicaoEstoque()
    return res.json(posicao)
  }
}