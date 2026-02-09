import { SystemRole } from "@prisma/client";
import { prisma } from "../../../config/prisma";

export class RoleRepository {
  async assignRoleToUser(userId: string, roleName: string) {
    const role = roleName as SystemRole;
    return prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }
}
