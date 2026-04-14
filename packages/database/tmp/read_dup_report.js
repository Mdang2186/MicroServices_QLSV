const fs = require('fs');
const content = fs.readFileSync('tmp/duplicate_subjects_report.txt', 'utf16le');
console.log(content);
