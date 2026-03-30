
async function testAutoLock() {
  const baseUrl = 'http://127.0.0.1:3003'; 
  
  try {
    // 1. Get a course
    const listRes = await fetch(`${baseUrl}/courses`);
    const courses = await listRes.json();
    const course = courses.find(c => c.enrolled > 0) || courses[0];
    console.log(`Testing Course ${course.id}: Enrolled=${course.enrolled}, Capacity=${course.capacity}`);

    // 2. Set capacity to match enrolled (trigger auto-lock)
    console.log('--- Triggering Auto-Lock (Capacity = Enrolled) ---');
    const lockRes = await fetch(`${baseUrl}/courses/${course.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxSlots: course.enrolled
      })
    });
    const lockData = await lockRes.json();
    console.log('API Reported Status:', lockData.status);

    // 3. Set capacity higher (back to OPEN if DB status is OPEN)
    console.log('--- Releasing Auto-Lock (Capacity > Enrolled) ---');
    const openRes = await fetch(`${baseUrl}/courses/${course.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxSlots: course.enrolled + 10,
        status: 'OPEN'
      })
    });
    const openData = await openRes.json();
    console.log('API Reported Status:', openData.status);

  } catch (err) {
    console.error('Auto-Lock Test Error:', err.message);
  }
}

testAutoLock();
