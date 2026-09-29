import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

// Minimal starter permission set covering the P0 Foundation domains this
// milestone's services will eventually enforce against. Extend as each
// subsequent phase's services come online.
const PERMISSIONS = [
  'patient.read',
  'patient.write',
  'patient.merge',
  'appointment.read',
  'appointment.write',
  'encounter.read',
  'encounter.write',
  'encounter.sign',
  'order.read',
  'order.write',
  'invoice.read',
  'invoice.write',
  'invoice.void',
  'user.manage',
  'role.manage',
];

const ROLES: Record<string, string[]> = {
  admin: PERMISSIONS,
  clinician: ['patient.read', 'encounter.read', 'encounter.write', 'encounter.sign', 'order.read', 'order.write'],
  receptionist: ['patient.read', 'patient.write', 'appointment.read', 'appointment.write'],
  billing_clerk: ['invoice.read', 'invoice.write', 'invoice.void'],
};

async function main() {
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((code) =>
      prisma.permission.upsert({ where: { code }, update: {}, create: { code } })
    )
  );
  const permissionByCode = new Map(permissionRecords.map((p) => [p.code, p]));

  for (const [roleName, codes] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    for (const code of codes) {
      const permission = permissionByCode.get(code);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${permissionRecords.length} permissions across ${Object.keys(ROLES).length} roles.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
