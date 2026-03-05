import axios from 'axios';

async function test() {
    try {
        const r = await axios.post('http://127.0.0.1:3000/api/auth/login', {
            email: '90000000001',
            password: '123456'
        });
        console.log("Success:", r.data);
    } catch (e: any) {
        console.log("Error status:", e.response?.status);
        console.log("Error data:", JSON.stringify(e.response?.data, null, 2));
        console.log("Error message:", e.message);
    }
}
test();
