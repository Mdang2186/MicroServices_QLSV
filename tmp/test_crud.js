
async function testCrud() {
  const baseUrl = 'http://127.0.0.1:3003'; 
  
  try {
    console.log('--- Testing Create ---');
    const createRes = await fetch(`${baseUrl}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST_' + Date.now(),
        name: 'Testing Course',
        subjectId: 'SUB_BM01', 
        semesterId: 'SEM_HK1_2223',
        maxSlots: 40,
        status: 'OPEN'
      })
    });
    
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(JSON.stringify(createData));
    console.log('Create Success:', createData.code, 'ID:', createData.id);
    const id = createData.id;

    console.log('--- Testing Update ---');
    const updateRes = await fetch(`${baseUrl}/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Testing Course',
        maxSlots: 45
      })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error(JSON.stringify(updateData));
    console.log('Update Success:', updateData.name);

    console.log('--- Testing Delete ---');
    const deleteRes = await fetch(`${baseUrl}/courses/${id}`, { method: 'DELETE' });
    if (!deleteRes.ok) throw new Error('Delete failed');
    console.log('Delete Success');

  } catch (err) {
    console.error('API Error:', err.message);
  }
}

testCrud();
