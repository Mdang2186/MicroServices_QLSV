const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const studentCode = 'SV18A1CNTT01';
    
    const student = await prisma.student.findUnique({
        where: { studentCode },
        include: { adminClass: true }
    });

    if (!student) {
        console.log("Student not found");
        return;
    }

    const legacyMeta = student.adminClassId ? await prisma.adminClass.findUnique({
        where: { id: student.adminClassId }
    }) : null;

    let mirrorStudentId = null;
    if (legacyMeta) {
        const match = legacyMeta.code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
        if (match) {
            const cohort = legacyMeta.cohort || `K${match[1]}`;
            const majorCode = match[3];
            const section = match[2].padStart(2, "0");
            
            const mirrorAdminClass = await prisma.adminClass.findFirst({
                where: {
                    cohort: cohort,
                    code: {
                        startsWith: `${cohort}-`,
                        contains: `-${majorCode}`,
                        endsWith: `-${section}`,
                    }
                }
            });
            if (mirrorAdminClass) {
                const mirror = await prisma.student.findFirst({
                    where: {
                        adminClassId: mirrorAdminClass.id,
                        fullName: student.fullName,
                        status: 'STUDYING'
                    }
                });
                if (mirror) mirrorStudentId = mirror.id;
            }
        }
    }

    const ids = [student.id];
    if (mirrorStudentId) ids.push(mirrorStudentId);

    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: { in: ids } },
        include: { courseClass: { include: { subject: true, semester: true } } }
    });

    // Group by subjectId
    const enrollmentsBySubject = {};
    for (const e of enrollments) {
        const subId = e.courseClass.subject.id;
        if (!enrollmentsBySubject[subId]) {
            enrollmentsBySubject[subId] = [];
        }
        enrollmentsBySubject[subId].push(e);
    }

    let deletedCount = 0;
    // Find subjects with multiple enrollments
    for (const [subId, enrs] of Object.entries(enrollmentsBySubject)) {
        if (enrs.length > 1) {
            // Sort by semester start date so we keep the earlier one or the HK4 one
            enrs.sort((a, b) => {
                const nameA = a.courseClass.semester?.name || '';
                const nameB = b.courseClass.semester?.name || '';
                
                // If one is HK4 and the other is HK6, keep HK4
                if (nameA.includes('HK4') && nameB.includes('HK6')) return -1;
                if (nameB.includes('HK4') && nameA.includes('HK6')) return 1;
                
                // Fallback to date
                const dateA = new Date(a.courseClass.semester?.startDate || 0).getTime();
                const dateB = new Date(b.courseClass.semester?.startDate || 0).getTime();
                return dateA - dateB;
            });

            // Keep the first one, delete the rest
            const toKeep = enrs[0];
            const toDelete = enrs.slice(1);

            console.log(`\nSubject: ${toKeep.courseClass.subject.name}`);
            console.log(` Keeping: ${toKeep.courseClass.code} (Sem: ${toKeep.courseClass.semester?.name})`);

            for (const del of toDelete) {
                console.log(` Deleting: ${del.courseClass.code} (Sem: ${del.courseClass.semester?.name})`);
                await prisma.enrollment.delete({ where: { id: del.id } });
                
                // Also decrement slot
                await prisma.courseClass.update({
                    where: { id: del.courseClassId },
                    data: { currentSlots: { decrement: 1 } }
                });
                deletedCount++;
            }
        }
    }

    console.log(`\nDeleted ${deletedCount} redundant enrollments.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
