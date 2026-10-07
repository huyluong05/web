import fs from 'fs';
const content = fs.readFileSync('server.js', 'utf8');
const lines = content.split('\n');
let inBlock = false;
for(let i=0; i<lines.length; i++) {
    let l = lines[i].trim();
    if(l.startsWith('//') && !l.includes('====') && !l.includes('---')) {
        // if it looks like code (has { or } or = or () )
        if (l.match(/\{|\}|=|function|\(\)/)) {
            console.log(`Line ${i+1}: ${l}`);
        }
    }
}
