import axios from 'axios';

async function testGateway() {
    // Port 3000 is the Gateway
    const url = 'http://localhost:3000/api/auth/register';
    const randomId = Math.floor(Math.random() * 10000);
    const payload = {
        email: `gatewaytest${randomId}@example.com`,
        username: `gateuser${randomId}`,
        password: 'password123',
        role: 'STUDENT'
    };

    console.log(`Sending POST request to ${url}`);
    console.log('If this hangs, it means the Gateway is swallowing the body stream.');

    try {
        // Short timeout to fail fast
        const response = await axios.post(url, payload, { timeout: 5000 });
        console.log(`Success! Status: ${response.status}`);
        console.log('Response data:', response.data);
    } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
            console.error('TIMED OUT! The request hung.');
        } else {
            console.error('Error details:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
        }
    }
}

testGateway();
