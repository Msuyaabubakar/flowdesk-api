import { Request, Response, NextFunction } from "express";

/**
 * Fake authentication middleware
 * (Temporary until JWT is added)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Simulated logged-in user
  req.user = {
    id: 1,
    role: "admin"
  };

  next();
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Forbidden"
      });
    }

    next();
  };
};