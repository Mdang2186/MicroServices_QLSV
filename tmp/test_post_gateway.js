
const axios = require('axios');

async function testPost() {
  try {
    const res = await axios.post('http://localhost:3000/api/courses', {
      subjectId: 'SUB_CS01',
      semesterId: 'SEM_HK1_2627',
      lecturerId: 'LEC001',
      maxSlots: 60,
      status: 'OPEN',
      adminClassIds: [],
      schedules: []
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', err.response?.data);
  }
}

testPost();
