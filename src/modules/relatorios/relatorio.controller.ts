import { Request, Response } from "express";
import { z } from "zod";
import { RelatorioService } from "./relatorio.service";

const service = new RelatorioService();

export const movimentacoesGraficoQuerySchema = z.object({
  dias: z.preprocess(
    (val) => (val === undefined ? 7 : val),
    z.coerce
      .number({ message: "O parâmetro 'dias' deve ser um número inteiro entre 1 e 90" })
      .int("O parâmetro 'dias' deve ser um número inteiro entre 1 e 90")
      .min(1, "O parâmetro 'dias' deve estar entre 1 e 90")
      .max(90, "O parâmetro 'dias' deve estar entre 1 e 90")
  ),
});

export class RelatorioController {
  async dashboard(req: Request, res: Response) {
    const data = await service.getDashboardData();
    return res.json(data);
  }

  async movimentacoesGrafico(req: Request, res: Response) {
    const { dias } = movimentacoesGraficoQuerySchema.parse({
      dias: req.query.dias,
    });
    const data = await service.getMovimentacoesGrafico(dias);
    return res.json(data);
  }
}
