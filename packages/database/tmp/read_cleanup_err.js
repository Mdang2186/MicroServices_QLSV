const fs = require('fs');
const content = fs.readFileSync('tmp/cleanup_error.txt', 'utf8');
console.log(content);
