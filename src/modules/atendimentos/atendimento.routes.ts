import { Router } from "express"
import { AtendimentoController } from "./atendimento.controller"

const router = Router()
const controller = new AtendimentoController()

router.post("/", controller.create)
router.get("/", controller.findAll)
router.get("/:id", controller.findById)

router.patch("/:id/finalizar", controller.finalizar)
router.patch("/:id/cancelar", controller.cancelar)

export default router