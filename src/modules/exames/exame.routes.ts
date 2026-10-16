import { Router } from "express"
import { ExameController } from "./exame.controller"
import { roleMiddleware } from "../../middlewares/auth.middleware"

const router = Router()
const controller = new ExameController()

router.get("/", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA", "ATENDENTE"]), controller.findAll)
router.get("/:id", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA", "ATENDENTE"]), controller.findOne)
router.get("/:id/disponibilidade", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA", "ATENDENTE"]), controller.disponibilidade)
router.post("/", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA"]), controller.create)
router.put("/:id", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA"]), controller.update)
router.delete("/:id", roleMiddleware(["ADMIN", "GESTOR", "ESTOQUISTA"]), controller.delete)

export default router;