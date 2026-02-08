import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../common/middleware/errorHandler";

const permissionMatrix: Record<string, string[]> = {
  SuperAdmin: ["*"],
  User: ["apis.manage_own", "apis.view", "analytics.provider", "subscriptions.manage_self", "analytics.consumer"],
};

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(new AppError("Unauthorized", 401));
    }
    if (user.roles.includes("SuperAdmin")) {
      return next();
    }
    const hasRole = user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return next(new AppError("Forbidden", 403));
    }
    return next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(new AppError("Unauthorized", 401));
    }
    if (user.roles.includes("SuperAdmin")) {
      return next();
    }
    const hasPermission = user.roles.some((role) => {
      const perms = permissionMatrix[role] ?? [];
      return perms.includes("*") || perms.includes(permission);
    });
    if (!hasPermission) {
      return next(new AppError("Forbidden", 403));
    }
    return next();
  };
}

