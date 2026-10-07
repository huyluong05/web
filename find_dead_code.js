import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function scanExports() {
    const srcDir = path.join(process.cwd(), 'src');
    const files = [];
    walkDir(srcDir, (f) => {
        if (f.endsWith('.jsx') || f.endsWith('.js')) {
            files.push(f);
        }
    });

    const exportsMap = {};
    const importsMap = {};
    const contentMap = {};

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        contentMap[file] = content;
        
        // Match `export const Name`, `export function Name`, `export default function Name`
        // Simplified regex for named and default exports
        const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|let|var)\s+([A-Za-z0-9_]+)/g;
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            if (!exportsMap[match[1]]) exportsMap[match[1]] = [];
            exportsMap[match[1]].push(file);
        }
    });

    // Let's check where they are used.
    Object.keys(exportsMap).forEach(exportedName => {
        let isUsed = false;
        files.forEach(file => {
            const content = contentMap[file];
            // Don't check the file that exports it, unless it's imported elsewhere
            if (exportsMap[exportedName].includes(file)) return;
            
            // Check if the name appears in the file
            if (new RegExp(`\\b${exportedName}\\b`).test(content)) {
                isUsed = true;
            }
        });
        if (!isUsed) {
            console.log(`Unused export: ${exportedName} (in ${exportsMap[exportedName].join(', ')})`);
        }
    });
}

scanExports();
