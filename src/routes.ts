import { Router } from "express";

import insumosRoutes from "./modules/insumos/insumo.routes";
import exameRoutes from "./modules/exames/exame.routes";

const routes = Router();

routes.use("/insumos", insumosRoutes);
routes.use("/exames", exameRoutes);
export default routes;