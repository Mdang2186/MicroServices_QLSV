
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt"; // You might need to install bcrypt in packages/database or use a simple hash for dev

const prisma = new PrismaClient();

async function main() {
    console.log("Start seeding...");

    // 1. IAM: Create Users
    const passwordHash = await bcrypt.hash("123456", 10);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@edu.com" },
        update: {},
        create: {
            username: "admin",
            email: "admin@edu.com",
            passwordHash,
            role: "ADMIN_STAFF",
            avatarUrl: "https://i.pravatar.cc/150?u=admin",
        },
    });

    const studentUser = await prisma.user.upsert({
        where: { email: "student@edu.com" },
        update: {},
        create: {
            username: "SV001",
            email: "student@edu.com",
            passwordHash,
            role: "STUDENT",
            avatarUrl: "https://i.pravatar.cc/150?u=student",
        },
    });

    // 2. Organization: Faculties & Majors
    const itFaculty = await prisma.faculty.create({
        data: {
            code: "CNTT",
            name: "Công nghệ thông tin",
            deanName: "Dr. Tech",
            majors: {
                create: [
                    { code: "SE", name: "Kỹ thuật phần mềm" },
                    { code: "DS", name: "Khoa học dữ liệu" },
                    { code: "AI", name: "Trí tuệ nhân tạo" },
                ],
            },
        },
    });

    const seMajor = (await prisma.major.findUnique({ where: { code: "SE" } }))!;

    // 3. Organization: Admin Classes & Students
    const adminClass = await prisma.adminClass.create({
        data: {
            code: "SE1601",
            name: "Lớp SE1601",
            majorId: seMajor.id,
            cohort: "K16",
        }
    });

    const student = await prisma.student.create({
        data: {
            userId: studentUser.id,
            studentCode: "SV001",
            fullName: "Nguyen Van A",
            dob: new Date("2000-01-01"),
            gender: "Nam",
            majorId: seMajor.id,
            adminClassId: adminClass.id,
            status: "ACTIVE",
        }
    });

    // 4. Curriculum: Semester & Subjects
    const semester = await prisma.semester.create({
        data: {
            code: "SP2026",
            name: "Spring 2026",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-05-01"),
            isRegistering: true,
        }
    });

    const subjects = await prisma.subject.createMany({
        data: [
            { code: "SWP391", name: "Software Development Project", credits: 3, majorId: seMajor.id },
            { code: "PRN211", name: "Basic Cross-Platform Application Programming", credits: 3, majorId: seMajor.id },
            { code: "SWR302", name: "Software Requirements", credits: 3, majorId: seMajor.id },
        ]
    });

    // 5. Schedule: Course Classes
    const swpSubject = (await prisma.subject.findUnique({ where: { code: "SWP391" } }))!;

    await prisma.courseClass.create({
        data: {
            code: "SWP391_SE1601",
            name: "Lớp SWP391 - SE1601",
            subjectId: swpSubject.id,
            semesterId: semester.id,
            currentSlots: 5,
            schedules: {
                create: [
                    { dayOfWeek: 2, startShift: 1, endShift: 3, room: "AL-202", type: "THEORY" }, // Monday
                    { dayOfWeek: 4, startShift: 1, endShift: 3, room: "AL-202", type: "LAB" },    // Wednesday
                ]
            }
        }
    });

    console.log("Seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
