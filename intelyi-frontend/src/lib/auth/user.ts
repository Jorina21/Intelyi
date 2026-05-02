import { prisma } from "@/lib/prisma";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const credentialsUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  isAdmin: true,
  passwordHash: true,
} as const;

const roleUserSelect = {
  id: true,
  isAdmin: true,
  name: true,
  email: true,
  image: true,
} as const;

export async function findUserForCredentials(email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: credentialsUserSelect,
  });
}

export async function findUserRoleByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    select: roleUserSelect,
  });
}
