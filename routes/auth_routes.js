// auth_routes.js
import { Router } from "express";
import {
  registerUser,
  loginUser,
  verifyLogin,
  getProfile,
  logoutUser,
} from "./controller/auth_controller.js";
import { requireMfa } from "./modules/mfa_module.js";

function requireLogin(req, res, next) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ ok: false, message: "Login required" });
  }
  next();
}

const r = Router();

r.post("/register", registerUser);
r.post("/login", loginUser);
r.post("/verify-mfa", verifyLogin);
r.get("/me", requireLogin, requireMfa, getProfile);
r.post("/logout", requireLogin, logoutUser);

export default r;
