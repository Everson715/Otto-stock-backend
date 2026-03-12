import { Router } from "express";

import insumosRoutes from "./modules/insumos/insumo.routes";

const routes = Router();

routes.use("/insumos", insumosRoutes);

export default routes;