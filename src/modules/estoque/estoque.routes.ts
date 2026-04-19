import { Router } from "express"
import { EstoqueController } from "./estoque.controller"

const router = Router()
const controller = new EstoqueController()

router.post("/entrada", controller.entrada)
router.post("/saida", controller.saida)
router.get("/movimentacoes", controller.historico)
router.get("/saldo", controller.saldo)

export default router