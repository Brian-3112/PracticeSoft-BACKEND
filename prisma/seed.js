const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  await prisma.user.upsert({
    where: { email: 'parejabrianh31@gmail.com' },
    update: {},
    create: {
      nombre: 'Brian',
      apellido: 'Pareja',
      email: 'parejabrianh31@gmail.com',
      password: passwordHash,
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