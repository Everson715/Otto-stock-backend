import { Router } from "express"
import { EstoqueController } from "./estoque.controller"
import { roleMiddleware } from "../../middlewares/auth.middleware"

const router = Router()
const controller = new EstoqueController()

router.post("/entrada", roleMiddleware(["ADMIN", "ESTOQUISTA"]), controller.entrada)
router.post("/saida", roleMiddleware(["ADMIN", "ESTOQUISTA"]), controller.saida)
router.post("/ajuste", roleMiddleware(["ADMIN", "ESTOQUISTA"]), controller.ajuste)
router.get("/movimentacoes", roleMiddleware(["ADMIN", "ESTOQUISTA", "GESTOR"]), controller.historico)
router.get("/saldo", roleMiddleware(["ADMIN", "ESTOQUISTA", "GESTOR"]), controller.saldo)
router.get("/resumo", roleMiddleware(["ADMIN", "ESTOQUISTA", "GESTOR"]), controller.resumo)

export default router