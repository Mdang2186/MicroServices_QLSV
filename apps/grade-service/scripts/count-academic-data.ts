import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaService } from '../src/prisma.service';

function loadRootEnv() {
  const envPath = resolve(__dirname, '../../../.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  loadRootEnv();
  const prisma = new PrismaService();
  await prisma.$connect();
  const [classes, grades, students, semesters, trainingScores, approvedGrades] =
    await Promise.all([
      prisma.courseClass.count({ where: { enrollments: { some: {} } } }),
      prisma.grade.count(),
      prisma.student.count({ where: { status: 'STUDYING' } }),
      prisma.semester.count(),
      prisma.trainingScore.count(),
      prisma.grade.count({ where: { status: 'APPROVED' } }),
    ]);
  console.log(
    JSON.stringify(
      { classes, grades, approvedGrades, students, semesters, trainingScores },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
