import { Router } from "express";

import insumosRoutes from "./modules/insumos/insumo.routes";
import exameRoutes from "./modules/exames/exame.routes";
import estoqueRoutes from "./modules/estoque/estoque.routes";
import atendimentoRoutes from "./modules/atendimentos/atendimento.routes";
import exameInsumoRoutes from "./modules/exame-insumo/exame-insumo.routes";
import medicoRoutes from "./modules/medicos/medico.routes";
import relatorioRoutes from "./modules/relatorios/relatorio.routes";

const routes = Router();

routes.use("/insumos", insumosRoutes);
routes.use("/exames", exameRoutes);
routes.use("/estoque", estoqueRoutes);
routes.use("/atendimentos",atendimentoRoutes);
routes.use("/exame-insumos", exameInsumoRoutes);
routes.use("/medicos", medicoRoutes);
routes.use("/relatorios", relatorioRoutes);

export default routes;