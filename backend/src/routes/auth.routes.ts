import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authLimiter, sessionLimiter } from "../middleware/rateLimiter";
import { loginSchema, registerSchema } from "../validators/auth.validator";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", sessionLimiter, authController.refresh);
router.post("/logout", sessionLimiter, authController.logout);

export default router;
