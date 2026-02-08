import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../logger";
import { Prisma } from "@prisma/client";

const FIELD_LABELS: Record<string, string> = {
  name: "API Name",
  slug: "Slug",
  category: "Category",
  description: "Description",
  providerDisplayName: "Provider Display Name",
  rateLimits: "Rate Limits Description",
};

function formatZodMessage(zodError: ZodError): string {
  const first = zodError.errors[0];
  if (!first) return "Validation failed";
  const field = first.path[0] as string;
  const label = FIELD_LABELS[field] || (field ? `${field.charAt(0).toUpperCase()}${field.slice(1)}` : "Field");
  const msg = first.message;
  // Turn "String must contain at most 150 character(s)" into "Description must be at most 150 characters."
  const maxMatch = msg.match(/at most (\d+) character/i);
  if (maxMatch) {
    return `${label} must be at most ${maxMatch[1]} characters.`;
  }
  const minMatch = msg.match(/at least (\d+) character/i);
  if (minMatch) {
    return `${label} must be at least ${minMatch[1]} characters.`;
  }
  return `${label}: ${msg}`;
}

export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "AppError";
  }
}

// Express error-handling middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;

  // Handle Zod validation errors (e.g. character limits)
  if (err instanceof ZodError) {
    const message = formatZodMessage(err);
    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = err.meta?.target as string[] | undefined;
      const field = target?.[0] || "field";
      const message = `A record with this ${field} already exists. Please choose a different value.`;
      res.status(409).json({
        success: false,
        message,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Record not found",
      });
      return;
    }
    // For other Prisma errors, return generic error
    logger.error("Prisma error occurred", err);
    res.status(500).json({
      success: false,
      message: "Database error occurred",
    });
    return;
  }

  const statusCode = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : "Internal Server Error";

  logger.error("Error occurred", err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(isAppError && err.details ? { details: err.details } : {}),
  });
}

