const http = require('http');

const options = [
  { path: '/api/courses/classes/CCLASS_CS04_HK1_01_2627', name: 'Course Detail' },
  { path: '/api/enrollments/admin/classes/CCLASS_CS04_HK1_01_2627/enrollments', name: 'Enrollments' },
  { path: '/api/grades/class/CCLASS_CS04_HK1_01_2627', name: 'Grades' }
];

async function test() {
  for (const opt of options) {
    console.log(`Testing ${opt.name}: ${opt.path}`);
    await new Promise(resolve => {
      http.get(`http://localhost:3000${opt.path}`, (res) => {
        console.log(`  Status: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`  Body length: ${data.length}`);
          if (res.statusCode !== 200) console.log(`  Error Body: ${data}`);
          resolve();
        });
      }).on('error', err => {
        console.log(`  Error: ${err.message}`);
        resolve();
      });
    });
  }
}

test();
