import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Notifications module working"
  });
});

export default router;