import { Router } from "express";
import { AuthController } from "./auth.controller";
import rateLimit from "express-rate-limit";

const router = Router();
const controller = new AuthController();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: true, message: "Muitas tentativas de login. Tente novamente mais tarde." }
});

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
router.post("/login", loginLimiter, controller.login);

export default router;
