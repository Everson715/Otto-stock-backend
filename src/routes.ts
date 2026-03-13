import { Router } from "express";

import insumosRoutes from "./modules/insumos/insumo.routes";
import exameRoutes from "./modules/exames/exame.routes";
import estoqueRoutes from "./modules/estoque/estoque.routes";

const routes = Router();

routes.use("/insumos", insumosRoutes);
routes.use("/exames", exameRoutes);
routes.use("/estoque", estoqueRoutes);
export default routes;