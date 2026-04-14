const fs = require('fs');
const content = fs.readFileSync('tmp/cleanup_v2_log.txt', 'utf8');
console.log(content.slice(0, 5000));
