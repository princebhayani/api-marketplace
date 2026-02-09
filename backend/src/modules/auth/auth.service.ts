import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { config } from "../../config/env";
import { AppError } from "../../common/middleware/errorHandler";
import { RoleRepository } from "../rbac/repositories/role.repository";
import { NotificationService } from "../notifications/notification.service";
import { logger } from "../../common/logger";
import { firebaseAuth } from "../../config/firebase";
import { auditLog } from "../audit/audit.service";
import { SESSION_EXPIRY_MS } from "../../common/types";

const roleRepo = new RoleRepository();
const notificationService = new NotificationService();

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

export class AuthService {
  async register(email: string, password: string, name?: string | null) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    // Create ApiProvider record for the user
    await prisma.apiProvider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: user.name || user.email.split("@")[0],
      },
    });

    notificationService.sendWelcomeEmail(user.id, user.email, user.name).catch((err) => {
      logger.error("Failed to send welcome email", err);
    });

    const tokens = await this.issueTokens(user.id, user.email, [user.role]);

    auditLog.log({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: user.id,
      metadata: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: [user.role],
      },
      ...tokens,
    };
  }

  async login(email: string, password: string, deviceInfo?: string, ip?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new AppError("Invalid credentials", 401);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError("Invalid credentials", 401);
    }

    // Ensure ApiProvider record exists for User and SuperAdmin (both can create/manage APIs)
    await prisma.apiProvider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: user.name || user.email.split("@")[0],
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, [user.role]);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        deviceInfo,
        ipAddress: ip,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    auditLog.log({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
      metadata: { method: "password" },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: [user.role],
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new AppError("Invalid refresh token", 401);
    }

    const tokens = await this.issueTokens(session.user.id, session.user.email, [session.user.role]);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
      },
    });

    return { user: session.user, ...tokens };
  }

  async logout(refreshToken: string) {
    const session = await prisma.userSession.findFirst({
      where: { refreshToken, revokedAt: null },
      select: { userId: true },
    });
    await prisma.userSession.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (session?.userId) {
      auditLog.log({
        userId: session.userId,
        action: "LOGOUT",
        entity: "User",
        entityId: session.userId,
      });
    }
  }

  async selectRole(userId: string, role: string) {
    // Assign the User role (always User now)
    await roleRepo.assignRoleToUser(userId, "User");

    // Ensure ApiProvider record exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await prisma.apiProvider.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          displayName: user.name || user.email.split("@")[0],
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    const tokens = await this.issueTokens(userId, updatedUser!.email, [updatedUser!.role]);

    return {
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        roles: [updatedUser!.role],
      },
      ...tokens,
    };
  }

  async loginWithProvider(idToken: string, ip?: string) {
    let decodedToken;
    try {
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
      logger.info('Decoded Firebase token', {
        email: decodedToken.email,
        name: decodedToken.name,
        uid: decodedToken.uid,
        provider: decodedToken.firebase?.sign_in_provider,
        emailVerified: decodedToken.email_verified
      });
    } catch (e) {
      throw new AppError("Invalid Firebase token", 401);
    }

    const { email, name, picture, uid } = decodedToken;
    if (!email) {
      logger.error('OAuth provider did not return email', {
        uid,
        provider: decodedToken.firebase?.sign_in_provider,
        fullToken: JSON.stringify(decodedToken)
      });
      throw new AppError(
        "Email is required from provider. Please ensure your GitHub account has a public email set, or grant email permissions during sign-in.",
        400
      );
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name || email.split("@")[0],
          emailVerifiedAt: new Date(),
        },
      });
    }

    await prisma.apiProvider.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: user.name || user.email.split("@")[0],
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, [user.role]);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: ip,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    auditLog.log({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
      metadata: { method: "oauth" },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: [user.role],
      },
      ...tokens,
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.isActive) throw new AppError("User not found", 404);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: [user.role],
    };
  }

  async updateProfile(userId: string, data: { name?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });

    // Also update ApiProvider displayName if it exists
    await prisma.apiProvider.updateMany({
      where: { userId },
      data: { displayName: data.name || user.email.split("@")[0] },
    });

    auditLog.log({
      userId,
      action: "PROFILE_UPDATED",
      entity: "User",
      entityId: userId,
      metadata: { field: "name" },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw new AppError("Current password incorrect", 401);

    const passwordHash = await bcrypt.hash(data.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    auditLog.log({
      userId,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: userId,
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    roles?: string[]
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const roleNames =
      roles ??
      [(await prisma.user.findUnique({ where: { id: userId } }))!.role];

    const payload: JwtPayload = { sub: userId, email, roles: roleNames };

    const accessToken = jwt.sign(payload, config.jwtAccessSecret, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: "30d",
    });

    return { accessToken, refreshToken };
  }
}
