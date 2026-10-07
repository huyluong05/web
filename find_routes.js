import fs from 'fs';
const s = fs.readFileSync('server.js', 'utf8');
const routes = [...s.matchAll(/app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g)].map(m => `${m[1].toUpperCase()} ${m[2]}`);
console.log(routes.join('\n'));
