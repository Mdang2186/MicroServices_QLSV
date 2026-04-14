const fs = require('fs');

function readLog(filename) {
    try {
        const content = fs.readFileSync(filename, 'utf16le');
        console.log(`--- content of ${filename} ---`);
        console.log(content.slice(-2000)); // Read last 2000 chars
    } catch (e) {
        console.log(`Error reading ${filename}: ${e.message}`);
    }
}

readLog('apps/web-admin/web_admin_out.txt');
readLog('apps/api-gateway/api_gateway_out.txt');
