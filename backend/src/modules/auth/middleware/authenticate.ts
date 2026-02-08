import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../../config/env";
import type { JwtPayload } from "../auth.service";
import { AppError } from "../../../common/middleware/errorHandler";

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

export function authenticateJWT(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
    req.user = payload;
    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
}

