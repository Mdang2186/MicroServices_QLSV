
async function testStatusUpdate() {
  const baseUrl = 'http://127.0.0.1:3003'; 
  
  try {
    // 1. Get a course to update
    const listRes = await fetch(`${baseUrl}/courses`);
    const courses = await listRes.json();
    if (courses.length === 0) {
      console.log('No courses found to test status update');
      return;
    }
    const courseId = courses[0].id;
    const oldStatus = courses[0].status;
    console.log(`Original Status of Course ${courseId}:`, oldStatus);

    // 2. Change status to LOCKED
    console.log('--- Testing Status Change to LOCKED ---');
    const updateRes = await fetch(`${baseUrl}/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'LOCKED'
      })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error(JSON.stringify(updateData));
    console.log('New Status:', updateData.status);

    // 3. Change back to original (or OPEN)
    console.log('--- Reverting Status ---');
    await fetch(`${baseUrl}/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: oldStatus
      })
    });
    console.log('Status reverted success');

  } catch (err) {
    console.error('Status Update Test Error:', err.message);
  }
}

testStatusUpdate();
