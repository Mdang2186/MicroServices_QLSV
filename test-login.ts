import axios from 'axios';

async function testLogin() {
    try {
        console.log("Testing Admin login with username 90000000001...");
        const res = await axios.post('http://localhost:3000/api/auth/login', {
            email: '90000000001',
            password: '123456'
        });
        console.log("Login Admin Success!");
    } catch (e: any) {
        console.error("Login Admin Error:");
        console.error(e.response?.data || e.message);
    }

    try {
        console.log("\nTesting Student login with student code 21103100001...");
        const res2 = await axios.post('http://localhost:3000/api/auth/login', {
            email: '21103100001',
            password: '123456'
        });
        console.log("Login Student Success!");
    } catch (e: any) {
        console.error("Login Student Error:");
        console.error(e.response?.data || e.message);
    }
}
testLogin();
