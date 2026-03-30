
const axios = require('axios');

async function test() {
    try {
        const semesterId = 'SEM_HKH_2526';
        const res = await axios.get(`http://localhost:3002/students/tuition/list?semesterId=${semesterId}&query=22103100030`);
        console.log('Results for Bùi Trọng Anh in SEM_HK1_2627:');
        const item = res.data.items[0];
        if (item) {
            console.log(`FullName: ${item.fullName}`);
            console.log(`TotalFee: ${item.totalFee}`);
            console.log(`TotalSubjects: ${item.totalSubjects}`);
            console.log('Enrollments:', JSON.stringify(item.enrollments, null, 2));
        } else {
            console.log('Not found in this semester list');
        }
    } catch (e) {
        console.error('Error fetching list:', e.message);
    }
}

test();
