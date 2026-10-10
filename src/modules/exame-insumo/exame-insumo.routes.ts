import { Router } from "express"
import { ExameInsumoController } from "./exame-insumo.controller"

const router = Router()
const controller = new ExameInsumoController()

router.post("/", controller.create)
router.get("/", controller.findAll)
router.get("/exame/:exameId", controller.findByExame)
router.put("/:id", controller.update)
router.delete("/:id", controller.delete)

export default router
