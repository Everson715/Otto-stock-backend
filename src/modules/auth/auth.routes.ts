import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
const controller = new AuthController();

router.post("/login", controller.login);
router.post("/setup-admin", controller.setupAdmin); // Rota para facilitar o início

export default router;
