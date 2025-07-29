import { Router } from "express";
import {
  changeProfile,
  getMe,
  login,
  register,
  verifyEmail,
} from "../controllers/auth.js";
import { authenticate } from "../middleware/authentication.js";

export const authRoute = Router();

authRoute.post("/login", login);
authRoute.post("/register", register);
authRoute.get("/verify", verifyEmail);
authRoute.get("/me", authenticate, getMe);
authRoute.patch("/me", authenticate, changeProfile);

export default authRoute;
