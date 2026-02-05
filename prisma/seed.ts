import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
