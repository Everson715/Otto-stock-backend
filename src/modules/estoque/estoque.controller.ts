import { Request, Response } from "express"
import { EstoqueService } from "./estoque.service"
import { MovimentacaoDto } from "./dto/movimentacao.dto"

const service = new EstoqueService()

export class EstoqueController {

  async entrada(req: Request, res: Response) {
    const data: MovimentacaoDto = req.body
    const movimentacao = await service.entrada(data)
    return res.status(201).json(movimentacao)
  }
  async saida(req: Request, res: Response) {
    const data: MovimentacaoDto = req.body
    const movimentacao = await service.saida(data)
    return res.status(201).json(movimentacao)
  }
  async historico(req: Request, res: Response) {
    const movimentacoes = await service.historico()
    return res.json(movimentacoes)
  }
}