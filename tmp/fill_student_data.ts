import { PrismaClient } from '@prisma/client';

async function fillData() {
    const prisma = new PrismaClient();
    console.log("Starting massive data enrichment for 11,762 students...");

    try {
        const students = await prisma.student.findMany({
            select: { id: true, fullName: true, studentCode: true }
        });

        console.log(`Found ${students.length} students. Beginning update in chunks of 500...`);

        const chunks = [];
        for (let i = 0; i < students.length; i += 500) {
            chunks.push(students.slice(i, i + 500));
        }

        let updatedCount = 0;
        for (const chunk of chunks) {
            await Promise.all(chunk.map(s => {
                const randomPhone = "09" + Math.floor(10000000 + Math.random() * 90000000);
                const randomCitizenId = "001" + Math.floor(100000000 + Math.random() * 900000000);
                const randomAcc = "1900" + Math.floor(100000 + Math.random() * 900000);
                
                return prisma.student.update({
                    where: { id: s.id },
                    data: {
                        gender: s.fullName.toLowerCase().includes("thị") || s.fullName.toLowerCase().includes("hồng") ? "FEMALE" : "MALE",
                        phone: randomPhone,
                        address: "Số " + Math.floor(Math.random() * 200) + " Phố Bà Triệu, Hà Nội",
                        permanentAddress: "Hà Nội, Việt Nam",
                        citizenId: randomCitizenId,
                        emailPersonal: `${s.studentCode.toLowerCase()}@sv.uneti.edu.vn`,
                        admissionDate: new Date("2024-09-01"),
                        campus: "Hà Nội",
                        educationLevel: "Đại học",
                        educationType: "Chính quy",
                        intake: "K18",
                        ethnicity: "Kinh",
                        religion: "Không",
                        nationality: "Việt Nam",
                        region: "Miền Bắc",
                        idIssueDate: new Date("2021-05-15"),
                        idIssuePlace: "Cục Cảnh sát QLHC về TTXH",
                        birthPlace: "Hà Nội",
                        bankName: "MB Bank",
                        bankBranch: "Chi nhánh Hà Nội",
                        bankAccountName: s.fullName.toUpperCase(),
                        bankAccountNumber: randomAcc,
                        status: "STUDYING",
                        academicStatus: "NORMAL"
                    }
                });
            }));
            updatedCount += chunk.length;
            console.log(`Updated ${updatedCount}/${students.length} students...`);
        }

        console.log("Enrichment complete! All students now have realistic, non-null data.");
    } catch (err) {
        console.error("Enrichment failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

fillData();
