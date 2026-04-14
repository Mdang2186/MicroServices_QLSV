import { PrismaClient } from '@prisma/client';

async function seedGrades() {
    const prisma = new PrismaClient();
    console.log("🚀 Starting Grade Seeding (Realistic Data)...");

    try {
        // 1. Get all enrollments
        const enrollments = await prisma.enrollment.findMany({
            include: {
                courseClass: {
                    include: { 
                        // @ts-ignore
                        subject: true 
                    }
                }
            }
        });

        console.log(`Found ${enrollments.length} enrollments to process.`);

        let count = 0;
        for (const enr of enrollments) {
            // @ts-ignore
            const cls = enr.courseClass;
            const subject = cls?.subject;
            if (!subject) continue;

            const credits = subject.credits || 3;
            const isTheory = (subject.theoryHours || 0) > 0 || (subject.practiceHours || 0) === 0;

            // Generate realistic scores
            const cc = 8 + Math.random() * 2; 
            const tx1 = 6 + Math.random() * 3.5; 
            const tx2 = 6 + Math.random() * 3.5;
            const tx3 = 6 + Math.random() * 3.5;
            const fin = 4 + Math.random() * 5.5; 

            let processAvg = 0;
            let total10 = 0;

            if (isTheory) {
                const regularScores = [tx1, tx2];
                if (credits > 2) regularScores.push(tx3);
                
                const sumRegular = regularScores.reduce((a, b) => a + b, 0);
                const weightTotal = 1 + (2 * regularScores.length);
                processAvg = (cc + sumRegular * 2) / weightTotal;
                total10 = (processAvg * 0.4 + fin * 0.6);
            } else {
                total10 = (cc + tx1 * 2 + tx2 * 2) / 5;
                processAvg = total10;
            }

            total10 = Math.round(total10 * 10) / 10;
            processAvg = Math.round(processAvg * 10) / 10;

            let letter = 'F';
            let gpa = 0;
            if (total10 >= 8.5) { letter = 'A'; gpa = 4.0; }
            else if (total10 >= 7.8) { letter = 'B+'; gpa = 3.5; }
            else if (total10 >= 7.0) { letter = 'B'; gpa = 3.0; }
            else if (total10 >= 6.3) { letter = 'C+'; gpa = 2.5; }
            else if (total10 >= 5.5) { letter = 'C'; gpa = 2.0; }
            else if (total10 >= 4.8) { letter = 'D+'; gpa = 1.5; }
            else if (total10 >= 4.0) { letter = 'D'; gpa = 1.0; }

            await prisma.grade.upsert({
                where: {
                    studentId_subjectId_courseClassId: {
                        studentId: enr.studentId,
                        subjectId: subject.id,
                        courseClassId: enr.courseClassId
                    }
                },
                update: {
                    attendanceScore: cc,
                    regularScore1: tx1,
                    regularScore2: tx2,
                    regularScore3: tx3,
                    finalScore: fin,
                    midtermScore: processAvg,
                    totalScore10: total10,
                    totalScore4: gpa,
                    letterGrade: letter,
                    isPassed: total10 >= 4.0,
                    status: 'DRAFT'
                },
                create: {
                    studentId: enr.studentId,
                    subjectId: subject.id,
                    courseClassId: enr.courseClassId,
                    attendanceScore: cc,
                    regularScore1: tx1,
                    regularScore2: tx2,
                    regularScore3: tx3,
                    finalScore: fin,
                    midtermScore: processAvg,
                    totalScore10: total10,
                    totalScore4: gpa,
                    letterGrade: letter,
                    isPassed: total10 >= 4.0,
                    status: 'DRAFT'
                }
            });
            count++;
        }

        console.log(`✅ Success! Seeded grades for ${count} students.`);
    } catch (err) {
        console.error("❌ Error during seeding:", err);
    } finally {
        await prisma.$disconnect();
    }
}

seedGrades();
