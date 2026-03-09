const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { name: true, type: true, userId: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.type] = (acc[row.type] || 0) + 1;
    return acc;
  }, {});

  console.log('counts=', counts);
  console.log('firstRows=', rows.slice(0, 20));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
