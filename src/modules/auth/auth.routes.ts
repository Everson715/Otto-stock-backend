import { Router } from "express";
import { AuthController } from "./auth.controller";
import { createLoginLimiters } from "../../middlewares/rate-limit.middleware";

const router = Router();
const controller = new AuthController();

const loginLimiters = createLoginLimiters();

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
router.post("/login", ...loginLimiters, controller.login);

export default router;
