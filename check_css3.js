import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');
let allCode = '';

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath);
        } else if (dirPath.endsWith('.jsx') || dirPath.endsWith('.js')) {
            allCode += fs.readFileSync(dirPath, 'utf-8') + '\n';
        }
    });
}
walkDir(srcDir);

const cssClassesToCheck = ['glass', 'shimmer', 'animate-pulse-slow', 'text-gradient'];
cssClassesToCheck.forEach(cls => {
    if (allCode.includes(cls)) {
        console.log(`Class used: ${cls}`);
    } else {
        console.log(`Class UNUSED: ${cls}`);
    }
});
