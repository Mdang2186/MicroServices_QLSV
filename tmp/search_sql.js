const fs = require('fs');

function search() {
    const filePath = 'd:/KHOA_LUAN_TOT_NGHIEP/MicroServices_QLSV/student_db.sql';
    // Try both UTF-8 and UTF-16LE
    console.log('Searching in student_db.sql...');
    
    try {
        const content8 = fs.readFileSync(filePath, 'utf8');
        if (content8.includes('CNTT_K18')) {
            console.log('Found CNTT_K18 in UTF-8 encoding');
            return;
        }
    } catch (e) {}

    try {
        const content16 = fs.readFileSync(filePath, 'utf16le');
        if (content16.includes('CNTT_K18')) {
            console.log('Found CNTT_K18 in UTF-16LE encoding');
            return;
        }
    } catch (e) {}

    console.log('CNTT_K18 NOT found in student_db.sql');
}

search();
