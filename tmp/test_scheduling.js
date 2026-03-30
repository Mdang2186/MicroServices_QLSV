
async function testScheduling() {
  const baseUrl = 'http://127.0.0.1:3003'; 
  
  try {
    // 1. Get rooms
    const roomsRes = await fetch(`${baseUrl}/rooms`);
    const rooms = await roomsRes.json();
    if (rooms.length === 0) throw new Error('No rooms available for testing');
    const roomId = rooms[0].id;

    // 2. Get a course
    const coursesRes = await fetch(`${baseUrl}/courses`);
    const courses = await coursesRes.json();
    const courseId = courses[0].id;

    console.log(`--- Testing Scheduling for Course ${courseId} ---`);
    console.log(`Using Room: ${rooms[0].name}`);

    // 3. Update with schedule
    const scheduleData = [
      { dayOfWeek: 2, startShift: 1, endShift: 4, roomId: roomId, type: 'THEORY' },
      { dayOfWeek: 5, startShift: 7, endShift: 9, roomId: roomId, type: 'PRACTICE' }
    ];

    const updateRes = await fetch(`${baseUrl}/courses/${courseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedules: scheduleData
      })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error(JSON.stringify(updateData));

    console.log('API Reported Schedules:', updateData.schedules.length);
    updateData.schedules.forEach((s, i) => {
      console.log(`  Session ${i+1}: Thứ ${s.dayOfWeek}, Tiết ${s.startShift}-${s.endShift} tại ${s.roomId}`);
    });

  } catch (err) {
    console.error('Scheduling Test Error:', err.message);
  }
}

testScheduling();
