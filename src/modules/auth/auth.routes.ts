import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
const controller = new AuthController();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica o usuário e retorna o token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sucesso na autenticação
 *       401:
 *         description: Credenciais inválidas
 */
router.post("/login", controller.login);

/**
 * @swagger
 * /auth/setup-admin:
 *   post:
 *     summary: Cria o primeiro administrador do sistema
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Admin criado
 */
router.post("/setup-admin", controller.setupAdmin); 

export default router;
