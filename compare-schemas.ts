
import * as fs from 'fs';

const prismaPath = 'd:\\KHOA_LUAN_TOT_NGHIEP\\MicroServices_QLSV\\packages\\database\\prisma\\schema.prisma';
const sqlPath = 'd:\\KHOA_LUAN_TOT_NGHIEP\\MicroServices_QLSV\\new_schema_only.sql';

function check() {
    const prismaContent = fs.readFileSync(prismaPath, 'utf8');
    const models = Array.from(prismaContent.matchAll(/model\s+(\w+)\s+{/g)).map(m => m[1]);
    
    // SQL file is UTF-16LE
    const sqlContent = fs.readFileSync(sqlPath, 'utf16le');
    const tables = Array.from(sqlContent.matchAll(/CREATE\s+TABLE\s+\[dbo\]\.\[(\w+)\]/g)).map(m => m[1]);
    
    const missingInSql = models.filter(m => !tables.includes(m));
    const extraInSql = tables.filter(t => !models.includes(t));
    
    console.log("--- Schema Comparison ---");
    console.log("Total Prisma Models:", models.length);
    console.log("Total SQL Tables:", tables.length);
    console.log("Missing in SQL:", missingInSql);
    console.log("Extra in SQL (Internal/Extra):", extraInSql);
}

check();
