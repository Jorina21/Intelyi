import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Seed skipped: Product table already has ${existing} rows.`);
    return;
  }

  await prisma.product.create({
    data: {
      title: "Basic Hoodie",
      description: "A comfortable everyday hoodie.",
      category: "CLOTHING",
      priceCents: 4500,
      stockQty: 10,
      images: {
        create: [
          {
            url: "https://via.placeholder.com/400",
            alt: "Hoodie",
            sortOrder: 0,
          },
        ],
      },
    },
  });

  console.log("Seed complete: created 1 product.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
