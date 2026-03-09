import { CategoryType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_SYSTEM_CATEGORIES = [
  'Food',
  'Transportation',
  'Home',
  'Supermarket',
  'Health',
  'Education',
  'Entertainment',
  'Services',
  'Savings',
  'Other',
];

async function main() {
  for (const categoryName of DEFAULT_SYSTEM_CATEGORIES) {
    const exists = await prisma.category.findFirst({
      where: {
        name: {
          equals: categoryName,
          mode: 'insensitive',
        },
        type: CategoryType.SYSTEM,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.category.create({
        data: {
          name: categoryName,
          type: CategoryType.SYSTEM,
          userId: null,
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
