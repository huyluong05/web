import fs from 'fs';
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('getMySQLPool')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
