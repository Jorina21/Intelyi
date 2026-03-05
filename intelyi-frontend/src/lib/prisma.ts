import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Check .env and restart the dev server.");
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    // ✅ PrismaNeon expects config, not a Pool instance
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
