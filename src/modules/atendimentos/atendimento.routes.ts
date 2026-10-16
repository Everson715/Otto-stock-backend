import { Router } from "express"
import { AtendimentoController } from "./atendimento.controller"

const router = Router()
const controller = new AtendimentoController()

/**
 * @swagger
 * /atendimentos:
 *   post:
 *     summary: Cria um novo atendimento
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", controller.create)

/**
 * @swagger
 * /atendimentos:
 *   get:
 *     summary: Lista de atendimentos com filtros
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", controller.findAll)
router.get("/resumo", controller.resumo)
router.get("/:id", controller.findById)

/**
 * @swagger
 * /atendimentos/{id}/finalizar:
 *   patch:
 *     summary: Finaliza o atendimento e realiza a baixa automática no estoque
 *     tags: [Atendimentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.patch("/:id/finalizar", controller.finalizar)
router.patch("/:id/cancelar", controller.cancelar)

export default router