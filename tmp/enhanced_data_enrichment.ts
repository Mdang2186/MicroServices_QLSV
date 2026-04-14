import { PrismaClient } from '@prisma/client';

async function enhance() {
    const prisma = new PrismaClient();
    console.log("Starting Academic & Specialized Data Enrichment...");

    try {
        // 1. Fetch Specializations mapping
        const specs = await prisma.specialization.findMany({
            select: { id: true, majorId: true }
        });
        
        const specMap = specs.reduce((acc, curr) => {
            if (!acc[curr.majorId]) acc[curr.majorId] = [];
            acc[curr.majorId].push(curr.id);
            return acc;
        }, {} as Record<string, string[]>);

        // 2. Fetch all students
        const students = await prisma.student.findMany({
            select: { id: true, dob: true, admissionDate: true, majorId: true, intake: true }
        });

        console.log(`Enriching ${students.length} students...`);

        const chunks = [];
        for (let i = 0; i < students.length; i += 500) {
            chunks.push(students.slice(i, i + 500));
        }

        let updatedCount = 0;
        for (const chunk of chunks) {
            await Promise.all(chunk.map(s => {
                // Realistic GPA (Normal-ish distribution around 3.0)
                const gpa = Number((2.5 + Math.random() * 1.3).toFixed(2));
                const cpa = Math.min(4.0, Number((gpa + (Math.random() * 0.4 - 0.2)).toFixed(2)));

                // Credits based on Intake
                let credits = 0;
                if (s.intake === 'K18' || s.intake?.includes('18')) credits = Math.floor(Math.random() * 15);
                else if (s.intake === 'K17' || s.intake?.includes('17')) credits = 30 + Math.floor(Math.random() * 20);
                else if (s.intake === 'K16' || s.intake?.includes('16')) credits = 65 + Math.floor(Math.random() * 30);
                else if (s.intake === 'K15' || s.intake?.includes('15')) credits = 105 + Math.floor(Math.random() * 25);
                else credits = 60;

                // Dates
                const unionDate = s.dob ? new Date(s.dob.getTime() + (16 * 365 * 24 * 60 * 60 * 1000)) : new Date("2021-03-26");
                const isPartyMember = Math.random() < 0.02; // 2% chance
                const partyDate = isPartyMember && s.admissionDate ? new Date(s.admissionDate.getTime() + (365 * 24 * 60 * 60 * 1000)) : null;

                // Specs
                const possibleSpecs = specMap[s.majorId] || [];
                const specializationId = possibleSpecs.length > 0 ? possibleSpecs[Math.floor(Math.random() * possibleSpecs.length)] : null;

                // Policy
                const policies = ["Không", "Không", "Không", "Không", "Không", "Con thương binh", "Vùng sâu vùng xa", "Con liệt sĩ"];
                const policy = policies[Math.floor(Math.random() * policies.length)];

                return prisma.student.update({
                    where: { id: s.id },
                    data: {
                        gpa: gpa,
                        cpa: cpa,
                        totalEarnedCredits: credits,
                        policyBeneficiary: policy,
                        youthUnionDate: unionDate,
                        partyDate: partyDate,
                        specializationId: specializationId
                    }
                });
            }));
            updatedCount += chunk.length;
            console.log(`Updated ${updatedCount}/${students.length} students...`);
        }

        console.log("Deep Academic Enrichment Complete!");
    } catch (err) {
        console.error("Enrichment error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

enhance();
