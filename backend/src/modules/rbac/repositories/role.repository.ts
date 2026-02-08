import { prisma } from "../../../config/prisma";

export class RoleRepository {
  findByName(name: string) {
    return prisma.role.findUnique({ where: { name } });
  }

  async assignRoleToUser(userId: string, roleName: string) {
    const role = await this.findByName(roleName);
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }
    return prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }
}

