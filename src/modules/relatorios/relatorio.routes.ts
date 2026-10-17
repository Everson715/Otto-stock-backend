import { Router } from "express";
import { RelatorioController } from "./relatorio.controller";
import { roleMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const controller = new RelatorioController();

router.get("/dashboard", controller.dashboard);
router.get(
  "/movimentacoes-grafico",
  roleMiddleware(["ADMIN", "ESTOQUISTA", "GESTOR"]),
  controller.movimentacoesGrafico
);

export default router;
