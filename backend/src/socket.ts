import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config/env";
import { logger } from "./common/logger";
import type { JwtPayload } from "./modules/auth/auth.service";

let io: Server;

export function initSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    },
  });

  // Authenticate socket connections using JWT
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
      (socket as any).userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    // Join user-specific room for targeted events
    socket.join(`user:${userId}`);
    logger.info(`Socket connected: user ${userId}`);

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  return io;
}

/**
 * Emit an event to a specific user via their socket room.
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}
