import { Router } from "express";

const router = Router();

/**
 * Test route
 * GET /api/auth
 */
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Auth module working"
  });
});

export const authRouter = Router();