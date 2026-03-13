import { Router } from "express";

import insumosRoutes from "./modules/insumos/insumo.routes";
import exameRoutes from "./modules/exames/exame.routes";
import estoqueRoutes from "./modules/estoque/estoque.routes";
import atendimentoRoutes from "./modules/atendimentos/atendimento.routes";

const routes = Router();

routes.use("/insumos", insumosRoutes);
routes.use("/exames", exameRoutes);
routes.use("/estoque", estoqueRoutes);
routes.use("/atendimentos",atendimentoRoutes);
export default routes;