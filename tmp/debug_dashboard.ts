import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('--- START DIAGNOSTIC ---');
  try {
    const count = await prisma.student.count();
    console.log('Total students:', count);

    const currentSemester = await prisma.semester.findFirst({
        where: { isCurrent: true },
    }) || await prisma.semester.findFirst({
        orderBy: { startDate: 'desc' },
    });

    console.log('Target semester:', currentSemester?.name);

    if (currentSemester) {
        console.log('Fetching enrollments with faculty info...');
        const enrollments = await prisma.enrollment.findMany({
            where: { courseClass: { semesterId: currentSemester.id } },
            select: {
              student: {
                select: {
                  major: {
                    select: {
                      faculty: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
        });

        console.log('Found enrollments:', enrollments.length);

        if (enrollments.length > 0) {
            console.log('Processing faculty distribution...');
            const facultyMap = new Map<string, number>();
            enrollments.forEach((e, index) => {
              try {
                if (!e.student) {
                    throw new Error('Student missing');
                }
                if (!e.student.major) {
                    throw new Error('Major missing');
                }
                if (!e.student.major.faculty) {
                    throw new Error('Faculty missing');
                }
                const fName = e.student.major.faculty.name;
                facultyMap.set(fName, (facultyMap.get(fName) || 0) + 1);
              } catch (err) {
                console.error(`Error processing enrollment at index ${index}:`, err.message);
                // In the real service, this 'throw' causes the 500 error
                // throw err; 
              }
            });
            console.log('Faculty distribution keys:', Array.from(facultyMap.keys()));
        }
    }
  } catch (err) {
    console.error('DIAGNOSTIC FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
