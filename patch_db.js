const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCol(table, col, type) {
    try {
        const columns = await prisma.$queryRawUnsafe(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`);
        if (!columns.some(c => c.COLUMN_NAME === col)) {
            console.log(`Adding ${table}.${col}...`);
            await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD ${col} ${type}`);
            console.log(`Added ${table}.${col}`);
        }
    } catch(e) { console.error(`Failed ${table}.${col}:`, e.message); }
}

async function main() {
    await addCol('Semester', 'registerStartDate', 'DATETIME2 NULL');
    await addCol('Semester', 'registerEndDate', 'DATETIME2 NULL');
    await addCol('Semester', 'midtermGradeDeadline', 'DATETIME2 NULL');
    await addCol('Semester', 'examStartDate', 'DATE NULL');
    await addCol('Semester', 'examEndDate', 'DATE NULL');
    await addCol('Semester', 'semesterNumber', 'INT DEFAULT 1 NOT NULL');
    
    await addCol('SemesterPlanItem', 'theoryPeriods', 'INT NULL');
    await addCol('SemesterPlanItem', 'practicePeriods', 'INT NULL');
    await addCol('SemesterPlanItem', 'theorySessionsPerWeek', 'INT NULL');
    await addCol('SemesterPlanItem', 'practiceSessionsPerWeek', 'INT NULL');
    await addCol('SemesterPlanItem', 'periodsPerSession', 'INT NULL');

    await prisma.$disconnect();
}

main();
