
import axios from 'axios';

async function testWebAdminLogin() {
    const url = 'http://localhost:3000/api/auth/login';
    const payload = {
        email: 'admin01@uni.edu.vn',
        password: '123456'
    };

    console.log(`--- Testing Web Admin Login Flow via Gateway ---`);
    console.log(`URL: ${url}`);
    console.log(`Payload:`, payload);

    try {
        const response = await axios.post(url, payload);
        console.log(`\nSuccess!`);
        console.log(`Status: ${response.status}`);
        console.log(`Role: ${response.data.role}`);
        console.log(`Token: ${response.data.accessToken ? 'Present' : 'Missing'}`);
    } catch (error: any) {
        console.log(`\nFailed!`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data:`, error.response.data);
        } else {
            console.log(`Message: ${error.message}`);
        }
    }
}

testWebAdminLogin();
