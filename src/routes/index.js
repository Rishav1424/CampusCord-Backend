import { Router } from "express";
import authRoutes from "./auth.js";
import serverRoutes from "./server.js";
import { authenticate } from "../middleware/authentication.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/server", authenticate, serverRoutes);



export default router;