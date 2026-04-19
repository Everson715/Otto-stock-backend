import { Router } from "express"
import { RelatorioController } from "./relatorio.controller"

const router = Router()
const controller = new RelatorioController()

router.get("/dashboard", controller.dashboard)

export default router
