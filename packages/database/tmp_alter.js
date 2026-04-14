const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE [dbo].[Curriculum] ADD [suggestedSemester] INT NOT NULL DEFAULT 1;`);
    console.log("Added suggestedSemester column.");
  } catch (e) {
    console.error("Error adding suggestedSemester:", e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
