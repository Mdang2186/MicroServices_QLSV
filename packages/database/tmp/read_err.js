const fs = require('fs');
const content = fs.readFileSync('prisma_err.txt', 'utf16le');
console.log(content);
