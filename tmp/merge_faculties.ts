import { PrismaClient } from '@prisma/client';

async function merge() {
    const prisma = new PrismaClient();
    console.log("Starting Faculty Merge: F_CNTT -> CNTT...");

    try {
        const primary = await prisma.faculty.findUnique({ where: { code: 'CNTT' } });
        const duplicate = await prisma.faculty.findUnique({ where: { code: 'F_CNTT' } });

        if (!primary || !duplicate) {
            console.error("Could not find both faculties. Aborting.");
            return;
        }

        console.log(`Primary ID: ${primary.id}, Duplicate ID: ${duplicate.id}`);

        // 1. Move Majors
        const majorUpdate = await prisma.major.updateMany({
            where: { facultyId: duplicate.id },
            data: { facultyId: primary.id }
        });
        console.log(`Moved ${majorUpdate.count} majors.`);

        // 2. Move Lecturers (just in case they exist)
        const lecturerUpdate = await prisma.lecturer.updateMany({
            where: { facultyId: duplicate.id },
            data: { facultyId: primary.id }
        });
        console.log(`Moved ${lecturerUpdate.count} lecturers.`);

        // 3. Move Departments
        const deptUpdate = await prisma.department.updateMany({
            where: { facultyId: duplicate.id },
            data: { facultyId: primary.id }
        });
        console.log(`Moved ${deptUpdate.count} departments.`);

        // 4. Delete Duplicate
        await prisma.faculty.delete({
            where: { id: duplicate.id }
        });
        console.log("Duplicate faculty record deleted successfully.");

        console.log("Merge Complete!");
    } catch (err) {
        console.error("Merge failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

merge();
