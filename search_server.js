import fs from 'fs';
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('/api/health') || line.includes('/health') || line.includes('app.post')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
