import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    const studentWhere = {};
    const enrollmentWhere = {};

    console.log("Running enrollment group...");
    await prisma.enrollment.groupBy({
      by: ["courseClassId"],
      where: enrollmentWhere,
      _count: { studentId: true },
      orderBy: { _count: { studentId: "desc" } },
      take: 6,
    });
    console.log("All passed");
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
