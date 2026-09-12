const http = require('http');
const data = JSON.stringify({ username: 'admin', password: 'wrongpassword' });
const options = { hostname: 'localhost', port: 3001, path: '/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } };
const req = http.request(options, res => { console.log(`STATUS: ${res.statusCode}`); res.on('data', d => process.stdout.write(d)); });
req.on('error', e => console.error(e));
req.write(data);
req.end();
