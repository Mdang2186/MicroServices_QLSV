const fs = require('fs');
const content = fs.readFileSync('tmp/curriculum_stats.json', 'utf16le');
console.log(content);
