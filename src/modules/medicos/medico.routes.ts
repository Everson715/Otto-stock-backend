import { Router } from "express"
import { MedicoController } from "./medico.controller"

const router = Router()
const controller = new MedicoController()

router.post("/", controller.create)
router.get("/", controller.findAll)
router.get("/:id", controller.findOne)
router.put("/:id", controller.update)
router.delete("/:id", controller.delete)

export default router
