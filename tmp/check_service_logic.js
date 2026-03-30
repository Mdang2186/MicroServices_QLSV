
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getStudentFees(studentId) {
    const fixedFees = await prisma.studentFee.findMany({
      where: { studentId },
      include: { semester: true },
    });

    const studentsWithEnrollments = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            courseClass: {
              include: { semester: true },
            },
          },
        },
      },
    });

    const studentFees = fixedFees.map((f) => ({
      id: f.id,
      name: f.name,
      semester: f.semester.name,
      totalAmount: Number(f.totalAmount),
      paidAmount: Number(f.paidAmount),
      finalAmount: Number(f.finalAmount),
      status: f.status,
      dueDate: f.dueDate,
    }));

    const enrollmentsBySemester = {};

    studentsWithEnrollments?.enrollments.forEach((e) => {
      const semester = e.courseClass.semester;
      if (!enrollmentsBySemester[semester.id]) {
        enrollmentsBySemester[semester.id] = {
          name: semester.name,
          total: 0,
          paid: 0,
        };
      }
      const fee = Number(e.tuitionFee);
      enrollmentsBySemester[semester.id].total += fee;
      if (e.status === "PAID") {
        enrollmentsBySemester[semester.id].paid += fee;
      }
    });

    Object.keys(enrollmentsBySemester).forEach((semesterId) => {
      const data = enrollmentsBySemester[semesterId];
      const synthesizedId = `tuition-${semesterId}`;
      if (!studentFees.some((f) => f.id === synthesizedId)) {
        studentFees.unshift({
          id: synthesizedId,
          name: `Học phí ${data.name}`,
          semester: data.name,
          totalAmount: data.total,
          paidAmount: data.paid,
          finalAmount: data.total,
          status: data.total === data.paid ? "PAID" : "UNPAID",
          dueDate: new Date(),
        });
      }
    });

    return studentFees;
}

async function main() {
    const studentId = 'STD_22101100025';
    const fees = await getStudentFees(studentId);
    console.log(JSON.stringify(fees, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
