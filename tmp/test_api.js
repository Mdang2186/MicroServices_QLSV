const axios = require('axios');

async function checkApi() {
  const lecturerId = 'LEC_30000000003';
  const semesterId = 'SEM_HK1_2627';
  
  try {
    console.log(`Checking API for lecturer ${lecturerId}...`);
    // Try without semester filter first
    const res1 = await axios.get(`http://localhost:3000/api/courses/lecturer/${lecturerId}`);
    console.log('Response without semester:', res1.data.length, 'items');

    // Try with semester filter
    const res2 = await axios.get(`http://localhost:3000/api/courses/lecturer/${lecturerId}?semesterId=${semesterId}`);
    console.log('Response with semester:', res2.data.length, 'items');
  } catch (err) {
    console.error('API Error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    }
  }
}

checkApi();
