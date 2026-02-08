import { Router } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { authenticateJWT } from "./middleware/authenticate";

const router = Router();
const authService = new AuthService();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceInfo: z.string().optional(),
});

router.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register(body.email, body.password, body.name);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const ip = req.ip;
    const result = await authService.login(
      body.email,
      body.password,
      body.deviceInfo,
      ip
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.body.refreshToken as string | undefined;
    if (!token) {
      return res.status(400).json({ success: false, message: "Missing refreshToken" });
    }
    const result = await authService.refresh(token);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const token = req.body.refreshToken as string | undefined;
    if (!token) {
      return res.status(400).json({ success: false, message: "Missing refreshToken" });
    }
    await authService.logout(token);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticateJWT, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.sub);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

const selectRoleSchema = z.object({
  role: z.enum(["User"]),
});

router.post("/select-role", authenticateJWT, async (req, res, next) => {
  try {
    const body = selectRoleSchema.parse(req.body);
    const result = await authService.selectRole(req.user!.sub, body.role);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post("/social", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "Missing idToken" });
    }
    const ip = req.ip;
    const result = await authService.loginWithProvider(idToken, ip);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

const profileSchema = z.object({
  name: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.patch("/profile", authenticateJWT, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const result = await authService.updateProfile(req.user!.sub, body);
    res.json({ success: true, user: result });
  } catch (err) {
    next(err);
  }
});

router.patch("/change-password", authenticateJWT, async (req, res, next) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.sub, body);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
});

export const authRouter = router;

