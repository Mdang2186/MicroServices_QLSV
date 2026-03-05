import axios from 'axios';
import * as fs from 'fs';

async function testLogin() {
    let out = "";
    try {
        const res = await axios.post('http://localhost:3000/api/auth/login', {
            email: '90000000001',
            password: '123456'
        });
        out += "Admin Success!\n";
    } catch (e: any) {
        out += "Admin Error: " + JSON.stringify(e.response?.data || e.message) + "\n";
    }

    try {
        const res2 = await axios.post('http://localhost:3000/api/auth/login', {
            email: '21103100001',
            password: '123456'
        });
        out += "Student Success!\n";
    } catch (e: any) {
        out += "Student Error: " + JSON.stringify(e.response?.data || e.message) + "\n";
    }
    fs.writeFileSync('test-login-out2.txt', out);
    console.log("Done");
}
testLogin();
