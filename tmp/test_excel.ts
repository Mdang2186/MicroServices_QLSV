import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

async function test() {
    const prisma = new PrismaClient();
    try {
        const students = await prisma.student.findMany({ 
            take: 1,
            include: { major: true, adminClass: true } 
        });
        
        const sampleData = students.length > 0 ? students : [{
            studentCode: "SV26001",
            fullName: "Nguyễn Văn A",
            dob: new Date("2004-01-01"),
            gender: "MALE",
            status: "STUDYING"
        }];

        console.log("Generating sheet...");
        const ws = xlsx.utils.json_to_sheet(sampleData);
        console.log("Sheet generated.");
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Template");
        const b64 = xlsx.write(wb, { type: "base64", bookType: "xlsx" });
        console.log("Base64 length:", b64.length);
    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
