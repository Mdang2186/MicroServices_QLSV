const fs = require('fs');
const log = fs.readFileSync('out.log', 'utf16le');
fs.writeFileSync('error.txt', log.substring(log.indexOf('ERROR CAUGHT')));
