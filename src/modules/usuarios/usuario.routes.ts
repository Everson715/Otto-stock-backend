import { Router } from "express";
import { UsuarioController } from "./usuario.controller";
import { roleMiddleware } from "../../middlewares/auth.middleware";

const router = Router();
const controller = new UsuarioController();

// Todas as rotas de gerenciamento de usuários são restritas ao perfil ADMIN
router.use(roleMiddleware(["ADMIN"]));

router.post("/", controller.create);
router.get("/", controller.findAll);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.patch("/:id/perfis", controller.updatePerfis);
router.delete("/:id", controller.delete);

export default router;
