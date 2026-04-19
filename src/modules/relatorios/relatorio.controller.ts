import { Request, Response } from "express"
import { RelatorioService } from "./relatorio.service"

const service = new RelatorioService()

export class RelatorioController {
  async dashboard(req: Request, res: Response) {
    const data = await service.getDashboardData()
    return res.json(data)
  }
}
