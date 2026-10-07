import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath);
        } else if (dirPath.endsWith('.jsx') || dirPath.endsWith('.js')) {
            const code = fs.readFileSync(dirPath, 'utf8');
            const lines = code.split('\n');
            lines.forEach((l, i) => {
                if (l.includes('/') && !l.includes('</') && !l.includes('import ') && !l.includes('//') && !l.includes('/*') && !l.match(/https?:\/\//) && !l.match(/\/api\//)) {
                    // Check for math division
                    if (l.match(/[a-zA-Z0-9_]+\s*\/\s*[a-zA-Z0-9_]+/)) {
                        console.log(`${f}:${i+1}: ${l.trim()}`);
                    }
                }
            });
        }
    });
}
walkDir(srcDir);
