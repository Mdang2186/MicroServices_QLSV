
import axios from 'axios';

async function testCourseService() {
  const classId = '813a92ea-8716-4db3-9fb0-520677a9a4cf';
  const url = `http://localhost:3003/courses/classes/${classId}`;
  try {
    console.log(`Calling Course Service: ${url}`);
    const response = await axios.get(url);
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('Course Service call failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testCourseService();
