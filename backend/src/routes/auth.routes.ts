import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authLimiter, sessionLimiter } from "../middleware/rateLimiter";
import { authenticate } from "../middleware/authenticate";
import { logActivity } from "../middleware/activityLogger";
import { loginSchema, registerSchema } from "../validators/auth.validator";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  logActivity("auth.register"),
  authController.register,
);
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  logActivity("auth.login"),
  authController.login,
);
router.post("/refresh", sessionLimiter, authController.refresh);
router.post("/logout", sessionLimiter, logActivity("auth.logout"), authController.logout);
router.get("/me", authenticate, authController.me);

// Social login: browser navigates to /google (or /facebook); the provider redirects back to /callback.
router.get("/google", sessionLimiter, authController.oauthStart("google"));
router.get(
  "/google/callback",
  sessionLimiter,
  logActivity("auth.login"),
  authController.oauthCallback("google"),
);
router.get("/facebook", sessionLimiter, authController.oauthStart("facebook"));
router.get(
  "/facebook/callback",
  sessionLimiter,
  logActivity("auth.login"),
  authController.oauthCallback("facebook"),
);

export default router;
