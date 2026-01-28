import { Router } from "express";
import { PlanController } from "../controllers/Plan.Controller";
import { checkJwt } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", [checkJwt], PlanController.getAll);
router.post("/", [checkJwt], PlanController.create);
router.delete("/:id", [checkJwt], PlanController.delete);

export default router;