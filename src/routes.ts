import { Router } from "express";

import authRoutes from "./modules/auth/auth.routes";
import usuarioRoutes from "./modules/usuarios/usuario.routes";
import insumosRoutes from "./modules/insumos/insumo.routes";
import exameRoutes from "./modules/exames/exame.routes";
import estoqueRoutes from "./modules/estoque/estoque.routes";
import atendimentoRoutes from "./modules/atendimentos/atendimento.routes";
import exameInsumoRoutes from "./modules/exame-insumo/exame-insumo.routes";
import medicoRoutes from "./modules/medicos/medico.routes";
import relatorioRoutes from "./modules/relatorios/relatorio.routes";
import pacienteRoutes from "./modules/pacientes/paciente.routes";

import { authMiddleware, roleMiddleware } from "./middlewares/auth.middleware";

const routes = Router();

// Rotas públicas
routes.use("/auth", authRoutes);

// Rotas protegidas (aplicar middleware globalmente a partir daqui)
routes.use(authMiddleware);

// Gestão de usuários (exclusivo ADMIN)
routes.use("/usuarios", roleMiddleware(["ADMIN"]), usuarioRoutes);

// Atendimento e recepção (ADMIN, GESTOR, ATENDENTE)
routes.use("/pacientes", roleMiddleware(["ADMIN", "GESTOR", "ATENDENTE"]), pacienteRoutes);
routes.use("/atendimentos", roleMiddleware(["ADMIN", "GESTOR", "ATENDENTE"]), atendimentoRoutes);
routes.use("/medicos", roleMiddleware(["ADMIN", "GESTOR", "ATENDENTE"]), medicoRoutes);

// Controle de estoque e insumos (ADMIN, GESTOR, ESTOQUISTA)
routes.use("/insumos", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA"]), insumosRoutes);
routes.use("/estoque", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA"]), estoqueRoutes);
routes.use("/exame-insumos", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA"]), exameInsumoRoutes);

// Exames (leitura também liberada para ATENDENTE dentro de exame.routes.ts)
routes.use("/exames", exameRoutes);

// Relatórios / Dashboard
routes.use("/relatorios", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA", "ATENDENTE"]), relatorioRoutes);

export default routes;