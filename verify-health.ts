import axios from 'axios';

async function testHealth() {
    const url = 'http://localhost:3001/auth/test';
    console.log(`Sending GET request to ${url}`);

    try {
        const response = await axios.get(url, { timeout: 3000 });
        console.log(`Success! Status: ${response.status}. Data: ${response.data}`);
    } catch (error: any) {
        console.error('Error details:', error.message);
    }
}

testHealth();
