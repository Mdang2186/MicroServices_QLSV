
import axios from 'axios';

async function testAuthFlow() {
    const registerUrl = 'http://localhost:3001/auth/register';
    const loginUrl = 'http://localhost:3001/auth/login';

    // Use a random user to avoid conflict
    const randomId = Math.floor(Math.random() * 10000);
    const password = 'password123';
    const payload = {
        email: `test${randomId}@example.com`,
        username: `student${randomId}`,
        password: password,
        role: 'STUDENT'
    };

    console.log(`--- Testing Registration ---`);
    console.log(`Sending request to ${registerUrl} with payload:`, payload);

    try {
        const regResponse = await axios.post(registerUrl, payload);
        console.log(`Registration Success! Status: ${regResponse.status}`);
        console.log('Response data:', regResponse.data);

        console.log(`\n--- Testing Login ---`);
        const loginPayload = {
            email: payload.email,
            password: password
        };
        console.log(`Sending request to ${loginUrl} with payload:`, loginPayload);

        const loginResponse = await axios.post(loginUrl, loginPayload);
        console.log(`Login Success! Status: ${loginResponse.status}`);
        console.log('Access Token received:', !!loginResponse.data.accessToken);

    } catch (error: any) {
        console.error('\n--- Error details ---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testAuthFlow();
