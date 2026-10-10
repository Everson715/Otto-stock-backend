import { Router } from "express";

import authRoutes from "./modules/auth/auth.routes";
import insumosRoutes from "./modules/insumos/insumo.routes";
import exameRoutes from "./modules/exames/exame.routes";
import estoqueRoutes from "./modules/estoque/estoque.routes";
import atendimentoRoutes from "./modules/atendimentos/atendimento.routes";
import exameInsumoRoutes from "./modules/exame-insumo/exame-insumo.routes";
import medicoRoutes from "./modules/medicos/medico.routes";
import relatorioRoutes from "./modules/relatorios/relatorio.routes";

import { authMiddleware } from "./middlewares/auth.middleware";

import pacienteRoutes from "./modules/pacientes/paciente.routes";

const routes = Router();

// Rotas públicas
routes.use("/auth", authRoutes);

// Rotas protegidas (aplicar middleware globalmente a partir daqui)
routes.use(authMiddleware);

routes.use("/pacientes", pacienteRoutes);
routes.use("/insumos", insumosRoutes);
routes.use("/exames", exameRoutes);
routes.use("/estoque", estoqueRoutes);
routes.use("/atendimentos", atendimentoRoutes);
routes.use("/exame-insumos", exameInsumoRoutes);
routes.use("/medicos", medicoRoutes);
routes.use("/relatorios", relatorioRoutes);

export default routes;